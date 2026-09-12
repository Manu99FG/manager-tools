import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type CompetitionStandingZone = {
  id: string;
  competitionId: string;
  label: string;
  startPosition: number;
  endPosition: number;
  color: string;
  sortOrder: number;
};

type DatabaseZone = {
  id: string;
  competition_id: string;
  label: string;
  start_position: number;
  end_position: number;
  color: string;
  sort_order: number;
};

export async function getCompetitionStandingZones(
  competitionId: string
): Promise<CompetitionStandingZone[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("competition_standing_zones")
    .select(
      "id,competition_id,label,start_position,end_position,color,sort_order"
    )
    .eq("competition_id", competitionId)
    .order("sort_order", { ascending: true })
    .order("start_position", { ascending: true });

  if (error) {
    // Permite desplegar primero el código y ejecutar el SQL justo después.
    // Cuando la tabla exista, los colores aparecerán automáticamente.
    if (
      error.code === "42P01" ||
      error.message?.includes("competition_standing_zones")
    ) {
      return [];
    }
    throw error;
  }

  return ((data ?? []) as DatabaseZone[]).map((row) => ({
    id: row.id,
    competitionId: row.competition_id,
    label: row.label,
    startPosition: row.start_position,
    endPosition: row.end_position,
    color: row.color,
    sortOrder: row.sort_order,
  }));
}
