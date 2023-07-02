package main

import (
	"context"
	"log"
	"net"
	"os"
	"strings"

	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"

	"golang.org/x/crypto/sha3"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
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

func connectToContract() (*ac.ENSRegistry, error) {
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

/*
 * This will create ETH connection each time (slow)
 * It is a read-only function. There are different write functions in the contract, but this server does not allow you to use it
 * TODO: cache it in the DB, because list of nodes is rarely changed
 */
func (s *server) IsNameAvailable(ctx context.Context, in *pb.NameAvailableRequest) (*pb.NameAvailableResponse, error) {
	log.Printf("Received request: %v", in.ProtoReflect().Descriptor().FullName())

	// 1 - connect to geth
	reg, err := connectToContract()
	if err != nil {
		log.Fatalf("Failed to connect to contract: %v", err)
		panic(err)
	}
	log.Printf("Connected!")

	// 2 - convert to name hash
	nh, err := nameHash(in.FullName)
	if err != nil {
		log.Fatalf("Can not convert FullName to namehash: %v", err)
		panic(err)
	}

	// 3 - get owner from registry
	callOpts := bind.CallOpts{}
	addr, err := reg.Owner(&callOpts, nh)
	if err != nil {
		log.Fatalf("Failed to get : %v", err)
		panic(err)
	}

	// 3 - covert to result
	var res pb.NameAvailableResponse
	var addrEmpty = common.Address{}

	if addr != addrEmpty {
		res.Available = false
	} else {
		res.Available = true
	}

	return &res, nil
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
