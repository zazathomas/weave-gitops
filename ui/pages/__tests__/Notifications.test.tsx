import { render, screen, waitFor } from "@testing-library/react";
import * as React from "react";
import { Kind } from "../../lib/api/core/types.pb";
import {
  createCoreMockClient,
  withContext,
  withTheme,
} from "../../lib/test-utils";
import Notifications from "../v2/Notifications";

describe("Notifications", () => {
  const getVersionMock = () => {
    return {
      semver: "",
      commit: "",
      branch: "",
      buildTime: "",
      fluxVersion: "",
      kubeVersion: "",
    };
  };

  const providerResponse = {
    payload: JSON.stringify({
      apiVersion: "notification.toolkit.fluxcd.io/v1beta3",
      kind: "Provider",
      metadata: {
        name: "slack-provider",
        namespace: "flux-system",
        uid: "p-1",
      },
      spec: {
        type: "slack",
        channel: "general",
        secretRef: { name: "slack-token" },
      },
      status: {
        conditions: [
          {
            type: "Ready",
            status: "True",
            reason: "Succeeded",
            message: "provider ready",
            lastTransitionTime: "2026-10-01T10:00:00Z",
          },
        ],
      },
    }),
    clusterName: "Default",
    tenant: "",
    uid: "p-1",
  };

  const receiverResponse = {
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
  };

  const client = createCoreMockClient({
    ListObjects: ({ kind }) => {
      const fullResponse = { objects: [], errors: [] };
      if (kind === Kind.Provider) fullResponse.objects = [providerResponse];
      if (kind === Kind.Receiver) fullResponse.objects = [receiverResponse];
      return fullResponse;
    },
    GetVersion: getVersionMock,
  });

  it("lists providers", async () => {
    render(
      withTheme(withContext(<Notifications />, "/providers", { api: client })),
    );

    await waitFor(() => {
      expect(screen.getByText("Providers")).toBeTruthy();
      expect(screen.getByText("Receivers")).toBeTruthy();
      expect(screen.getByText("slack-provider")).toBeTruthy();
    });
  });

  it("lists receivers", async () => {
    render(
      withTheme(withContext(<Notifications />, "/receivers", { api: client })),
    );

    await waitFor(() => {
      expect(screen.getByText("github-receiver")).toBeTruthy();
      expect(screen.getByText("/hook/abcdef123456")).toBeTruthy();
    });
  });
});
