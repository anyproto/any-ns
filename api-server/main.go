package main

import (
	"context"
	"errors"
	"log"
	"net"
	"os"

	"github.com/anyproto/any-sync/util/crypto"
	pb "github.com/anytype/anyns_api_server/pb/anyns_api_server"
	"github.com/gogo/protobuf/proto"
	"github.com/joho/godotenv"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
)

type server struct {
	pb.UnimplementedAnynsServer
}

func (s *server) IsNameAvailable(ctx context.Context, in *pb.NameAvailableRequest) (*pb.NameAvailableResponse, error) {
	//log.Printf("Received request: %v", in.ProtoReflect().Descriptor().FullName())

	return isNameAvailable(ctx, in)
}

func (s *server) NameRegister(ctx context.Context, in *pb.NameRegisterRequest) (*pb.OperationResponse, error) {
	//log.Printf("Received request: %v", in.ProtoReflect().Descriptor().FullName())

	var resp pb.OperationResponse // TODO: make non-blocking and save to queue
	resp.OperationId = 1          // TODO: increase the operation ID

	err := nameRegister(ctx, in)

	if err != nil {
		log.Printf("Can not register name: %v", err)
		resp.OperationState = pb.OperationState_Error
		return &resp, err
	}

	resp.OperationState = pb.OperationState_Completed
	return &resp, err
}

func VerifyIdentity(in *pb.NameRegisterSignedRequest, ownerAnyAddress string) error {
	// convert ownerAnyAddress to array of bytes
	arr := []byte(ownerAnyAddress)

	ownerAnyIdentity, err := crypto.UnmarshalEd25519PublicKeyProto(arr)
	if err != nil {
		return err
	}

	res, err := ownerAnyIdentity.Verify(in.Payload, in.Signature)
	if err != nil || !res {
		return errors.New("signature is different")
	}

	// identity is OK
	return nil
}

func (s *server) NameRegisterSigned(ctx context.Context, in *pb.NameRegisterSignedRequest) (*pb.OperationResponse, error) {
	//log.Printf("Received request: %v", in.ProtoReflect().Descriptor().FullName())

	var resp pb.OperationResponse // TODO: make non-blocking and save to queue
	resp.OperationId = 1          // TODO: increase the operation ID

	// 1 - unmarshal the signed request
	var nrr pb.NameRegisterRequest
	err := proto.Unmarshal(in.Payload, &nrr)
	if err != nil {
		resp.OperationState = pb.OperationState_Error
		log.Printf("Can not unmarshal NameRegisterRequest: %v", err)
		return &resp, err
	}

	// 2 - check signature
	err = VerifyIdentity(in, nrr.OwnerAnyAddress)
	if err != nil {
		resp.OperationState = pb.OperationState_Error
		log.Printf("Identity is different: %v", err)
	}

	// 3 - finally call function
	err = nameRegister(ctx, &nrr)

	if err != nil {
		log.Printf("Can not register name: %v", err)
		resp.OperationState = pb.OperationState_Error
		return &resp, err
	}

	resp.OperationState = pb.OperationState_Completed
	return &resp, err
}

func (s *server) GetOperationStatus(ctx context.Context, in *pb.GetOperationStatusRequest) (*pb.OperationResponse, error) {
	//log.Printf("Received request: %v", in.ProtoReflect().Descriptor().FullName())

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
