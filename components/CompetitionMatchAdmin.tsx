"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import EsmsMatchImporter from "@/components/EsmsMatchImporter";
import CompetitionQualificationAdmin from "@/components/CompetitionQualificationAdmin";
import CompetitionGroupsAdmin from "@/components/CompetitionGroupsAdmin";

import type {
  Competition,
  CompetitionMatch,
  CompetitionQualificationRule,
  CompetitionRound,
  CompetitionTeam,
  GroupStanding,
  Season,
  StandingRow,
} from "@/lib/competition-types";
import { getClubLogo } from "@/lib/club-logo";
import { getClubName } from "@/lib/club-names";

type CompetitionWithSeason = Competition & { season: Season | null };
type Props = {
  data: {
    competition: CompetitionWithSeason;
    teams: CompetitionTeam[];
    rounds: CompetitionRound[];
    matches: CompetitionMatch[];
    standings: StandingRow[];
    groupStandings: GroupStanding[];
    qualificationRules: CompetitionQualificationRule[];
    siblingCompetitions: Competition[];
  };
};

type MatchDraft = {
  homeScore: string;
  awayScore: string;
  status: CompetitionMatch["status"];
  noShowTeamCode: string;
};
type ApiResult = { ok?: boolean; error?: string };
type TabKey = "summary" | "groups" | "matches" | "standings" | "teams" | "rules" | "settings";

const STATUS_LABEL: Record<CompetitionMatch["status"], string> = {
  SCHEDULED: "Pendiente",
  PLAYED: "Jugado",
  POSTPONED: "Aplazado",
  CANCELLED: "Cancelado",
};
const COMP_STATUS: Record<Competition["status"], string> = {
  DRAFT: "Creada",
  ACTIVE: "En curso",
  FINISHED: "Finalizada",
};
const TYPE_LABEL: Record<Competition["type"], string> = {
  LEAGUE: "Liga",
  CUP: "Copa",
  GROUPS: "Solo grupos",
  GROUPS_KNOCKOUT: "Grupos + eliminatorias",
  SUPERCUP: "Supercopa",
};

