import type { CompetitionType } from "@/lib/competition-types";

export type OfficialCompetitionTemplate = {
  key: string;
  name: string;
  type: CompetitionType;
  homeAndAway: boolean;
  teamMode: "FIRST_16" | "SECOND_16" | "ALL" | "EMPTY";
  description: string;
};

export const OFFICIAL_COMPETITION_TEMPLATES: OfficialCompetitionTemplate[] = [
  { key: "pretemporada-inaugural", name: "Pretemporada Inaugural", type: "GROUPS", homeAndAway: false, teamMode: "EMPTY", description: "4 grupos de 8 con calendario fijo. Los 4 primeros de cada grupo van a Primera y los 4 últimos a Segunda." },
  { key: "primera", name: "Primera División", type: "LEAGUE", homeAndAway: true, teamMode: "FIRST_16", description: "Liga principal de 16 equipos. Descienden los 3 últimos." },
  { key: "segunda", name: "Segunda División", type: "LEAGUE", homeAndAway: true, teamMode: "SECOND_16", description: "Liga de 16 equipos. Ascienden los 2 primeros y el playoff de ascenso queda integrado en esta misma competición: 3.º vs 6.º y 4.º vs 5.º." },
  { key: "intercontinental", name: "Copa Intercontinental", type: "GROUPS", homeAndAway: false, teamMode: "EMPTY", description: "Solo fase de grupos: 4 grupos de 8. 1.º-2.º a Champions, 3.º-4.º a Conference, 5.º-6.º a Intertoto y 7.º-8.º eliminados." },
  { key: "champions", name: "Champions League", type: "CUP", homeAndAway: true, teamMode: "EMPTY", description: "Eliminatorias ida/vuelta; final a partido único." },
  { key: "conference", name: "Conference League", type: "CUP", homeAndAway: true, teamMode: "EMPTY", description: "Eliminatorias ida/vuelta; final a partido único." },
  { key: "intertoto", name: "Copa Intertoto", type: "CUP", homeAndAway: true, teamMode: "EMPTY", description: "Eliminatorias ida/vuelta; final a partido único." },
  { key: "copa-leyendas", name: "Copa de Leyendas", type: "GROUPS_KNOCKOUT", homeAndAway: true, teamMode: "ALL", description: "8 clases de 4 equipos. La fase de clases se juega a ida y vuelta; los 2 primeros de cada clase pasan a octavos." },
  { key: "recopa-liga", name: "Recopa de la Liga", type: "SUPERCUP", homeAndAway: false, teamMode: "EMPTY", description: "Campeón Primera División vs Campeón Copa de Leyendas." },
  { key: "recopa-intercontinental", name: "Recopa Intercontinental", type: "SUPERCUP", homeAndAway: false, teamMode: "EMPTY", description: "Campeón Champions League vs Campeón Conference League." },
  { key: "mundial-clubes", name: "Mundial de Clubes", type: "CUP", homeAndAway: false, teamMode: "EMPTY", description: "Campeones clasificados con prioridad si un club gana varios títulos." },
];

export const OFFICIAL_FORMAT_NOTES = [
  "Pretemporada Inaugural: 4 grupos de 8, calendario fijo y solo fase de grupos.",
  "Ligas principales: Primera y Segunda División de 16 equipos. En la primera temporada salen de la pretemporada: 4 primeros de cada grupo a Primera y 4 últimos a Segunda.",
  "Copa Intercontinental: primera temporada excepcional con bombos desde pretemporada; después, bombos por franjas de Primera y Segunda: Bombo 1 con 1.º-4.º de Primera y 1.º-4.º de Segunda, Bombo 2 con 5.º-8.º de ambas, Bombo 3 con 9.º-12.º de ambas y Bombo 4 con 13.º-16.º de ambas.",
  "Champions, Conference e Intertoto nacen de la Copa Intercontinental con cruces A vs B y C vs D entre mejor y peor clasificado.",
  "Copa de Leyendas: 32 equipos, 8 clases de 4 según la clase administrativa del club; fase de clases a ida y vuelta y los 2 primeros de cada clase pasan a octavos.",
  "Recopas y Mundial de Clubes quedan creados con huecos de campeón para rellenarlos al finalizar las competiciones origen.",
  "Desempate oficial recomendado: puntos, menos no presentados, enfrentamientos directos, diferencia de goles y goles a favor.",
];

export function officialTeamCodesForTemplate(mode: OfficialCompetitionTemplate["teamMode"], orderedTeams: string[]) {
  if (mode === "FIRST_16") return orderedTeams.slice(0, 16);
  if (mode === "SECOND_16") return orderedTeams.slice(16, 32);
  if (mode === "ALL") return orderedTeams.slice(0, 32);
  return [];
}

