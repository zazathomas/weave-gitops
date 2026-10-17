package server

import (
	"context"
	"testing"

	. "github.com/onsi/gomega"
	v1 "k8s.io/apiextensions-apiserver/pkg/apis/apiextensions/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

type stubCRDFetcher struct {
	crds map[string][]v1.CustomResourceDefinition
}

func (s stubCRDFetcher) IsAvailable(context.Context, string, string) bool { return false }

func (s stubCRDFetcher) IsAvailableOnClusters(context.Context, string) map[string]bool { return nil }

func (s stubCRDFetcher) UpdateCRDList(context.Context) {}

func (s stubCRDFetcher) CRDs(_ context.Context, clusterName string) []v1.CustomResourceDefinition {
	return s.crds[clusterName]
}

// crdWithVersions builds a CRD serving versions, with the last one as the
// storage version.
func crdWithVersions(group, kind string, served ...string) v1.CustomResourceDefinition {
	c := v1.CustomResourceDefinition{}
	c.Spec.Group = group
	c.Spec.Names.Kind = kind

	for i, v := range served {
		c.Spec.Versions = append(c.Spec.Versions, v1.CustomResourceDefinitionVersion{
			Name:    v,
			Served:  true,
			Storage: i == len(served)-1,
		})
	}

	return c
}

func gvk(group, version, kind string) schema.GroupVersionKind {
	return schema.GroupVersionKind{Group: group, Version: version, Kind: kind}
}

// Flux promotes API versions between releases, so a cluster running an older
// Flux serves versions this build does not ask for by default. Listing or
// getting objects has to use a version the cluster actually has.
func TestServedGVK(t *testing.T) {
	const (
		sourceGroup = "source.toolkit.fluxcd.io"
		helmGroup   = "helm.toolkit.fluxcd.io"
		notifGroup  = "notification.toolkit.fluxcd.io"
	)

	tests := []struct {
		name      string
		preferred schema.GroupVersionKind
		crds      []v1.CustomResourceDefinition
		expected  schema.GroupVersionKind
	}{
		{
			name:      "cluster serves the version we prefer",
			preferred: gvk(sourceGroup, "v1", "Bucket"),
			crds:      []v1.CustomResourceDefinition{crdWithVersions(sourceGroup, "Bucket", "v1beta1", "v1beta2", "v1")},
			expected:  gvk(sourceGroup, "v1", "Bucket"),
		},
		{
			name:      "Flux 2.0 serves Bucket only as v1beta2",
			preferred: gvk(sourceGroup, "v1", "Bucket"),
			crds:      []v1.CustomResourceDefinition{crdWithVersions(sourceGroup, "Bucket", "v1beta1", "v1beta2")},
			expected:  gvk(sourceGroup, "v1beta2", "Bucket"),
		},
		{
			name:      "Flux 2.0 serves OCIRepository only as v1beta2",
			preferred: gvk(sourceGroup, "v1", "OCIRepository"),
			crds:      []v1.CustomResourceDefinition{crdWithVersions(sourceGroup, "OCIRepository", "v1beta2")},
			expected:  gvk(sourceGroup, "v1beta2", "OCIRepository"),
		},
		{
			name:      "Flux 2.0 serves HelmRelease only as v2beta1",
			preferred: gvk(helmGroup, "v2", "HelmRelease"),
			crds:      []v1.CustomResourceDefinition{crdWithVersions(helmGroup, "HelmRelease", "v2beta1")},
			expected:  gvk(helmGroup, "v2beta1", "HelmRelease"),
		},
		{
			name:      "Alert is not served as v1beta3 before Flux 2.3",
			preferred: gvk(notifGroup, "v1beta3", "Alert"),
			crds:      []v1.CustomResourceDefinition{crdWithVersions(notifGroup, "Alert", "v1beta1", "v1beta2")},
			expected:  gvk(notifGroup, "v1beta2", "Alert"),
		},
		{
			name:      "kind is not installed at all",
			preferred: gvk(sourceGroup, "v1beta1", "ArtifactGenerator"),
			crds:      []v1.CustomResourceDefinition{crdWithVersions(sourceGroup, "Bucket", "v1")},
			expected:  gvk(sourceGroup, "v1beta1", "ArtifactGenerator"),
		},
		{
			name:      "another group with the same kind is not confused for ours",
			preferred: gvk(sourceGroup, "v1", "Bucket"),
			crds:      []v1.CustomResourceDefinition{crdWithVersions("example.com", "Bucket", "v9")},
			expected:  gvk(sourceGroup, "v1", "Bucket"),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			g := NewWithT(t)

			cs := &coreServer{crd: stubCRDFetcher{crds: map[string][]v1.CustomResourceDefinition{"Default": tt.crds}}}

			g.Expect(cs.servedGVK(context.Background(), "Default", tt.preferred)).To(Equal(tt.expected))
		})
	}
}

func TestServedGVKWithoutCRDCache(t *testing.T) {
	g := NewWithT(t)

	preferred := gvk("source.toolkit.fluxcd.io", "v1", "Bucket")

	// Without a CRD fetcher (as in some tests) we keep the preferred version.
	g.Expect((&coreServer{}).servedGVK(context.Background(), "Default", preferred)).To(Equal(preferred))

	// Same when the cluster is unknown to the cache.
	cs := &coreServer{crd: stubCRDFetcher{}}
	g.Expect(cs.servedGVK(context.Background(), "Default", preferred)).To(Equal(preferred))
}

func TestNewestVersion(t *testing.T) {
	tests := []struct {
		versions []string
		expected string
	}{
		{[]string{}, ""},
		{[]string{"v1beta1"}, "v1beta1"},
		{[]string{"v1beta1", "v1beta2"}, "v1beta2"},
		{[]string{"v1beta2", "v1", "v1beta1"}, "v1"},
		{[]string{"v2beta1", "v1"}, "v2beta1"},
		{[]string{"v2", "v2beta2", "v2beta1"}, "v2"},
		{[]string{"garbage", "v1beta1"}, "v1beta1"},
	}

	for _, tt := range tests {
		if got := newestVersion(tt.versions); got != tt.expected {
			t.Errorf("newestVersion(%v) = %q, want %q", tt.versions, got, tt.expected)
		}
	}
}
