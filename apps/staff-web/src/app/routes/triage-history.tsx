import { RequireCapability } from "~/design-system/composites/app-shell";
import { TriageQueuePage } from "~/features/triage/triage-page";

export default function TriageHistoryRoute() {
  return (
    <RequireCapability capability="triage:manage">
      <TriageQueuePage />
    </RequireCapability>
  );
}
