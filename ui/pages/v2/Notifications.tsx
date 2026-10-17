import * as React from "react";
import styled from "styled-components";
import Alert from "../../components/Alert";
import ErrorList from "../../components/ErrorList";
import NotificationsTable from "../../components/NotificationsTable";
import Page from "../../components/Page";
import ReceiversTable from "../../components/ReceiversTable";
import SubRouterTabs, { RouterTab } from "../../components/SubRouterTabs";
import { useListProviders, useListReceivers } from "../../hooks/notifications";
type Props = {
  className?: string;
};

function Notifications({ className }: Props) {
  const {
    data: providers,
    isLoading: providersLoading,
    error: providersError,
  } = useListProviders();
  const {
    data: receivers,
    isLoading: receiversLoading,
    error: receiversError,
  } = useListReceivers();

  return (
    <Page
      className={className}
      loading={providersLoading || receiversLoading}
      path={[{ label: "Notifications" }]}
    >
      <SubRouterTabs rootPath="providers">
        <RouterTab name="Providers" path="providers">
          <>
            {providersError && (
              <Alert
                severity="error"
                title="Request Error"
                message={providersError.message}
              />
            )}
            <ErrorList errors={providers?.errors} />
            <NotificationsTable rows={providers?.objects} />
          </>
        </RouterTab>
        <RouterTab name="Receivers" path="receivers">
          <>
            {receiversError && (
              <Alert
                severity="error"
                title="Request Error"
                message={receiversError.message}
              />
            )}
            <ErrorList errors={receivers?.errors} />
            <ReceiversTable rows={receivers?.objects} />
          </>
        </RouterTab>
      </SubRouterTabs>
    </Page>
  );
}

export default styled(Notifications).attrs({ className: Notifications.name })``;
