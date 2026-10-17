import * as React from "react";
import styled from "styled-components";
import { useFeatureFlags } from "../hooks/featureflags";
import { formatURL } from "../lib/nav";
import { Receiver } from "../lib/objects";
import { V2Routes } from "../lib/types";
import { statusSortHelper } from "../lib/utils";
import DataTable, {
  Field,
  filterByStatusCallback,
  filterConfig,
} from "./DataTable";
import Flex from "./Flex";
import KubeStatusIndicator from "./KubeStatusIndicator";
import Link from "./Link";
import MessageBox from "./MessageBox";
import Spacer from "./Spacer";
import Text from "./Text";

type Props = {
  className?: string;
  rows: Receiver[];
};

function ReceiversTable({ className, rows }: Props) {
  const { isFlagEnabled } = useFeatureFlags();

  let initialFilterState = {
    ...filterConfig(rows, "receiverType"),
    ...filterConfig(rows, "namespace"),
    ...filterConfig(rows, "status", filterByStatusCallback),
  };
  if (isFlagEnabled("WEAVE_GITOPS_FEATURE_CLUSTER")) {
    initialFilterState = {
      ...initialFilterState,
      ...filterConfig(rows, "clusterName"),
    };
  }
  if (isFlagEnabled("WEAVE_GITOPS_FEATURE_TENANCY")) {
    initialFilterState = {
      ...initialFilterState,
      ...filterConfig(rows, "tenant"),
    };
  }

  const fields: Field[] = [
    {
      label: "Name",
      value: (r) => {
        return (
          <Link
            to={formatURL(V2Routes.Receiver, {
              name: r.name,
              namespace: r.namespace,
              clusterName: r.clusterName,
            })}
          >
            {r.name}
          </Link>
        );
      },
      sortValue: ({ name }) => name,
      textSearchable: true,
      defaultSort: true,
    },
    {
      label: "Type",
      value: "receiverType",
    },
    {
      label: "Webhook Path",
      value: "webhookPath",
    },
    {
      label: "Namespace",
      value: "namespace",
    },
    {
      label: "Status",
      value: (r: Receiver) =>
        r.conditions.length > 0 ? (
          <KubeStatusIndicator
            short
            conditions={r.conditions}
            suspended={r.suspended}
          />
        ) : null,
      sortValue: statusSortHelper,
    },
    ...(isFlagEnabled("WEAVE_GITOPS_FEATURE_CLUSTER")
      ? [{ label: "Cluster", value: (obj: Receiver) => obj.clusterName }]
      : []),
    ...(isFlagEnabled("WEAVE_GITOPS_FEATURE_TENANCY")
      ? [{ label: "Tenant", value: "tenant" }]
      : []),
  ];

  if (!rows?.length)
    return (
      <Flex wide tall column align>
        <MessageBox>
          <Text size="large" semiBold>
            No receivers are currently configured
          </Text>
          <Spacer padding="medium" />
          <Text>
            Set up receivers to let external systems trigger Flux
            reconciliations over a webhook.
          </Text>
          <Spacer padding="xs" />
          <Text>
            To learn more about how to set up receivers,&nbsp;
            <Link
              href="https://fluxcd.io/flux/components/notification/receivers/"
              newTab
            >
              visit our documentation
            </Link>
          </Text>
        </MessageBox>
      </Flex>
    );

  return (
    <DataTable
      className={className}
      rows={rows}
      fields={fields}
      filters={initialFilterState}
    />
  );
}

export default styled(ReceiversTable).attrs({
  className: ReceiversTable.name,
})``;
