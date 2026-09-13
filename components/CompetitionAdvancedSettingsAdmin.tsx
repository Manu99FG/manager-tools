"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type {
  CompetitionStatus,
  StandingTiebreaker,
} from "@/lib/competition-types";

type CompetitionOption = {
  id: string;
  name: string;
  seasonName: string;
  type: string;
  status: CompetitionStatus;
  pointsWin: number;
  pointsDraw: number;
  pointsLoss: number;
  homeAndAway: boolean;
  tiebreakers: StandingTiebreaker[];
};

const FIXED_TIEBREAKERS = [
  "FEWER_NO_SHOWS",
  "HEAD_TO_HEAD_POINTS",
  "GOAL_DIFFERENCE",
  "GOALS_FOR",
] satisfies StandingTiebreaker[];

const FIXED_TIEBREAKER_LABELS = [
  ["1", "Puntos", "Mayor número de puntos."],
  ["2", "Partidos no presentados", "Menos NP obtiene mejor posición."],
  ["3", "Enfrentamientos directos", "Puntos obtenidos entre los equipos que siguen empatados."],
  ["4", "Diferencia de goles", "Diferencia de goles general de la competición."],
  ["5", "Goles a favor", "Mayor número de goles marcados."],
] as const;


export default function CompetitionAdvancedSettingsAdmin({
  competitions,
}: {
  competitions: CompetitionOption[];
}) {
  const router = useRouter();

  const [competitionId, setCompetitionId] = useState(
    competitions[0]?.id ?? ""
  );

  const selected = useMemo(
    () =>
      competitions.find(
        (competition) => competition.id === competitionId
      ) ?? null,
    [competitions, competitionId]
  );

  const [status, setStatus] =
    useState<CompetitionStatus>("DRAFT");
  const [pointsWin, setPointsWin] = useState(3);
  const [pointsDraw, setPointsDraw] = useState(1);
  const [pointsLoss, setPointsLoss] = useState(0);
  const [homeAndAway, setHomeAndAway] = useState(true);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selected) return;

    setStatus(selected.status);
    setPointsWin(selected.pointsWin);
    setPointsDraw(selected.pointsDraw);
    setPointsLoss(selected.pointsLoss);
    setHomeAndAway(selected.homeAndAway);
    setMessage(null);
    setError(null);
  }, [selected]);


  async function save() {
    if (!selected) return;

    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(
        "/api/admin/competition-settings",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            competitionId: selected.id,
            status,
            pointsWin,
            pointsDraw,
            pointsLoss,
            homeAndAway,
            tiebreakers: FIXED_TIEBREAKERS,
          }),
        }
      );

      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          data.error ??
            "No se pudo guardar la configuración."
        );
      }

      setMessage("Configuración avanzada guardada.");
      router.refresh();
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
    <section className="v3121-settings">
      <div className="v3121-settings-head">
        <div>
          <span>COMPETICIONES · AJUSTES</span>
          <h2>Configuración avanzada</h2>
          <p>
            Puntuación y formato de cada competición. El sistema de
            clasificación y la regla de NO PRESENTADO son globales.
          </p>
        </div>

        <div className="v3121-settings-badge">
          <b>V31.21</b>
          <span>Reglamento global</span>
        </div>
      </div>

      <div className="v3121-select-competition">
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
                {competition.seasonName} · {competition.name}
              </option>
            ))}
          </select>
        </label>

        {selected ? (
          <div>
            <span>Tipo</span>
            <strong>{selected.type}</strong>
          </div>
        ) : null}
      </div>

      {selected ? (
        <div className="v3121-settings-body">
          <section className="v3121-setting-card">
            <div className="v3121-card-title">
              <span>01</span>
              <div>
                <h3>Estado y formato</h3>
                <p>Estado administrativo y calendario de la competición.</p>
              </div>
            </div>

            <div className="v3121-fields two">
              <label>
                <span>Estado</span>
                <select
                  value={status}
                  onChange={(event) =>
                    setStatus(
                      event.target.value as CompetitionStatus
                    )
                  }
                >
                  <option value="DRAFT">Preparación</option>
                  <option value="ACTIVE">En curso</option>
                  <option value="FINISHED">Finalizada</option>
                </select>
              </label>

              <label className="v3121-switch-row">
                <span>
                  <b>Ida y vuelta</b>
                  <small>
                    Solo puede cambiarse antes de generar el calendario.
                  </small>
                </span>
                <input
                  type="checkbox"
                  checked={homeAndAway}
                  onChange={(event) =>
                    setHomeAndAway(event.target.checked)
                  }
                />
              </label>
            </div>
          </section>

          <section className="v3121-setting-card">
            <div className="v3121-card-title">
              <span>02</span>
              <div>
                <h3>Sistema de puntos</h3>
                <p>
                  Puntos que recibe un club según el resultado.
                  También admite valores negativos.
                </p>
              </div>
            </div>

            <div className="v3121-points-grid">
              <label>
                <span>Victoria</span>
                <input
                  type="number"
                  min={-20}
                  max={20}
                  value={pointsWin}
                  onChange={(event) =>
                    setPointsWin(Number(event.target.value))
                  }
                />
              </label>

              <label>
                <span>Empate</span>
                <input
                  type="number"
                  min={-20}
                  max={20}
                  value={pointsDraw}
                  onChange={(event) =>
                    setPointsDraw(Number(event.target.value))
                  }
                />
              </label>

              <label>
                <span>Derrota</span>
                <input
                  type="number"
                  min={-20}
                  max={20}
                  value={pointsLoss}
                  onChange={(event) =>
                    setPointsLoss(Number(event.target.value))
                  }
                />
              </label>
            </div>
          </section>

          <section className="v3121-setting-card v3121-tiebreak-card">
            <div className="v3121-card-title">
              <span>03</span>
              <div>
                <h3>Sistema de clasificación</h3>
                <p>
                  El reglamento es único para todas las competiciones con tabla.
                  Estos criterios no se pueden modificar por competición.
                </p>
              </div>
            </div>

            <div className="v3121-tiebreak-order">
              {FIXED_TIEBREAKER_LABELS.map(([number, label, help]) => (
                <div className="v3121-tiebreak-row" key={number}>
                  <strong>{number}</strong>
                  <span>
                    <b>{label}</b>
                    <small>{help}</small>
                  </span>
                </div>
              ))}
            </div>

            <div className="v3121-fallback-note">
              Si los cinco criterios siguen empatados, el código del club se usa
              únicamente como último criterio técnico estable.
            </div>
          </section>

          <section className="v3121-setting-card">
            <div className="v3121-card-title">
              <span>04</span>
              <div>
                <h3>Regla NO PRESENTADO</h3>
                <p>Regla única para todas las competiciones.</p>
              </div>
            </div>
            <div className="v3121-fallback-note">
              <strong>NP = derrota administrativa 0-3.</strong> El marcador oficial nunca cambia, aunque el .stt tenga otro resultado. Las estadísticas del .stt se conservan íntegramente.
            </div>
          </section>

          <div className="v3121-savebar">
            <div>
              <b>{selected.name}</b>
              <span>
                Los cambios de clasificación se reflejan
                automáticamente al guardar.
              </span>
            </div>

            <button
              type="button"
              disabled={saving}
              onClick={save}
            >
              {saving
                ? "Guardando..."
                : "Guardar configuración"}
            </button>
          </div>

          {message ? (
            <div className="v3121-notice is-ok">{message}</div>
          ) : null}

          {error ? (
            <div className="v3121-notice is-error">{error}</div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
