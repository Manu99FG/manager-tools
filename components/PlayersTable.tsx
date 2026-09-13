"use client";

import { useEffect, useMemo, useState } from "react";
import PlayerNameLink from "@/components/PlayerNameLink";
import type { EsmsPlayer } from "@/lib/parser-esms";
import {
  getPlayerProfile,
  getTieFallbackPosition,
  hasMainRatingTie,
  type EsmsPosition,
} from "@/lib/esms-player";
import { getFlagUrl } from "@/lib/nationalities";

type PlayerWithHistory = EsmsPlayer & { playerId: string | null };
type PlayerSortKey = keyof EsmsPlayer | "position";
type SortDirection = "asc" | "desc";

const positionOrder: Record<EsmsPosition, number> = {
  GK: 1, DF: 2, DM: 3, MF: 4, AM: 5, FW: 6,
};

const positionColors: Record<EsmsPosition, string> = {
  GK: "bg-[var(--mt-gold)] text-white",
  DF: "bg-[var(--mt-gold)] text-white",
  DM: "bg-[var(--mt-gold)] text-white",
  MF: "bg-[var(--mt-gold)] text-white",
  AM: "bg-[var(--mt-gold)] text-white",
  FW: "bg-[var(--mt-gold)] text-white",
};

export default function PlayersTable({ players, team }: { players: PlayerWithHistory[]; team: string }) {
  const [sortKey, setSortKey] = useState<PlayerSortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [positions, setPositions] = useState<Record<string, EsmsPosition>>({});
  const [query, setQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState<"ALL" | EsmsPosition>("ALL");

  function getPlayerKey(player: EsmsPlayer): string {
    return `${team}:${player.name}`;
  }

  useEffect(() => {
    const resolved: Record<string, EsmsPosition> = {};
    for (const player of players) {
      const playerKey = getPlayerKey(player);
      const storageKey = `manager-tools-position-v2:${playerKey}`;
      const previousPosition = localStorage.getItem(storageKey) as EsmsPosition | null;
      if (!hasMainRatingTie(player)) {
        const currentPosition = getPlayerProfile(player);
        resolved[playerKey] = currentPosition;
        localStorage.setItem(storageKey, currentPosition);
      } else if (previousPosition) {
        resolved[playerKey] = previousPosition;
      } else {
        resolved[playerKey] = getTieFallbackPosition(player);
      }
    }
    setPositions(resolved);
  }, [players, team]);

  function resolvePosition(player: EsmsPlayer): EsmsPosition {
    return positions[getPlayerKey(player)] ?? getPlayerProfile(player);
  }

  function handleSort(key: PlayerSortKey) {
    if (sortKey === key) {
      setSortDirection((current) => current === "asc" ? "desc" : "asc");
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  }

  const visiblePlayers = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    const filtered = players.filter((player) => {
      const matchesName = !normalized || player.name.replaceAll("_", " ").toLocaleLowerCase("es").includes(normalized);
      const matchesPosition = positionFilter === "ALL" || resolvePosition(player) === positionFilter;
      return matchesName && matchesPosition;
    });
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      if (sortKey === "position") {
        const result = positionOrder[resolvePosition(a)] - positionOrder[resolvePosition(b)];
        return sortDirection === "asc" ? result : -result;
      }
      const aValue = a[sortKey];
      const bValue = b[sortKey];
      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }
      const result = String(aValue).localeCompare(String(bValue), "es", { sensitivity: "base" });
      return sortDirection === "asc" ? result : -result;
    });
  }, [players, positions, positionFilter, query, sortDirection, sortKey]);

  function SortHeader({ label, field, align = "center" }: { label: string; field: PlayerSortKey; align?: "left" | "center" }) {
    const active = sortKey === field;
    return (
      <th onClick={() => handleSort(field)} title={`Ordenar por ${label}`} className={`cursor-pointer select-none whitespace-nowrap border-r border-[var(--mt-line)] px-2.5 py-3 text-[9px] font-black uppercase tracking-[0.055em] text-[var(--mt-muted)] transition hover:bg-[var(--mt-surface-soft)] hover:text-[var(--mt-gold-dark)] ${align === "left" ? "text-left" : "text-center"}`}>
        <div className={`flex items-center gap-1.5 ${align === "center" ? "justify-center" : ""}`}>
          <span>{label}</span>{active ? <span className="text-[8px] text-[var(--mt-gold)]">{sortDirection === "asc" ? "▲" : "▼"}</span> : null}
        </div>
      </th>
    );
  }

  const columns: Array<[string, PlayerSortKey]> = [
    ["Edad","age"],["Nat","nat"],["St","st"],["Tk","tk"],["Ps","ps"],["Sh","sh"],["Ag","ag"],
    ["KAb","kab"],["TAb","tab"],["PAb","pab"],["SAb","sab"],["Gam","gam"],["Sub","sub"],["Min","min"],
    ["Mom","mom"],["Sav","sav"],["Con","con"],["Ktk","ktk"],["Kps","kps"],["Sht","sht"],["Gls","gls"],
    ["Ass","ass"],["DP","dp"],["Inj","inj"],["Sus","sus"],["Fit","fit"],
  ];

  return (
    <div>
      <div className="flex flex-col gap-4 border-b border-[var(--mt-line)] bg-[var(--mt-surface)] px-5 py-5 lg:flex-row lg:items-center lg:justify-between sm:px-6">
        <div className="flex items-center gap-3">
          <div><div className="text-[9px] font-black uppercase tracking-[.14em] text-[var(--mt-gold)]">Equipo</div><h2 className="mt-1 text-[20px] font-black tracking-[-0.025em] text-[var(--mt-text)] sm:text-[24px]">Plantilla actual</h2></div>
          <span className="rounded-full border border-[var(--mt-line)] bg-[var(--mt-surface-soft)] px-3 py-1 text-[9px] font-black text-[var(--mt-gold)]">{visiblePlayers.length} jugadores</span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select value={positionFilter} onChange={(e) => setPositionFilter(e.target.value as "ALL" | EsmsPosition)} className="h-10 rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)] px-3 text-[11px] font-bold text-[var(--mt-text)] outline-none transition focus:border-[var(--mt-gold)] focus:bg-[var(--mt-surface)]">
            <option value="ALL">Todas las posiciones</option>
            <option value="GK">Porteros · GK</option><option value="DF">Defensas · DF</option><option value="DM">Mediocentros defensivos · DM</option>
            <option value="MF">Centrocampistas · MF</option><option value="AM">Mediapuntas · AM</option><option value="FW">Delanteros · FW</option>
          </select>
          <label className="flex h-10 min-w-[250px] items-center gap-2 rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)] px-3 transition focus-within:border-[var(--mt-gold)] focus-within:bg-[var(--mt-surface)]">
            <span className="text-[var(--mt-muted)]">⌕</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar jugador..." className="min-w-0 flex-1 bg-transparent text-[11px] text-[var(--mt-text)] outline-none placeholder:text-[var(--mt-muted)]" />
          </label>
        </div>
      </div>

      <div className="overflow-x-auto bg-[var(--mt-surface)]">
        <table className="w-full min-w-max border-collapse text-[10px] text-[var(--mt-text)]">
          <thead className="border-b border-[var(--mt-line)] bg-[var(--mt-surface-soft)] text-[var(--mt-muted)]">
            <tr>
              <SortHeader label="Pos" field="position" align="left" />
              <SortHeader label="Nombre" field="name" align="left" />
              {columns.map(([label, field]) => <SortHeader key={field} label={label} field={field} />)}
            </tr>
          </thead>
          <tbody>
            {visiblePlayers.map((player, index) => {
              const position = resolvePosition(player);
              const flagUrl = getFlagUrl(player.nat);
              const values: Array<keyof EsmsPlayer> = ["age","nat","st","tk","ps","sh","ag","kab","tab","pab","sab","gam","sub","min","mom","sav","con","ktk","kps","sht","gls","ass","dp","inj","sus","fit"];
              return (
                <tr key={`${player.name}-${index}`} className="border-b border-[var(--mt-line)] bg-[var(--mt-surface)] transition odd:bg-[var(--mt-surface)] hover:bg-[var(--mt-surface-soft)]">
                  <td className="px-2 py-1.5"><div className={`min-w-[48px] rounded-[4px] border px-2 py-1 text-center text-[9px] font-black ${positionColors[position]}`}>{position}</div></td>
                  <td className="min-w-[145px] whitespace-nowrap px-3 py-2 font-black text-[var(--mt-text)]"><PlayerNameLink playerId={player.playerId} name={player.name} className="text-[var(--mt-text)] hover:text-[var(--mt-gold-dark)]" /></td>
                  {values.map((field) => {
                    if (field === "nat") return <td key={field} className="px-2.5 py-2 text-center" title={player.nat.toUpperCase()}>{flagUrl ? <img src={flagUrl} alt={player.nat} width={24} height={18} loading="lazy" className="mx-auto h-[18px] w-6 rounded-sm object-cover" /> : <span className="font-bold uppercase text-[var(--mt-text)]">{player.nat}</span>}</td>;
                    const value = player[field];
                    const statusClass = field === "inj" && player.inj > 0 ? "font-black text-red-500" : field === "sus" && player.sus > 0 ? "font-black text-red-500" : field === "fit" ? (player.fit >= 90 ? "font-black text-[var(--mt-gold)]" : player.fit >= 75 ? "font-black text-[var(--mt-gold)]" : "font-black text-red-500") : "";
                    return <td key={field} className={`px-2.5 py-2 text-center ${statusClass}`}>{String(value)}</td>;
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
