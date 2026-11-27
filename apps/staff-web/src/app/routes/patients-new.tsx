import { RequireCapability } from "~/design-system/composites/app-shell";
import { EnrollPatientPage } from "~/features/patients/patients-list-page";

export default function PatientsNewRoute() {
  return (
    <RequireCapability capability="patient:enroll">
      <EnrollPatientPage />
    </RequireCapability>
  );
}
