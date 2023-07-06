package main

import (
	"context"
	"crypto/ecdsa"
	"log"
	"math/big"
	"os"

	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"

	ac "github.com/anytype/anyns_api_server/anytype_crypto"
)

func createEthConnection() (*ethclient.Client, error) {
	connStr := os.Getenv("GETH_URL")
	conn, err := ethclient.Dial(connStr)
	return conn, err
}

func ConnectToRegistryContract(conn *ethclient.Client) (*ac.ENSRegistry, error) {
	// 1 - create new contract instance
	contractRegAddr := os.Getenv("CONTRACT_REG_ADDR")
	reg, err := ac.NewENSRegistry(common.HexToAddress(contractRegAddr), conn)
	if err != nil || reg == nil {
		log.Fatalf("Failed to instantiate ENSRegistry contract: %v", err)
		return nil, err
	}

	return reg, err
}

func ConnectToNamewrapperContract(conn *ethclient.Client) (*ac.AnytypeNameWrapper, error) {
	// 1 - create new contract instance
	contractAddr := os.Getenv("CONTRACT_NW_ADDR")
	nw, err := ac.NewAnytypeNameWrapper(common.HexToAddress(contractAddr), conn)
	if err != nil || nw == nil {
		log.Fatalf("Failed to instantiate AnytypeNameWrapper contract: %v", err)
		return nil, err
	}

	return nw, err
}

func ConnectToResolver(conn *ethclient.Client) (*ac.AnytypeResolver, error) {
	// 1 - create new contract instance
	contractAddr := os.Getenv("CONTRACT_RESOLVER_ADDR")
	ar, err := ac.NewAnytypeResolver(common.HexToAddress(contractAddr), conn)
	if err != nil || ar == nil {
		log.Fatalf("Failed to instantiate AnytypeResolver contract: %v", err)
		return nil, err
	}

	return ar, err
}

func ConnectToController(conn *ethclient.Client) (*ac.AnytypeRegistrarControllerPrivate, error) {
	// 1 - create new contract instance
	contractAddr := os.Getenv("CONTRACT_CONTROLLER_PRIVATE_ADDR")
	ac, err := ac.NewAnytypeRegistrarControllerPrivate(common.HexToAddress(contractAddr), conn)
	if err != nil || ac == nil {
		log.Fatalf("Failed to instantiate AnytypeRegistrarControllerPrivate contract: %v", err)
		return nil, err
	}

	return ac, err
}

func GenerateAuthOptsForAdmin(conn *ethclient.Client) (*bind.TransactOpts, error) {
	// 1 - load private key
	privateKey, err := crypto.HexToECDSA(os.Getenv("ADMIN_PK"))
	if err != nil {
		log.Fatal(err)
		return nil, err
	}

	publicKey := privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		log.Fatal("error casting public key to ECDSA")
	}

	fromAddress := crypto.PubkeyToAddress(*publicKeyECDSA)

	// 2 - get gas costs, etc
	nonce, err := conn.PendingNonceAt(context.Background(), fromAddress)
	if err != nil {
		log.Fatal(err)
		return nil, err
	}

	gasPrice, err := conn.SuggestGasPrice(context.Background())
	if err != nil {
		log.Fatal(err)
		return nil, err
	}

	auth := bind.NewKeyedTransactor(privateKey)

	auth.Nonce = big.NewInt(int64(nonce))
	auth.Value = big.NewInt(0)     // in wei
	auth.GasLimit = uint64(300000) // in units
	auth.GasPrice = gasPrice

	return auth, nil
}

func checkTransactionReceipt(conn *ethclient.Client, txHash common.Hash) bool {
	tx, err := conn.TransactionReceipt(context.Background(), txHash)
	if err != nil {
		return false
	}

	// success
	if tx.Status == 1 {
		return true
	}

	return false
}
