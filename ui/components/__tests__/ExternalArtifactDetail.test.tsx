import { render, screen, waitFor } from "@testing-library/react";
import * as React from "react";
import { ExternalArtifact } from "../../lib/objects";
import {
  createCoreMockClient,
  withContext,
  withTheme,
} from "../../lib/test-utils";
import ExternalArtifactDetail from "../ExternalArtifactDetail";

describe("ExternalArtifactDetail", () => {
  const responseObject = {
    payload: JSON.stringify({
      apiVersion: "source.toolkit.fluxcd.io/v1",
      kind: "ExternalArtifact",
      metadata: {
        name: "generated-app",
        namespace: "flux-system",
        uid: "ea-1",
      },
      spec: {
        sourceRef: {
          kind: "OCIRepository",
          name: "podinfo-oci",
        },
      },
      status: {
        artifact: {
          revision: "sha256:abc123",
          url: "http://source-controller.flux-system.svc.cluster.local./externalartifact/flux-system/generated-app/abc.tar.gz",
          lastUpdateTime: "2026-10-01T10:00:00Z",
        },
        conditions: [
          {
            type: "Ready",
            status: "True",
            reason: "Succeeded",
            message: "stored artifact",
            lastTransitionTime: "2026-10-01T10:00:00Z",
          },
        ],
      },
    }),
    clusterName: "Default",
    tenant: "",
    uid: "ea-1",
    inventory: [],
    info: "",
    health: null,
  };

  const externalArtifact = new ExternalArtifact(responseObject);

  it("renders the wrapped source and revision", async () => {
    const client = createCoreMockClient({
      ListObjects: () => ({ objects: [], errors: [] }),
    });

    render(
      withTheme(
        withContext(
          <ExternalArtifactDetail externalArtifact={externalArtifact} />,
          "/details",
          { api: client },
        ),
      ),
    );

    await waitFor(() => {
      expect(screen.getByText("OCIRepository/podinfo-oci")).toBeTruthy();
      expect(screen.getByText("sha256:abc123")).toBeTruthy();
    });
  });
});
