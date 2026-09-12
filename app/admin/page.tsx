import Link from "next/link";

import AdminLineupsDashboard from "@/components/AdminLineupsDashboard";
import AdminSeasonsHub from "@/components/AdminSeasonsHub";
import AwardVotingAdmin from "@/components/AwardVotingAdmin";
import ClubClassAdmin from "@/components/ClubClassAdmin";
import CompetitionAdmin from "@/components/CompetitionAdmin";
import CompetitionHistoryAdmin from "@/components/CompetitionHistoryAdmin";
import CompetitionNoShowAdmin from "@/components/CompetitionNoShowAdmin";
import CompetitionStandingZonesAdmin from "@/components/CompetitionStandingZonesAdmin";
import DrawAdmin from "@/components/draws/DrawAdmin";
import DropboxIntegrationAdmin from "@/components/DropboxIntegrationAdmin";
import RecordsAdmin from "@/components/RecordsAdmin";
import TransferHistoryAdmin from "@/components/TransferHistoryAdmin";
import { isAdminSession } from "@/lib/admin-auth";
import { getAdminLineupCompetitions } from "@/lib/admin-lineups";
import { getAdminSeasonsData } from "@/lib/admin-seasons";
import { getAwardPollDetail, getAwardPolls } from "@/lib/award-voting";
import { getClubCodes } from "@/lib/club-history";
import { getClubName } from "@/lib/club-names";
import { getCompetitionSeriesAdminData } from "@/lib/competition-history";
import { getCompetitionCounts, getCompetitions, getSeasons } from "@/lib/competitions";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getDropboxIntegrationSettings } from "@/lib/dropbox";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  searchParams: Promise<{
    error?: string;
    section?: string;
  }>;
};

type AdminStats = {
  seasons: number | null;
  competitions: number | null;
  transfers: number | null;
  pendingTransfers: number | null;
  activeLoans: number | null;
  polls: number | null;
  players: number | null;
  series: number | null;
};

const SECTIONS = [
  ["inicio", "Resumen"],
  ["clubes", "Clubes"],
  ["temporadas", "Temporadas"],
  ["competiciones", "Competiciones"],
  ["sorteos", "Sorteos"],
  ["alineaciones", "Alineaciones"],
  ["mercado", "Mercado"],
  ["votaciones", "Votaciones"],
  ["historico", "Histórico"],
  ["integraciones", "Integraciones"],
] as const;

type AdminSection = (typeof SECTIONS)[number][0];

const SECTION_KEYS = new Set<string>(SECTIONS.map(([key]) => key));

