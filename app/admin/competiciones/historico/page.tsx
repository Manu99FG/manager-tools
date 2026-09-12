import { redirect } from "next/navigation";

export default function LegacyCompetitionHistoryRedirect() {
  redirect("/admin?section=historico#series");
}
