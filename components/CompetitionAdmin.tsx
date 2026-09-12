"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { Competition, Season } from "@/lib/competition-types";
import { CLUB_NAMES } from "@/lib/club-names";
import { OFFICIAL_COMPETITION_TEMPLATES, OFFICIAL_FORMAT_NOTES } from "@/lib/official-competitions";

type CompetitionWithSeason = Competition & { season: Season | null };

type CompetitionCounts = {
  teamCount: number;
  roundCount: number;
  matchCount: number;
};

type Props = {
  seasons: Season[];
  competitions: CompetitionWithSeason[];
  countsByCompetition: Record<string, CompetitionCounts>;
};

type ApiResponse = { ok?: boolean; error?: string; created?: Array<{ id: string; name: string }> };

type TypeFilter = "ALL" | Competition["type"];
type StatusFilter = "ALL" | Competition["status"];

const TYPE_LABEL: Record<Competition["type"], string> = {
  LEAGUE: "Liga",
  CUP: "Copa",
  GROUPS: "Grupos",
  GROUPS_KNOCKOUT: "Grupos + KO",
  SUPERCUP: "Supercopa",
};

const STATUS_LABEL: Record<Competition["status"], string> = {
  DRAFT: "Creada",
  ACTIVE: "Activa",
  FINISHED: "Finalizada",
};

