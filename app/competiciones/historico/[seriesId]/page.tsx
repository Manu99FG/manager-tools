import { notFound, redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function LegacyCompetitionHistoryPage({
  params,
}: {
  params: Promise<{ seriesId: string }>;
}) {
  const { seriesId } = await params;
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("competitions")
    .select("id,created_at")
    .eq("series_id", seriesId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (!data) notFound();

  redirect(`/competiciones/${data.id}?tab=historial`);
}
