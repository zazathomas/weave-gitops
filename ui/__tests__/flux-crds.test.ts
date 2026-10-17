import { readFileSync } from "fs";
import { loadAll } from "js-yaml";
import { convertResponse } from "../hooks/objects";
import { Kind } from "../lib/api/core/types.pb";
import { objectTypeToRoute } from "../lib/nav";
import { FluxObject } from "../lib/objects";
import { V2Routes } from "../lib/types";

type CRDDocument = {
  kind?: string;
  spec?: {
    names?: {
      kind?: string;
    };
  };
};

// The pinned Flux release's CRD bundle is the source of truth for the set of
// Flux CRDs this app is expected to support. Keeping the test tied to the file
// means it fails as soon as a Flux upgrade adds a CRD that is not supported yet.
const crdPath = `${__dirname}/../../tools/testcrds/flux.yaml`;

const fluxCRDKinds = (loadAll(readFileSync(crdPath, "utf8")) as CRDDocument[])
  .filter((doc) => doc?.kind === "CustomResourceDefinition")
  .map((doc) => doc.spec?.names?.kind)
  .filter((kind): kind is string => Boolean(kind))
  .sort();

// Kinds whose detail route is resolved through objectTypeToRoute, which is what
// the Sources and Notifications lists use to build links. The image automation
// kinds are routed by their own tables instead.
const ROUTED_KINDS: [Kind, V2Routes][] = [
  [Kind.GitRepository, V2Routes.GitRepo],
  [Kind.Bucket, V2Routes.Bucket],
  [Kind.HelmRepository, V2Routes.HelmRepo],
  [Kind.HelmChart, V2Routes.HelmChart],
  [Kind.Kustomization, V2Routes.Kustomization],
  [Kind.HelmRelease, V2Routes.HelmRelease],
  [Kind.OCIRepository, V2Routes.OCIRepository],
  [Kind.ExternalArtifact, V2Routes.ExternalArtifact],
  [Kind.ArtifactGenerator, V2Routes.ArtifactGenerator],
  [Kind.Provider, V2Routes.Provider],
  [Kind.Receiver, V2Routes.Receiver],
];

describe("Flux CRD support", () => {
  it("reads the pinned Flux CRD set", () => {
    expect(fluxCRDKinds.length).toBeGreaterThan(0);
    expect(fluxCRDKinds).toContain(Kind.ExternalArtifact);
    expect(fluxCRDKinds).toContain(Kind.Receiver);
    expect(fluxCRDKinds).toContain(Kind.ArtifactGenerator);
  });

  it("declares every Flux CRD kind in the Core API Kind enum", () => {
    const known = Object.values(Kind) as string[];
    fluxCRDKinds.forEach((kind) => {
      expect(known).toContain(kind);
    });
  });

  it("converts every Flux CRD kind into a dedicated object model", () => {
    fluxCRDKinds.forEach((kind) => {
      const object = convertResponse(kind as Kind);
      expect(object).toBeInstanceOf(FluxObject);
      expect(object.constructor).not.toBe(FluxObject);
    });
  });

  it("routes every Flux CRD kind that is linked from a list", () => {
    ROUTED_KINDS.forEach(([kind, route]) => {
      expect(objectTypeToRoute(kind)).toEqual(route);
    });
  });

  // Alert has no page of its own (it is listed on the detail page of the
  // Provider it references) and the image automation kinds are routed by their
  // own tables, so none of them go through objectTypeToRoute. Any other Flux CRD
  // appearing here means a new kind was added without a route.
  it("only leaves kinds that are routed elsewhere unhandled", () => {
    const withoutRoute = fluxCRDKinds.filter(
      (kind) => objectTypeToRoute(kind as Kind) === ("" as V2Routes),
    );
    expect(withoutRoute).toEqual([
      Kind.Alert,
      Kind.ImagePolicy,
      Kind.ImageRepository,
      Kind.ImageUpdateAutomation,
    ]);
  });
});
