import { RequireCapability } from "~/design-system/composites/app-shell";
import { OpsConsolePage } from "~/features/ops_console/ops-page";

export default function OpsRoute() {
  return (
    <RequireCapability capability="ops:read">
      <OpsConsolePage />
    </RequireCapability>
  );
}
