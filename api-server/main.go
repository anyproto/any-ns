package main

import (
	"context"
	"encoding/hex"
	"log"
	"math/big"
	"net"
	"os"

	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"

	pb "github.com/anytype/anyns_api_server/pb/anyns_api_server"
)

type server struct {
	pb.UnimplementedAnynsServer
}

/*
 * This will create ETH connection each time (slow)
 */
func (s *server) IsNameAvailable(ctx context.Context, in *pb.NameAvailableRequest) (*pb.NameAvailableResponse, error) {
	log.Printf("Received request: %v", in.ProtoReflect().Descriptor().FullName())

	// 1 - connect to geth
	reg, err := ConnectToRegistryContract()
	if err != nil {
		log.Fatalf("Failed to connect to contract: %v", err)
		panic(err)
	}

	// 2 - convert to name hash
	nh, err := NameHash(in.FullName)
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
	nw, err := ConnectToNamewrapperContract()
	if err != nil {
		log.Fatalf("Failed to connect to contract: %v", err)
		return nil, err
	}

	// 2 - convert to name hash
	nh, err := NameHash(fullName)
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
	ar, err := ConnectToResolver()
	if err != nil {
		log.Fatalf("Failed to connect to contract: %v", err)
		return nil, nil, err
	}

	// 2 - convert to name hash
	nh, err := NameHash(fullName)
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

	// convert hex values to string
	hexString := hex.EncodeToString(hash)
	contentHashDecoded, _ := hex.DecodeString(hexString)
	log.Printf("Contenthash is: %s", contentHashDecoded)

	hexString = hex.EncodeToString(space)
	spaceIDDecoded, _ := hex.DecodeString(hexString)
	log.Printf("Space ID is: %s", spaceIDDecoded)

	contentHashOut := string(contentHashDecoded)
	spaceIDOut := string(spaceIDDecoded)

	return &contentHashOut, &spaceIDOut, nil
}

func (s *server) NameRegister(ctx context.Context, in *pb.NameRegisterRequest) (*pb.OperationResponse, error) {
	log.Printf("Received request: %v", in.ProtoReflect().Descriptor().FullName())

	// 1 - connect to geth
	ac, err := ConnectToController()
	if err != nil {
		log.Fatalf("Failed to connect to contract: %v", err)
		panic(err)
	}

	// 2 - get a name's first part
	// TODO: normalize string
	nameFirstPart := RemoveTLD(in.FullName)

	// 3 - calculate a commitment
	var registrantAccount common.Address
	var REGISTRATION_TIME big.Int
	secret, err := GenerateRandomSecret()

	if err != nil {
		log.Fatalf("Can not generate random secret: %v", err)
		panic(err)
	}

	var resolverAddr common.Address = common.HexToAddress(os.Getenv("CONTRACT_RESOLVER_ADDR"))
	var callData [][]byte = nil
	var isReverseRecord bool = false
	var ownerControlledFuses uint16 = 0

	callOpts := bind.CallOpts{}
	callOpts.From = common.HexToAddress("0x61d1eeE7FBF652482DEa98A1Df591C626bA09a60")

	commitment, err := ac.MakeCommitment(
		&callOpts,
		nameFirstPart,
		registrantAccount,
		&REGISTRATION_TIME,
		secret,
		resolverAddr,
		callData,
		isReverseRecord,
		ownerControlledFuses)

	if err != nil {
		log.Fatalf("Can not calculate a commitment: %v", err)
		panic(err)
	}

	log.Printf("Commitment value is: %v", commitment)

	// ...

	// return
	var resp pb.OperationResponse
	resp.OperationId = 1
	resp.OperationState = pb.OperationState_Error

	return &resp, nil
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
