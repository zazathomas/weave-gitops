import * as React from "react";
import styled from "styled-components";
import ExternalArtifactDetailComponent from "../../components/ExternalArtifactDetail";
import Page from "../../components/Page";
import { useGetObject } from "../../hooks/objects";
import { Kind } from "../../lib/api/core/types.pb";
import { ExternalArtifact } from "../../lib/objects";

type Props = {
  className?: string;
  name?: string;
  namespace?: string;
  clusterName?: string;
};

function ExternalArtifactDetail({
  className,
  name,
  namespace,
  clusterName,
}: Props) {
  const {
    data: externalArtifact,
    isLoading,
    error,
  } = useGetObject<ExternalArtifact>(
    name,
    namespace,
    Kind.ExternalArtifact,
    clusterName,
  );
  return (
    <Page
      className={className}
      loading={isLoading}
      error={error}
      path={[{ label: name }]}
    >
      <ExternalArtifactDetailComponent externalArtifact={externalArtifact} />
    </Page>
  );
}

export default styled(ExternalArtifactDetail).attrs({
  className: ExternalArtifactDetail.name,
})``;
