import { DailyPackPage } from "../DailyPackPage.jsx";
import { RequireAuth } from "../Auth.jsx";

export default function DailyPackRoute() {
  return (
    <RequireAuth>
      <DailyPackPage />
    </RequireAuth>
  );
}
