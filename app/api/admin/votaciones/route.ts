import { NextResponse } from "next/server";

import { isAdminSession } from "@/lib/admin-auth";
import { getAutomaticAwardNominees } from "@/lib/award-nominees";
import { getAwardPollDetail } from "@/lib/award-voting";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

async function replaceAutomaticCandidates(
  pollId: string,
  seasonId: string,
  awardKey: string
) {
  const supabase = getSupabaseAdmin();
  const nominees = await getAutomaticAwardNominees(seasonId, awardKey, 10);

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

  return nominees;
}

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();

    const seasonId = String(body.seasonId ?? "");
    const title = String(body.title ?? "").trim();
    const awardKey = String(body.awardKey ?? "BALLON_DOR").trim();
    const maxRank = Math.min(3, Math.max(1, Number(body.maxRank ?? 3)));

    if (!seasonId || !title) {
      return NextResponse.json(
        { error: "Faltan temporada o título." },
        { status: 400 }
      );
    }

    const allowedAwards = [
      "BALLON_DOR",
      "MVP",
      "GK",
      "DF",
      "MF",
      "FW",
      "YOUNG",
    ];

    if (!allowedAwards.includes(awardKey)) {
      return NextResponse.json(
        { error: "Tipo de premio no válido." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("award_polls")
      .insert({
        season_id: seasonId,
        title,
        award_key: awardKey,
        description: String(body.description ?? "").trim() || null,
        status: "DRAFT",
        max_rank: maxRank,
        points_first: Math.max(0, Number(body.pointsFirst ?? 5)),
        points_second: Math.max(0, Number(body.pointsSecond ?? 3)),
        points_third: Math.max(0, Number(body.pointsThird ?? 1)),
        show_live_results: false,
      })
      .select("id")
      .single();

    if (error) throw error;

    try {
      await replaceAutomaticCandidates(data.id, seasonId, awardKey);
    } catch (nomineeError) {
      await supabase.from("award_polls").delete().eq("id", data.id);
      throw nomineeError;
    }

    const poll = await getAwardPollDetail(data.id);

    return NextResponse.json({ poll });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo crear." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const id = String(body.id ?? "");

    if (!id) {
      return NextResponse.json({ error: "Falta el ID." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: currentPoll, error: currentError } = await supabase
      .from("award_polls")
      .select("id,status,finalized_at")
      .eq("id", id)
      .maybeSingle();

    if (currentError) throw currentError;
    if (!currentPoll) {
      return NextResponse.json(
        { error: "Votación inexistente." },
        { status: 404 }
      );
    }

    if (currentPoll.status === "CLOSED" && currentPoll.finalized_at) {
      return NextResponse.json(
        {
          error:
            "Este premio ya está cerrado y forma parte del palmarés histórico. No puede reabrirse.",
        },
        { status: 400 }
      );
    }

    if (body.status === "CLOSED") {
      const { error: finalizeError } = await supabase.rpc(
        "finalize_award_poll",
        { p_poll_id: id }
      );

      if (finalizeError) {
        return NextResponse.json(
          { error: finalizeError.message },
          { status: 400 }
        );
      }

      const poll = await getAwardPollDetail(id);
      return NextResponse.json({ poll });
    }

    const patch: Record<string, unknown> = {};

    if (body.status !== undefined) {
      const status = String(body.status);

      if (!["DRAFT", "OPEN"].includes(status)) {
        return NextResponse.json(
          { error: "Estado no válido." },
          { status: 400 }
        );
      }

      patch.status = status;
    }

    if (body.showLiveResults !== undefined) {
      patch.show_live_results = Boolean(body.showLiveResults);
    }

    const { error } = await supabase
      .from("award_polls")
      .update(patch)
      .eq("id", id);

    if (error) throw error;

    const poll = await getAwardPollDetail(id);
    return NextResponse.json({ poll });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo guardar." },
      { status: 500 }
    );
  }
}
