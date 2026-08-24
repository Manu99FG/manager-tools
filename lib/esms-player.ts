import type { EsmsPlayer } from "@/lib/parser-esms";

export type EsmsPosition =
  | "GK"
  | "DF"
  | "DM"
  | "MF"
  | "AM"
  | "FW";

const HYBRID_MAX_DIFFERENCE = 5;

export function hasMainRatingTie(player: EsmsPlayer): boolean {
  const ratings = [
    player.st,
    player.tk,
    player.ps,
    player.sh,
  ];

  const max = Math.max(...ratings);

  return ratings.filter((value) => value === max).length > 1;
}

export function getPlayerProfile(
  player: EsmsPlayer
): EsmsPosition {
  const { st, tk, ps, sh } = player;

  const max = Math.max(st, tk, ps, sh);

  if (hasMainRatingTie(player)) {
    return getTieFallbackPosition(player);
  }

  if (st === max) {
    return "GK";
  }

  if (sh === max) {
    return "FW";
  }

  if (tk === max) {
    return "DF";
  }

  const differenceTk = ps - tk;
  const differenceSh = ps - sh;

  if (
    tk > sh &&
    differenceTk <= HYBRID_MAX_DIFFERENCE
  ) {
    return "DM";
  }

  if (
    sh > tk &&
    differenceSh <= HYBRID_MAX_DIFFERENCE
  ) {
    return "AM";
  }

  return "MF";
}

export function getTieFallbackPosition(
  player: EsmsPlayer
): EsmsPosition {
  const { st, tk, ps, sh } = player;

  const max = Math.max(st, tk, ps, sh);

  if (st === max) return "GK";
  if (sh === max) return "FW";
  if (tk === max) return "DF";

  return "MF";
}