import type { CompetitionType } from './competition-types';

export const COMPETITION_FORMAT = {
  LEAGUE: { label: 'Liga normal', tab: 'Clasificación', unit: 'Jornadas', description: 'Cada jornada cuenta. Sigue la clasificación y la carrera por el título.' },
  CUP: { label: 'Eliminatorias directas', tab: 'Eliminatorias', unit: 'Rondas', description: 'Sigue los enfrentamientos de cada ronda hasta la final.' },
  GROUPS: { label: 'Fase de grupos', tab: 'Grupos', unit: 'Jornadas', description: 'Una clasificación por grupo. Consulta puntos, resultados y posiciones.' },
  GROUPS_KNOCKOUT: { label: 'Grupos + eliminatorias', tab: 'Grupos y eliminatorias', unit: 'Rondas', description: 'De la fase de grupos al cuadro final: dos etapas, un mismo título.' },
  SUPERCUP: { label: 'Supercopa', tab: 'Eliminatorias', unit: 'Rondas', description: 'Los campeones se encuentran. Sigue la disputa por el título.' },
} satisfies Record<CompetitionType, { label: string; tab: string; unit: string; description: string }>;

export function isKnockoutFormat(type: CompetitionType) {
  return type === 'CUP' || type === 'SUPERCUP';
}

// Older records have no phase field. Only explicit round names are classified;
// team membership alone cannot distinguish rematches from knockout ties.
export function roundPhase(name: string): 'groups' | 'knockout' | 'unknown' {
  const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/\b(grupo\w*|jornada\w*|group\w*)\b/.test(normalized)) return 'groups';
  if (/\b(final\w*|semifinal\w*|cuartos|octavos|dieciseisavos|treintaidosavos|eliminatoria\w*|knockout|play.?off\w*)\b/.test(normalized)) return 'knockout';
  return 'unknown';
}
