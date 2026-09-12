"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type {
  Competition,
  CompetitionQualificationRule,
  GroupStanding,
} from "@/lib/competition-types";
import { getClubName } from "@/lib/club-names";

type DraftRule = {
  key: string;
  groupName: string;
  startPosition: number;
  endPosition: number;
  destinationCompetitionId: string;
};

type Props = {
  competition: Competition;
  groupStandings: GroupStanding[];
  siblingCompetitions: Competition[];
  rules: CompetitionQualificationRule[];
};

type ApiResponse = {
  ok?: boolean;
  error?: string;
  assignments?: Array<{
    destinationCompetitionId: string;
    destinationName?: string;
    teamCodes: string[];
    inserted: number;
    pendingInsert?: number;
  }>;
  generatedCalendars?: Array<{
    competitionId: string;
    competitionName: string;
    matchesCreated: number;
    roundsCreated: number;
  }>;
  finalized?: boolean;
};

function makeKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createInitialRules(
  groups: GroupStanding[],
  rules: CompetitionQualificationRule[]
): DraftRule[] {
  if (rules.length) {
    return rules.map((rule) => ({
      key: rule.id,
      groupName: rule.group_name,
      startPosition: rule.start_position,
      endPosition: rule.end_position,
      destinationCompetitionId: rule.destination_competition_id,
    }));
  }

  return groups.flatMap((group) => {
    const size = group.standings.length;
    if (!size) return [];
    const split = size === 8 ? 4 : Math.ceil(size / 2);
    const rows: DraftRule[] = [
      {
        key: makeKey(),
        groupName: group.groupName,
        startPosition: 1,
        endPosition: split,
        destinationCompetitionId: "",
      },
    ];
    if (split < size) {
      rows.push({
        key: makeKey(),
        groupName: group.groupName,
        startPosition: split + 1,
        endPosition: size,
        destinationCompetitionId: "",
      });
    }
    return rows;
  });
}

