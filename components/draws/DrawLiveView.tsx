"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { getClubLogo } from "@/lib/club-logo";
import { getClubName } from "@/lib/club-names";

type RevealItem = { index: number; pot: string; teamCode: string; groupName: string };

type DrawResult = {
  generatedAt: string;
  pots: Array<{ name: string; teams: string[] }>;
  groups: Record<string, string[]>;
  reveal: RevealItem[];
};

type Draw = {
  id: string;
  name: string;
  scheduled_at: string;
  status: string;
  result: DrawResult | null;
  generated_at: string | null;
  reveal_interval_seconds: number;
};

type ApiResponse = { ok?: boolean; draw?: Draw; serverNow?: string; error?: string };

function formatClock(ms: number) {
  const safe = Math.max(0, ms);
  const total = Math.floor(safe / 1000);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${days ? `${days}d ` : ""}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function DrawLiveView({ drawId }: { drawId: string }) {
  const [draw, setDraw] = useState<Draw | null>(null);
  const [serverOffset, setServerOffset] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [speedMs, setSpeedMs] = useState(2400);
  const [replayStartMs, setReplayStartMs] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch(`/api/competitions/draws/${drawId}`, { cache: "no-store" });
        const data = (await response.json()) as ApiResponse;
        if (!response.ok) throw new Error(data.error ?? "No se pudo cargar el sorteo.");
        if (cancelled) return;
        setDraw(data.draw ?? null);
        if (data.serverNow) setServerOffset(new Date(data.serverNow).getTime() - Date.now());
        setError(null);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Error desconocido.");
      }
    }
    load();
    const timer = window.setInterval(load, 5000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [drawId]);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, []);

  const now = nowMs + serverOffset;
  const scheduled = draw ? new Date(draw.scheduled_at).getTime() : 0;
  const countdown = scheduled - now;
  const totalSteps = (draw?.result?.reveal.length ?? 0) * 3;
  const generatedAt = draw?.generated_at ? new Date(draw.generated_at).getTime() : null;
  const playbackBase = replayStartMs ?? generatedAt;
  const step = draw?.result && playbackBase ? Math.max(0, Math.min(totalSteps, Math.floor((nowMs - playbackBase) / speedMs))) : 0;
  const currentIndex = Math.min(draw?.result?.reveal.length ?? 0, Math.floor(step / 3));
  const phase = step % 3;
  const current = draw?.result?.reveal[currentIndex] ?? null;
  const visibleCount = Math.min(draw?.result?.reveal.length ?? 0, Math.floor((step + 1) / 3));
  const visible = useMemo(() => draw?.result?.reveal.slice(0, visibleCount) ?? [], [draw, visibleCount]);
  const drawnTeams = useMemo(() => new Set(visible.map((item) => item.teamCode)), [visible]);

  const visibleGroups = useMemo(() => {
    const groups: Record<string, string[]> = { "Grupo A": [], "Grupo B": [], "Grupo C": [], "Grupo D": [] };
    for (const item of visible) groups[item.groupName].push(item.teamCode);
    return groups;
  }, [visible]);

  if (!draw) return <main className="draw-live-page"><div className="draw-live-card">Cargando sorteo...</div></main>;

  const phaseTitle = !current
    ? countdown > 0 ? "Cuenta atrás" : "Esperando sorteo"
    : phase === 0 ? "Sorteo GRUPO"
    : phase === 1 ? "Sorteo BOMBO"
    : "Sorteo EQUIPO";

  return <main className="draw-live-page">
    <section className="draw-live-hero">
      <span>Sorteo real en directo</span>
      <h1>{draw.name}</h1>
      {countdown > 0 ? <p>El sorteo empezará en <strong>{formatClock(countdown)}</strong></p> : <p>{draw.result ? "Sorteo en directo" : "Preparando sorteo..."}</p>}
      {error ? <div className="draw-live-error">{error}</div> : null}
    </section>

    {draw.result ? <section className="draw-live-controls">
      <button type="button" onClick={() => setReplayStartMs(Date.now())}>Volver a ver sorteo</button>
      <label><span>Velocidad</span><select value={speedMs} onChange={(event) => { setSpeedMs(Number(event.target.value)); setReplayStartMs(Date.now()); }}>
        <option value={4000}>Lenta</option>
        <option value={2400}>Normal</option>
        <option value={1200}>Rápida</option>
        <option value={700}>Muy rápida</option>
      </select></label>
      <strong>{visible.length} / {draw.result.reveal.length} equipos colocados</strong>
    </section> : null}

    <section className="draw-live-stage">
      <div className="draw-live-current">
        <small>{phaseTitle}</small>
        {current ? <>
          <div className="draw-live-step-stack">
            <span className="is-active">Grupo: <b>{current.groupName}</b></span>
            <span className={phase >= 1 ? "is-active" : ""}>Bombo: <b>{phase >= 1 ? current.pot : "..."}</b></span>
            <span className={phase >= 2 ? "is-active" : ""}>Equipo: <b>{phase >= 2 ? getClubName(current.teamCode) : "..."}</b></span>
          </div>
          {phase >= 2 ? <Image src={getClubLogo(current.teamCode)} alt="" width={78} height={78} /> : null}
        </> : <strong>{countdown > 0 ? formatClock(countdown) : "Esperando primera bola"}</strong>}
      </div>
      <div className="draw-live-groups">
        {Object.entries(visibleGroups).map(([groupName, teams]) => <article key={groupName}>
          <h2>{groupName}</h2>
          <div>{teams.map((teamCode) => <span key={teamCode}><Image src={getClubLogo(teamCode)} alt="" width={28} height={28} />{getClubName(teamCode)}</span>)}</div>
        </article>)}
      </div>
    </section>

    {draw.result ? <section className="draw-live-pots">
      <div className="draw-live-pots-head">
        <span>Bombos del sorteo</span>
        <strong>{visible.length} / {draw.result.reveal.length} bolas reveladas</strong>
      </div>
      <div className="draw-live-pots-grid">
        {draw.result.pots.map((pot) => <article key={pot.name}>
          <h2>{pot.name}</h2>
          <div>{pot.teams.map((teamCode) => <span key={teamCode} className={drawnTeams.has(teamCode) ? "is-drawn" : ""}>
            <Image src={getClubLogo(teamCode)} alt="" width={24} height={24} />
            {getClubName(teamCode)}
          </span>)}</div>
        </article>)}
      </div>
    </section> : null}
  </main>;
}
