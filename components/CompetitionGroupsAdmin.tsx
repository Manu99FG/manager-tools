"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { CompetitionMatch, CompetitionRound, CompetitionTeam } from "@/lib/competition-types";
import { getClubLogo } from "@/lib/club-logo";
import { getClubName } from "@/lib/club-names";

type Props = {
  competitionId: string;
  competitionName?: string;
  teams: CompetitionTeam[];
  hasMatches: boolean;
  homeAndAway: boolean;
  rounds: CompetitionRound[];
  matches: CompetitionMatch[];
};

type ApiResult = {
  ok?: boolean;
  error?: string;
  groups?: number;
  rounds?: number;
  matches?: number;
};

function alphaLabel(index: number) {
  let n = index + 1;
  let label = "";
  while (n > 0) {
    n -= 1;
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26);
  }
  return label;
}

function groupLabel(index: number, mode: "group" | "class" = "group") {
  return `${mode === "class" ? "Clase" : "Grupo"} ${alphaLabel(index)}`;
}

export default function CompetitionGroupsAdmin({
  competitionId,
  competitionName = "",
  teams,
  hasMatches,
  homeAndAway,
  rounds,
  matches,
}: Props) {
  const router = useRouter();

  const normalizedCompetitionName = competitionName.trim().toLocaleLowerCase("es");
  const isClassCompetition = normalizedCompetitionName.includes("leyendas");
  const isIntercontinental = normalizedCompetitionName === "copa intercontinental";
  const effectiveHomeAndAway = isClassCompetition ? true : homeAndAway;
  const unitLabel = isClassCompetition ? "clase" : "grupo";
  const unitLabelPlural = isClassCompetition ? "clases" : "grupos";

  const existingNames = useMemo(
    () =>
      Array.from(
        new Set(
          teams
            .map((team) => team.group_name?.trim())
            .filter((name): name is string => Boolean(name))
        )
      ),
    [teams]
  );

  const initialCount = isClassCompetition ? 8 : Math.max(
    existingNames.length,
    teams.length ? Math.min(2, teams.length) : 1
  );

  const [groupCount, setGroupCount] = useState(initialCount);
  const [assignments, setAssignments] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      teams.map((team) => [team.team_code, team.group_name?.trim() ?? ""])
    )
  );
  const [busy, setBusy] = useState(false);
  const [calendarBusy, setCalendarBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const groupNames = useMemo(
    () => Array.from({ length: groupCount }, (_, index) => groupLabel(index, isClassCompetition ? "class" : "group")),
    [groupCount, isClassCompetition]
  );

  const preview = useMemo(
    () =>
      groupNames.map((name) => ({
        name,
        teams: teams.filter((team) => assignments[team.team_code] === name),
      })),
    [assignments, groupNames, teams]
  );

  const groupsDirty = useMemo(
    () =>
      teams.some(
        (team) =>
          (assignments[team.team_code] ?? "") !==
          (team.group_name?.trim() ?? "")
      ),
    [assignments, teams]
  );

  const persistedGroups = useMemo(() => {
    const map = new Map<string, CompetitionTeam[]>();

    for (const team of teams) {
      const name = team.group_name?.trim();
      if (!name) continue;
      const current = map.get(name) ?? [];
      current.push(team);
      map.set(name, current);
    }

    return [...map.entries()].sort(([a], [b]) =>
      a.localeCompare(b, "es", { numeric: true })
    );
  }, [teams]);

  const calendarPreview = useMemo(() => {
    if (
      !persistedGroups.length ||
      teams.some((team) => !team.group_name?.trim())
    ) {
      return null;
    }

    const sizes = persistedGroups.map(([, members]) => members.length);
    const firstLegRounds = Math.max(
      ...sizes.map((size) => (size % 2 === 0 ? size - 1 : size))
    );
    const firstLegMatches = sizes.reduce(
      (sum, size) => sum + (size * (size - 1)) / 2,
      0
    );
    const multiplier = effectiveHomeAndAway ? 2 : 1;

    return {
      groups: persistedGroups.length,
      rounds: firstLegRounds * multiplier,
      matches: firstLegMatches * multiplier,
      valid: sizes.every((size) => size >= 2),
    };
  }, [effectiveHomeAndAway, persistedGroups, teams]);

  const generatedCalendarByGroup = useMemo(() => {
    if (!matches.length || !rounds.length) return [];

    const teamGroup = new Map(
      teams.map((team) => [team.team_code, team.group_name?.trim() ?? ""])
    );
    const roundById = new Map(rounds.map((round) => [round.id, round]));
    const groupsMap = new Map<string, Map<number, { round: CompetitionRound; matches: CompetitionMatch[] }>>();

    for (const match of matches) {
      const homeGroup = teamGroup.get(match.home_team_code) ?? "";
      const awayGroup = teamGroup.get(match.away_team_code) ?? "";
      if (!homeGroup || homeGroup !== awayGroup || !match.round_id) continue;
      const round = roundById.get(match.round_id);
      if (!round) continue;
      const roundsMap = groupsMap.get(homeGroup) ?? new Map();
      const item = roundsMap.get(round.number) ?? { round, matches: [] };
      item.matches.push(match);
      roundsMap.set(round.number, item);
      groupsMap.set(homeGroup, roundsMap);
    }

    return [...groupsMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b, "es", { numeric: true }))
      .map(([groupName, roundsMap]) => ({
        groupName,
        rounds: [...roundsMap.values()].sort((a, b) => a.round.number - b.round.number),
      }));
  }, [matches, rounds, teams]);

  function changeGroupCount(next: number) {
    const safe = isClassCompetition ? 8 : Math.max(1, Math.min(Math.max(teams.length, 1), next || 1));
    setGroupCount(safe);

    const allowed = new Set(
      Array.from({ length: safe }, (_, index) => groupLabel(index, isClassCompetition ? "class" : "group"))
    );

    setAssignments((current) => {
      const copy = { ...current };
      for (const team of teams) {
        if (copy[team.team_code] && !allowed.has(copy[team.team_code])) {
          copy[team.team_code] = "";
        }
      }
      return copy;
    });
  }

  function distributeAutomatically() {
    if (!teams.length || isClassCompetition) return;

    const next: Record<string, string> = {};
    teams.forEach((team, index) => {
      next[team.team_code] = groupNames[index % groupNames.length];
    });

    setAssignments(next);
    setMessage(null);
    setError(null);
  }

  async function saveGroups() {
    setMessage(null);
    setError(null);

    if (!teams.length) {
      setError("Añade primero los equipos participantes de la competición.");
      return;
    }

    const missing = teams.filter((team) => !assignments[team.team_code]);
    if (missing.length) {
      setError(
        `Falta asignar ${missing.length} ${
          missing.length === 1 ? "equipo" : "equipos"
        } a una ${unitLabel}.`
      );
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/competitions/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competitionId,
          assignments: teams.map((team) => ({
            teamCode: team.team_code,
            groupName: assignments[team.team_code],
          })),
        }),
      });

      const result = (await response.json()) as ApiResult;
      if (!response.ok) {
        throw new Error(result.error ?? "No se pudieron guardar los grupos.");
      }

      setMessage(isClassCompetition ? "Clases sincronizadas desde Administración. Ya puedes generar el calendario." : "Grupos guardados correctamente. Ya puedes generar el calendario.");
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Error desconocido."
      );
    } finally {
      setBusy(false);
    }
  }

  async function generateGroupCalendar() {
    setMessage(null);
    setError(null);

    if (groupsDirty) {
      setError(
        `Guarda primero los cambios de ${unitLabelPlural} antes de generar el calendario.`
      );
      return;
    }

    if (!calendarPreview) {
      setError(
        `Asigna todos los equipos a una ${unitLabel} y guarda la distribución antes de generar el calendario.`
      );
      return;
    }

    if (!calendarPreview.valid) {
      setError(`Cada ${unitLabel} necesita al menos 2 equipos para poder generar partidos.`);
      return;
    }

    setCalendarBusy(true);
    try {
      const response = await fetch("/api/competitions/generate-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitionId }),
      });

      const result = (await response.json()) as ApiResult;
      if (!response.ok) {
        throw new Error(
          result.error ?? "No se pudo generar el calendario de grupos."
        );
      }

      setMessage(
        `Calendario generado: ${
          result.rounds ?? calendarPreview.rounds
        } jornadas y ${result.matches ?? calendarPreview.matches} partidos.`
      );
      router.refresh();
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : "Error desconocido."
      );
    } finally {
      setCalendarBusy(false);
    }
  }

  if (isIntercontinental && !teams.length) {
    return (
      <section className="manage-comp-card manage-groups-admin">
        <div className="manage-comp-section-head">
          <div>
            <span>Copa Intercontinental</span>
            <h2>Pendiente de sorteo</h2>
          </div>
        </div>
        <div className="manage-groups-empty">
          <strong>Los grupos todavía no existen.</strong>
          <p>Programa y realiza el sorteo de la Copa Intercontinental desde Administración → Sorteos. Los 32 equipos y los cuatro grupos se asignarán automáticamente cuando el sorteo se aplique.</p>
        </div>
      </section>
    );
  }

  if (!teams.length) {
    return (
      <section className="manage-comp-card manage-groups-admin">
        <div className="manage-comp-section-head">
          <div>
            <span>{isClassCompetition ? "Copa de Leyendas" : "Fase de grupos"}</span>
            <h2>{isClassCompetition ? "Asignar clases" : "Crear y repartir grupos"}</h2>
          </div>
        </div>
        <div className="manage-groups-empty">
          <strong>No hay equipos participantes.</strong>
          <p>Ve a la pestaña Equipos y añade los clubes antes de crear la distribución.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="manage-comp-card manage-groups-admin">
      <div className="manage-comp-section-head manage-groups-head">
        <div>
          <span>{isClassCompetition ? "Copa de Leyendas" : isIntercontinental ? "Copa Intercontinental" : "Fase de grupos"}</span>
          <h2>{isClassCompetition ? "Asignar Clase a cada equipo" : isIntercontinental ? "Grupos definidos por sorteo" : "Crear y repartir grupos"}</h2>
          <p>
            {isClassCompetition
              ? "Las clases se toman automáticamente desde Administración → Clubes. Cada clase (A-H) es un grupo de 4 equipos y clasifican los 2 primeros."
              : isIntercontinental
                ? "La distribución es de solo lectura: los cuatro grupos proceden exclusivamente del sorteo oficial. Aquí solo puedes comprobar el resultado y generar el calendario una vez aplicado el sorteo."
                : "Define cuántos grupos tendrá la competición y asigna cada equipo. Después podrás generar automáticamente las jornadas de cada grupo."}
          </p>
        </div>
      </div>

      {hasMatches ? (
        <div className="manage-comp-notice is-error">
          Ya existe un calendario. Para proteger partidos, clasificaciones y
          estadísticas, la distribución queda bloqueada una vez generados los
          partidos.
        </div>
      ) : null}
      {message ? (
        <div className="manage-comp-notice is-success">{message}</div>
      ) : null}
      {error ? <div className="manage-comp-notice is-error">{error}</div> : null}

      <div className="manage-groups-toolbar">
        <label>
          <span>{isClassCompetition ? "Número de clases" : "Número de grupos"}</span>
          <div className="manage-groups-counter">
            <button
              type="button"
              disabled={hasMatches || isClassCompetition || isIntercontinental || groupCount <= 1}
              onClick={() => changeGroupCount(groupCount - 1)}
            >
              −
            </button>
            <strong>{groupCount}</strong>
            <button
              type="button"
              disabled={hasMatches || isClassCompetition || isIntercontinental || groupCount >= teams.length}
              onClick={() => changeGroupCount(groupCount + 1)}
            >
              +
            </button>
          </div>
        </label>

        <div className="manage-groups-toolbar-actions">
          <button
            type="button"
            className="manage-groups-secondary"
            disabled={hasMatches || isClassCompetition || isIntercontinental}
            onClick={distributeAutomatically}
          >
            {isClassCompetition ? "Clases desde Administración" : isIntercontinental ? "Distribución del sorteo" : "Repartir automáticamente"}
          </button>
          <button
            type="button"
            className="manage-groups-primary"
            disabled={hasMatches || busy || isIntercontinental}
            onClick={saveGroups}
          >
            {busy ? "Sincronizando..." : isClassCompetition ? "Sincronizar clases" : isIntercontinental ? "Grupos aplicados por sorteo" : "Guardar grupos"}
          </button>
        </div>
      </div>

      <div className="manage-groups-assignment-list">
        {teams.map((team) => (
          <div className="manage-groups-team-row" key={team.id}>
            <div className="manage-groups-team-ident">
              <Image
                src={getClubLogo(team.team_code)}
                alt=""
                width={36}
                height={36}
              />
              <div>
                <strong>{getClubName(team.team_code)}</strong>
                <span>{team.team_code}</span>
              </div>
            </div>
            <select
              value={assignments[team.team_code] ?? ""}
              disabled={hasMatches || isClassCompetition || isIntercontinental}
              onChange={(event) =>
                setAssignments((current) => ({
                  ...current,
                  [team.team_code]: event.target.value,
                }))
              }
            >
              <option value="">{isClassCompetition ? "Seleccionar clase" : "Seleccionar grupo"}</option>
              {groupNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="manage-groups-preview">
        {preview.map((group) => (
          <article className="manage-groups-preview-card" key={group.name}>
            <header>
              <strong>{group.name}</strong>
              <span>{group.teams.length} equipos</span>
            </header>
            <div>
              {group.teams.map((team) => (
                <span className="manage-groups-chip" key={team.id}>
                  <Image
                    src={getClubLogo(team.team_code)}
                    alt=""
                    width={22}
                    height={22}
                  />
                  {getClubName(team.team_code)}
                </span>
              ))}
              {!group.teams.length ? <em>Sin equipos asignados</em> : null}
            </div>
          </article>
        ))}
      </div>

      <div className="manage-groups-calendar-box">
        <div className="manage-groups-calendar-copy">
          <span>{isClassCompetition ? "Calendario por clases" : "Calendario de la fase de grupos"}</span>
          <h3>{hasMatches ? "Calendario generado" : "Generar jornadas y partidos"}</h3>
          {calendarPreview ? (
            <p>
              {calendarPreview.groups}{" "}
              {calendarPreview.groups === 1 ? unitLabel : unitLabelPlural} ·{" "}
              {calendarPreview.rounds} jornadas · {calendarPreview.matches}{" "}
              partidos · {homeAndAway ? "ida y vuelta" : "una vuelta"}. Los
              equipos solo se enfrentarán a rivales de su propia {unitLabel}.
            </p>
          ) : (
            <p>
              Guarda primero una distribución completa de equipos para poder
              generar el calendario.
            </p>
          )}
          {groupsDirty && !hasMatches ? (
            <small>Hay cambios sin guardar en la distribución.</small>
          ) : null}
        </div>

        <button
          type="button"
          className="manage-groups-calendar-button"
          disabled={
            hasMatches ||
            calendarBusy ||
            groupsDirty ||
            !calendarPreview?.valid
          }
          onClick={generateGroupCalendar}
        >
          {hasMatches
            ? "Calendario ya generado"
            : calendarBusy
              ? "Generando..."
              : "Generar calendario"}
        </button>
      </div>

      {hasMatches ? (
        <div className="manage-groups-generated-calendar">
          <div className="manage-comp-section-head">
            <div>
              <span>Partidos generados</span>
              <h2>{isClassCompetition ? "Calendario por clases" : "Calendario por grupos"}</h2>
              <p>Aquí puedes comprobar las jornadas creadas para cada grupo. Los resultados se editan desde la pestaña Partidos.</p>
            </div>
          </div>

          {generatedCalendarByGroup.length ? (
            <div className="manage-groups-calendar-groups">
              {generatedCalendarByGroup.map((group) => (
                <article className="manage-groups-calendar-group" key={group.groupName}>
                  <header>
                    <strong>{group.groupName}</strong>
                    <span>{group.rounds.reduce((total, round) => total + round.matches.length, 0)} partidos</span>
                  </header>
                  <div className="manage-groups-rounds-list">
                    {group.rounds.map(({ round, matches: roundMatches }) => (
                      <section className="manage-groups-round-card" key={round.id}>
                        <div className="manage-groups-round-title">
                          <strong>{round.name}</strong>
                          <span>{roundMatches.length} partidos</span>
                        </div>
                        <div className="manage-groups-round-fixtures">
                          {roundMatches.map((match) => (
                            <div className="manage-groups-fixture" key={match.id}>
                              <div className="manage-groups-fixture-team is-home">
                                <span>{getClubName(match.home_team_code)}</span>
                                <Image src={getClubLogo(match.home_team_code)} alt="" width={24} height={24} />
                              </div>
                              <div className="manage-groups-fixture-score">
                                {match.status === "PLAYED" && match.home_score !== null && match.away_score !== null ? `${match.home_score} - ${match.away_score}` : "vs"}
                              </div>
                              <div className="manage-groups-fixture-team is-away">
                                <Image src={getClubLogo(match.away_team_code)} alt="" width={24} height={24} />
                                <span>{getClubName(match.away_team_code)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="manage-groups-empty">
              <strong>El calendario existe, pero no se han podido asociar los partidos a los grupos.</strong>
              <p>Comprueba que los equipos siguen teniendo asignada su distribución y recarga la página.</p>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}

