import { RequireCapability } from "~/design-system/composites/app-shell";
import { IntegrationsPage } from "~/features/integrations/integrations-page";

export default function IntegrationsRoute() {
  return (
    <RequireCapability capability="integrations:manage">
      <IntegrationsPage />
    </RequireCapability>
  );
}