export default function CompetitionMatchAdmin({ data }: Props) {
  const router = useRouter();
  const {
    competition,
    teams,
    rounds,
    matches,
    standings,
    groupStandings,
    qualificationRules,
    siblingCompetitions,
  } = data;

  const [tab, setTab] = useState<TabKey>("summary");
  const [selectedRoundId, setSelectedRoundId] = useState(rounds[0]?.id ?? "");
  const [drafts, setDrafts] = useState<Record<string, MatchDraft>>(() =>
    Object.fromEntries(
      matches.map((match) => [
        match.id,
        {
          homeScore: match.home_score === null ? "" : String(match.home_score),
          awayScore: match.away_score === null ? "" : String(match.away_score),
          status: match.status,
          noShowTeamCode: match.home_no_show
            ? match.home_team_code
            : match.away_no_show
              ? match.away_team_code
              : "",
        },
      ])
    )
  );
  const [openImportId, setOpenImportId] = useState<string | null>(null);
  const [busyMatchId, setBusyMatchId] = useState<string | null>(null);
  const [simulateBusy, setSimulateBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const roundMatches = useMemo(
    () => matches.filter((match) => match.round_id === selectedRoundId),
    [matches, selectedRoundId]
  );
  const playedMatches = useMemo(() => matches.filter((match) => match.status === "PLAYED"), [matches]);
  const pendingMatches = useMemo(() => matches.filter((match) => match.status !== "PLAYED"), [matches]);
  const completedRoundIds = useMemo(() => {
    const result = new Set<string>();
    for (const round of rounds) {
      const rows = matches.filter((match) => match.round_id === round.id);
      if (rows.length && rows.every((match) => match.status === "PLAYED")) result.add(round.id);
    }
    return result;
  }, [matches, rounds]);
  const nextRound = rounds.find((round) => !completedRoundIds.has(round.id)) ?? null;
  const recentMatches = [...playedMatches].reverse().slice(0, 5);
  const nextMatches = pendingMatches.slice(0, 5);
  const displayStandings = groupStandings.length ? groupStandings : [{ groupName: "Clasificación", standings }];

  function updateDraft(matchId: string, patch: Partial<MatchDraft>) {
    setDrafts((current) => ({
      ...current,
      [matchId]: { ...current[matchId], ...patch },
    }));
  }

  async function simulatePreseason() {
    const confirmed = window.confirm("¿Simular resultados para esta pretemporada? Solo se rellenarán partidos no jugados.");
    if (!confirmed) return;
    setSimulateBusy(true);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/competitions/simulate-preseason", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitionId: competition.id }),
      });
      const result = (await response.json()) as ApiResult & { updated?: number };
      if (!response.ok) throw new Error(result.error ?? "No se pudo simular la pretemporada.");
      setMessage(`Simulación completada: ${result.updated ?? 0} partidos actualizados.`);
      router.refresh();
    } catch (simulateError) {
      setError(simulateError instanceof Error ? simulateError.message : "Error desconocido.");
    } finally {
      setSimulateBusy(false);
    }
  }

  async function saveMatch(match: CompetitionMatch) {
    const draft = drafts[match.id];
    if (!draft) return;
    setBusyMatchId(match.id);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch("/api/competitions/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: match.id,
          status: draft.status,
          homeScore: draft.homeScore,
          awayScore: draft.awayScore,
          noShowTeamCode: draft.noShowTeamCode || null,
        }),
      });
      const result = (await response.json()) as ApiResult;
      if (!response.ok) throw new Error(result.error ?? "No se pudo guardar el partido.");
      setMessage(`${getClubName(match.home_team_code)} - ${getClubName(match.away_team_code)} actualizado.`);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Error desconocido.");
    } finally {
      setBusyMatchId(null);
    }
  }

  const tabs: Array<{ key: TabKey; label: string; icon: IconName; visible?: boolean }> = [
    { key: "summary", label: "Resumen", icon: "summary" },
    {
      key: "groups",
      label: "Grupos",
      icon: "groups",
      visible: competition.type === "GROUPS" || competition.type === "GROUPS_KNOCKOUT",
    },
    { key: "matches", label: "Partidos", icon: "calendar" },
    { key: "standings", label: "Clasificación", icon: "chart" },
    { key: "teams", label: "Equipos", icon: "teams" },
    {
      key: "rules",
      label: "Reglas de clasificación",
      icon: "rules",
      visible: competition.type === "GROUPS" || competition.type === "GROUPS_KNOCKOUT",
    },
    { key: "settings", label: "Configuración", icon: "settings" },
  ];

  return (
    <main className="manage-comp-page">
      <nav className="manage-comp-breadcrumbs" aria-label="Migas de pan">
        <Link href="/admin?section=competiciones">Competiciones</Link><span>›</span>
        <span>{competition.name}</span><span>›</span><strong>Gestionar competición</strong>
      </nav>

      <section className="manage-comp-hero">
        <div className="manage-comp-title-wrap">
          <div className="manage-comp-trophy"><UiIcon name="trophy" /></div>
          <div>
            <div className="manage-comp-title-line">
              <h1>{competition.name}</h1>
              <span className={`manage-comp-status is-${competition.status.toLowerCase()}`}>
                <i />{COMP_STATUS[competition.status]}
              </span>
            </div>
            <p>{TYPE_LABEL[competition.type]} · {competition.season?.name ?? "Temporada"}</p>
            <small><UiIcon name="calendar" /> {formatRange(competition.season?.starts_at, competition.season?.ends_at)}</small>
          </div>
        </div>

        <div className="manage-comp-metrics">
          <Metric icon="teams" value={teams.length} label="Equipos" />
          <Metric icon="ball" value={matches.length} label="Partidos" />
          <Metric icon="groups" value={groupStandings.length || "—"} label="Grupos" />
          <Metric icon="settings" value={formatTypeShort(competition.type)} label="Formato" text />
        </div>

        <Link href={`/competiciones/${competition.id}`} className="manage-comp-public-link">
          <UiIcon name="eye" /> Ver en público ↗
        </Link>

        <div className="manage-comp-tabs" role="tablist">
          {tabs.filter((item) => item.visible !== false).map((item) => (
            <button
              key={item.key}
              type="button"
              className={tab === item.key ? "is-active" : ""}
              onClick={() => setTab(item.key)}
            >
              <UiIcon name={item.icon} />{item.label}
            </button>
          ))}
        </div>
      </section>

      {message ? <div className="manage-comp-notice is-success">{message}</div> : null}
      {error ? <div className="manage-comp-notice is-error">{error}</div> : null}

      <div className="manage-comp-layout">
        <div className="manage-comp-maincol">
          {tab === "summary" ? (
            <>
              <section className="manage-comp-card manage-comp-group-card">
                <div className="manage-comp-section-head">
                  <div><span>Vista principal</span><h2>{groupStandings.length ? "Fase de grupos" : "Clasificación actual"}</h2></div>
                  <button type="button" onClick={() => setTab(groupStandings.length ? "groups" : "standings")}>Ver clasificación completa <span>⌄</span></button>
                </div>
                <div className="manage-comp-standings-grid">
                  {displayStandings.slice(0, 2).map((group) => (
                    <CompactStanding key={group.groupName} group={group} rules={qualificationRules} />
                  ))}
                </div>
              </section>

              <div className="manage-comp-match-grid">
                <MatchList title="Últimos partidos" matches={recentMatches} empty="Todavía no hay partidos jugados." />
                <MatchList title="Próximos partidos" matches={nextMatches} empty="No hay partidos pendientes." upcoming />
              </div>

              {(competition.type === "GROUPS" || competition.type === "GROUPS_KNOCKOUT") ? (
                <section className="manage-comp-rule-summary">
                  <div className="manage-comp-rule-icon"><UiIcon name="rules" /></div>
                  <div>
                    <strong>Reglas de clasificación</strong>
                    {qualificationRules.length ? (
                      qualificationRules.slice(0, 4).map((rule) => (
                        <p key={rule.id}>
                          {rule.group_name}: {positionRange(rule.start_position, rule.end_position)} → {siblingCompetitions.find((item) => item.id === rule.destination_competition_id)?.name ?? "Competición destino"}
                        </p>
                      ))
                    ) : <p>Aún no hay reglas de clasificación guardadas.</p>}
                  </div>
                  <button type="button" onClick={() => setTab("rules")}><UiIcon name="settings" /> Ver configuración</button>
                </section>
              ) : null}
            </>
          ) : null}

          {tab === "groups" ? (
            <>
              <CompetitionGroupsAdmin competitionName={competition.name} competitionId={competition.id}
                teams={teams}
                hasMatches={matches.length > 0}
                homeAndAway={competition.name.toLocaleLowerCase("es").includes("copa de leyendas") ? true : competition.home_and_away}
                rounds={rounds}
                matches={matches}
              />
              {groupStandings.length ? (
                <section className="manage-comp-card">
                  <div className="manage-comp-section-head"><div><span>Fase de grupos</span><h2>Clasificaciones por grupo</h2></div></div>
                  <div className="manage-comp-standings-grid">
                    {groupStandings.map((group) => <CompactStanding key={group.groupName} group={group} rules={qualificationRules} full />)}
                  </div>
                </section>
              ) : null}
            </>
          ) : null}

          {tab === "standings" ? (
            <section className="manage-comp-card">
              <div className="manage-comp-section-head"><div><span>Tabla</span><h2>Clasificación</h2></div></div>
              <div className="manage-comp-standings-grid">
                {displayStandings.map((group) => <CompactStanding key={group.groupName} group={group} rules={qualificationRules} full />)}
              </div>
            </section>
          ) : null}

          {tab === "teams" ? (
            <section className="manage-comp-card">
              <div className="manage-comp-section-head"><div><span>Participantes</span><h2>Equipos de la competición</h2></div><strong>{teams.length} equipos</strong></div>
              <div className="manage-comp-team-grid">
                {teams.map((team) => (
                  <div className="manage-comp-team-card" key={team.id}>
                    <Image src={getClubLogo(team.team_code)} alt="" width={42} height={42} />
                    <div><strong>{getClubName(team.team_code)}</strong><span>{team.team_code}{team.group_name ? ` · ${team.group_name}` : ""}</span></div>
                  </div>
                ))}
              </div>
              {!teams.length ? <EmptyState text="Todavía no hay equipos inscritos." /> : null}
              {matches.length ? <p className="manage-comp-help">Los participantes quedan bloqueados cuando ya existe un calendario, para no romper partidos ni estadísticas.</p> : null}
            </section>
          ) : null}

          {tab === "rules" ? (
            <div className="manage-comp-qualification-wrap">
              <CompetitionQualificationAdmin
                competition={competition}
                groupStandings={groupStandings}
                siblingCompetitions={siblingCompetitions}
                rules={qualificationRules}
              />
            </div>
          ) : null}

          {tab === "settings" ? (
            <section className="manage-comp-card">
              <div className="manage-comp-section-head"><div><span>Configuración</span><h2>Información de la competición</h2></div></div>
              <div className="manage-comp-settings-grid">
                <Setting label="Tipo" value={TYPE_LABEL[competition.type]} />
                <Setting label="Estado" value={COMP_STATUS[competition.status]} />
                <Setting label="Temporada" value={competition.season?.name ?? "—"} />
                <Setting label="Sistema de partidos" value={competition.name.toLocaleLowerCase("es").includes("copa de leyendas") || competition.home_and_away ? "Ida y vuelta" : "Una vuelta"} />
                <Setting label="Puntos por victoria" value={String(competition.points_win)} />
                <Setting label="Puntos por empate" value={String(competition.points_draw)} />
                <Setting label="Puntos por derrota" value={String(competition.points_loss)} />
                <Setting label="Partidos" value={String(matches.length)} />
              </div>
            </section>
          ) : null}

          {tab === "matches" ? (
            <MatchesEditor
              rounds={rounds}
              matches={roundMatches}
              selectedRoundId={selectedRoundId}
              setSelectedRoundId={setSelectedRoundId}
              drafts={drafts}
              updateDraft={updateDraft}
              saveMatch={saveMatch}
              busyMatchId={busyMatchId}
              openImportId={openImportId}
              setOpenImportId={setOpenImportId}
            />
          ) : null}
        </div>

        <aside className="manage-comp-sidecol">
          <section className="manage-comp-side-card">
            <div className="manage-comp-side-title"><strong>Estado de la competición</strong><span className={`manage-comp-status is-${competition.status.toLowerCase()}`}><i />{COMP_STATUS[competition.status]}</span></div>
            <div className="manage-comp-progress-copy"><span>Jornadas completadas</span><b>{completedRoundIds.size} / {rounds.length}</b></div>
            <div className="manage-comp-progress"><i style={{ width: `${rounds.length ? Math.round((completedRoundIds.size / rounds.length) * 100) : 0}%` }} /></div>
            <div className="manage-comp-next-round">
              <strong>Próxima jornada</strong>
              {nextRound ? <><span><UiIcon name="calendar" />{nextRound.name}</span><small>{formatRange(nextRound.starts_at, nextRound.ends_at)}</small></> : <small>No hay jornadas pendientes.</small>}
            </div>
          </section>

          <section className="manage-comp-side-card">
            <h3>Acciones rápidas</h3>
            {competition.name.toLocaleLowerCase("es").includes("pretemporada") ? <QuickAction icon="ball" text={simulateBusy ? "Simulando..." : "Simular pretemporada"} onClick={simulateBusy ? () => undefined : simulatePreseason} /> : null}
            <QuickAction icon="calendar" text="Gestionar partidos" onClick={() => setTab("matches")} />
            <QuickAction icon="teams" text="Gestionar equipos" onClick={() => setTab("teams")} />
            {(competition.type === "GROUPS" || competition.type === "GROUPS_KNOCKOUT") ? <QuickAction icon="groups" text={matches.length ? "Gestionar grupos" : teams.length && teams.every((team) => team.group_name?.trim()) ? "Generar calendario de grupos" : groupStandings.length ? "Gestionar grupos" : "Crear grupos"} onClick={() => setTab("groups")} /> : null}
            {(competition.type === "GROUPS" || competition.type === "GROUPS_KNOCKOUT") ? <QuickAction icon="chart" text={competition.status === "FINISHED" ? "Ver reparto final" : "Reparto / finalizar"} onClick={() => setTab("rules")} /> : null}
          </section>

          <section className="manage-comp-side-card manage-comp-info-card">
            <h3>Información</h3>
            <InfoRow icon="trophy" label="Tipo" value={TYPE_LABEL[competition.type]} />
            <InfoRow icon="calendar" label="Temporada" value={competition.season?.name ?? "—"} />
            <InfoRow icon="groups" label="Grupos" value={groupStandings.length ? `${groupStandings.length} grupos` : "Sin grupos"} />
            <InfoRow icon="rules" label="Sistema de partidos" value={competition.name.toLocaleLowerCase("es").includes("copa de leyendas") || competition.home_and_away ? "Ida y vuelta" : "Una vuelta"} />
          </section>

          <Link href="/admin?section=competiciones" className="manage-comp-back">← Volver a competiciones</Link>
        </aside>
      </div>
    </main>
  );
}

