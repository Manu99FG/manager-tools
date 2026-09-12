# Revisión visual — Liga de Leyendas

Se han inventariado los 284 archivos del ZIP y modificado 56 archivos de presentación. El inventario completo figura al final. Los archivos de datos, API, SQL, configuración y recursos gráficos se conservan; escudos y fotografías mantienen sus colores originales.

## Cambios

- Paleta centralizada en las variables --mt-* de app/globals.css, con los ocho colores de la guía.
- Sustitución de los azules, violetas y variantes decorativas por dorados y neutros en estilos comunes y utilidades de páginas y componentes.
- Superficies, bordes, títulos, texto secundario, formularios, tablas, pestañas y tarjetas ajustados. Radios de tarjetas y paneles entre 12 y 14 px y sombras suaves en las reglas comunes.
- Colores de resultados, sanciones y estados conservados. Empates en gris legible, tanto en indicadores como en gráficos.
- Foco visible dorado y soporte de movimiento reducido.
- Cobertura de Clubes, Competiciones, Partidos, Estadísticas, Historial, Récords, jugadores, herramientas, mercado, votaciones y administración.

## Validación y límites

- Next.js compiló correctamente el código y CSS con webpack. La construcción completa se detiene después, en la comprobación de tipos.
- TypeScript: 76 errores; la salida coincide exactamente con la del proyecto original. No se han corregido errores funcionales ajenos al trabajo visual.
- ESLint: mismos recuentos por regla que el original, sin nuevas incidencias.
- Navegador: formulario real de administración; muestra local con ClubsDirectory y estilos de récords, estadísticas y resultados, en escritorio y a 390 × 844 px. Búsqueda de Barcelona y cambio de vista comprobados.
- La muestra empleó datos de ejemplo y no forma parte del ZIP entregado. No representa una prueba de todas las páginas con datos reales.
- El ZIP no incluye credenciales de Supabase. La portada falla sin ellas; no se han podido recorrer las pantallas dependientes de esa conexión. Antes de publicar, es necesaria una revisión con la configuración y los datos del entorno real.

## Uso

El ZIP contiene el proyecto completo actualizado, la guía y este informe. Extraer en una carpeta nueva e incorporar la configuración privada del entorno; instalar las dependencias del proyecto antes de ejecutarlo. No se incluyen node_modules, archivos temporales, compilaciones ni datos de prueba.

Para futuros cambios, utilizar var(--mt-gold), var(--mt-gold-dark), var(--mt-bg), var(--mt-surface), var(--mt-line), var(--mt-text), var(--mt-muted) y var(--mt-black). Las variables surface-soft y gold-soft son alias del fondo crema. Evitar nuevos colores decorativos locales; los colores semánticos deben corresponder a un resultado o estado concreto.

## Inventario completo

