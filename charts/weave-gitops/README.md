# weave-gitops Helm chart

Deploys the Weave GitOps UI server (`gitops-server`), a read-only dashboard for Flux.

Images are published to `ghcr.io/zazathomas/weave-gitops/gitops-server`, the chart to
`oci://ghcr.io/zazathomas/weave-gitops/charts/weave-gitops`.

## Install

```sh
helm upgrade --install weave-gitops \
  oci://ghcr.io/zazathomas/weave-gitops/charts/weave-gitops \
  --version 0.40.0 \
  --namespace flux-system
```

Flux must already be installed in the cluster. The chart creates the server, its
service account, RBAC and an optional local admin user.

To get the initial admin password:

```sh
kubectl get secret cluster-user-auth -n flux-system -o jsonpath='{.data.password}' | base64 -d
```

Then port-forward and open the dashboard:

```sh
kubectl port-forward -n flux-system svc/weave-gitops 9001:9001
```

## Authentication

The server reads cluster data by **impersonating** the signed-in user, so what a user
sees is bounded by that user's own RBAC. The service account's own permissions are
deliberately small: impersonate `users`/`groups`, list namespaces, list CRDs, and
optionally read the `cluster-user-auth` and `oidc-auth` secrets.

Use `adminUser` for a local user, or `oidcSecret` to delegate to an OIDC provider.

## Key values

| Value | Default | Description |
| --- | --- | --- |
| `image.repository` | `ghcr.io/zazathomas/weave-gitops/gitops-server` | Server image |
| `image.tag` | `""` | Defaults to the chart `appVersion` |
| `replicaCount` | `1` | Server replicas |
| `logLevel` | `info` | `debug`, `info`, `warn` or `error` |
| `adminUser.create` | `false` | Create a local admin user |
| `adminUser.passwordHash` | unset | bcrypt hash for that user |
| `oidcSecret.create` | `false` | Create the `oidc-auth` secret for OIDC login |
| `rbac.viewSecretsEnabled` | `true` | Allow reading the auth secrets |
| `rbac.additionalRules` | `[]` | Extra permissions, e.g. for other Flux-related CRDs |
| `service.type` / `service.port` | `ClusterIP` / `9001` | Service exposure |
| `ingress.enabled` | `false` | Create an Ingress |
| `serverTLS.enable` | `false` | Serve HTTPS from the pod |
| `metrics.enabled` | `false` | Expose Prometheus metrics on port 2112 |
| `networkPolicy.create` | `true` | Create default network policies |
| `envVars` | tenancy on | Feature flags, e.g. `WEAVE_GITOPS_FEATURE_CLUSTER` |

Values are validated by `values.schema.json`, so a typo in `logLevel` or `service.type`
fails the install instead of starting a broken server.

See `values.yaml` for the full list.

## Multiple clusters

Setting `WEAVE_GITOPS_FEATURE_CLUSTER=true` enables multi-cluster mode. Other clusters
are discovered through secrets labelled `weave.works/cluster-config=true` in the
installation namespace. For impersonation from the other clusters to work, the
`impersonate` ClusterRole created here must exist there too.

Cluster resources must be visible to the signing-in user, either through cluster-wide
permissions or through `rbac.impersonationResourceNames`.
