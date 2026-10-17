# Weave GitOps

[![CI](https://github.com/zazathomas/weave-gitops/actions/workflows/ci.yaml/badge.svg)](https://github.com/zazathomas/weave-gitops/actions/workflows/ci.yaml)
[![LICENSE](https://img.shields.io/github/license/zazathomas/weave-gitops)](LICENSE)

A web UI for [Flux](https://fluxcd.io/flux/): browse your GitOps resources, inspect
reconciled objects, and trigger or suspend reconciliations. This is a maintained fork of
[weaveworks/weave-gitops](https://github.com/weaveworks/weave-gitops), trimmed down to the
dashboard server and its Helm chart.

## Install

Flux has to be running in the cluster already.

```sh
helm upgrade --install weave-gitops \
  oci://ghcr.io/zazathomas/weave-gitops/charts/weave-gitops \
  --version 0.40.0 \
  --namespace flux-system
```

```sh
kubectl get secret cluster-user-auth -n flux-system -o jsonpath='{.data.password}' | base64 -d
kubectl port-forward -n flux-system svc/weave-gitops 9001:9001
```

Then open <http://localhost:9001>. See the [chart README](charts/weave-gitops/README.md)
for authentication, TLS, ingress, metrics and multi-cluster setup.

Image: `ghcr.io/zazathomas/weave-gitops/gitops-server:v0.40.0`
Chart: `oci://ghcr.io/zazathomas/weave-gitops/charts/weave-gitops`

## Flux compatibility

The server speaks to Flux through the Kubernetes API and picks, per cluster, the newest
API version that cluster actually serves. That means one build works across Flux
releases:

| Flux | Supported kinds |
| --- | --- |
| 2.9.x | all 15, including `ArtifactGenerator` |
| 2.7.x | 14 (no `ArtifactGenerator`) |
| 2.2 – 2.6 | the kinds those releases ship |
| 2.0.x | 13 — old API versions such as `Bucket` `v1beta2` and `HelmRelease` `v2beta1` are negotiated automatically |

Kinds that a cluster does not install are simply shown as empty rather than as an error.
The CRD bundle the test suite runs against is pinned by `FLUX_VERSION` in the `Makefile`
and lives in `tools/testcrds/flux.yaml`.

## Repository layout

| Path | Contents |
| --- | --- |
| `cmd/gitops-server` | Server entrypoint |
| `core/` | Server-side logic: object listing, inventories, clusters, auth |
| `pkg/` | Supporting packages: Kubernetes helpers, gRPC API, auth |
| `api/` | Protobuf definitions and the generated OpenAPI spec |
| `ui/` | React dashboard |
| `charts/weave-gitops` | Helm chart |
| `tools/testcrds` | Flux CRDs used by the envtest suite |

## Development

Requires Go 1.26, Node 22.12 (`nvm use`), Yarn 4 (bundled in `.yarn/releases`) and
`helm` for chart work.

```sh
make unit-tests     # Go suite, runs against envtest (downloads the 1.32 apiserver)
make ui-test        # UI tests
make lint           # golangci-lint + protolint
make ui-lint        # eslint + tsc
make proto          # regenerate protobuf/gateway/TypeScript clients
make ui             # build the UI into bin/dist
make gitops-server  # build bin/gitops-server
make helm-lint      # lint the chart (helm-template / chart-package also available)
```

`make unit-tests` needs the `flux` CLI on `PATH`; the CRD bundle is already committed.

## Releases

`.github/workflows/release.yaml` bumps `Chart.yaml`, `values.yaml` and `package.json`,
tags the commit and creates a GitHub release. The tag push triggers
`.github/workflows/ci.yaml`, which builds and publishes the image and chart to GHCR with
SBOM, provenance and cosign signatures.

## Licence and provenance

Apache 2.0, see [LICENSE](LICENSE). Derived from Weaveworks' Weave GitOps; the original
source and copyright notices are retained.
