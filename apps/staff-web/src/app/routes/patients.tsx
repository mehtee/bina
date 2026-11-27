import { RequireCapability } from "~/design-system/composites/app-shell";
import { PatientsListPage } from "~/features/patients/patients-list-page";

export default function PatientsRoute() {
  return (
    <RequireCapability capability="patient:read">
      <PatientsListPage />
    </RequireCapability>
  );
}