| Archivo | Tratamiento |
| --- | --- |
| AGENTS.md | Conservado |
| app/admin/alineaciones/page.tsx | Estilos actualizados |
| app/admin/competiciones/historico/page.tsx | Estilos actualizados |
| app/admin/competiciones/page.tsx | Conservado |
| app/admin/competiciones/[id]/page.tsx | Conservado |
| app/admin/fichajes/page.tsx | Conservado |
| app/admin/page.tsx | Estilos actualizados |
| app/admin/records/page.tsx | Conservado |
| app/admin/temporadas/page.tsx | Conservado |
| app/admin/votaciones/page.tsx | Conservado |
| app/alineaciones/page.tsx | Estilos actualizados |
| app/api/admin/competition-no-show/route.ts | Conservado |
| app/api/admin/competition-series/assign/route.ts | Conservado |
| app/api/admin/competition-series/route.ts | Conservado |
| app/api/admin/competition-settings/route.ts | Conservado |
| app/api/admin/competition-standing-zones/route.ts | Conservado |
| app/api/admin/fichajes/route.ts | Conservado |
| app/api/admin/lineups/download/route.ts | Conservado |
| app/api/admin/login/route.ts | Conservado |
| app/api/admin/logout/route.ts | Conservado |
| app/api/admin/records/round/route.ts | Conservado |
| app/api/admin/records/series/route.ts | Conservado |
| app/api/admin/seasons/route.ts | Conservado |
| app/api/admin/votaciones/candidates/route.ts | Conservado |
| app/api/admin/votaciones/route.ts | Conservado |
| app/api/admin/votaciones/tokens/route.ts | Conservado |
| app/api/competitions/competition/route.ts | Conservado |
| app/api/competitions/generate-groups/route.ts | Conservado |
| app/api/competitions/generate-league/route.ts | Conservado |
| app/api/competitions/groups/route.ts | Conservado |
| app/api/competitions/import-esms/route.ts | Conservado |
| app/api/competitions/match/route.ts | Conservado |
| app/api/competitions/qualification/route.ts | Conservado |
| app/api/competitions/result/route.ts | Conservado |
| app/api/competitions/season/route.ts | Conservado |
| app/api/competitions/teams/route.ts | Conservado |
| app/api/lineups/submit/route.ts | Conservado |
| app/api/player-history/import/route.ts | Conservado |
| app/api/player-photo/delete/route.ts | Conservado |
| app/api/player-photo/upload/route.ts | Conservado |
| app/api/players/find/route.ts | Conservado |
| app/api/votaciones/[id]/vote/route.ts | Conservado |
| app/buscador/page.tsx | Estilos actualizados |
| app/clubes/page.tsx | Conservado |
| app/clubes/[teamCode]/competiciones/page.tsx | Conservado |
| app/clubes/[teamCode]/estadisticas/page.tsx | Conservado |
| app/clubes/[teamCode]/historial/page.tsx | Conservado |
| app/clubes/[teamCode]/layout.tsx | Conservado |
| app/clubes/[teamCode]/page.tsx | Conservado |
| app/clubes/[teamCode]/partidos/page.tsx | Conservado |
| app/clubes/[teamCode]/plantilla/page.tsx | Conservado |
| app/clubes/[teamCode]/records/page.tsx | Conservado |
| app/competiciones/historico/[seriesId]/page.tsx | Conservado |
| app/competiciones/page.tsx | Conservado |
| app/competiciones/[id]/page.tsx | Conservado |
| app/competiciones/[id]/partidos/[matchId]/page.tsx | Conservado |
| app/creador/page.tsx | Estilos actualizados |
| app/disponibilidad/page.tsx | Estilos actualizados |
| app/estadisticas/page.tsx | Estilos actualizados |
| app/favicon.ico | Conservado |
| app/globals.css | Estilos actualizados |
| app/historia/page.tsx | Estilos actualizados |
| app/historial/page.tsx | Estilos actualizados |
| app/jugadores/[id]/page.tsx | Estilos actualizados |
| app/layout.tsx | Conservado |
| app/mercado/page.tsx | Estilos actualizados |
| app/page.tsx | Conservado |
| app/partidos/[id]/page.tsx | Conservado |
| app/plantillas/page.tsx | Estilos actualizados |
| app/plantillas/[id]/page.tsx | Estilos actualizados |
| app/premios/page.tsx | Estilos actualizados |
| app/records/page.tsx | Estilos actualizados |
| app/records/[seriesId]/page.tsx | Estilos actualizados |
| app/temporadas/page.tsx | Estilos actualizados |
| app/temporadas/[id]/page.tsx | Estilos actualizados |
| app/votaciones/page.tsx | Estilos actualizados |
| app/votaciones/[id]/page.tsx | Estilos actualizados |
| CLAUDE.md | Conservado |
| components/AdminLineupsDashboard.tsx | Estilos actualizados |
| components/AdminSeasonsHub.tsx | Conservado |
| components/AvailabilityDashboard.tsx | Estilos actualizados |
| components/AwardBallot.tsx | Estilos actualizados |
| components/AwardVotingAdmin.tsx | Estilos actualizados |
| components/BenchSelector.tsx | Estilos actualizados |
| components/ChangeBuilder.tsx | Estilos actualizados |
| components/ClubCard.tsx | Estilos actualizados |
| components/ClubCompetitionsDashboard.tsx | Conservado |
| components/ClubHistoryDashboard.tsx | Estilos actualizados |
| components/ClubHistoryTabs.tsx | Estilos actualizados |
| components/ClubMatchesDashboard.tsx | Conservado |
| components/ClubProfileNav.tsx | Conservado |
| components/ClubProfileOverview.tsx | Conservado |
| components/ClubProfileShell.tsx | Conservado |
| components/ClubsDirectory.tsx | Conservado |
| components/ClubSectionCard.tsx | Conservado |
| components/ClubStatisticsDashboard.tsx | Estilos actualizados |
| components/CompetitionAdmin.tsx | Conservado |
| components/CompetitionAdvancedSettingsAdmin.tsx | Conservado |
| components/CompetitionDetailHub.tsx | Conservado |
| components/CompetitionGroupsAdmin.tsx | Conservado |
| components/CompetitionHistoryAdmin.tsx | Estilos actualizados |
| components/CompetitionHistoryHub.tsx | Conservado |
| components/CompetitionMatchAdmin.tsx | Conservado |
| components/CompetitionNoShowAdmin.tsx | Conservado |
| components/CompetitionQualificationAdmin.tsx | Estilos actualizados |
| components/CompetitionRankings.tsx | Estilos actualizados |
| components/CompetitionRoundSelector.tsx | Estilos actualizados |
| components/CompetitionsHub.tsx | Conservado |
| components/CompetitionStandingZonesAdmin.tsx | Conservado |
| components/EsmsMatchImporter.tsx | Estilos actualizados |
| components/FootballPitch.tsx | Estilos actualizados |
| components/HomeDashboard.tsx | Conservado |
| components/LineupSubmissionForm.tsx | Estilos actualizados |
| components/ManualShtChecker.tsx | Estilos actualizados |
| components/MatchDetail.tsx | Estilos actualizados |
| components/PlayerAwards.tsx | Estilos actualizados |
| components/PlayerCareerHistory.tsx | Estilos actualizados |
| components/PlayerHistoryImporter.tsx | Estilos actualizados |
| components/PlayerLink.tsx | Estilos actualizados |
| components/PlayerMatchHistory.tsx | Estilos actualizados |
| components/PlayerNameLink.tsx | Estilos actualizados |
| components/PlayerPhotoAdmin.tsx | Estilos actualizados |
| components/PlayerProfileCard.tsx | Estilos actualizados |
| components/PlayerRender.tsx | Estilos actualizados |
| components/PlayerSearch.tsx | Estilos actualizados |
| components/PlayersTable.tsx | Estilos actualizados |
| components/RecordsAdmin.tsx | Estilos actualizados |
| components/SeasonAdmin.tsx | Conservado |
| components/SeasonAdminHub.tsx | Conservado |
| components/ShtCreator.tsx | Estilos actualizados |
| components/Sidebar.tsx | Conservado |
| components/StrategyBuilder.tsx | Estilos actualizados |
| components/TransferHistoryAdmin.tsx | Estilos actualizados |
| data/teams.ts | Conservado |
| eslint.config.mjs | Conservado |
| lib/admin-auth.ts | Conservado |
| lib/admin-lineups.ts | Conservado |
| lib/admin-seasons.ts | Conservado |
| lib/all-players.ts | Conservado |
| lib/award-history.ts | Conservado |
| lib/award-nominees.ts | Conservado |
| lib/award-voting.ts | Conservado |
| lib/club-competitions.ts | Conservado |
| lib/club-history-dashboard.ts | Conservado |
| lib/club-history.ts | Conservado |
| lib/club-logo.ts | Conservado |
| lib/club-matches.ts | Conservado |
| lib/club-names.ts | Conservado |
| lib/club-overview.ts | Conservado |
| lib/club-statistics.ts | Conservado |
| lib/competition-history.ts | Conservado |
| lib/competition-rankings.ts | Conservado |
| lib/competition-standing-zones.ts | Conservado |
| lib/competition-types.ts | Conservado |
| lib/competitions.ts | Conservado |
| lib/dropbox.ts | Conservado |
| lib/esms-player.ts | Conservado |
| lib/esms-stt.ts | Conservado |
| lib/home-dashboard.ts | Conservado |
| lib/import-player-history.ts | Conservado |
| lib/league-history.ts | Conservado |
| lib/lineup-submissions.ts | Conservado |
| lib/market-history.ts | Conservado |
| lib/match-detail.ts | Conservado |
| lib/nationalities.ts | Conservado |
| lib/original-sht-checker.ts | Conservado |
| lib/parser-esms.ts | Conservado |
| lib/performance-score.ts | Conservado |
| lib/plantillas.ts | Conservado |
| lib/player-availability.ts | Conservado |
| lib/player-career-history.ts | Conservado |
| lib/player-history-types.ts | Conservado |
| lib/player-history.ts | Conservado |
| lib/player-match-history.ts | Conservado |
| lib/player-palmares.ts | Conservado |
| lib/records.ts | Conservado |
| lib/roster-market.ts | Conservado |
| lib/season-admin.ts | Conservado |
| lib/season-history.ts | Conservado |
| lib/supabase-admin.ts | Conservado |
| next-env.d.ts | Conservado |
| next.config.ts | Conservado |
| package-lock.json | Conservado |
| package.json | Conservado |
| postcss.config.mjs | Conservado |
| public/branding/liga-leyendas-banner.png | Conservado |
| public/branding/liga-leyendas-logo-oficial-v308.png | Conservado |
| public/branding/liga-leyendas-logo-oficial.png | Conservado |
| public/branding/llv-emblem.png | Conservado |
| public/clubs/AJA.png | Conservado |
| public/clubs/ARS.png | Conservado |
| public/clubs/ATM.png | Conservado |
| public/clubs/BDO.png | Conservado |
| public/clubs/BLE.png | Conservado |
| public/clubs/BMU.png | Conservado |
| public/clubs/BOC.png | Conservado |
| public/clubs/CEL.png | Conservado |
| public/clubs/CHE.png | Conservado |
| public/clubs/DEP.png | Conservado |
| public/clubs/FCB.png | Conservado |
| public/clubs/FLA.png | Conservado |
| public/clubs/IND.png | Conservado |
| public/clubs/INT.png | Conservado |
| public/clubs/JUV.png | Conservado |
| public/clubs/LIV.png | Conservado |
| public/clubs/MAR.png | Conservado |
| public/clubs/MCI.png | Conservado |
| public/clubs/MIL.png | Conservado |
| public/clubs/MUN.png | Conservado |
| public/clubs/NAP.png | Conservado |
| public/clubs/OPO.png | Conservado |
| public/clubs/PAR.png | Conservado |
| public/clubs/PSG.png | Conservado |
| public/clubs/PSV.png | Conservado |
| public/clubs/RIV.png | Conservado |
| public/clubs/RMA.png | Conservado |
| public/clubs/ROM.png | Conservado |
| public/clubs/SAN.png | Conservado |
| public/clubs/SLB.png | Conservado |
| public/clubs/TOT.png | Conservado |
| public/clubs/VAL.png | Conservado |
| public/competitions/assists-v317.jpg | Conservado |
| public/competitions/banner-v31.jpg | Conservado |
| public/competitions/calendar-v3110.jpg | Conservado |
| public/competitions/cup-v31.jpg | Conservado |
| public/competitions/hero-v31.jpg | Conservado |
| public/competitions/keepers-v318.jpg | Conservado |
| public/competitions/league-v31.jpg | Conservado |
| public/competitions/overview-kpis/goals-v31137.png | Conservado |
| public/competitions/overview-kpis/goals.png | Conservado |
| public/competitions/overview-kpis/matches-v31137.png | Conservado |
| public/competitions/overview-kpis/matches.png | Conservado |
| public/competitions/overview-kpis/red-v31137.png | Conservado |
| public/competitions/overview-kpis/red.png | Conservado |
| public/competitions/overview-kpis/teams-v31137.png | Conservado |
| public/competitions/overview-kpis/teams.png | Conservado |
| public/competitions/overview-kpis/yellow-v31137.png | Conservado |
| public/competitions/overview-kpis/yellow.png | Conservado |
| public/competitions/overview-v3113.jpg | Conservado |
| public/competitions/results-v3112.jpg | Conservado |
| public/competitions/scorers-v316.jpg | Conservado |
| public/competitions/season-data/average.png | Conservado |
| public/competitions/season-data/biggest-win.png | Conservado |
| public/competitions/season-data/goals.png | Conservado |
| public/competitions/season-data/matches.png | Conservado |
| public/competitions/season-data/red-card.png | Conservado |
| public/competitions/season-data/teams.png | Conservado |
| public/competitions/season-data/yellow-card.png | Conservado |
| public/competitions/standings-v3111.jpg | Conservado |
| public/competitions/statistics-v319.jpg | Conservado |
| public/competitions/supercup-v31.jpg | Conservado |
| public/file.svg | Conservado |
| public/globe.svg | Conservado |
| public/home/buscar-jugadores-v306.png | Conservado |
| public/home/buscar-jugadores.png | Conservado |
| public/home/estadisticas-v306.png | Conservado |
| public/home/estadisticas.png | Conservado |
| public/home/explorar-clubes-v306.png | Conservado |
| public/home/explorar-clubes.png | Conservado |
| public/home/historial-v306.png | Conservado |
| public/home/historial.png | Conservado |
| public/next.svg | Conservado |
| public/vercel.svg | Conservado |
| public/window.svg | Conservado |
| sql/01-v24-votaciones-premios.sql | Conservado |
| sql/02-v25-palmares-premios.sql | Conservado |
| sql/04-v27-1-fichajes-cesiones.sql | Conservado |
| sql/05-v27-3-intercambios.sql | Conservado |
| sql/05-v31-11-zonas-clasificacion.sql | Conservado |
| sql/06-v31-18-no-presentado.sql | Conservado |
| sql/07-v31-19-performance-competiciones.sql | Conservado |
| sql/08-v31-21-configuracion-avanzada.sql | Conservado |
| sql/09-v31-22-borrado-temporadas-cascada.sql | Conservado |
| sql/10-v31-23-tipo-solo-grupos.sql | Conservado |
| sql/11-v31-24-clasificacion-entre-competiciones.sql | Conservado |
| sql/12-v31-27-historico-automatico.sql | Conservado |
| sql/13-v31-28-historico-solo-por-nombre.sql | Conservado |
| supabase/club-history-v20-1.sql | Conservado |
| supabase/competition-history-v18.sql | Conservado |
| supabase/records-v19.sql | Conservado |
| supabase/supabase-competitions.sql | Conservado |
| supabase/supabase-fix-duplicate-player-names.sql | Conservado |
| supabase/supabase-match-player-stats-v3.sql | Conservado |
| tsconfig.json | Conservado |
