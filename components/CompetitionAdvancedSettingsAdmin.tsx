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

const TIEBREAKER_OPTIONS: Array<{
  value: StandingTiebreaker;
  label: string;
  help: string;
}> = [
  {
    value: "GOAL_DIFFERENCE",
    label: "Diferencia de goles",
    help: "DG general de la competición.",
  },
  {
    value: "GOALS_FOR",
    label: "Goles a favor",
    help: "Más goles marcados.",
  },
  {
    value: "WINS",
    label: "Victorias",
    help: "Mayor número de partidos ganados.",
  },
  {
    value: "HEAD_TO_HEAD_POINTS",
    label: "Enfrentamientos directos · puntos",
    help: "Mini-clasificación entre los clubes empatados.",
  },
  {
    value: "HEAD_TO_HEAD_GOAL_DIFFERENCE",
    label: "Enfrentamientos directos · DG",
    help: "Diferencia de goles entre los clubes empatados.",
  },
  {
    value: "HEAD_TO_HEAD_GOALS_FOR",
    label: "Enfrentamientos directos · GF",
    help: "Goles a favor entre los clubes empatados.",
  },
  {
    value: "FEWER_NO_SHOWS",
    label: "Menos NO PRESENTADOS",
    help: "Prioriza al club con menos NP.",
  },
];

function normalizeTiebreakers(
  value: StandingTiebreaker[] | undefined
) {
  return value?.length
    ? value
    : ([
        "GOAL_DIFFERENCE",
        "GOALS_FOR",
      ] satisfies StandingTiebreaker[]);
}

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
  const [tiebreakers, setTiebreakers] = useState<
    StandingTiebreaker[]
  >(["GOAL_DIFFERENCE", "GOALS_FOR"]);

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
    setTiebreakers(normalizeTiebreakers(selected.tiebreakers));
    setMessage(null);
    setError(null);
  }, [selected]);

  function moveTiebreaker(index: number, direction: -1 | 1) {
    setTiebreakers((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;

      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function toggleTiebreaker(value: StandingTiebreaker) {
    setTiebreakers((current) => {
      if (current.includes(value)) {
        if (current.length === 1) return current;
        return current.filter((item) => item !== value);
      }

      return [...current, value];
    });
  }

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
            tiebreakers,
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
            Reglas propias de cada competición: puntuación,
            desempates, formato y NO PRESENTADO.
          </p>
        </div>

        <div className="v3121-settings-badge">
          <b>V31.21</b>
          <span>Reglamento configurable</span>
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
                <h3>Criterios de desempate</h3>
                <p>
                  Los puntos siempre son el primer criterio.
                  Ordena aquí qué se aplica después.
                </p>
              </div>
            </div>

            <div className="v3121-tiebreak-layout">
              <div className="v3121-tiebreak-order">
                {tiebreakers.map((value, index) => {
                  const option = TIEBREAKER_OPTIONS.find(
                    (item) => item.value === value
                  );

                  if (!option) return null;

                  return (
                    <div
                      className="v3121-tiebreak-row"
                      key={value}
                    >
                      <strong>{index + 1}</strong>
                      <span>
                        <b>{option.label}</b>
                        <small>{option.help}</small>
                      </span>
                      <div>
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() =>
                            moveTiebreaker(index, -1)
                          }
                          aria-label="Subir criterio"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={
                            index === tiebreakers.length - 1
                          }
                          onClick={() =>
                            moveTiebreaker(index, 1)
                          }
                          aria-label="Bajar criterio"
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="v3121-tiebreak-options">
                <span>Añadir / quitar criterios</span>
                {TIEBREAKER_OPTIONS.map((option) => {
                  const active = tiebreakers.includes(
                    option.value
                  );

                  return (
                    <button
                      type="button"
                      key={option.value}
                      className={active ? "is-active" : ""}
                      onClick={() =>
                        toggleTiebreaker(option.value)
                      }
                    >
                      <b>{active ? "✓" : "+"}</b>
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="v3121-fallback-note">
              Si todos los criterios siguen empatados, se utiliza
              el código del club como último criterio técnico estable.
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
