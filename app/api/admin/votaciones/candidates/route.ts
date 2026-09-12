import { NextResponse } from "next/server";

import { isAdminSession } from "@/lib/admin-auth";
import { getAutomaticAwardNominees } from "@/lib/award-nominees";
import { getAwardPollDetail } from "@/lib/award-voting";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const pollId = String(body.pollId ?? "");

    if (!pollId) {
      return NextResponse.json(
        { error: "Falta la votación." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const [
      { data: poll, error: pollError },
      { count: ballotCount, error: ballotError },
    ] = await Promise.all([
      supabase
        .from("award_polls")
        .select("id,season_id,award_key,status")
        .eq("id", pollId)
        .maybeSingle(),
      supabase
        .from("award_ballots")
        .select("id", { count: "exact", head: true })
        .eq("poll_id", pollId),
    ]);

    if (pollError) throw pollError;
    if (ballotError) throw ballotError;

    if (!poll) {
      return NextResponse.json(
        { error: "Votación inexistente." },
        { status: 404 }
      );
    }

    if (poll.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Solo puedes recalcular candidatos mientras esté en borrador." },
        { status: 400 }
      );
    }

    if ((ballotCount ?? 0) > 0) {
      return NextResponse.json(
        { error: "No se pueden cambiar candidatos después de recibir votos." },
        { status: 400 }
      );
    }

    const nominees = await getAutomaticAwardNominees(
      poll.season_id,
      poll.award_key,
      10
    );

    const { error: deleteError } = await supabase
      .from("award_candidates")
      .delete()
      .eq("poll_id", pollId);

    if (deleteError) throw deleteError;

    if (nominees.length > 0) {
      const { error: insertError } = await supabase
        .from("award_candidates")
        .insert(
          nominees.map((nominee, index) => ({
            poll_id: pollId,
            player_id: nominee.playerId,
            team_code: nominee.teamCode || null,
            sort_order: index + 1,
            nomination_score: nominee.score,
            nomination_reason: nominee.reason,
          }))
        );

      if (insertError) throw insertError;
    }

    const detail = await getAwardPollDetail(pollId);

    return NextResponse.json({ poll: detail });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudieron recalcular los nominados.",
      },
      { status: 500 }
    );
  }
}
