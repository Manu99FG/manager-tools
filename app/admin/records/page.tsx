import { redirect } from "next/navigation";

export default function LegacyAdminRedirect() {
  redirect("/admin?section=historico");
}
