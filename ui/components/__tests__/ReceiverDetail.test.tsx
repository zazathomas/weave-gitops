import { render, screen, waitFor } from "@testing-library/react";
import * as React from "react";
import { Receiver } from "../../lib/objects";
import {
  createCoreMockClient,
  withContext,
  withTheme,
} from "../../lib/test-utils";
import ReceiverDetail from "../ReceiverDetail";

describe("ReceiverDetail", () => {
  const responseObject = {
    payload: JSON.stringify({
      apiVersion: "notification.toolkit.fluxcd.io/v1",
      kind: "Receiver",
      metadata: {
        name: "github-receiver",
        namespace: "flux-system",
        uid: "r-1",
      },
      spec: {
        type: "github",
        interval: "5m",
        secretRef: { name: "receiver-token" },
        resources: [{ kind: "GitRepository", name: "podinfo" }],
      },
      status: {
        webhookPath: "/hook/abcdef123456",
        conditions: [
          {
            type: "Ready",
            status: "True",
            reason: "Succeeded",
            message: "receiver ready",
            lastTransitionTime: "2026-10-01T10:00:00Z",
          },
        ],
      },
    }),
    clusterName: "Default",
    tenant: "",
    uid: "r-1",
    inventory: [],
    info: "",
    health: null,
  };

  const receiver = new Receiver(responseObject);

  it("renders the receiver type, webhook path and resources", async () => {
    const client = createCoreMockClient({
      ListObjects: () => ({ objects: [], errors: [] }),
    });

    render(
      withTheme(
        withContext(<ReceiverDetail receiver={receiver} />, "/details", {
          api: client,
        }),
      ),
    );

    await waitFor(() => {
      expect(screen.getByText("github")).toBeTruthy();
      expect(screen.getByText("/hook/abcdef123456")).toBeTruthy();
      expect(screen.getByText("GitRepository/podinfo")).toBeTruthy();
      expect(screen.getByText("receiver-token")).toBeTruthy();
    });
  });
});
