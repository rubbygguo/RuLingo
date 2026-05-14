import { RequireAuth } from "../Auth.jsx";
import { MemoryPage } from "../MemoryPage.jsx";

export default function MemoryRoute() {
  return (
    <RequireAuth>
      <MemoryPage />
    </RequireAuth>
  );
}
