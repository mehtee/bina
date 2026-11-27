import { RequireCapability } from "~/design-system/composites/app-shell";
import { ClinicAdminPage } from "~/features/admin/admin-pages";

export default function AdminRoute() {
  return (
    <RequireCapability capability="admin:manage">
      <ClinicAdminPage />
    </RequireCapability>
  );
}
