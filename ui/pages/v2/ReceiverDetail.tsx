import * as React from "react";
import styled from "styled-components";
import Page from "../../components/Page";
import ReceiverDetailComponent from "../../components/ReceiverDetail";
import { useGetObject } from "../../hooks/objects";
import { Kind } from "../../lib/api/core/types.pb";
import { Receiver } from "../../lib/objects";

type Props = {
  className?: string;
  name?: string;
  namespace?: string;
  clusterName?: string;
};

function ReceiverDetail({ className, name, namespace, clusterName }: Props) {
  const {
    data: receiver,
    isLoading,
    error,
  } = useGetObject<Receiver>(name, namespace, Kind.Receiver, clusterName);
  return (
    <Page
      className={className}
      loading={isLoading}
      error={error}
      path={[{ label: name }]}
    >
      <ReceiverDetailComponent receiver={receiver} />
    </Page>
  );
}

export default styled(ReceiverDetail).attrs({
  className: ReceiverDetail.name,
})``;
