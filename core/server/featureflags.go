package server

import (
	"context"

	pb "github.com/zazathomas/weave-gitops/pkg/api/core"
	"github.com/zazathomas/weave-gitops/pkg/featureflags"
)

func (cs *coreServer) GetFeatureFlags(ctx context.Context, msg *pb.GetFeatureFlagsRequest) (*pb.GetFeatureFlagsResponse, error) {
	return &pb.GetFeatureFlagsResponse{
		Flags: featureflags.GetFlags(),
	}, nil
}
