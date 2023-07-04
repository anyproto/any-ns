package main

import (
	"context"
	"log"
	"math/big"
	"net"
	"os"
	"strings"

	"golang.org/x/crypto/sha3"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/common/hexutil"
	"github.com/ethereum/go-ethereum/ethclient"

	ac "github.com/anytype/anyns_api_server/anytype_crypto"
	pb "github.com/anytype/anyns_api_server/pb/anyns_api_server"
)

type server struct {
	pb.UnimplementedAnynsServer
}

func nameHashPart(prevHash [32]byte, name string) (hash [32]byte, err error) {
	sha := sha3.NewLegacyKeccak256()
	if _, err = sha.Write(prevHash[:]); err != nil {
		return
	}

	nameSha := sha3.NewLegacyKeccak256()
	if _, err = nameSha.Write([]byte(name)); err != nil {
		return
	}
	nameHash := nameSha.Sum(nil)
	if _, err = sha.Write(nameHash); err != nil {
		return
	}
	sha.Sum(hash[:0])
	return
}

// NameHash generates a hash from a name that can be used to
// look up the name in ENS
func nameHash(name string) (hash [32]byte, err error) {
	if name == "" {
		return
	}

	parts := strings.Split(name, ".")
	for i := len(parts) - 1; i >= 0; i-- {
		if hash, err = nameHashPart(hash, parts[i]); err != nil {
			return
		}
	}
	return
}

func createEthConnection() (*ethclient.Client, error) {
	connStr := os.Getenv("GETH_URL")
	conn, err := ethclient.Dial(connStr)
	return conn, err
}

func connectToRegistryContract() (*ac.ENSRegistry, error) {
	// 1 - connect to the registry contract
	conn, err := createEthConnection()
	if err != nil {
		log.Fatalf("Failed to connect to geth: %v", err)
		return nil, err
	}

	// 2 - create new contract instance
	contractRegAddr := os.Getenv("CONTRACT_REG_ADDR")
	reg, err := ac.NewENSRegistry(common.HexToAddress(contractRegAddr), conn)
	if err != nil || reg == nil {
		log.Fatalf("Failed to instantiate ENSRegistry contract: %v", err)
		return nil, err
	}

	return reg, err
}

func connectToNamewrapperContract() (*ac.AnytypeNameWrapper, error) {
	// 1 - connect to the registry contract
	conn, err := createEthConnection()
	if err != nil {
		log.Fatalf("Failed to connect to geth: %v", err)
		return nil, err
	}

	// 2 - create new contract instance
	contractAddr := os.Getenv("CONTRACT_NW_ADDR")
	nw, err := ac.NewAnytypeNameWrapper(common.HexToAddress(contractAddr), conn)
	if err != nil || nw == nil {
		log.Fatalf("Failed to instantiate AnytypeNameWrapper contract: %v", err)
		return nil, err
	}

	return nw, err
}

func connectToResolver() (*ac.AnytypeResolver, error) {
	// 1 - connect to the registry contract
	conn, err := createEthConnection()
	if err != nil {
		log.Fatalf("Failed to connect to geth: %v", err)
		return nil, err
	}

	// 2 - create new contract instance
	contractAddr := os.Getenv("CONTRACT_RESOLVER_ADDR")
	ar, err := ac.NewAnytypeResolver(common.HexToAddress(contractAddr), conn)
	if err != nil || ar == nil {
		log.Fatalf("Failed to instantiate AnytypeResolver contract: %v", err)
		return nil, err
	}

	return ar, err
}

/*
 * This will create ETH connection each time (slow)
 */
func (s *server) IsNameAvailable(ctx context.Context, in *pb.NameAvailableRequest) (*pb.NameAvailableResponse, error) {
	log.Printf("Received request: %v", in.ProtoReflect().Descriptor().FullName())

	// 1 - connect to geth
	reg, err := connectToRegistryContract()
	if err != nil {
		log.Fatalf("Failed to connect to contract: %v", err)
		panic(err)
	}

	// 2 - convert to name hash
	nh, err := nameHash(in.FullName)
	if err != nil {
		log.Fatalf("Can not convert FullName to namehash: %v", err)
		panic(err)
	}

	// 3 - call contract's method
	log.Printf("Getting owner for name: %v", in.GetFullName())

	callOpts := bind.CallOpts{}
	addr, err := reg.Owner(&callOpts, nh)
	if err != nil {
		log.Fatalf("Failed to get : %v", err)
		panic(err)
	}

	// 4 - covert to result
	// the owner can be NameWrapper
	log.Printf("Received owner address: %v", addr.Hex())

	var res pb.NameAvailableResponse
	var addrEmpty = common.Address{}

	if addr != addrEmpty {
		log.Printf("Name is NOT available...Getting additional info")
		// 5 - if name is not available, then get additional info
		return getAdditionalNameInfo(addr, in.GetFullName())
	}

	log.Printf("Name is available for registration...")
	res.Available = true

	return &res, nil
}

