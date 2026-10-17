package server

import (
	"errors"
	"fmt"
	"testing"

	. "github.com/onsi/gomega"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/api/meta"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

// ListObjects is called for every kind the UI knows about, including kinds whose
// CRD is not installed on the target cluster. A missing CRD must not turn into a
// user-visible error, while genuine failures still must.
func TestSkipListError(t *testing.T) {
	g := NewWithT(t)

	noKind := &meta.NoKindMatchError{
		GroupKind:        schema.GroupKind{Group: "source.extensions.fluxcd.io", Kind: "ArtifactGenerator"},
		SearchedVersions: []string{"v1beta1"},
	}

	g.Expect(skipListError(noKind)).To(BeTrue(),
		"a kind whose CRD is absent is an empty list, not an error")
	g.Expect(skipListError(fmt.Errorf("cluster Default: %w", noKind))).To(BeTrue(),
		"clustered list errors are wrapped, and must still be recognised")
	g.Expect(skipListError(&meta.NoResourceMatchError{
		PartialResource: schema.GroupVersionResource{Group: "source.toolkit.fluxcd.io", Version: "v1", Resource: "buckets"},
	})).To(BeTrue(), "an unserved resource is treated the same way")

	g.Expect(skipListError(nil)).To(BeFalse())
	g.Expect(skipListError(errors.New("dial tcp: connection refused"))).To(BeFalse(),
		"real failures must still be surfaced")
	g.Expect(skipListError(apierrors.NewForbidden(
		schema.GroupResource{Group: "source.toolkit.fluxcd.io", Resource: "buckets"}, "podinfo", errors.New("denied"),
	))).To(BeFalse(), "permission errors must still be surfaced")
}
