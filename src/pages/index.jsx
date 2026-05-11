import LearningApp from "../LearningApp.jsx";
import { RequireAuth } from "../Auth.jsx";

export default function IndexPage() {
  return (
    <RequireAuth>
      <LearningApp />
    </RequireAuth>
  );
}
