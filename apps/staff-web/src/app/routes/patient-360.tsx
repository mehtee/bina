import { RequireCapability } from "~/design-system/composites/app-shell";
import { Patient360Page } from "~/features/patients/patient-360-page";

export default function Patient360Route() {
  return (
    <RequireCapability capability="patient:read">
      <Patient360Page />
    </RequireCapability>
  );
}
