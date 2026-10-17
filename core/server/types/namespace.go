package types

import (
	corev1 "k8s.io/api/core/v1"

	pb "github.com/zazathomas/weave-gitops/pkg/api/core"
)

func NamespaceToProto(ns corev1.Namespace, clusterName string) *pb.Namespace {
	return &pb.Namespace{
		ClusterName: clusterName,
		Name:        ns.GetName(),
		Status:      ns.Status.String(),
		Annotations: ns.GetAnnotations(),
		Labels:      ns.GetLabels(),
	}
}
