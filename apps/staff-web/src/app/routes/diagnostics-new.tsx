import { RequireCapability } from "~/design-system/composites/app-shell";
import { NewStudyUploadPage } from "~/features/diagnostics/diagnostics-worklist-page";

export default function DiagnosticsNewRoute() {
  return (
    <RequireCapability capability="study:upload">
      <NewStudyUploadPage />
    </RequireCapability>
  );
}
