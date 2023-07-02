// Code generated by protoc-gen-go-grpc. DO NOT EDIT.
// versions:
// - protoc-gen-go-grpc v1.2.0
// - protoc             v3.21.7
// source: anyns_api_server.proto

package anyns_api_server

import (
	context "context"
	grpc "google.golang.org/grpc"
	codes "google.golang.org/grpc/codes"
	status "google.golang.org/grpc/status"
)

// This is a compile-time assertion to ensure that this generated file
// is compatible with the grpc package it is being compiled against.
// Requires gRPC-Go v1.32.0 or later.
const _ = grpc.SupportPackageIsVersion7

// AnynsClient is the client API for Anyns service.
//
// For semantics around ctx use and closing/ending streaming RPCs, please refer to https://pkg.go.dev/google.golang.org/grpc/?tab=doc#ClientConn.NewStream.
type AnynsClient interface {
	IsNameAvailable(ctx context.Context, in *NameAvailableRequest, opts ...grpc.CallOption) (*NameAvailableResponse, error)
}

type anynsClient struct {
	cc grpc.ClientConnInterface
}

func NewAnynsClient(cc grpc.ClientConnInterface) AnynsClient {
	return &anynsClient{cc}
}

func (c *anynsClient) IsNameAvailable(ctx context.Context, in *NameAvailableRequest, opts ...grpc.CallOption) (*NameAvailableResponse, error) {
	out := new(NameAvailableResponse)
	err := c.cc.Invoke(ctx, "/Anyns/IsNameAvailable", in, out, opts...)
	if err != nil {
		return nil, err
	}
	return out, nil
}

// AnynsServer is the server API for Anyns service.
// All implementations must embed UnimplementedAnynsServer
// for forward compatibility
type AnynsServer interface {
	IsNameAvailable(context.Context, *NameAvailableRequest) (*NameAvailableResponse, error)
	mustEmbedUnimplementedAnynsServer()
}

// UnimplementedAnynsServer must be embedded to have forward compatible implementations.
type UnimplementedAnynsServer struct {
}

func (UnimplementedAnynsServer) IsNameAvailable(context.Context, *NameAvailableRequest) (*NameAvailableResponse, error) {
	return nil, status.Errorf(codes.Unimplemented, "method IsNameAvailable not implemented")
}
func (UnimplementedAnynsServer) mustEmbedUnimplementedAnynsServer() {}

// UnsafeAnynsServer may be embedded to opt out of forward compatibility for this service.
// Use of this interface is not recommended, as added methods to AnynsServer will
// result in compilation errors.
type UnsafeAnynsServer interface {
	mustEmbedUnimplementedAnynsServer()
}

func RegisterAnynsServer(s grpc.ServiceRegistrar, srv AnynsServer) {
	s.RegisterService(&Anyns_ServiceDesc, srv)
}

func _Anyns_IsNameAvailable_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(NameAvailableRequest)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(AnynsServer).IsNameAvailable(ctx, in)
	}
	info := &grpc.UnaryServerInfo{
		Server:     srv,
		FullMethod: "/Anyns/IsNameAvailable",
	}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(AnynsServer).IsNameAvailable(ctx, req.(*NameAvailableRequest))
	}
	return interceptor(ctx, in, info, handler)
}

// Anyns_ServiceDesc is the grpc.ServiceDesc for Anyns service.
// It's only intended for direct use with grpc.RegisterService,
// and not to be introspected or modified (even as a copy)
var Anyns_ServiceDesc = grpc.ServiceDesc{
	ServiceName: "Anyns",
	HandlerType: (*AnynsServer)(nil),
	Methods: []grpc.MethodDesc{
		{
			MethodName: "IsNameAvailable",
			Handler:    _Anyns_IsNameAvailable_Handler,
		},
	},
	Streams:  []grpc.StreamDesc{},
	Metadata: "anyns_api_server.proto",
}