export default function CompetitionQualificationAdmin({
  competition,
  groupStandings,
  siblingCompetitions,
  rules,
}: Props) {
  const router = useRouter();
  const [draftRules, setDraftRules] = useState<DraftRule[]>(() =>
    createInitialRules(groupStandings, rules)
  );
  const [busy, setBusy] = useState<"save" | "preview" | "finalize" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastAssignments, setLastAssignments] = useState<NonNullable<ApiResponse["assignments"]> | null>(null);
  const [previewReady, setPreviewReady] = useState(false);
  const [confirmFinalize, setConfirmFinalize] = useState(false);

  const destinationsById = useMemo(
    () => new Map(siblingCompetitions.map((item) => [item.id, item])),
    [siblingCompetitions]
  );

  const groupedRules = useMemo(
    () =>
      groupStandings.map((group) => ({
        ...group,
        rules: draftRules
          .filter((rule) => rule.groupName === group.groupName)
          .sort((a, b) => a.startPosition - b.startPosition),
      })),
    [draftRules, groupStandings]
  );

  function updateRule(key: string, patch: Partial<DraftRule>) {
    setDraftRules((current) =>
      current.map((rule) => (rule.key === key ? { ...rule, ...patch } : rule))
    );
    setPreviewReady(false);
    setLastAssignments(null);
  }

  function addRule(groupName: string, size: number) {
    setPreviewReady(false);
    setLastAssignments(null);
    const existing = draftRules.filter((rule) => rule.groupName === groupName);
    const highest = Math.max(0, ...existing.map((rule) => rule.endPosition));
    const start = Math.min(size, highest + 1 || 1);
    setDraftRules((current) => [
      ...current,
      {
        key: makeKey(),
        groupName,
        startPosition: start,
        endPosition: start,
        destinationCompetitionId: "",
      },
    ]);
  }

  function deleteRule(key: string) {
    setDraftRules((current) => current.filter((rule) => rule.key !== key));
    setPreviewReady(false);
    setLastAssignments(null);
  }

  async function request(action: "save" | "preview" | "finalize") {
    setBusy(action);
    setMessage(null);
    setError(null);
    if (action === "save") {
      setLastAssignments(null);
      setPreviewReady(false);
    }

    try {
      const response = await fetch("/api/competitions/qualification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          competitionId: competition.id,
          rules:
            action === "save"
              ? draftRules.map((rule) => ({
                  groupName: rule.groupName,
                  startPosition: rule.startPosition,
                  endPosition: rule.endPosition,
                  destinationCompetitionId: rule.destinationCompetitionId,
                }))
              : undefined,
        }),
      });
      const data = (await response.json()) as ApiResponse;
      if (!response.ok) throw new Error(data.error ?? "No se pudo completar la acción.");

      if (action === "save") {
        setMessage("Reglas de clasificación guardadas.");
      } else if (action === "preview") {
        setLastAssignments(data.assignments ?? []);
        setPreviewReady(true);
        setMessage("Vista previa preparada. Revisa el reparto antes de finalizar la competición.");
      } else {
        setLastAssignments(data.assignments ?? []);
        setPreviewReady(false);
        setConfirmFinalize(false);
        const total = (data.assignments ?? []).reduce(
          (sum, assignment) => sum + assignment.teamCodes.length,
          0
        );
        const generated = data.generatedCalendars ?? [];
        const calendarText = generated.length
          ? ` Calendario generado automáticamente en ${generated.map((item) => item.competitionName).join(" y ")}.`
          : "";
        setMessage(
          `Competición finalizada: ${total} plaza${total === 1 ? "" : "s"} asignada${total === 1 ? "" : "s"} a sus destinos.${calendarText}`
        );
      }
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Error desconocido.");
    } finally {
      setBusy(null);
    }
  }

  if (!groupStandings.length) {
    return (
      <section className="mt-8 rounded-[13px] border border-[var(--mt-gold)] bg-[var(--mt-surface-soft)] p-5">
        <h2 className="text-lg font-black text-[var(--mt-gold-dark)]">Clasificación a otras competiciones</h2>
        <p className="mt-2 text-sm text-[var(--mt-gold-dark)]">
          Esta competición todavía no tiene equipos asociados a grupos. Asigna un nombre de grupo
          (por ejemplo, Grupo A o Grupo B) a los participantes para poder configurar los destinos.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8 rounded-[13px] border border-[var(--mt-line)] bg-[var(--mt-surface)] p-5 sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.18em] text-[var(--mt-gold-dark)]">
            Pretemporada → divisiones
          </div>
          <h2 className="mt-2 text-xl font-black text-[var(--mt-text)]">Clasificación a otras competiciones</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--mt-muted)]">
            Define qué posiciones de cada grupo pasan a cada competición. Al aplicar las reglas se
            inscriben únicamente los equipos; los partidos, goles, minutos, asistencias y demás
            estadísticas de esta pretemporada permanecen aquí y no se transfieren a la competición de destino.
          </p>
        </div>
        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-black text-emerald-700">
          Estadísticas separadas
        </span>
      </div>

      {message ? (
        <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm font-bold text-emerald-700">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm font-bold text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mt-6 grid gap-5">
        {groupedRules.map((group) => (
          <div key={group.groupName} className="rounded-[13px] border border-[var(--mt-line)] bg-[var(--mt-surface)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-[var(--mt-text)]">{group.groupName}</h3>
                <p className="mt-1 text-xs text-[var(--mt-muted)]">
                  {group.standings.length} equipos · clasificación actual
                </p>
              </div>
              <button
                type="button"
                onClick={() => addRule(group.groupName, group.standings.length)}
                className="rounded-lg border border-[var(--mt-line)] px-3 py-2 text-xs font-black text-[var(--mt-text)] hover:border-[var(--mt-gold)]"
              >
                + Añadir destino
              </button>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="text-[10px] uppercase tracking-wide text-[var(--mt-muted)]">
                  <tr>
                    <th className="pb-2 text-left">Posiciones</th>
                    <th className="pb-2 text-left">Competición de destino</th>
                    <th className="pb-2 text-left">Ahora pasarían</th>
                    <th className="pb-2 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {group.rules.map((rule) => {
                    const selected = group.standings.filter(
                      (row) => row.position >= rule.startPosition && row.position <= rule.endPosition
                    );
                    return (
                      <tr key={rule.key} className="border-t border-[var(--mt-line)]">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={1}
                              max={group.standings.length}
                              value={rule.startPosition}
                              onChange={(event) =>
                                updateRule(rule.key, {
                                  startPosition: Math.max(1, Number(event.target.value) || 1),
                                })
                              }
                              className="w-16 rounded-lg border border-[var(--mt-line)] bg-[var(--mt-surface)] px-2 py-2 text-center font-black text-[var(--mt-text)]"
                            />
                            <span className="text-[var(--mt-muted)]">a</span>
                            <input
                              type="number"
                              min={1}
                              max={group.standings.length}
                              value={rule.endPosition}
                              onChange={(event) =>
                                updateRule(rule.key, {
                                  endPosition: Math.max(1, Number(event.target.value) || 1),
                                })
                              }
                              className="w-16 rounded-lg border border-[var(--mt-line)] bg-[var(--mt-surface)] px-2 py-2 text-center font-black text-[var(--mt-text)]"
                            />
                          </div>
                        </td>
                        <td className="py-3 pr-4">
                          <select
                            value={rule.destinationCompetitionId}
                            onChange={(event) =>
                              updateRule(rule.key, { destinationCompetitionId: event.target.value })
                            }
                            className="w-full min-w-[220px] rounded-lg border border-[var(--mt-line)] bg-[var(--mt-surface)] px-3 py-2 font-bold text-[var(--mt-text)]"
                          >
                            <option value="">Seleccionar destino</option>
                            {siblingCompetitions.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 pr-4 text-xs text-[var(--mt-muted)]">
                          {selected.length
                            ? selected.map((row) => getClubName(row.teamCode)).join(", ")
                            : "Ningún equipo"}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            onClick={() => deleteRule(rule.key)}
                            className="rounded-lg px-3 py-2 text-xs font-black text-red-700 hover:bg-red-500/10"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 border-t border-[var(--mt-line)] pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-[var(--mt-muted)]">
          Guarda primero las reglas. La vista previa comprueba que todos los partidos de los grupos estén
          terminados y muestra el reparto final. Al finalizar, se inscriben los clubes en sus destinos y,
          si el destino es una liga sin calendario, este se genera automáticamente. No se copian partidos
          ni estadísticas de la pretemporada.
        </p>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => request("save")}
            className="rounded-xl border border-[var(--mt-line)] px-4 py-3 text-sm font-black text-[var(--mt-text)] disabled:opacity-50"
          >
            {busy === "save" ? "Guardando..." : "Guardar reglas"}
          </button>
          <button
            type="button"
            disabled={busy !== null || !rules.length || competition.status === "FINISHED"}
            onClick={() => request("preview")}
            className="rounded-xl bg-[var(--mt-gold)] px-4 py-3 text-sm font-black text-[var(--mt-surface)] disabled:cursor-not-allowed disabled:opacity-40"
            title={!rules.length ? "Guarda las reglas antes de preparar el reparto" : undefined}
          >
            {busy === "preview" ? "Comprobando..." : competition.status === "FINISHED" ? "Competición finalizada" : "Vista previa final"}
          </button>
          <button
            type="button"
            disabled={busy !== null || !previewReady || competition.status === "FINISHED"}
            onClick={() => setConfirmFinalize(true)}
            className="rounded-xl bg-[var(--mt-gold)] px-4 py-3 text-sm font-black text-[var(--mt-surface)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Finalizar competición
          </button>
        </div>
      </div>

      {lastAssignments?.length ? (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-black text-[var(--mt-text)]">Reparto final</h3>
              <p className="mt-1 text-xs text-[var(--mt-muted)]">Estos clubes serán inscritos en las competiciones de destino.</p>
            </div>
            <span className="rounded-full border border-[var(--mt-gold)] bg-[var(--mt-surface-soft)] px-3 py-1 text-xs font-black text-[var(--mt-gold-dark)]">Sin transferir estadísticas</span>
          </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {lastAssignments.map((assignment) => {
            const destination = destinationsById.get(assignment.destinationCompetitionId);
            return (
              <div
                key={assignment.destinationCompetitionId}
                className="rounded-xl border border-[var(--mt-gold)] bg-[var(--mt-surface-soft)] p-4"
              >
                <div className="font-black text-[var(--mt-gold-dark)]">{destination?.name ?? "Destino"}</div>
                <div className="mt-2 text-sm text-[var(--mt-muted)]">
                  {assignment.teamCodes.map((code) => getClubName(code)).join(", ")}
                </div>
                <div className="mt-2 text-xs text-[var(--mt-muted)]">
                  {(assignment.pendingInsert ?? assignment.inserted)} equipo{(assignment.pendingInsert ?? assignment.inserted) === 1 ? "" : "s"} por añadir · estadísticas a 0 en el destino
                </div>
              </div>
            );
          })}
        </div>
        </div>
      ) : null}

      {confirmFinalize ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-[var(--mt-surface)] p-4">
          <div className="w-full max-w-xl rounded-[13px] border border-[var(--mt-line)] bg-[var(--mt-surface)] p-6 shadow-2xl">
            <div className="text-xs font-black uppercase tracking-[0.18em] text-[var(--mt-gold-dark)]">Confirmación final</div>
            <h3 className="mt-2 text-2xl font-black text-[var(--mt-text)]">¿Finalizar {competition.name}?</h3>
            <p className="mt-3 text-sm leading-6 text-[var(--mt-muted)]">
              Se marcará la competición como finalizada y se inscribirán los equipos mostrados en la vista previa en sus competiciones de destino. Los resultados, goles, asistencias, minutos y demás estadísticas de esta competición permanecerán separados.
            </p>
            <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm font-bold text-emerald-700">
              Primera/Segunda División comenzarán con estadísticas propias desde cero.
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" disabled={busy !== null} onClick={() => setConfirmFinalize(false)} className="rounded-xl border border-[var(--mt-line)] px-4 py-3 text-sm font-black text-[var(--mt-text)]">Cancelar</button>
              <button type="button" disabled={busy !== null} onClick={() => request("finalize")} className="rounded-xl bg-[var(--mt-gold)] px-4 py-3 text-sm font-black text-[var(--mt-surface)] disabled:opacity-50">{busy === "finalize" ? "Finalizando..." : "Confirmar y clasificar equipos"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
