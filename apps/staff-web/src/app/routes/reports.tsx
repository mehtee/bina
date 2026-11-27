import { RequireCapability } from "~/design-system/composites/app-shell";
import { ReportsCenterPage } from "~/features/reporting/reports-and-analytics-pages";

export default function ReportsRoute() {
  return (
    <RequireCapability capability="report:read">
      <ReportsCenterPage />
    </RequireCapability>
  );
}