function MatchesEditor({
  rounds, matches, selectedRoundId, setSelectedRoundId, drafts, updateDraft, saveMatch,
  busyMatchId, openImportId, setOpenImportId,
}: {
  rounds: CompetitionRound[];
  matches: CompetitionMatch[];
  selectedRoundId: string;
  setSelectedRoundId: (value: string) => void;
  drafts: Record<string, MatchDraft>;
  updateDraft: (id: string, patch: Partial<MatchDraft>) => void;
  saveMatch: (match: CompetitionMatch) => Promise<void>;
  busyMatchId: string | null;
  openImportId: string | null;
  setOpenImportId: (id: string | null) => void;
}) {
  return (
    <section className="manage-comp-card">
      <div className="manage-comp-section-head manage-comp-match-head">
        <div><span>Resultados ESMS</span><h2>Jornadas y partidos</h2><p>Guarda el resultado manualmente o impórtalo desde el archivo .stt. Puedes marcar un NO PRESENTADO en cualquier competición.</p></div>
        <label><span>Jornada</span><select value={selectedRoundId} onChange={(event) => setSelectedRoundId(event.target.value)}>{rounds.map((round) => <option key={round.id} value={round.id}>{round.name}</option>)}</select></label>
      </div>
      <div className="manage-comp-editor-list">
        {matches.map((match) => {
          const draft = drafts[match.id];
          if (!draft) return null;
          const importOpen = openImportId === match.id;
          return (
            <article className="manage-comp-editor-match" key={match.id}>
              <div className="manage-comp-editor-row">
                <Team code={match.home_team_code} reverse />
                <div className="manage-comp-score-inputs"><ScoreInput value={draft.homeScore} onChange={(value) => updateDraft(match.id, { homeScore: value })} /><b>–</b><ScoreInput value={draft.awayScore} onChange={(value) => updateDraft(match.id, { awayScore: value })} /></div>
                <Team code={match.away_team_code} />
                <select value={draft.status} onChange={(event) => updateDraft(match.id, { status: event.target.value as CompetitionMatch["status"] })}>{Object.entries(STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                <select
                  className={`manage-comp-no-show-select ${draft.noShowTeamCode ? "is-no-show" : ""}`}
                  value={draft.noShowTeamCode}
                  onChange={(event) => updateDraft(match.id, { noShowTeamCode: event.target.value })}
                  aria-label="No presentado"
                  title="No presentado"
                >
                  <option value="">Ambos presentados</option>
                  <option value={match.home_team_code}>NP · {getClubName(match.home_team_code)}</option>
                  <option value={match.away_team_code}>NP · {getClubName(match.away_team_code)}</option>
                </select>
                <button type="button" disabled={busyMatchId === match.id} onClick={() => saveMatch(match)}>{busyMatchId === match.id ? "..." : "Guardar"}</button>
              </div>
              <div className="manage-comp-import-row"><span>{match.esms_source ? `Archivo ESMS: ${match.esms_source}` : "Sin .stt importado"}</span><button type="button" onClick={() => setOpenImportId(importOpen ? null : match.id)}>{importOpen ? "Cerrar importador" : "Importar .stt"}</button></div>
              {importOpen ? <EsmsMatchImporter matchId={match.id} homeTeamCode={match.home_team_code} awayTeamCode={match.away_team_code} /> : null}
            </article>
          );
        })}
        {!matches.length ? <EmptyState text="No hay partidos en esta jornada." /> : null}
      </div>
    </section>
  );
}

function CompactStanding({ group, rules, full = false }: { group: GroupStanding; rules: CompetitionQualificationRule[]; full?: boolean }) {
  const visible = full ? group.standings : group.standings.slice(0, 8);
  return (
    <div className="manage-comp-standing">
      <h3>{group.groupName}</h3>
      <div className="manage-comp-table-wrap"><table><thead><tr><th>#</th><th>Equipo</th><th>PJ</th><th>G</th><th>E</th><th>P</th><th>GF</th><th>GC</th><th>DG</th><th>Pts</th></tr></thead>
      <tbody>{visible.map((row) => {
        const rule = rules.find((item) => item.group_name === group.groupName && row.position >= item.start_position && row.position <= item.end_position);
        const zone = rule ? adminQualificationZone(rule) : null;
        return <tr key={row.teamCode} className={zone ? `is-qualified ${zone.className}` : ""}><td><span className={zone ? `manage-comp-position is-qualified ${zone.className}` : "manage-comp-position"} title={zone?.label}>{row.position}</span></td><td><Team code={row.teamCode} compact /></td><td>{row.played}</td><td>{row.won}</td><td>{row.drawn}</td><td>{row.lost}</td><td>{row.goalsFor}</td><td>{row.goalsAgainst}</td><td>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td><td><b>{row.points}</b></td></tr>;
      })}</tbody></table></div>
    </div>
  );
}

function adminQualificationZone(rule: CompetitionQualificationRule) {
  if (rule.start_position <= 2) return { className: "is-champions", label: "Champions League" };
  if (rule.start_position <= 4) return { className: "is-conference", label: "Conference League" };
  if (rule.start_position <= 6) return { className: "is-intertoto", label: "Copa Intertoto" };
  return { className: "is-qualified-generic", label: "Clasificado" };
}

function MatchList({ title, matches, empty, upcoming = false }: { title: string; matches: CompetitionMatch[]; empty: string; upcoming?: boolean }) {
  return <section className="manage-comp-card manage-comp-match-list"><div className="manage-comp-mini-head"><h3>{title}</h3><span>{matches.length ? `${matches.length} mostrados` : ""}</span></div>{matches.length ? matches.map((match) => <div className="manage-comp-mini-match" key={match.id}><span>{formatMatchDate(match)}</span><div><Team code={match.home_team_code} compact /><strong>{upcoming || match.home_score === null || match.away_score === null ? "vs" : `${match.home_score} - ${match.away_score}`}</strong><Team code={match.away_team_code} compact reverse /></div></div>) : <p className="manage-comp-empty-copy">{empty}</p>}</section>;
}

function Metric({ icon, value, label, text = false }: { icon: IconName; value: string | number; label: string; text?: boolean }) {
  return <div className="manage-comp-metric"><span><UiIcon name={icon} /></span><div><strong className={text ? "is-text" : ""}>{value}</strong><small>{label}</small></div></div>;
}
function QuickAction({ icon, text, onClick }: { icon: IconName; text: string; onClick: () => void }) {
  return <button className="manage-comp-quick" type="button" onClick={onClick}><span><UiIcon name={icon} />{text}</span><b>›</b></button>;
}
function InfoRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return <div className="manage-comp-info-row"><UiIcon name={icon} /><div><span>{label}</span><strong>{value}</strong></div></div>;
}
function Setting({ label, value }: { label: string; value: string }) { return <div className="manage-comp-setting"><span>{label}</span><strong>{value}</strong></div>; }
function EmptyState({ text }: { text: string }) { return <div className="manage-comp-empty"><UiIcon name="ball" /><strong>{text}</strong></div>; }

function ScoreInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <input type="number" min="0" step="1" value={value} onChange={(event) => onChange(event.target.value)} />;
}
function Team({ code, reverse = false, compact = false }: { code: string; reverse?: boolean; compact?: boolean }) {
  return <div className={`manage-comp-team ${reverse ? "is-reverse" : ""} ${compact ? "is-compact" : ""}`}><Image src={getClubLogo(code)} alt="" width={compact ? 24 : 36} height={compact ? 24 : 36} /><div><strong>{getClubName(code)}</strong>{compact ? null : <small>{code}</small>}</div></div>;
}

