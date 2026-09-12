import { createHash, randomBytes } from "node:crypto";

import { NextResponse } from "next/server";

import { isAdminSession } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function createCode() {
  const raw = randomBytes(6).toString("hex").toUpperCase();
  return `MT-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

export async function POST(request: Request) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const pollId = String(body.pollId ?? "");
    const count = Number(body.count ?? 0);

    if (!pollId || !Number.isInteger(count) || count < 1 || count > 200) {
      return NextResponse.json(
        { error: "Cantidad no válida. Máximo 200 por tanda." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: poll, error: pollError } = await supabase
      .from("award_polls")
      .select("id,status")
      .eq("id", pollId)
      .maybeSingle();

    if (pollError) throw pollError;
    if (!poll) {
      return NextResponse.json({ error: "Votación inexistente." }, { status: 404 });
    }

    if (poll.status === "CLOSED") {
      return NextResponse.json(
        { error: "No se generan códigos para una votación cerrada." },
        { status: 400 }
      );
    }

    const tokens = Array.from({ length: count }, () => createCode());

    const rows = tokens.map((token, index) => ({
      poll_id: pollId,
      label: `Código ${index + 1}`,
      token_hash: createHash("sha256").update(token).digest("hex"),
      is_active: true,
    }));

    const { error } = await supabase.from("award_voter_tokens").insert(rows);
    if (error) throw error;

    return NextResponse.json({ tokens });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudieron generar los códigos.",
      },
      { status: 500 }
    );
  }
}
