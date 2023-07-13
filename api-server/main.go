package main

import (
	"context"
	"log"
	"net"
	"os"

	pb "github.com/anytype/anyns_api_server/pb/anyns_api_server"
	"github.com/joho/godotenv"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
)

type server struct {
	pb.UnimplementedAnynsServer
}

func (s *server) IsNameAvailable(ctx context.Context, in *pb.NameAvailableRequest) (*pb.NameAvailableResponse, error) {
	log.Printf("Received request: %v", in.ProtoReflect().Descriptor().FullName())

	return isNameAvailable(ctx, in)
}

func (s *server) NameRegister(ctx context.Context, in *pb.NameRegisterRequest) (*pb.OperationResponse, error) {
	log.Printf("Received request: %v", in.ProtoReflect().Descriptor().FullName())

	// TODO: make non-blocking and save to queue
	var resp pb.OperationResponse
	// TODO: increase the operation ID
	resp.OperationId = 1

	err := nameRegister(ctx, in)

	if err == nil {
		resp.OperationState = pb.OperationState_Completed
	} else {
		resp.OperationState = pb.OperationState_Error
	}

	return &resp, err
}

func (s *server) GetOperationStatus(ctx context.Context, in *pb.GetOperationStatusRequest) (*pb.OperationResponse, error) {
	log.Printf("Received request: %v", in.ProtoReflect().Descriptor().FullName())

	// TODO: get status from the queue
	// for now, just return completed
	var resp pb.OperationResponse
	resp.OperationId = in.OperationId
	resp.OperationState = pb.OperationState_Completed

	return &resp, nil
}

func main() {
	godotenv.Load()

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