func getAdditionalNameInfo(currentOwner common.Address, fullName string) (*pb.NameAvailableResponse, error) {
	var res pb.NameAvailableResponse
	res.Available = false

	// 1 - if current owner is the NW contract - then ask it again about the "real owner"
	nwAddress := os.Getenv("CONTRACT_NW_ADDR")
	nwAddressBytes := common.HexToAddress(nwAddress)

	if currentOwner == nwAddressBytes {
		log.Printf("Address is owned by NameWrapper contract, ask it to retrieve real owner")

		realOwner, err := getRealOwner(fullName)
		if err != nil {
			log.Fatalf("Failed to get real owner of the name: %v", err)
			// do not panic, try to continue
		}

		if realOwner != nil {
			res.Owner = *realOwner
		}
	} else {
		// if NW is not the "owner" of the contract -> then it is the real owner
		res.Owner = currentOwner.Hex()
	}

	// 2 - get content hash and spaceID
	contentHash, spaceID, err := getAdditionalData(fullName)
	if err != nil {
		log.Fatalf("Failed to get real additional data of the name: %v", err)
		// do not panic, try to continue
	}
	if contentHash != nil {
		res.ContentHash = *contentHash
	}
	if spaceID != nil {
		res.SpaceId = *spaceID
	}

	return &res, nil
}

func getRealOwner(fullName string) (*string, error) {
	// 1 - connect to contract
	nw, err := connectToNamewrapperContract()
	if err != nil {
		log.Fatalf("Failed to connect to contract: %v", err)
		return nil, err
	}

	// 2 - convert to name hash
	nh, err := nameHash(fullName)
	if err != nil {
		log.Fatalf("Can not convert FullName to namehash: %v", err)
		return nil, err
	}

	// 3 - call contract's method
	log.Printf("Getting real owner for name: %v", fullName)

	callOpts := bind.CallOpts{}

	// convert bytes32 -> uin256 (also 32 bytes long)
	id := new(big.Int).SetBytes(nh[:])
	addr, err := nw.OwnerOf(&callOpts, id)
	if err != nil {
		log.Fatalf("Failed to get : %v", err)
		return nil, err
	}

	// 4 - covert to result
	// the owner can be NameWrapper
	log.Printf("Received real owner address: %v", addr)

	var out string = addr.Hex()
	return &out, nil
}

func getAdditionalData(fullName string) (*string, *string, error) {
	// 1 - connect to contract
	ar, err := connectToResolver()
	if err != nil {
		log.Fatalf("Failed to connect to contract: %v", err)
		return nil, nil, err
	}

	// 2 - convert to name hash
	nh, err := nameHash(fullName)
	if err != nil {
		log.Fatalf("Can not convert FullName to namehash: %v", err)
		return nil, nil, err
	}

	// 3 - get content hash and space ID
	callOpts := bind.CallOpts{}
	hash, err := ar.Contenthash(&callOpts, nh)
	if err != nil {
		log.Fatalf("Can not get contenthash: %v", err)
		// do not panic, continue
		// return nil, nil, err
	}

	space, err := ar.SpaceId(&callOpts, nh)
	if err != nil {
		log.Fatalf("Can not get SpaceID: %v", err)
		// do not panic, continue
		// return nil, nil, err
	}

	log.Printf("Contenthash is: %v", hexutil.Encode(hash))
	log.Printf("Space ID is: %v", hexutil.Encode(space))

	// 4 - TODO: convert them from hex string to string (decode)
	// there are 2 ways to do that:
	// ens.ContenthashToString(hash)
	// cid.CidFromBytes(hash)
	var contentHashOut string = hexutil.Encode(hash)
	var spaceIDOut string = hexutil.Encode(space)

	return &contentHashOut, &spaceIDOut, nil
}

func main() {
	port := os.Getenv("GRPC_PORT")
	listener, err := net.Listen("tcp", ":"+port)
	if err != nil {
		panic(err)
	}

	s := grpc.NewServer()
	reflection.Register(s)

	log.Printf("Launching gRPC server on port: " + port)

	pb.RegisterAnynsServer(s, &server{})
	if err := s.Serve(listener); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
