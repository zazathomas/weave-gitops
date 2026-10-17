import * as React from "react";
import styled from "styled-components";
import { Kind } from "../lib/api/core/types.pb";
import { Receiver } from "../lib/objects";
import { createYamlCommand } from "../lib/utils";
import Flex from "./Flex";
import InfoList from "./InfoList";
import Interval from "./Interval";
import PageStatus from "./PageStatus";
import SubRouterTabs, { RouterTab } from "./SubRouterTabs";
import YamlView from "./YamlView";

type Props = {
  className?: string;
  receiver: Receiver;
};

function ReceiverDetail({ className, receiver }: Props) {
  const resources =
    receiver.resources.map((r) => `${r.kind}/${r.name}`).join(", ") || "-";

  return (
    <Flex column tall wide className={className} gap="32">
      <PageStatus
        conditions={receiver.conditions}
        suspended={receiver.suspended}
      />
      <SubRouterTabs rootPath="details">
        <RouterTab name="Details" path="details">
          <InfoList
            items={[
              ["Kind", Kind.Receiver],
              ["Type", receiver.receiverType || "-"],
              ["Webhook Path", receiver.webhookPath || "-"],
              ["Resources", resources],
              ["Secret", receiver.secretRef || "-"],
              ["Namespace", receiver.namespace],
              [
                "Interval",
                <Interval key={receiver.uid} interval={receiver.interval} />,
              ],
            ]}
          />
        </RouterTab>
        <RouterTab name="yaml" path="yaml">
          <YamlView
            header={createYamlCommand(
              Kind.Receiver,
              receiver.name,
              receiver.namespace,
            )}
            yaml={receiver.yaml}
          />
        </RouterTab>
      </SubRouterTabs>
    </Flex>
  );
}

export default styled(ReceiverDetail).attrs({
  className: ReceiverDetail.name,
})``;
