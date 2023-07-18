package main

import (
	"context"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"math/big"
	"os"
	"strings"

	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"

	pb "github.com/anytype/anyns_api_server/pb/anyns_api_server"
)

func isNameAvailable(ctx context.Context, in *pb.NameAvailableRequest) (*pb.NameAvailableResponse, error) {
	//log.Printf("Received request: %v", in.ProtoReflect().Descriptor().FullName())

	conn, err := createEthConnection()
	if err != nil {
		log.Printf("Failed to connect to geth: %v", err)
		return nil, err
	}

	// 1 - connect to geth
	reg, err := ConnectToRegistryContract(conn)
	if err != nil {
		log.Printf("Failed to connect to contract: %v", err)
		return nil, err
	}

	// 2 - convert to name hash
	nh, err := NameHash(in.FullName)
	if err != nil {
		log.Printf("Can not convert FullName to namehash: %v", err)
		return nil, err
	}

	// 3 - call contract's method
	log.Printf("Getting owner for name: %v", in.GetFullName())

	callOpts := bind.CallOpts{}
	addr, err := reg.Owner(&callOpts, nh)
	if err != nil {
		log.Printf("Failed to get : %v", err)
		return nil, err
	}

	// 4 - covert to result
	// the owner can be NameWrapper
	log.Printf("Received owner address: %v", addr.Hex())

	var res pb.NameAvailableResponse
	var addrEmpty = common.Address{}

	if addr != addrEmpty {
		log.Printf("Name is NOT available...Getting additional info")
		// 5 - if name is not available, then get additional info
		return getAdditionalNameInfo(conn, addr, in.GetFullName())
	}

	log.Printf("Name is not registered yet...")
	res.Available = true
	return &res, nil
}

