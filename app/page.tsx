import { redirect } from "next/navigation";

// The home page is built in Phase 2. Until then, / shows the Phase 0 styleguide.
export default function Home() {
  redirect("/styleguide");
}
