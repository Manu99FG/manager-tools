V31.24 - CLASIFICACIÓN DE PRETEMPORADA A OTRAS COMPETICIONES

1. Ejecutar en Supabase SQL Editor:
   sql/11-v31-24-clasificacion-entre-competiciones.sql

2. Sustituir/subir los archivos del parche.

3. En una competición tipo "Solo grupos" o "Grupos + eliminatorias":
   - abre Admin > Competiciones > Gestionar;
   - configura los destinos por posiciones de cada grupo;
   - ejemplo: 1-4 -> Primera División, 5-8 -> Segunda División;
   - guarda las reglas;
   - al terminar todos los partidos de los grupos, pulsa "Aplicar clasificación".

IMPORTANTE:
- Solo se insertan los equipos en competition_teams de la competición destino.
- NO se copian partidos ni resultados.
- NO se copian match_player_stats.
- Por tanto, las estadísticas de pretemporada permanecen separadas de Primera/Segunda.
- Si la competición destino ya tiene calendario generado, no se añaden participantes nuevos.