export default async function AdminPage({ searchParams }: Props) {
  const isAdmin = await isAdminSession();
  const params = await searchParams;

  if (!isAdmin) return <LoginPanel error={params.error} />;

  const section: AdminSection = SECTION_KEYS.has(params.section ?? "")
    ? (params.section as AdminSection)
    : "inicio";

  const content = await renderSection(section);

  return (
    <main className="admin-unified-page">
      <section className="admin-unified-hero">
        <div>
          <div className="app-eyebrow">Manager Tools</div>
          <h1>Panel de administración</h1>
          <p>
            Toda la gestión de la Liga de Leyendas está centralizada aquí.
            Cambia de apartado sin salir del panel de administración.
          </p>
        </div>
        <form action="/api/admin/logout" method="post">
          <button type="submit" className="admin-unified-logout">Cerrar sesión</button>
        </form>
      </section>

      <nav className="admin-unified-nav" aria-label="Administración">
        {SECTIONS.map(([key, label]) => (
          <Link
            key={key}
            href={key === "inicio" ? "/admin" : `/admin?section=${key}`}
            className={section === key ? "is-active" : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>

      <section className="admin-unified-content">
        {content}
      </section>
    </main>
  );
}

async function renderSection(section: AdminSection) {
  switch (section) {
    case "clubes":
      return <ClubesSection />;
    case "temporadas":
      return <TemporadasSection />;
    case "competiciones":
      return <CompeticionesSection />;
    case "sorteos":
      return <SorteosSection />;
    case "alineaciones":
      return <AlineacionesSection />;
    case "mercado":
      return <MercadoSection />;
    case "votaciones":
      return <VotacionesSection />;
    case "historico":
      return <HistoricoSection />;
    case "integraciones":
      return <IntegracionesSection />;
    default:
      return <ResumenSection />;
  }
}

async function ResumenSection() {
  const stats = await getAdminStats();
  const areas = [
    ["Clubes", "clubes", "Clase, identidad y metadatos de los clubes."],
    ["Temporadas", "temporadas", "Abrir, cerrar y organizar temporadas."],
    ["Competiciones", "competiciones", "Formatos, equipos, grupos, calendarios y resultados."],
    ["Sorteos", "sorteos", "Bombos, sorteos y asignaciones automáticas."],
    ["Alineaciones", "alineaciones", "Controlar envíos por jornada y competición."],
    ["Mercado", "mercado", "Fichajes, cesiones, intercambios y movimientos."],
    ["Votaciones", "votaciones", "Premios, votaciones y enlaces de participación."],
    ["Histórico", "historico", "Series, palmarés, rondas y criterios históricos."],
    ["Integraciones", "integraciones", "Dropbox, carpetas de plantillas y sincronización automática."],
  ] as const;

  return (
    <div className="admin-unified-stack">
      <section className="admin-unified-stats">
        <StatCard label="Temporadas" value={stats.seasons} helper="creadas" />
        <StatCard label="Competiciones" value={stats.competitions} helper="registradas" />
        <StatCard label="Fichajes" value={stats.transfers} helper="movimientos" />
        <StatCard label="Jugadores" value={stats.players} helper="registrados" />
      </section>

      <section className="admin-unified-grid">
        {areas.map(([title, key, description]) => (
          <Link key={key} href={`/admin?section=${key}`} className="admin-unified-card">
            <span className="app-eyebrow">Administración</span>
            <h2>{title}</h2>
            <p>{description}</p>
            <strong>Abrir apartado →</strong>
          </Link>
        ))}
      </section>

      <section className="admin-unified-overview-grid">
        <div className="app-panel-soft rounded-2xl p-5">
          <div className="app-eyebrow">Estado rápido</div>
          <div className="mt-4 space-y-3">
            <CheckRow label="Movimientos pendientes" value={stats.pendingTransfers} href="/admin?section=mercado" />
            <CheckRow label="Cesiones activas" value={stats.activeLoans} href="/admin?section=mercado" />
            <CheckRow label="Votaciones creadas" value={stats.polls} href="/admin?section=votaciones" />
            <CheckRow label="Series históricas" value={stats.series} href="/admin?section=historico" />
          </div>
        </div>
        <div className="app-panel rounded-2xl p-5">
          <div className="app-eyebrow">Accesos públicos</div>
          <div className="mt-4 grid gap-2">
            <Link className="admin-unified-quick" href="/clubes">Ver clubes</Link>
            <Link className="admin-unified-quick" href="/competiciones">Ver competiciones</Link>
            <Link className="admin-unified-quick" href="/mercado">Ver mercado</Link>
            <Link className="admin-unified-quick" href="/buscador">Buscador de jugadores</Link>
          </div>
        </div>
      </section>
    </div>
  );
}

async function ClubesSection() {
  const codes = await getClubCodes();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("club_metadata").select("team_code,club_class");
  if (error) throw error;
  const rows = (data ?? []) as Array<{ team_code: string; club_class: string | null }>;
  const classByCode = new Map(rows.map((row) => [String(row.team_code).toUpperCase(), row.club_class ? String(row.club_class) : null]));
  const clubs = codes
    .map((teamCode) => ({ teamCode, name: getClubName(teamCode), clubClass: classByCode.get(teamCode) ?? null }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
  return <ClubClassAdmin initialClubs={clubs} />;
}

async function TemporadasSection() {
  const seasons = await getAdminSeasonsData();
  return <AdminSeasonsHub seasons={seasons} />;
}

async function CompeticionesSection() {
  const [seasons, competitions, countsByCompetition] = await Promise.all([
    getSeasons(),
    getCompetitions(),
    getCompetitionCounts(),
  ]);
  const compact = competitions.map((competition) => ({
    id: competition.id,
    name: competition.name,
    seasonName: competition.season?.name ?? "Temporada",
    type: competition.type,
  }));
  return (
    <div className="admin-unified-stack">
      <CompetitionAdmin seasons={seasons} competitions={competitions} countsByCompetition={countsByCompetition} />
      <details className="admin-comp-advanced">
        <summary>Configuración avanzada</summary>
        <div className="admin-comp-advanced-body">
          <CompetitionStandingZonesAdmin competitions={compact} />
          <CompetitionNoShowAdmin competitions={compact} />
        </div>
      </details>
    </div>
  );
}

async function SorteosSection() {
  const competitions = await getCompetitions();
  return <DrawAdmin competitions={competitions.map((competition) => ({
    id: competition.id,
    name: competition.name,
    type: competition.type,
    seasonName: competition.season?.name ?? "Temporada",
  }))} />;
}

async function AlineacionesSection() {
  const competitions = await getAdminLineupCompetitions();
  return (
    <div className="admin-unified-tool">
      <div className="admin-unified-section-heading">
        <div className="app-eyebrow">Administración</div>
        <h2>Control de alineaciones</h2>
        <p>Comprueba qué equipos han enviado alineación por competición y jornada.</p>
      </div>
      <AdminLineupsDashboard competitions={competitions} />
    </div>
  );
}

async function MercadoSection() {
  const supabase = getSupabaseAdmin();
  const [transfersResult, playersResult, seasonsResult] = await Promise.all([
    supabase.from("transfers").select("*").order("transfer_date", { ascending: false }),
    supabase.from("players").select("id,esms_name,current_team_code,owner_team_code"),
    supabase.from("seasons").select("id,name").order("created_at", { ascending: false }),
  ]);
  if (transfersResult.error) throw transfersResult.error;
  if (playersResult.error) throw playersResult.error;
  if (seasonsResult.error) throw seasonsResult.error;
  const teamCodes = Array.from(new Set(
    [
      ...(transfersResult.data ?? []).flatMap((row: any) => [row.from_team_code, row.to_team_code, row.owner_team_code]),
      ...(playersResult.data ?? []).flatMap((row: any) => [row.current_team_code, row.owner_team_code]),
    ].flat().filter((value): value is string => typeof value === "string" && value.length > 0)
  )).sort();
  return <TransferHistoryAdmin initialTransfers={transfersResult.data ?? []} players={playersResult.data ?? []} seasons={seasonsResult.data ?? []} teams={teamCodes} />;
}

async function VotacionesSection() {
  const supabase = getSupabaseAdmin();
  const [{ data: seasonsData, error: seasonsError }, pollSummaries] = await Promise.all([
    supabase.from("seasons").select("id,name").order("starts_at", { ascending: false, nullsFirst: false }),
    getAwardPolls(),
  ]);
  if (seasonsError) throw seasonsError;
  const details = await Promise.all(pollSummaries.map((poll: any) => getAwardPollDetail(poll.id)));
  return <AwardVotingAdmin seasons={seasonsData ?? []} initialPolls={details.filter((poll): poll is NonNullable<typeof poll> => Boolean(poll))} />;
}

async function HistoricoSection() {
  const supabase = getSupabaseAdmin();
  const [seriesResult, competitionsResult, roundsResult, historyData] = await Promise.all([
    supabase.from("competition_series").select("id,name,type,scope,league_level,counts_as_league,counts_as_champions,tracks_promotions,promoted_places").order("name"),
    supabase.from("competitions").select("id,name,series_id,season:seasons(name)").order("created_at", { ascending: false }),
    supabase.from("competition_rounds").select("id,competition_id,number,name,stage").order("number"),
    getCompetitionSeriesAdminData(),
  ]);
  if (seriesResult.error) throw seriesResult.error;
  if (competitionsResult.error) throw competitionsResult.error;
  if (roundsResult.error) throw roundsResult.error;
  return (
    <div className="admin-unified-stack">
      <div id="records">
        <RecordsAdmin initialSeries={seriesResult.data ?? []} competitions={(competitionsResult.data ?? []) as never[]} initialRounds={roundsResult.data ?? []} />
      </div>
      <div id="series" className="admin-unified-series-block">
        <CompetitionHistoryAdmin initialSeries={historyData.series} competitions={historyData.competitions} />
      </div>
    </div>
  );
}


async function IntegracionesSection() {
  const settings = await getDropboxIntegrationSettings();
  return <DropboxIntegrationAdmin initialSettings={settings} />;
}

async function getAdminStats(): Promise<AdminStats> {
  const supabase = getSupabaseAdmin();
  const [seasons, competitions, transfers, pendingTransfers, activeLoans, polls, players, series] = await Promise.all([
    countRows(supabase, "seasons"),
    countRows(supabase, "competitions"),
    countRows(supabase, "transfers"),
    countRows(supabase, "transfers", "movement_type", "PENDING"),
    countRows(supabase, "transfers", "movement_type", "LOAN"),
    countRows(supabase, "award_polls"),
    countRows(supabase, "players"),
    countRows(supabase, "competition_series"),
  ]);
  return { seasons, competitions, transfers, pendingTransfers, activeLoans, polls, players, series };
}

async function countRows(supabase: ReturnType<typeof getSupabaseAdmin>, table: string, column?: string, value?: string) {
  let query = supabase.from(table).select("id", { count: "exact", head: true });
  if (column && value) query = query.eq(column, value);
  const { count, error } = await query;
  return error ? null : count ?? 0;
}

function StatCard({ label, value, helper }: { label: string; value: number | null; helper: string }) {
  return (
    <div className="app-panel rounded-2xl p-5">
      <div className="text-3xl font-black text-[var(--mt-text)]">{value ?? "—"}</div>
      <div className="mt-1 text-xs font-black uppercase tracking-wider text-[var(--mt-muted)]">{label}</div>
      <div className="mt-1 text-xs text-[var(--mt-muted)]">{helper}</div>
    </div>
  );
}

function CheckRow({ label, value, href }: { label: string; value: number | null; href: string }) {
  return (
    <Link href={href} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)] px-4 py-3 transition hover:border-[var(--mt-gold)] hover:bg-[var(--mt-surface-soft)]">
      <span className="text-sm font-bold text-[var(--mt-text)]">{label}</span>
      <span className="rounded-full bg-[var(--mt-surface-soft)] px-3 py-1 text-xs font-black text-[var(--mt-gold-dark)]">{value ?? "—"}</span>
    </Link>
  );
}

function LoginPanel({ error }: { error?: string }) {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-xl items-center p-4 sm:p-6">
      <section className="w-full rounded-[13px] border border-[var(--mt-line)] bg-[var(--mt-surface)] p-6 shadow-xl">
        <div className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--mt-gold-dark)]">Manager Tools</div>
        <h1 className="mt-2 text-2xl font-black text-[var(--mt-text)]">Administración</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--mt-muted)]">Entra para acceder al panel único de administración.</p>
        <form action="/api/admin/login" method="post" className="mt-6 space-y-4">
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-semibold text-[var(--mt-text)]">Contraseña de administrador</label>
            <input id="password" name="password" type="password" required autoComplete="current-password" className="w-full rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)] px-4 py-3 text-[var(--mt-text)] outline-none focus:border-[var(--mt-gold)]" />
          </div>
          {error === "1" ? <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">Contraseña incorrecta.</div> : null}
          {error === "config" ? <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">No se pudo iniciar la sesión. Revisa las variables de entorno del servidor.</div> : null}
          <button type="submit" className="w-full rounded-xl bg-[var(--mt-gold)] px-4 py-3 text-sm font-black text-[var(--mt-surface)] transition hover:bg-[var(--mt-gold-dark)]">Entrar como administrador</button>
        </form>
      </section>
    </main>
  );
}
