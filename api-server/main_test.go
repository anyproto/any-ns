package main

import (
	"testing"

	"github.com/anyproto/any-sync/commonspace/object/accountdata"
	pb "github.com/anytype/anyns_api_server/pb/anyns_api_server"
	"github.com/stretchr/testify/require"
)

// test NameRegisterSigned
func TestVerifyIdentity_IdentityIsOK(t *testing.T) {
	var in pb.NameRegisterSignedRequest

	accountKeys, err := accountdata.NewRandom()
	require.NoError(t, err)

	identity, err := accountKeys.SignKey.GetPublic().Marshall()
	require.NoError(t, err)

	// pack
	nrr := pb.NameRegisterRequest{
		OwnerAnyAddress: string(identity),
		OwnerEthAddress: "0x10d5B0e279E5E4c1d1Df5F57DFB7E84813920a51",
		FullName:        "hello.any",
		SpaceId:         "",
	}

	marshalled, err := nrr.Marshal()
	require.NoError(t, err)

	in.Payload = marshalled
	in.Signature, err = accountKeys.SignKey.Sign(in.Payload)
	require.NoError(t, err)

	// run
	err = VerifyIdentity(&in, nrr.OwnerAnyAddress)
	require.NoError(t, err)
}

func TestVerifyIdentity_IdentityIsBad(t *testing.T) {
	var in pb.NameRegisterSignedRequest

	accountKeys, err := accountdata.NewRandom()
	require.NoError(t, err)

	accountKeys2, err := accountdata.NewRandom()
	require.NoError(t, err)

	identity, err := accountKeys.SignKey.GetPublic().Marshall()
	identity2, err := accountKeys2.SignKey.GetPublic().Marshall()
	require.NoError(t, err)

	// pack
	nrr := pb.NameRegisterRequest{
		// DIFFERENT!
		OwnerAnyAddress: string(identity2),
		OwnerEthAddress: "0x10d5B0e279E5E4c1d1Df5F57DFB7E84813920a51",
		FullName:        "hello.any",
		SpaceId:         "",
	}

	marshalled, err := nrr.Marshal()
	require.NoError(t, err)

	in.Payload = marshalled
	in.Signature, err = accountKeys.SignKey.Sign(in.Payload)
	require.NoError(t, err)

	// run
	err = VerifyIdentity(&in, nrr.OwnerAnyAddress)
	require.Error(t, err)
}
