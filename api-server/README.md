# AnyNS API Server

This is the API server for AnyNS smart contracts. You can call smart contracts directly or by using _this_ gRPC service. Please see the top-level README file for more information about AnyNS.

## Build and run a gRPC server

This will build a gRPC server that can be used to call contract's functions:

- `make prereqs-for-mac`
- `make all`

Run:

- `make run-server`

Now use your server:

- `make is-name-avail`
