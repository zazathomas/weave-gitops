import * as React from "react";
import type { JSX } from "react";
import styled from "styled-components";
import { useFeatureFlags } from "../hooks/featureflags";
import { Kind } from "../lib/api/core/types.pb";
import { ExternalArtifact } from "../lib/objects";
import ClusterDashboardLink from "./ClusterDashboardLink";
import { InfoField } from "./InfoList";
import SourceDetail from "./SourceDetail";
import Timestamp from "./Timestamp";

type Props = {
  className?: string;
  externalArtifact: ExternalArtifact;
  customActions?: JSX.Element[];
};

function ExternalArtifactDetail({
  className,
  externalArtifact,
  customActions,
}: Props) {
  const { isFlagEnabled } = useFeatureFlags();

  const tenancyInfo: InfoField[] =
    isFlagEnabled("WEAVE_GITOPS_FEATURE_TENANCY") && externalArtifact.tenant
      ? [["Tenant", externalArtifact.tenant]]
      : [];
  const clusterInfo: InfoField[] = isFlagEnabled("WEAVE_GITOPS_FEATURE_CLUSTER")
    ? [
        [
          "Cluster",
          <ClusterDashboardLink
            key={externalArtifact.uid}
            clusterName={externalArtifact.clusterName}
          />,
        ],
      ]
    : [];

  const sourceRef = externalArtifact.sourceRef;

  return (
    <SourceDetail
      className={className}
      type={Kind.ExternalArtifact}
      source={externalArtifact}
      customActions={customActions}
      info={[
        ["Kind", Kind.ExternalArtifact],
        ["Source", sourceRef ? `${sourceRef.kind}/${sourceRef.name}` : "-"],
        ["Revision", externalArtifact.revision || "-"],
        [
          "Last Updated",
          externalArtifact.lastUpdatedAt ? (
            <Timestamp
              key={externalArtifact.uid}
              time={externalArtifact.lastUpdatedAt}
            />
          ) : (
            "-"
          ),
        ],
        ...clusterInfo,
        ["Namespace", externalArtifact.namespace],
        ...tenancyInfo,
      ]}
    />
  );
}

export default styled(ExternalArtifactDetail).attrs({
  className: ExternalArtifactDetail.name,
})``;
