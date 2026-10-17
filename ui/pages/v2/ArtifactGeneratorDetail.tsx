import * as React from "react";
import styled from "styled-components";
import ArtifactGeneratorDetailComponent from "../../components/ArtifactGeneratorDetail";
import Page from "../../components/Page";
import { useGetObject } from "../../hooks/objects";
import { Kind } from "../../lib/api/core/types.pb";
import { ArtifactGenerator } from "../../lib/objects";

type Props = {
  className?: string;
  name?: string;
  namespace?: string;
  clusterName?: string;
};

function ArtifactGeneratorDetail({
  className,
  name,
  namespace,
  clusterName,
}: Props) {
  const {
    data: artifactGenerator,
    isLoading,
    error,
  } = useGetObject<ArtifactGenerator>(
    name,
    namespace,
    Kind.ArtifactGenerator,
    clusterName,
  );
  return (
    <Page
      className={className}
      loading={isLoading}
      error={error}
      path={[{ label: name }]}
    >
      <ArtifactGeneratorDetailComponent artifactGenerator={artifactGenerator} />
    </Page>
  );
}

export default styled(ArtifactGeneratorDetail).attrs({
  className: ArtifactGeneratorDetail.name,
})``;
