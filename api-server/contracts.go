package main

import (
	"log"
	"os"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"

	ac "github.com/anytype/anyns_api_server/anytype_crypto"
)

func createEthConnection() (*ethclient.Client, error) {
	connStr := os.Getenv("GETH_URL")
	conn, err := ethclient.Dial(connStr)
	return conn, err
}

func ConnectToRegistryContract() (*ac.ENSRegistry, error) {
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

func ConnectToNamewrapperContract() (*ac.AnytypeNameWrapper, error) {
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

func ConnectToResolver() (*ac.AnytypeResolver, error) {
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
