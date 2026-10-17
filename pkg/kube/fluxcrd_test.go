package kube_test

import (
	"errors"
	"io"
	"os"
	"reflect"
	"sort"
	"testing"

	"gopkg.in/yaml.v3"
	"k8s.io/apimachinery/pkg/runtime/schema"

	"github.com/zazathomas/weave-gitops/core/server"
	pb "github.com/zazathomas/weave-gitops/pkg/api/core"
	"github.com/zazathomas/weave-gitops/pkg/kube"
)

// fluxCRDPath is the CRD bundle generated from the Flux release pinned in the
// Makefile via `make download-test-crds`. It is the source of truth for the set
// of Flux CRDs this app is expected to support.
const fluxCRDPath = "../../tools/testcrds/flux.yaml"

type crdDocument struct {
	Kind string `yaml:"kind"`
	Spec struct {
		Group string `yaml:"group"`
		Names struct {
			Kind string `yaml:"kind"`
		} `yaml:"names"`
	} `yaml:"spec"`
}

// fluxCRDKinds returns the Kind of every CustomResourceDefinition in the pinned
// Flux release, sorted for deterministic failures.
func fluxCRDKinds(t *testing.T) []string {
	t.Helper()

	f, err := os.Open(fluxCRDPath)
	if err != nil {
		t.Fatalf("could not open %s: %v", fluxCRDPath, err)
	}
	defer f.Close()

	decoder := yaml.NewDecoder(f)

	var kinds []string
	for {
		var doc crdDocument
		if err := decoder.Decode(&doc); err != nil {
			if errors.Is(err, io.EOF) {
				break
			}
			t.Fatalf("could not decode %s: %v", fluxCRDPath, err)
		}
		if doc.Kind == "CustomResourceDefinition" && doc.Spec.Names.Kind != "" {
			kinds = append(kinds, doc.Spec.Names.Kind)
		}
	}

	if len(kinds) == 0 {
		t.Fatalf("no CustomResourceDefinition documents found in %s", fluxCRDPath)
	}

	sort.Strings(kinds)

	return kinds
}

// TestFluxCRDsSupported asserts that every CRD shipped by the pinned Flux
// release can actually be served by this app: it must be known to the API
// scheme, resolvable through the primary kinds lookup used by ListObjects and
// GetObject, and present in the Core API Kind enum that the UI switch statements
// and route lookups depend on.
func TestFluxCRDsSupported(t *testing.T) {
	kinds := fluxCRDKinds(t)

	scheme, err := kube.CreateScheme()
	if err != nil {
		t.Fatalf("could not create scheme: %v", err)
	}

	primaryKinds, err := server.DefaultPrimaryKinds()
	if err != nil {
		t.Fatalf("could not build primary kinds: %v", err)
	}

	known := scheme.AllKnownTypes()

	for _, kind := range kinds {
		t.Run(kind, func(t *testing.T) {
			if !hasKindInScheme(known, kind) {
				t.Errorf("%s is missing from the API scheme registered by kube.CreateScheme()", kind)
			}

			gvk, err := primaryKinds.Lookup(kind)
			if err != nil {
				t.Errorf("primary kinds could not resolve %s: %v", kind, err)
			} else if gvk.Kind != kind {
				t.Errorf("primary kinds resolved %s to unexpected kind %s", kind, gvk.Kind)
			}

			if _, ok := pb.Kind_value[kind]; !ok {
				t.Errorf("%s is missing from the Core API Kind enum (api/core/types.proto); regenerate with `make proto`", kind)
			}
		})
	}

	t.Logf("verified %d Flux CRDs: %v", len(kinds), kinds)
}

func hasKindInScheme(known map[schema.GroupVersionKind]reflect.Type, kind string) bool {
	for gvk := range known {
		if gvk.Kind == kind {
			return true
		}
	}

	return false
}
