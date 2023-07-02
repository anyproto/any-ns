########### Vars:
PORT=8080
GETH_URL="https://sepolia.infura.io/v3/68c55936b8534264801fa4bc313ff26f" 
# TODO: read from ../deployments/sepolia folder
CONTRACT_REG_ADDR="0xc0D3c96aE923Da6b45E6d4c21a0424730a20BCA9" 

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

# requires Go stubs generated from *.sol files
api_server: anytype_crypto/ens_registry_stub.go

.PHONY: all
all: pb api_server

# run gRPC server
.PHONY: run-server
run-server: api_server
	GRPC_PORT=$(PORT) GETH_URL=$(GETH_URL) CONTRACT_REG_ADDR=$(CONTRACT_REG_ADDR) go run main.go

