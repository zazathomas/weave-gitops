package server

import (
	"context"

	"k8s.io/apimachinery/pkg/runtime/schema"
)

// servedGVK returns the version of preferred that the cluster actually serves.
//
// Flux promotes API versions between releases, so the version this build
// compiles against may not exist on an older cluster: Flux 2.0 serves Bucket,
// HelmChart, HelmRepository and OCIRepository only as v1beta2, HelmRelease only
// as v2beta1, and Alert and Provider only up to v1beta2. Asking such a cluster
// for the newer version fails with "no matches for kind", which is why we ask
// the cluster's CRDs what they serve and use the newest of those instead.
//
// preferred is returned unchanged when the kind is not installed on the cluster
// or is not known to the CRD cache yet, so behaviour is unchanged for current
// Flux releases.
func (cs *coreServer) servedGVK(ctx context.Context, clusterName string, preferred schema.GroupVersionKind) schema.GroupVersionKind {
	if cs.crd == nil {
		return preferred
	}

	var crdVersions []string

	for _, crd := range cs.crd.CRDs(ctx, clusterName) {
		if crd.Spec.Group != preferred.Group || crd.Spec.Names.Kind != preferred.Kind {
			continue
		}

		for _, version := range crd.Spec.Versions {
			if version.Served {
				crdVersions = append(crdVersions, version.Name)
			}
		}

		break
	}

	version := newestVersion(crdVersions)
	if version == "" {
		return preferred
	}

	preferred.Version = version

	return preferred
}

// newestVersion picks the highest ranked version from a list of API versions,
// using the same ranking as PrimaryKinds. It returns "" when there is nothing
// to choose from.
func newestVersion(versions []string) string {
	best := ""

	bestRank := -1

	for _, version := range versions {
		rank, err := versionRank(version)
		if err != nil || rank <= bestRank {
			continue
		}

		best, bestRank = version, rank
	}

	return best
}