function positionRange(start: number, end: number) { return start === end ? `${start}º` : `${start}º-${end}º`; }
function formatTypeShort(type: Competition["type"]) { if (type === "GROUPS") return "Grupos"; if (type === "GROUPS_KNOCKOUT") return "Grupos + KO"; return TYPE_LABEL[type]; }
function formatRange(start: string | null | undefined, end: string | null | undefined) { const a = formatDate(start); const b = formatDate(end); return a === "—" && b === "—" ? "Fechas sin definir" : `${a} - ${b}`; }
function formatDate(value: string | null | undefined) { if (!value) return "—"; const date = new Date(value.includes("T") ? value : `${value}T12:00:00`); if (Number.isNaN(date.getTime())) return "—"; return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date); }
function formatMatchDate(match: CompetitionMatch) { const value = match.played_at ?? match.scheduled_at; return value ? formatDate(value) : "—"; }

type IconName = "trophy" | "calendar" | "teams" | "groups" | "ball" | "settings" | "eye" | "summary" | "chart" | "rules";
function UiIcon({ name }: { name: IconName }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "trophy") return <svg viewBox="0 0 24 24"><path {...p} d="M8 4h8v4.5c0 3-1.7 5.5-4 5.5s-4-2.5-4-5.5V4Z"/><path {...p} d="M8 6H5v1.5c0 2 1.2 3.5 3.2 3.8M16 6h3v1.5c0 2-1.2 3.5-3.2 3.8M12 14v3M9 20h6M10 17h4"/></svg>;
  if (name === "calendar") return <svg viewBox="0 0 24 24"><rect {...p} x="4" y="5.5" width="16" height="14" rx="2"/><path {...p} d="M8 3.5v4M16 3.5v4M4 9.5h16"/></svg>;
  if (name === "teams" || name === "groups") return <svg viewBox="0 0 24 24"><circle {...p} cx="9" cy="8" r="2.6"/><circle {...p} cx="16.5" cy="9" r="2"/><path {...p} d="M3.8 19c.5-4 2.2-6 5.2-6s4.7 2 5.2 6M14 14c3.3-.5 5.4 1.3 6 4.5"/></svg>;
  if (name === "ball") return <svg viewBox="0 0 24 24"><circle {...p} cx="12" cy="12" r="8"/><path {...p} d="m12 8 3 2.2-1.1 3.5h-3.8L9 10.2 12 8ZM10.1 13.7 7 16M13.9 13.7 17 16M9 10.2 6.3 9M15 10.2 17.7 9M12 8V4.2"/></svg>;
  if (name === "settings") return <svg viewBox="0 0 24 24"><circle {...p} cx="12" cy="12" r="3"/><path {...p} d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/></svg>;
  if (name === "eye") return <svg viewBox="0 0 24 24"><path {...p} d="M3.5 12s3-5 8.5-5 8.5 5 8.5 5-3 5-8.5 5-8.5-5-8.5-5Z"/><circle {...p} cx="12" cy="12" r="2.2"/></svg>;
  if (name === "chart") return <svg viewBox="0 0 24 24"><path {...p} d="M5 19V10M10 19V5M15 19v-7M20 19V8"/></svg>;
  if (name === "rules") return <svg viewBox="0 0 24 24"><path {...p} d="M4 7h12M13 4l3 3-3 3M20 17H8M11 14l-3 3 3 3"/></svg>;
  return <svg viewBox="0 0 24 24"><path {...p} d="M4 6h16M4 12h16M4 18h10"/></svg>;
}

