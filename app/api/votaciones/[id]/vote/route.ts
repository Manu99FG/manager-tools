import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pollId } = await params;
    const body = await request.json();

    const token = String(body.token ?? "").trim().toUpperCase();
    const rawChoices: Array<{
      candidateId?: unknown;
      rank?: unknown;
    }> = Array.isArray(body.choices)
      ? body.choices
      : [];

    if (!token) {
      return NextResponse.json(
        { error: "Introduce tu código de votación." },
        { status: 400 }
      );
    }

    const choices = rawChoices.map(
      (choice) => ({
        candidate_id: String(choice.candidateId ?? ""),
        rank: Number(choice.rank),
      })
    );

    if (
      choices.length < 1 ||
      choices.some(
        (choice) =>
          !choice.candidate_id ||
          !Number.isInteger(choice.rank) ||
          choice.rank < 1 ||
          choice.rank > 3
      )
    ) {
      return NextResponse.json(
        { error: "La papeleta no es válida." },
        { status: 400 }
      );
    }

    const tokenHash = createHash("sha256").update(token).digest("hex");
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase.rpc("cast_award_ballot", {
      p_poll_id: pollId,
      p_token_hash: tokenHash,
      p_choices: choices,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || "No se pudo registrar el voto." },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true, ballotId: data });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo registrar el voto.",
      },
      { status: 500 }
    );
  }
}
