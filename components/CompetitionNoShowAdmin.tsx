"use client";

import { useEffect, useMemo, useState } from "react";

import { getClubName } from "@/lib/club-names";

type CompetitionOption = {
  id: string;
  name: string;
  seasonName: string;
  type: string;
};

type AdminMatch = {
  id: string;
  roundId: string | null;
  roundNumber: number | null;
  roundName: string | null;
  homeTeamCode: string;
  awayTeamCode: string;
  homeScore: number | null;
  awayScore: number | null;
  homeNoShow: boolean;
  awayNoShow: boolean;
  sttHomeScore: number | null;
  sttAwayScore: number | null;
  status: string;
  scheduledAt: string | null;
  playedAt: string | null;
};

type ApiResponse = {
  matches?: AdminMatch[];
  match?: AdminMatch;
  error?: string;
};

function scoreLabel(match: AdminMatch) {
  if (
    match.homeScore === null ||
    match.awayScore === null
  ) {
    return "Pendiente";
  }

  return `${match.homeScore} - ${match.awayScore}`;
}

function originalSttLabel(match: AdminMatch) {
  if (
    match.sttHomeScore === null ||
    match.sttAwayScore === null
  ) {
    return null;
  }

  return `${match.sttHomeScore} - ${match.sttAwayScore}`;
}

export default function CompetitionNoShowAdmin({
  competitions,
}: {
  competitions: CompetitionOption[];
}) {
  const [competitionId, setCompetitionId] =
    useState(competitions[0]?.id ?? "");

  const [matches, setMatches] =
    useState<AdminMatch[]>([]);

  const [matchId, setMatchId] =
    useState("");

  const [noShowTeamCode, setNoShowTeamCode] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const selectedMatch = useMemo(
    () =>
      matches.find(
        (match) => match.id === matchId
      ) ?? null,
    [matches, matchId]
  );

  async function loadMatches(
    nextCompetitionId: string
  ) {
    if (!nextCompetitionId) {
      setMatches([]);
      setMatchId("");
      return;
    }

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        `/api/admin/competition-no-show?competitionId=${encodeURIComponent(
          nextCompetitionId
        )}`,
        { cache: "no-store" }
      );

      const data =
        (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(
          data.error ??
            "No se pudieron cargar los partidos."
        );
      }

      const nextMatches = data.matches ?? [];
      setMatches(nextMatches);

      const first =
        nextMatches.find(
          (match) =>
            match.status !== "PLAYED"
        ) ??
        nextMatches.at(-1) ??
        null;

      setMatchId(first?.id ?? "");

      if (first) {
        setNoShowTeamCode(
          first.homeNoShow
            ? first.homeTeamCode
            : first.awayNoShow
              ? first.awayTeamCode
              : ""
        );
      } else {
        setNoShowTeamCode("");
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Error desconocido."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMatches(competitionId);
  }, [competitionId]);

  useEffect(() => {
    if (!selectedMatch) {
      setNoShowTeamCode("");
      return;
    }

    setNoShowTeamCode(
      selectedMatch.homeNoShow
        ? selectedMatch.homeTeamCode
        : selectedMatch.awayNoShow
          ? selectedMatch.awayTeamCode
          : ""
    );
  }, [selectedMatch]);

  async function saveNoShow() {
    if (!selectedMatch) {
      setError("Selecciona un partido.");
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(
        "/api/admin/competition-no-show",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            matchId: selectedMatch.id,
            noShowTeamCode:
              noShowTeamCode || null,
          }),
        }
      );

      const data =
        (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(
          data.error ??
            "No se pudo guardar el NO PRESENTADO."
        );
      }

      await loadMatches(competitionId);

      setMessage(
        noShowTeamCode
          ? "NO PRESENTADO guardado. Si el .stt todavía no se ha importado, la regla se aplicará automáticamente al cargarlo."
          : "NO PRESENTADO eliminado. Si existía marcador original del .stt, se ha restaurado."
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Error desconocido."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="v31118-admin">
      <div className="v31118-admin-head">
        <div>
          <span>RESULTADOS · SANCIÓN</span>
          <h2>NO PRESENTADO</h2>
          <p>
            Marca aquí el equipo que no envió alineación.
            Puedes hacerlo antes o después de importar el .stt.
          </p>
        </div>

        <div className="v31118-rule">
          <b>Regla automática</b>
          <span>
            Victoria real por 3+ goles → se conserva.
            En cualquier otro caso → 3-0 para el equipo
            que sí presentó.
          </span>
        </div>
      </div>

      <div className="v31118-admin-grid">
        <label>
          <span>Competición</span>
          <select
            value={competitionId}
            onChange={(event) =>
              setCompetitionId(event.target.value)
            }
          >
            {competitions.map((competition) => (
              <option
                key={competition.id}
                value={competition.id}
              >
                {competition.seasonName} ·{" "}
                {competition.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Partido</span>
          <select
            value={matchId}
            disabled={loading}
            onChange={(event) =>
              setMatchId(event.target.value)
            }
          >
            {matches.map((match) => (
              <option
                key={match.id}
                value={match.id}
              >
                {match.roundName ??
                  (match.roundNumber
                    ? `Jornada ${match.roundNumber}`
                    : "Sin jornada")}
                {" · "}
                {getClubName(match.homeTeamCode)}
                {" vs "}
                {getClubName(match.awayTeamCode)}
                {" · "}
                {scoreLabel(match)}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Estado de alineación</span>
          <select
            value={noShowTeamCode}
            disabled={!selectedMatch}
            onChange={(event) =>
              setNoShowTeamCode(
                event.target.value
              )
            }
          >
            <option value="">
              Ambos presentados
            </option>

            {selectedMatch ? (
              <>
                <option
                  value={
                    selectedMatch.homeTeamCode
                  }
                >
                  NO PRESENTADO ·{" "}
                  {getClubName(
                    selectedMatch.homeTeamCode
                  )}
                </option>

                <option
                  value={
                    selectedMatch.awayTeamCode
                  }
                >
                  NO PRESENTADO ·{" "}
                  {getClubName(
                    selectedMatch.awayTeamCode
                  )}
                </option>
              </>
            ) : null}
          </select>
        </label>
      </div>

      {selectedMatch ? (
        <div className="v31118-preview">
          <div>
            <span>Marcador oficial</span>
            <strong>
              {scoreLabel(selectedMatch)}
            </strong>
          </div>

          <div>
            <span>Marcador original .stt</span>
            <strong>
              {originalSttLabel(
                selectedMatch
              ) ?? "—"}
            </strong>
          </div>

          <div>
            <span>NP actual</span>
            <strong>
              {selectedMatch.homeNoShow
                ? getClubName(
                    selectedMatch.homeTeamCode
                  )
                : selectedMatch.awayNoShow
                  ? getClubName(
                      selectedMatch.awayTeamCode
                    )
                  : "Ninguno"}
            </strong>
          </div>
        </div>
      ) : null}

      <div className="v31118-actions">
        <button
          type="button"
          onClick={saveNoShow}
          disabled={
            saving ||
            loading ||
            !selectedMatch
          }
        >
          {saving
            ? "Guardando..."
            : "Guardar NO PRESENTADO"}
        </button>

        <p>
          Después carga el .stt con el importador normal.
          Las estadísticas del .stt se guardan completas;
          solo se corrige el marcador oficial si corresponde.
        </p>
      </div>

      {message ? (
        <div className="v31118-message is-ok">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="v31118-message is-error">
          {error}
        </div>
      ) : null}
    </section>
  );
}
