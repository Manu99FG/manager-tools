import type { EsmsPlayer } from "@/lib/parser-esms";

export type EsmsPosition =
  | "GK"
  | "DF"
  | "DM"
  | "MF"
  | "AM"
  | "FW";

/**
 * Reglamento global de posiciones ESMS.
 *
 * GK -> St principal.
 * DF -> Tk principal.
 * DM -> Ps principal + Tk como secundaria dominante.
 * MF -> Ps principal + Tk y Sh superiores a 10.
 * AM -> Ps principal + Sh como secundaria dominante.
 * FW -> Sh principal.
 *
 * "Principal" significa la habilidad de mayor valor. En caso de empate
 * por el máximo se mantiene una prioridad determinista: St -> Tk -> Sh -> Ps.
 * Para jugadores con Ps estrictamente principal, MF tiene prioridad cuando
 * Tk > 10 y Sh > 10; si no, Tk >= Sh da DM y Sh > Tk da AM.
 */

export function hasMainRatingTie(player: EsmsPlayer): boolean {
  const ratings = [player.st, player.tk, player.ps, player.sh];
  const max = Math.max(...ratings);
  return ratings.filter((value) => value === max).length > 1;
}

export function getPlayerProfile(player: EsmsPlayer): EsmsPosition {
  const { st, tk, ps, sh } = player;
  const max = Math.max(st, tk, ps, sh);

  // Habilidades principales puras / empates por el máximo.
  if (st === max) return "GK";
  if (tk === max) return "DF";
  if (sh === max) return "FW";

  // A partir de aquí Ps es estrictamente la habilidad principal.
  if (ps === max) {
    // Centrocampista equilibrado: ambas secundarias ofensiva/defensiva > 10.
    if (tk > 10 && sh > 10) return "MF";

    // Mediocentro defensivo: Tk es la secundaria dominante.
    if (tk >= sh) return "DM";

    // Mediocentro ofensivo: Sh es la secundaria dominante.
    return "AM";
  }

  // Salvaguarda teórica; Math.max garantiza que no debería alcanzarse.
  return "MF";
}

/**
 * Se conserva por compatibilidad con componentes antiguos que resolvían
 * manualmente empates. Ahora usa exactamente el reglamento global.
 */
export function getTieFallbackPosition(player: EsmsPlayer): EsmsPosition {
  return getPlayerProfile(player);
}