async function requestJson(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  const data = (await response.json()) as ApiResponse;
  if (!response.ok) throw new Error(data.error ?? "Error desconocido.");
  return data;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

export default function CompetitionAdmin({
  seasons,
  competitions,
  countsByCompetition,
}: Props) {
  const router = useRouter();
  const activeSeason = seasons.find((season) => season.is_active) ?? seasons[0] ?? null;

  const [seasonId, setSeasonId] = useState(activeSeason?.id ?? "ALL");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [createOpen, setCreateOpen] = useState(false);
  const [officialOpen, setOfficialOpen] = useState(false);
  const [officialSeasonId, setOfficialSeasonId] = useState(activeSeason?.id ?? seasons[0]?.id ?? "");
  const [teamQuery, setTeamQuery] = useState("");
  const [selectedPreseasonId, setSelectedPreseasonId] = useState("");
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    return competitions.filter((competition) => {
      if (seasonId !== "ALL" && competition.season_id !== seasonId) return false;
      if (typeFilter !== "ALL" && competition.type !== typeFilter) return false;
      if (statusFilter !== "ALL" && competition.status !== statusFilter) return false;
      if (normalized && !competition.name.toLocaleLowerCase("es").includes(normalized)) return false;
      return true;
    });
  }, [competitions, query, seasonId, statusFilter, typeFilter]);

  const summary = useMemo(() => {
    const scoped = competitions.filter(
      (competition) => seasonId === "ALL" || competition.season_id === seasonId
    );
    return scoped.reduce(
      (acc, competition) => {
        const counts = countsByCompetition[competition.id];
        acc.competitions += 1;
        acc.teams += counts?.teamCount ?? 0;
        acc.matches += counts?.matchCount ?? 0;
        if (competition.status === "ACTIVE") acc.active += 1;
        return acc;
      },
      { competitions: 0, teams: 0, matches: 0, active: 0 }
    );
  }, [competitions, countsByCompetition, seasonId]);

  const firstSeasonId = useMemo(() => {
    return [...seasons]
      .sort((a, b) => {
        const aDate = a.starts_at ?? "";
        const bDate = b.starts_at ?? "";
        if (aDate !== bDate) return aDate.localeCompare(bDate);
        return a.name.localeCompare(b.name, "es");
      })[0]?.id ?? "";
  }, [seasons]);

  const isOfficialFirstSeason = Boolean(officialSeasonId && officialSeasonId === firstSeasonId);
  const mustCreatePreseasonFirst = isOfficialFirstSeason && !selectedPreseasonId;

  const preseasonOptions = useMemo(() => {
    return competitions
      .filter((competition) => {
        const normalizedName = competition.name.toLocaleLowerCase("es");
        const isPreseason = normalizedName.includes("pretemporada") || normalizedName.includes("inaugural");
        if (!isPreseason) return false;
        if (officialSeasonId && competition.season_id !== officialSeasonId) return false;
        return competition.type === "GROUPS" || competition.type === "GROUPS_KNOCKOUT";
      })
      .sort((a, b) => {
        if (a.status === "FINISHED" && b.status !== "FINISHED") return -1;
        if (a.status !== "FINISHED" && b.status === "FINISHED") return 1;
        return a.name.localeCompare(b.name, "es");
      });
  }, [competitions, officialSeasonId]);

  const suggestedPreseasonId =
    preseasonOptions.find((competition) => competition.status === "FINISHED")?.id ??
    preseasonOptions[0]?.id ??
    "";

  const availableTeams = useMemo(() => {
    const normalized = teamQuery.trim().toLocaleLowerCase("es");
    return Object.entries(CLUB_NAMES)
      .map(([code, name]) => ({ code, name }))
      .filter(({ code, name }) =>
        !normalized ||
        code.toLocaleLowerCase("es").includes(normalized) ||
        name.toLocaleLowerCase("es").includes(normalized)
      )
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [teamQuery]);

  function openCreateModal() {
    setTeamQuery("");
    setSelectedTeams([]);
    setCreateOpen(true);
  }

  function openOfficialModal() {
    const initialSeasonId = seasonId !== "ALL" ? seasonId : activeSeason?.id ?? seasons[0]?.id ?? "";
    setTeamQuery("");
    setOfficialSeasonId(initialSeasonId);
    setSelectedTeams(Object.keys(CLUB_NAMES));
    const initialPreseason = competitions
      .filter((competition) => {
        const normalizedName = competition.name.toLocaleLowerCase("es");
        return (
          competition.season_id === initialSeasonId &&
          (normalizedName.includes("pretemporada") || normalizedName.includes("inaugural"))
        );
      })
      .sort((a, b) => {
        if (a.status === "FINISHED" && b.status !== "FINISHED") return -1;
        if (a.status !== "FINISHED" && b.status === "FINISHED") return 1;
        return a.name.localeCompare(b.name, "es");
      })[0]?.id ?? "";
    setSelectedPreseasonId(initialPreseason);
    setOfficialOpen(true);
  }

  function toggleTeam(code: string) {
    setSelectedTeams((current) =>
      current.includes(code)
        ? current.filter((item) => item !== code)
        : [...current, code]
    );
  }

  function toggleAllVisibleTeams() {
    const visibleCodes = availableTeams.map((team) => team.code);
    const allVisibleSelected = visibleCodes.every((code) => selectedTeams.includes(code));
    setSelectedTeams((current) => {
      if (allVisibleSelected) {
        return current.filter((code) => !visibleCodes.includes(code));
      }
      return Array.from(new Set([...current, ...visibleCodes]));
    });
  }

  function clearFilters() {
    setQuery("");
    setTypeFilter("ALL");
    setStatusFilter("ALL");
  }

  async function createCompetition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);

    const form = new FormData(event.currentTarget);
    try {
      await requestJson("/api/competitions/competition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seasonId: form.get("seasonId"),
          name: form.get("name"),
          type: form.get("type"),
          homeAndAway: form.get("homeAndAway") === "on",
          teams: selectedTeams,
        }),
      });
      setCreateOpen(false);
      setMessage("Competición creada correctamente.");
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Error desconocido.");
    } finally {
      setBusy(false);
    }
  }


  async function createOfficialFormat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);

    const form = new FormData(event.currentTarget);
    try {
      const selectedTemplates = OFFICIAL_COMPETITION_TEMPLATES
        .filter((template) => form.get(`template-${template.key}`) === "on")
        .filter((template) => !(selectedPreseasonId && template.key === "pretemporada-inaugural"))
        .filter((template) => isOfficialFirstSeason || template.key !== "pretemporada-inaugural")
        .filter((template) => !mustCreatePreseasonFirst || template.key === "pretemporada-inaugural")
        .map((template) => template.key);
      const data = await requestJson("/api/competitions/official-format", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seasonId: officialSeasonId,
          preseasonCompetitionId: selectedPreseasonId,
          teams: selectedTeams,
          include: selectedTemplates,
        }),
      });
      setOfficialOpen(false);
      setMessage(`Formato oficial creado: ${data.created?.length ?? selectedTemplates.length} competiciones.`);
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Error desconocido.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteCompetition(competition: CompetitionWithSeason) {
    const counts = countsByCompetition[competition.id];
    const confirmed = window.confirm(
      `¿Eliminar definitivamente «${competition.name}»?\n\n` +
        `Se eliminarán también ${counts?.teamCount ?? 0} equipos asociados, ` +
        `${counts?.roundCount ?? 0} jornadas/rondas y ${counts?.matchCount ?? 0} partidos.\n\n` +
        "Esta acción no se puede deshacer."
    );
    if (!confirmed) return;

    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      await requestJson(`/api/competitions/competition?id=${encodeURIComponent(competition.id)}`, {
        method: "DELETE",
      });
      setMessage(`«${competition.name}» eliminada.`);
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Error desconocido.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="admin-competitions-page">
      <section className="admin-comp-hero">
        <div className="admin-comp-heading">
          <span className="admin-comp-heading-icon"><TrophyIcon /></span>
          <div>
            <h1>Competiciones</h1>
            <p>Gestiona las competiciones de la temporada actual.</p>
          </div>
        </div>

        <div className="admin-comp-hero-actions">
          <button type="button" className="admin-comp-create is-official" onClick={openOfficialModal}>
            <TrophyIcon />
            Crear formato foro
          </button>
          <button type="button" className="admin-comp-create" onClick={openCreateModal}>
            <PlusIcon />
            Nueva competición
          </button>
        </div>

        <div className="admin-comp-summary">
          <SummaryCard icon={<TrophyIcon />} value={summary.competitions} label="Total competiciones" tone="blue" />
          <SummaryCard icon={<TeamsIcon />} value={summary.teams} label="Equipos totales" tone="violet" />
          <SummaryCard icon={<BallIcon />} value={summary.matches} label="Partidos totales" tone="slate" />
          <SummaryCard
            icon={<PlayIcon />}
            value={summary.active > 0 ? "En curso" : "Sin actividad"}
            label={summary.active > 0 ? `${summary.active} competición${summary.active === 1 ? "" : "es"} activa${summary.active === 1 ? "" : "s"}` : "Estado de la temporada"}
            tone="green"
          />
        </div>
      </section>

      {message ? <Notice type="success">{message}</Notice> : null}
      {error ? <Notice type="error">{error}</Notice> : null}

      <section className="admin-comp-panel">
        <div className="admin-comp-filters">
          <label className="admin-comp-search">
            <SearchIcon />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar competición..."
              aria-label="Buscar competición"
            />
          </label>

          <FilterSelect label="Temporada" value={seasonId} onChange={setSeasonId}>
            {activeSeason ? <option value={activeSeason.id}>{activeSeason.name} · actual</option> : null}
            {seasons.filter((season) => season.id !== activeSeason?.id).map((season) => (
              <option value={season.id} key={season.id}>{season.name}</option>
            ))}
            <option value="ALL">Todas</option>
          </FilterSelect>

          <FilterSelect label="Tipo" value={typeFilter} onChange={(value) => setTypeFilter(value as TypeFilter)}>
            <option value="ALL">Todos</option>
            <option value="LEAGUE">Liga</option>
            <option value="CUP">Copa</option>
            <option value="GROUPS">Grupos</option>
            <option value="GROUPS_KNOCKOUT">Grupos + KO</option>
            <option value="SUPERCUP">Supercopa</option>
          </FilterSelect>

          <FilterSelect label="Estado" value={statusFilter} onChange={(value) => setStatusFilter(value as StatusFilter)}>
            <option value="ALL">Todos</option>
            <option value="DRAFT">Creada</option>
            <option value="ACTIVE">Activa</option>
            <option value="FINISHED">Finalizada</option>
          </FilterSelect>

          <button type="button" className="admin-comp-clear" onClick={clearFilters}>
            <ResetIcon /> Limpiar
          </button>
        </div>

        <div className="admin-comp-table-wrap">
          <table className="admin-comp-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Temporada</th>
                <th>Equipos</th>
                <th>Partidos</th>
                <th>Estado</th>
                <th>Inicio</th>
                <th>Fin</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((competition, index) => {
                const counts = countsByCompetition[competition.id] ?? {
                  teamCount: 0,
                  roundCount: 0,
                  matchCount: 0,
                };
                return (
                  <tr key={competition.id}>
                    <td className="admin-comp-index">{index + 1}</td>
                    <td>
                      <div className="admin-comp-name-cell">
                        <span className={`admin-comp-logo admin-comp-logo-${competition.type.toLowerCase()}`}>
                          <TrophyIcon />
                        </span>
                        <div>
                          <strong>{competition.name}</strong>
                          <small>{competition.season?.name ?? "Sin temporada"}</small>
                        </div>
                      </div>
                    </td>
                    <td><span className={`admin-comp-type admin-comp-type-${competition.type.toLowerCase()}`}>{TYPE_LABEL[competition.type]}</span></td>
                    <td><span className="admin-comp-season"><CalendarIcon />{competition.season?.name ?? "—"}</span></td>
                    <td className="admin-comp-number">{counts.teamCount}</td>
                    <td className="admin-comp-number">{counts.matchCount}</td>
                    <td><StatusBadge status={competition.status} /></td>
                    <td className="admin-comp-date">{formatDate(competition.season?.starts_at)}</td>
                    <td className="admin-comp-date">{formatDate(competition.season?.ends_at)}</td>
                    <td>
                      <div className="admin-comp-actions">
                        <Link href={`/admin/competiciones/${competition.id}`} className="admin-comp-action" title="Gestionar competición"><PencilIcon /></Link>
                        <Link href={`/admin/competiciones/${competition.id}`} className="admin-comp-action" title="Equipos y partidos"><TeamsIcon /></Link>
                        <Link href={`/competiciones/${competition.id}`} className="admin-comp-action" title="Ver competición"><ChartIcon /></Link>
                        <button
                          type="button"
                          className="admin-comp-action admin-comp-action-delete"
                          title="Eliminar competición"
                          disabled={busy}
                          onClick={() => deleteCompetition(competition)}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {visible.length === 0 ? (
            <div className="admin-comp-empty">
              <TrophyIcon />
              <strong>No hay competiciones</strong>
              <span>Prueba con otros filtros o crea una nueva competición.</span>
            </div>
          ) : null}
        </div>

        <div className="admin-comp-footer">
          <span>Mostrando {visible.length} de {competitions.length} competiciones</span>
          <div className="admin-comp-pagination">
            <button type="button" disabled aria-label="Página anterior">‹</button>
            <button type="button" className="is-active">1</button>
            <button type="button" disabled aria-label="Página siguiente">›</button>
          </div>
        </div>
      </section>


      {officialOpen ? (
        <div className="admin-comp-modal-backdrop" role="presentation" onMouseDown={() => !busy && setOfficialOpen(false)}>
          <div className="admin-comp-modal admin-comp-official-modal" role="dialog" aria-modal="true" aria-labelledby="official-format-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="admin-comp-modal-head">
              <div>
                <span>Formato oficial del foro</span>
                <h2 id="official-format-title">Crear temporada completa</h2>
              </div>
              <button type="button" aria-label="Cerrar" disabled={busy} onClick={() => setOfficialOpen(false)}>×</button>
            </div>

            <form onSubmit={createOfficialFormat} className="admin-comp-form">
              <label>
                <span>Temporada</span>
                <select
                  name="seasonId"
                  value={officialSeasonId}
                  onChange={(event) => {
                    setOfficialSeasonId(event.target.value);
                    setSelectedPreseasonId("");
                  }}
                  required
                >
                  <option value="">Seleccionar temporada</option>
                  {seasons.map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}
                </select>
              </label>

              <section className="admin-comp-official-info">
                <strong>Qué se creará</strong>
                <ul>{OFFICIAL_FORMAT_NOTES.map((note) => <li key={note}>{note}</li>)}</ul>
              </section>

              <label>
                <span>Pretemporada inaugural, opcional</span>
                <select name="preseasonCompetitionId" value={selectedPreseasonId} onChange={(event) => setSelectedPreseasonId(event.target.value)}>
                  <option value="">No usar pretemporada: repartir por el orden elegido abajo</option>
                  {preseasonOptions.length ? null : <option value="" disabled>No hay ninguna pretemporada en esta temporada</option>}
                  {preseasonOptions.map((competition) => (
                    <option key={competition.id} value={competition.id}>{competition.name} · {TYPE_LABEL[competition.type]} · {competition.season?.name ?? "Sin temporada"}</option>
                  ))}
                </select>
                <small className="admin-comp-team-help">
                  {isOfficialFirstSeason
                    ? "En la primera temporada puedes crear la Pretemporada Inaugural con los grupos y calendarios oficiales. Cuando esté terminada, selecciónala aquí para crear Primera y Segunda según la clasificación."
                    : "En temporadas posteriores no se crea pretemporada inaugural. Primera, Segunda y los bombos se calculan desde la temporada anterior."}
                </small>
              </label>

              <section className="admin-comp-official-grid">
                {OFFICIAL_COMPETITION_TEMPLATES.map((template) => {
                  const usesExistingPreseason = Boolean(selectedPreseasonId && template.key === "pretemporada-inaugural");
                  const disabledAfterFirstSeason = !isOfficialFirstSeason && template.key === "pretemporada-inaugural";
                  const waitsForPreseason = mustCreatePreseasonFirst && template.key !== "pretemporada-inaugural";
                  return (
                    <label className={`admin-comp-official-option${usesExistingPreseason || disabledAfterFirstSeason || waitsForPreseason ? " is-disabled" : ""}`} key={`${template.key}-${officialSeasonId}-${selectedPreseasonId}`}>
                      <input
                        type="checkbox"
                        name={`template-${template.key}`}
                        defaultChecked={
                          mustCreatePreseasonFirst
                            ? template.key === "pretemporada-inaugural"
                            : !usesExistingPreseason && !disabledAfterFirstSeason
                        }
                        disabled={usesExistingPreseason || disabledAfterFirstSeason || waitsForPreseason}
                      />
                      <span>
                        <strong>{template.name}</strong>
                        <small>
                          {usesExistingPreseason
                            ? "Se usará la pretemporada seleccionada arriba. No se creará otra."
                            : disabledAfterFirstSeason
                              ? "Solo se crea en la primera temporada."
                              : waitsForPreseason
                                ? "Primero crea y termina la Pretemporada Inaugural."
                              : template.description}
                        </small>
                      </span>
                    </label>
                  );
                })}
              </section>

              <section className="admin-comp-team-picker">
                <div className="admin-comp-team-picker-head">
                  <div>
                    <span>Equipos ordenados</span>
                    <strong>{selectedPreseasonId ? "La pretemporada decide Primera y Segunda" : `${selectedTeams.length} seleccionados · mínimo 32`}</strong>
                  </div>
                  <button type="button" onClick={toggleAllVisibleTeams}>
                    {availableTeams.length > 0 && availableTeams.every((team) => selectedTeams.includes(team.code)) ? "Quitar visibles" : "Seleccionar visibles"}
                  </button>
                </div>
                <p className="admin-comp-team-help">{selectedPreseasonId ? "Con pretemporada seleccionada, Primera y Segunda salen de sus grupos. Esta lista solo se usa como apoyo para el resto del formato si hiciera falta." : "El orden importa: los 16 primeros serán Primera División, los 16 siguientes Segunda División y los 32 formarán las copas del foro."}</p>
                <label className="admin-comp-team-search">
                  <SearchIcon />
                  <input type="search" value={teamQuery} onChange={(event) => setTeamQuery(event.target.value)} placeholder="Buscar por club o código..." />
                </label>
                <div className="admin-comp-team-grid">
                  {availableTeams.map((team) => {
                    const checked = selectedTeams.includes(team.code);
                    const order = selectedTeams.indexOf(team.code) + 1;
                    return (
                      <label key={team.code} className={`admin-comp-team-option${checked ? " is-selected" : ""}`}>
                        <input type="checkbox" checked={checked} onChange={() => toggleTeam(team.code)} />
                        <span className="admin-comp-team-code">{checked ? order : team.code}</span>
                        <span className="admin-comp-team-name">{team.name}</span>
                      </label>
                    );
                  })}
                </div>
              </section>

              <div className="admin-comp-modal-actions">
                <button type="button" disabled={busy} className="admin-comp-secondary" onClick={() => setOfficialOpen(false)}>Cancelar</button>
                <button type="submit" disabled={busy || (!selectedPreseasonId && selectedTeams.length < 32)} className="admin-comp-primary">{busy ? "Creando..." : "Crear formato completo"}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {createOpen ? (
        <div className="admin-comp-modal-backdrop" role="presentation" onMouseDown={() => !busy && setCreateOpen(false)}>
          <div className="admin-comp-modal" role="dialog" aria-modal="true" aria-labelledby="new-competition-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="admin-comp-modal-head">
              <div>
                <span>Nueva competición</span>
                <h2 id="new-competition-title">Crear competición</h2>
              </div>
              <button type="button" aria-label="Cerrar" disabled={busy} onClick={() => setCreateOpen(false)}>×</button>
            </div>

            <form onSubmit={createCompetition} className="admin-comp-form">
              <label>
                <span>Temporada</span>
                <select name="seasonId" defaultValue={seasonId !== "ALL" ? seasonId : activeSeason?.id ?? ""} required>
                  <option value="">Seleccionar temporada</option>
                  {seasons.map((season) => <option key={season.id} value={season.id}>{season.name}</option>)}
                </select>
              </label>

              <label>
                <span>Nombre</span>
                <input name="name" placeholder="Ej. Evolution League" required autoFocus />
              </label>

              <label>
                <span>Tipo</span>
                <select name="type" defaultValue="LEAGUE">
                  <option value="LEAGUE">Liga</option>
                  <option value="CUP">Copa</option>
                  <option value="GROUPS">Solo grupos</option>
                  <option value="GROUPS_KNOCKOUT">Grupos + eliminatorias</option>
                  <option value="SUPERCUP">Supercopa</option>
                </select>
              </label>

              <label className="admin-comp-checkbox">
                <input type="checkbox" name="homeAndAway" defaultChecked />
                <span>Ida y vuelta</span>
              </label>

              <section className="admin-comp-team-picker">
                <div className="admin-comp-team-picker-head">
                  <div>
                    <span>Equipos participantes</span>
                    <strong>{selectedTeams.length} seleccionados</strong>
                  </div>
                  <button type="button" onClick={toggleAllVisibleTeams}>
                    {availableTeams.length > 0 && availableTeams.every((team) => selectedTeams.includes(team.code))
                      ? "Quitar visibles"
                      : "Seleccionar visibles"}
                  </button>
                </div>

                <label className="admin-comp-team-search">
                  <SearchIcon />
                  <input
                    type="search"
                    value={teamQuery}
                    onChange={(event) => setTeamQuery(event.target.value)}
                    placeholder="Buscar por club o código..."
                  />
                </label>

                <div className="admin-comp-team-grid">
                  {availableTeams.map((team) => {
                    const checked = selectedTeams.includes(team.code);
                    return (
                      <label key={team.code} className={`admin-comp-team-option${checked ? " is-selected" : ""}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTeam(team.code)}
                        />
                        <span className="admin-comp-team-code">{team.code}</span>
                        <span className="admin-comp-team-name">{team.name}</span>
                      </label>
                    );
                  })}
                </div>
                <small className="admin-comp-team-help">
                  Puedes crear la competición sin equipos y añadirlos después, o seleccionarlos ahora.
                </small>
              </section>

              <div className="admin-comp-modal-actions">
                <button type="button" disabled={busy} className="admin-comp-secondary" onClick={() => setCreateOpen(false)}>Cancelar</button>
                <button type="submit" disabled={busy} className="admin-comp-primary">{busy ? "Creando..." : "Crear competición"}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}

function SummaryCard({ icon, value, label, tone }: { icon: ReactNode; value: number | string; label: string; tone: "blue" | "violet" | "slate" | "green" }) {
  return (
    <div className="admin-comp-summary-card">
      <span className={`admin-comp-summary-icon is-${tone}`}>{icon}</span>
      <div>
        <strong>{value}</strong>
        <small>{label}</small>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <label className="admin-comp-filter-select">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>{children}</select>
    </label>
  );
}

function StatusBadge({ status }: { status: Competition["status"] }) {
  return <span className={`admin-comp-status admin-comp-status-${status.toLowerCase()}`}><i />{STATUS_LABEL[status]}</span>;
}

function Notice({ type, children }: { type: "success" | "error"; children: ReactNode }) {
  return <div className={`admin-comp-notice is-${type}`}>{children}</div>;
}

function SvgIcon({ children }: { children: ReactNode }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
}
function TrophyIcon() { return <SvgIcon><path d="M8 4h8v4a4 4 0 0 1-8 0V4Z"/><path d="M8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4M12 12v5M8 21h8M9 17h6"/></SvgIcon>; }
function TeamsIcon() { return <SvgIcon><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></SvgIcon>; }
function BallIcon() { return <SvgIcon><circle cx="12" cy="12" r="9"/><path d="m12 8 3 2-1 4h-4l-1-4 3-2ZM7 5l2 5M17 5l-2 5M4 13l6 1M20 13l-6 1M8 20l2-6M16 20l-2-6"/></SvgIcon>; }
function PlayIcon() { return <SvgIcon><path d="m8 5 11 7-11 7V5Z"/></SvgIcon>; }
function PlusIcon() { return <SvgIcon><path d="M12 5v14M5 12h14"/></SvgIcon>; }
function SearchIcon() { return <SvgIcon><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></SvgIcon>; }
function ResetIcon() { return <SvgIcon><path d="M4 4v6h6M20 20v-6h-6"/><path d="M5.5 15a7 7 0 0 0 11.7 2M18.5 9A7 7 0 0 0 6.8 7"/></SvgIcon>; }
function CalendarIcon() { return <SvgIcon><path d="M6 3v3M18 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z"/></SvgIcon>; }
function PencilIcon() { return <SvgIcon><path d="m4 20 4-.8L18.5 8.7a2 2 0 0 0-2.8-2.8L5.2 16.4 4 20Z"/><path d="m14.5 7 2.8 2.8"/></SvgIcon>; }
function ChartIcon() { return <SvgIcon><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></SvgIcon>; }
function TrashIcon() { return <SvgIcon><path d="M4 7h16M9 7V4h6v3M8 11v6M12 11v6M16 11v6M6 7l1 14h10l1-14"/></SvgIcon>; }

