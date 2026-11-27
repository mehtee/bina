import { RequireCapability } from "~/design-system/composites/app-shell";
import { AnalyticsPage } from "~/features/reporting/reports-and-analytics-pages";

export default function AnalyticsRoute() {
  return (
    <RequireCapability capability="analytics:read">
      <AnalyticsPage />
    </RequireCapability>
  );
}
