import * as React from "react";
import type { JSX } from "react";
import styled from "styled-components";
import { useFeatureFlags } from "../hooks/featureflags";
import { Kind } from "../lib/api/core/types.pb";
import { ArtifactGenerator } from "../lib/objects";
import ClusterDashboardLink from "./ClusterDashboardLink";
import { InfoField } from "./InfoList";
import SourceDetail from "./SourceDetail";

type Props = {
  className?: string;
  artifactGenerator: ArtifactGenerator;
  customActions?: JSX.Element[];
};

function ArtifactGeneratorDetail({
  className,
  artifactGenerator,
  customActions,
}: Props) {
  const { isFlagEnabled } = useFeatureFlags();

  const tenancyInfo: InfoField[] =
    isFlagEnabled("WEAVE_GITOPS_FEATURE_TENANCY") && artifactGenerator.tenant
      ? [["Tenant", artifactGenerator.tenant]]
      : [];
  const clusterInfo: InfoField[] = isFlagEnabled("WEAVE_GITOPS_FEATURE_CLUSTER")
    ? [
        [
          "Cluster",
          <ClusterDashboardLink
            key={artifactGenerator.uid}
            clusterName={artifactGenerator.clusterName}
          />,
        ],
      ]
    : [];

  const sources =
    artifactGenerator.sources
      .map((s) => `${s.alias}=${s.kind}/${s.name}`)
      .join(", ") || "-";
  const outputs =
    artifactGenerator.outputArtifacts.map((a) => a.name).join(", ") || "-";

  return (
    <SourceDetail
      className={className}
      type={Kind.ArtifactGenerator}
      source={artifactGenerator}
      customActions={customActions}
      info={[
        ["Kind", Kind.ArtifactGenerator],
        ["Sources", sources],
        ["Path Pattern", artifactGenerator.pathPattern || "-"],
        ["Output Artifacts", outputs],
        ...clusterInfo,
        ["Namespace", artifactGenerator.namespace],
        ...tenancyInfo,
      ]}
    />
  );
}

export default styled(ArtifactGeneratorDetail).attrs({
  className: ArtifactGeneratorDetail.name,
})``;
