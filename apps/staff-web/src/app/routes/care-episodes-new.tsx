import { RequireCapability } from "~/design-system/composites/app-shell";
import { NewEpisodePage } from "~/features/episodes/care-dashboard-page";

export default function CareEpisodesNewRoute() {
  return (
    <RequireCapability capability="episode:create">
      <NewEpisodePage />
    </RequireCapability>
  );
}
