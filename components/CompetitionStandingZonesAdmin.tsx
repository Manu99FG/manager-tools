"use client";

import { useEffect, useMemo, useState } from "react";

type CompetitionOption = {
  id: string;
  name: string;
  seasonName: string;
  type: string;
};

type EditableZone = {
  key: string;
  label: string;
  startPosition: number;
  endPosition: number;
  color: string;
};

const PRESETS = [
  { label: "Campeón", color: "#B38728" },
  { label: "Clasificación continental", color: "#2EA66B" },
  { label: "Playoff", color: "#3D7EDB" },
  { label: "Descenso", color: "#D94B4B" },
];

export default function CompetitionStandingZonesAdmin({
  competitions,
}: {
  competitions: CompetitionOption[];
}) {
  const leagueCompetitions = useMemo(
    () => competitions.filter((competition) => competition.type === "LEAGUE"),
    [competitions]
  );

  const [competitionId, setCompetitionId] = useState(
    leagueCompetitions[0]?.id ?? ""
  );
  const [zones, setZones] = useState<EditableZone[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!competitionId) {
      setZones([]);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setMessage("");

      try {
        const response = await fetch(
          `/api/admin/competition-standing-zones?competitionId=${encodeURIComponent(
            competitionId
          )}`,
          { cache: "no-store" }
        );

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? "No se pudieron cargar las zonas.");
        }

        if (!cancelled) {
          setZones(
            (payload.zones ?? []).map(
              (
                zone: {
                  id: string;
                  label: string;
                  startPosition: number;
                  endPosition: number;
                  color: string;
                },
                index: number
              ) => ({
                key: zone.id || `zone-${index}`,
                label: zone.label,
                startPosition: zone.startPosition,
                endPosition: zone.endPosition,
                color: zone.color,
              })
            )
          );
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error instanceof Error ? error.message : "Error cargando zonas."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [competitionId]);

  function addZone() {
    const lastEnd = zones.reduce(
      (maximum, zone) => Math.max(maximum, zone.endPosition),
      0
    );

    setZones((current) => [
      ...current,
      {
        key: `new-${Date.now()}-${current.length}`,
        label: "Nueva zona",
        startPosition: lastEnd + 1,
        endPosition: lastEnd + 1,
        color: "#9A7425",
      },
    ]);
  }

  function applyPreset(label: string, color: string) {
    const lastEnd = zones.reduce(
      (maximum, zone) => Math.max(maximum, zone.endPosition),
      0
    );

    setZones((current) => [
      ...current,
      {
        key: `preset-${Date.now()}-${current.length}`,
        label,
        startPosition: lastEnd + 1,
        endPosition: lastEnd + 1,
        color,
      },
    ]);
  }

  function updateZone(key: string, patch: Partial<EditableZone>) {
    setZones((current) =>
      current.map((zone) => (zone.key === key ? { ...zone, ...patch } : zone))
    );
  }

  function removeZone(key: string) {
    setZones((current) => current.filter((zone) => zone.key !== key));
  }

  async function saveZones() {
    if (!competitionId) return;

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch("/api/admin/competition-standing-zones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competitionId,
          zones: zones.map((zone, index) => ({
            label: zone.label,
            startPosition: zone.startPosition,
            endPosition: zone.endPosition,
            color: zone.color,
            sortOrder: index,
          })),
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "No se pudieron guardar las zonas.");
      }

      setMessage("Configuración guardada correctamente.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Error guardando zonas."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="v3111-admin-zones">
      <div className="v3111-admin-zones-head">
        <div>
          <span>AJUSTES DE COMPETICIÓN</span>
          <h2>Zonas de clasificación</h2>
          <p>
            Define qué puestos se colorean y qué significa cada franja. Si no
            configuras ninguna zona, la clasificación se mostrará neutra.
          </p>
        </div>

        <label>
          <span>Competición</span>
          <select
            value={competitionId}
            onChange={(event) => setCompetitionId(event.target.value)}
          >
            {leagueCompetitions.map((competition) => (
              <option value={competition.id} key={competition.id}>
                {competition.name} · {competition.seasonName}
              </option>
            ))}
          </select>
        </label>
      </div>

      {leagueCompetitions.length === 0 ? (
        <div className="v3111-admin-empty">
          No hay competiciones de tipo liga.
        </div>
      ) : (
        <>
          <div className="v3111-admin-presets">
            <span>Añadir rápido:</span>
            {PRESETS.map((preset) => (
              <button
                type="button"
                key={preset.label}
                onClick={() => applyPreset(preset.label, preset.color)}
              >
                <i style={{ backgroundColor: preset.color }} />
                {preset.label}
              </button>
            ))}
          </div>

          <div className="v3111-admin-zone-list">
            {loading ? (
              <div className="v3111-admin-empty">Cargando configuración…</div>
            ) : zones.length === 0 ? (
              <div className="v3111-admin-empty">
                Esta competición no tiene zonas configuradas.
              </div>
            ) : (
              zones.map((zone) => (
                <div className="v3111-admin-zone" key={zone.key}>
                  <label className="is-name">
                    <span>Nombre</span>
                    <input
                      value={zone.label}
                      onChange={(event) =>
                        updateZone(zone.key, { label: event.target.value })
                      }
                    />
                  </label>

                  <label>
                    <span>Desde</span>
                    <input
                      type="number"
                      min={1}
                      value={zone.startPosition}
                      onChange={(event) =>
                        updateZone(zone.key, {
                          startPosition: Number(event.target.value),
                        })
                      }
                    />
                  </label>

                  <label>
                    <span>Hasta</span>
                    <input
                      type="number"
                      min={zone.startPosition}
                      value={zone.endPosition}
                      onChange={(event) =>
                        updateZone(zone.key, {
                          endPosition: Number(event.target.value),
                        })
                      }
                    />
                  </label>

                  <label className="is-color">
                    <span>Color</span>
                    <span className="v3111-admin-color">
                      <input
                        type="color"
                        value={zone.color}
                        onChange={(event) =>
                          updateZone(zone.key, {
                            color: event.target.value.toUpperCase(),
                          })
                        }
                      />
                      <input
                        value={zone.color}
                        maxLength={7}
                        onChange={(event) =>
                          updateZone(zone.key, {
                            color: event.target.value.toUpperCase(),
                          })
                        }
                      />
                    </span>
                  </label>

                  <button
                    type="button"
                    className="v3111-admin-remove"
                    onClick={() => removeZone(zone.key)}
                    aria-label={`Eliminar ${zone.label}`}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="v3111-admin-actions">
            <button type="button" onClick={addZone}>
              + Añadir zona
            </button>
            <button
              type="button"
              className="is-primary"
              disabled={saving}
              onClick={saveZones}
            >
              {saving ? "Guardando…" : "Guardar configuración"}
            </button>
          </div>

          {message ? <p className="v3111-admin-message">{message}</p> : null}
        </>
      )}
    </section>
  );
}
