import { TodayPlanPage } from "../LearningApp.jsx";
import { RequireAuth } from "../Auth.jsx";

export default function TodayPage() {
  return (
    <RequireAuth>
      <TodayPlanPage />
    </RequireAuth>
  );
}
