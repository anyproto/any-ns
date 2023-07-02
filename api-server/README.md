# AnyNS API Server

This is the API server for AnyNS

## Build and run a gRPC server

This will build a gRPC server that can be used to call contract's functions from your Golang application

Build:

- `make prereqs-for-mac`
- `make all`

Run:

- Set correct CONTRACT_ADDR variable (it was deployed above in the **truffle migrate** step)
- `GRPC_PORT=$(PORT) GETH_URL=$(GETH_URL) CONTRACT_ADDR=$(CONTRACT_ADDR) go run main.go`
  or
- `make run-server`

Now use your server:

- `grpcurl -plaintext localhost:$(PORT) AnytypeBootnodesList/GetBootnodes`
  or
- `make get-nodes`
