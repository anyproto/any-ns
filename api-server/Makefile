########### Vars:
PORT=8080
GETH_URL="https://sepolia.infura.io/v3/68c55936b8534264801fa4bc313ff26f" 
# TODO: read from ../deployments/sepolia folder
CONTRACT_REG_ADDR="0xc0D3c96aE923Da6b45E6d4c21a0424730a20BCA9" 
CONTRACT_NW_ADDR="0xFe69BF9B3fD69d09977b37b5953C8B43687f3B23"
CONTRACT_RESOLVER_ADDR="0x34F9c5CB9b6dcc036e045a15af20CEdC0dE4dcB2"

.PHONY: prereqs-for-mac
prereqs-for-mac:
	go install github.com/pseudomuto/protoc-gen-doc/cmd/protoc-gen-doc@latest
	brew install protobuf protoc-gen-go protoc-gen-go-grpc
	brew install clang-format
	brew install grpcurl
	brew install golangci-lint

# Generate protobuf stubs and documentation
pb: proto/anyns_api_server.proto
	protoc --proto_path=proto proto/*.proto --go_out=. --go-grpc_out=.
	protoc --doc_out=./doc --doc_opt=html,index.html proto/*.proto

.PHONY: check-style
check-style:
	golangci-lint run -E errcheck -E gofmt -E revive 

# This doesn work unfortunately:
#abigen --combined-json contracts/build/contracts/XXX.json --pkg bootnodes --out xxx.go
#abigen --sol contracts/contracts/XXX.sol --pkg bootnodes --out xxx.go
anytype_crypto/ens_registry_stub.go: ../deployments/sepolia/ENSRegistry.json
	# convert combined json -> ./contract.abi and ./contract.bin
	node utils/combined_json_to_abi_and_bin.js ../deployments/sepolia/ENSRegistry.json
	# now generate Golang stub
	abigen --bin contract.bin --abi contract.abi --pkg anytype_crypto --type ENSRegistry --out anytype_crypto/ens_registry_stub.go
	rm contract.bin contract.abi

anytype_crypto/name_wrapper_stub.go: ../deployments/sepolia/AnytypeNameWrapper.json
	node utils/combined_json_to_abi_and_bin.js ../deployments/sepolia/AnytypeNameWrapper.json
	abigen --bin contract.bin --abi contract.abi --pkg anytype_crypto --type AnytypeNameWrapper --out anytype_crypto/name_wrapper_stub.go
	rm contract.bin contract.abi

anytype_crypto/anytype_resolver_stub.go: ../deployments/sepolia/AnytypeResolver.json
	node utils/combined_json_to_abi_and_bin.js ../deployments/sepolia/AnytypeResolver.json
	abigen --bin contract.bin --abi contract.abi --pkg anytype_crypto --type AnytypeResolver --out anytype_crypto/anytype_resolver_stub.go
	rm contract.bin contract.abi

# requires Go stubs generated from *.sol files
anytype_crypto:\
    anytype_crypto/ens_registry_stub.go\
    anytype_crypto/name_wrapper_stub.go\
    anytype_crypto/anytype_resolver_stub.go

# Build everything
.PHONY: all
all: pb anytype_crypto

# Run a gRPC server
.PHONY: run-server
run-server: anytype_crypto
	GRPC_PORT=$(PORT)\
    GETH_URL=$(GETH_URL)\
    CONTRACT_REG_ADDR=$(CONTRACT_REG_ADDR)\
    CONTRACT_NW_ADDR=$(CONTRACT_NW_ADDR)\
    CONTRACT_RESOLVER_ADDR=$(CONTRACT_RESOLVER_ADDR)\
    go run main.go

# Run a test client that connects to server
.PHONY: is-name-avail
is-name-avail:
	grpcurl -plaintext -d '{"fullName": "hello.any"}' localhost:8080 Anyns/IsNameAvailable

# Print a helpful description of the gRPC interface
.PHONY: describe
describe:
	grpcurl -plaintext localhost:$(PORT) describe Anyns