func getAdditionalNameInfo(conn *ethclient.Client, currentOwner common.Address, fullName string) (*pb.NameAvailableResponse, error) {
	var res pb.NameAvailableResponse
	res.Available = false

	// 1 - if current owner is the NW contract - then ask it again about the "real owner"
	nwAddress := os.Getenv("CONTRACT_NW_ADDR")
	nwAddressBytes := common.HexToAddress(nwAddress)

	if currentOwner == nwAddressBytes {
		log.Printf("Address is owned by NameWrapper contract, ask it to retrieve real owner")

		realOwner, err := getRealOwner(conn, fullName)
		if err != nil {
			log.Printf("Failed to get real owner of the name: %v", err)
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
	ownerAnyAddress, spaceID, err := getAdditionalData(conn, fullName)
	if err != nil {
		log.Printf("Failed to get real additional data of the name: %v", err)
		return nil, err
	}
	if ownerAnyAddress != nil {
		res.ContentHash = *ownerAnyAddress
	}
	if spaceID != nil {
		res.SpaceId = *spaceID
	}

	return &res, nil
}

func getRealOwner(conn *ethclient.Client, fullName string) (*string, error) {
	// 1 - connect to contract
	nw, err := ConnectToNamewrapperContract(conn)
	if err != nil {
		log.Printf("Failed to connect to contract: %v", err)
		return nil, err
	}

	// 2 - convert to name hash
	nh, err := NameHash(fullName)
	if err != nil {
		log.Printf("Can not convert FullName to namehash: %v", err)
		return nil, err
	}

	// 3 - call contract's method
	log.Printf("Getting real owner for name: %v", fullName)

	callOpts := bind.CallOpts{}

	// convert bytes32 -> uin256 (also 32 bytes long)
	id := new(big.Int).SetBytes(nh[:])
	addr, err := nw.OwnerOf(&callOpts, id)
	if err != nil {
		log.Printf("Failed to get : %v", err)
		return nil, err
	}

	// 4 - covert to result
	// the owner can be NameWrapper
	log.Printf("Received real owner address: %v", addr)

	var out string = addr.Hex()
	return &out, nil
}

func getAdditionalData(conn *ethclient.Client, fullName string) (*string, *string, error) {
	// 1 - connect to contract
	ar, err := ConnectToResolver(conn)
	if err != nil {
		log.Printf("Failed to connect to contract: %v", err)
		return nil, nil, err
	}

	// 2 - convert to name hash
	nh, err := NameHash(fullName)
	if err != nil {
		log.Printf("Can not convert FullName to namehash: %v", err)
		return nil, nil, err
	}

	// 3 - get content hash and space ID
	callOpts := bind.CallOpts{}
	hash, err := ar.Contenthash(&callOpts, nh)
	if err != nil {
		log.Printf("Can not get contenthash: %v", err)
		return nil, nil, err
	}

	space, err := ar.SpaceId(&callOpts, nh)
	if err != nil {
		log.Printf("Can not get SpaceID: %v", err)
		return nil, nil, err
	}

	// convert hex values to string
	hexString := hex.EncodeToString(hash)
	contentHashDecoded, _ := hex.DecodeString(hexString)
	log.Printf("Contenthash is: %s", contentHashDecoded)

	hexString = hex.EncodeToString(space)
	spaceIDDecoded, _ := hex.DecodeString(hexString)
	log.Printf("Space ID is: %s", spaceIDDecoded)

	ownerAnyAddressOut := string(contentHashDecoded)
	spaceIDOut := string(spaceIDDecoded)

	return &ownerAnyAddressOut, &spaceIDOut, nil
}

func nameRegister(ctx context.Context, in *pb.NameRegisterRequest) error {
	var adminAddr common.Address = common.HexToAddress(os.Getenv("ADMIN_ADDR"))
	var resolverAddr common.Address = common.HexToAddress(os.Getenv("CONTRACT_RESOLVER_ADDR"))
	var registrantAccount common.Address = common.HexToAddress(in.OwnerEthAddress)

	conn, err := createEthConnection()
	if err != nil {
		log.Printf("Failed to connect to geth: %v", err)
		return err
	}

	// 1 - connect to geth
	ac, err := ConnectToController(conn)
	if err != nil {
		log.Printf("Failed to connect to contract: %v", err)
		return err
	}

	// 2 - get a name's first part
	// TODO: normalize string
	nameFirstPart := RemoveTLD(in.FullName)

	// 3 - calculate a commitment
	var REGISTRATION_TIME big.Int = *big.NewInt(365 * 24 * 60 * 60)

	secret, err := GenerateRandomSecret()

	if err != nil {
		log.Printf("Can not generate random secret: %v", err)
		return err
	}

	callData, err := prepareCallData(in.GetFullName(), in.GetOwnerAnyAddress(), in.GetSpaceId())

	if err != nil {
		log.Printf("Can not prepare call data: %v", err)
		return err
	}

	var isReverseRecord bool = false
	var ownerControlledFuses uint16 = 0

	callOpts := bind.CallOpts{}
	callOpts.From = adminAddr

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
		log.Printf("Can not calculate a commitment: %v", err)
		return err
	}

	authOpts, err := GenerateAuthOptsForAdmin(conn)
	if err != nil {
		log.Printf("Can not get auth params for admin: %v", err)
		return err
	}

	// 2 - send a commit transaction from Admin
	tx, err := ac.Commit(authOpts, commitment)
	if err != nil {
		log.Printf("Can not Commit tx: %v", err)
		return err
	}

	log.Printf("Commit tx sent: %s. Waiting for it to be mined...", tx.Hash().Hex())

	// 3 - wait for tx to be mined
	bind.WaitMined(ctx, conn, tx)
	txRes := checkTransactionReceipt(conn, tx.Hash())
	if !txRes {
		log.Printf("TX : %v", err)
		return errors.New("commit tx failed")
	}

	// update nonce again...
	authOpts, err = GenerateAuthOptsForAdmin(conn)
	if err != nil {
		log.Printf("Can not get auth params for admin: %v", err)
		return err
	}

	// 4 - now send register tx
	tx, err = ac.Register(
		authOpts,
		nameFirstPart,
		registrantAccount,
		&REGISTRATION_TIME,
		secret,
		resolverAddr,
		callData,
		isReverseRecord,
		ownerControlledFuses)

	if err != nil {
		log.Printf("Can not Commit tx: %v", err)
		return err
	}

	log.Printf("Register tx sent: %s. Waiting for it to be mined...", tx.Hash().Hex())

	// 5 - wait for tx to be mined
	bind.WaitMined(ctx, conn, tx)

	// 6 - return results
	txRes = checkTransactionReceipt(conn, tx.Hash())
	if !txRes {
		// new error
		return errors.New("register tx failed")
	}

	log.Printf("Operation succeeded!")
	return nil
}

func Utf8ToHex(input string) string {
	encoded := hex.EncodeToString([]byte(input))
	return "0x" + encoded
}

func prepareCallData(fullName string, contentHash string, spaceID string) ([][]byte, error) {
	var out [][]byte

	// 1 -
	const jsondata = `
		[
			{
				"inputs": [
					{
						"internalType": "bytes32",
						"name": "node",
						"type": "bytes32"
					},
					{
						"internalType": "bytes",
						"name": "hash",
						"type": "bytes"
					}
				],
				"name": "setContenthash",
				"outputs": [],
				"stateMutability": "nonpayable",
				"type": "function"
			},

			{
				"inputs": [
					{
						"internalType": "bytes32",
						"name": "node",
						"type": "bytes32"
					},
					{
						"internalType": "bytes",
						"name": "spaceid",
						"type": "bytes"
					}
				],
				"name": "setSpaceId",
				"outputs": [],
				"stateMutability": "nonpayable",
				"type": "function"
			}
		]
	`
	contractABI, err := abi.JSON(strings.NewReader(jsondata))
	if err != nil {
		fmt.Println("Error parsing ABI:", err)
		return nil, err
	}

	// print to debug log
	log.Printf("Preparing call data for name: %v", fullName)
	log.Printf("ContentHash: %v", contentHash)
	log.Printf("SpaceID: %v", spaceID)

	// 2 - convert fullName to name hash
	nh, err := NameHash(fullName)
	if err != nil {
		log.Printf("Can not convert FullName to namehash: %v", err)
		return nil, err
	}

	// 3 - if spaceID is not empty - then call setSpaceId method of resolver
	if spaceID != "" {
		data, err := contractABI.Pack("setSpaceId", nh, []byte(spaceID))
		if err != nil {
			fmt.Println("Error encoding function data:", err)
			return nil, nil
		}

		fmt.Printf("Encoded space ID: %v", hex.EncodeToString(data))

		out = append(out, data)
	}

	// 4 - if contentHash is not empty - then call encodeFunctionData method of resolver
	if contentHash != "" {
		data, err := contractABI.Pack("setContenthash", nh, []byte(contentHash))
		if err != nil {
			fmt.Println("Error encoding function data:", err)
			return nil, nil
		}

		// convert bytes to string
		log.Printf("Encoded data: %v", hex.EncodeToString(data))

		out = append(out, data)
	}

	return out, nil
}
