import { render, screen, waitFor } from "@testing-library/react";
import * as React from "react";
import { ArtifactGenerator } from "../../lib/objects";
import {
  createCoreMockClient,
  withContext,
  withTheme,
} from "../../lib/test-utils";
import ArtifactGeneratorDetail from "../ArtifactGeneratorDetail";

describe("ArtifactGeneratorDetail", () => {
  const responseObject = {
    payload: JSON.stringify({
      apiVersion: "source.extensions.fluxcd.io/v1beta1",
      kind: "ArtifactGenerator",
      metadata: {
        name: "podinfo-generator",
        namespace: "flux-system",
        uid: "ag-1",
      },
      spec: {
        sources: [
          {
            alias: "app",
            kind: "OCIRepository",
            name: "podinfo-oci",
          },
        ],
        pathPattern: "apps/{app}",
        artifacts: [{ name: "podinfo" }],
      },
      status: {
        conditions: [
          {
            type: "Ready",
            status: "True",
            reason: "Succeeded",
            message: "generated artifacts",
            lastTransitionTime: "2026-10-01T10:00:00Z",
          },
        ],
      },
    }),
    clusterName: "Default",
    tenant: "",
    uid: "ag-1",
    inventory: [],
    info: "",
    health: null,
  };

  const artifactGenerator = new ArtifactGenerator(responseObject);

  it("renders the sources, path pattern and output artifacts", async () => {
    const client = createCoreMockClient({
      ListObjects: () => ({ objects: [], errors: [] }),
    });

    render(
      withTheme(
        withContext(
          <ArtifactGeneratorDetail artifactGenerator={artifactGenerator} />,
          "/details",
          { api: client },
        ),
      ),
    );

    await waitFor(() => {
      expect(screen.getByText("app=OCIRepository/podinfo-oci")).toBeTruthy();
      expect(screen.getByText("apps/{app}")).toBeTruthy();
      expect(screen.getByText("podinfo")).toBeTruthy();
    });
    // The component tree is heavy enough that 5s is tight when the suite runs in
    // parallel, which showed up as an intermittent timeout.
  }, 15000);
});
