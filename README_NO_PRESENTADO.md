# V31.32 · NO PRESENTADO en actualización de resultados

- Añade un selector de `NO PRESENTADO` directamente en cada partido de **todas las competiciones**.
- Opciones: ambos presentados, NP local, NP visitante.
- La API de actualización del partido guarda `home_no_show` / `away_no_show` junto con el resultado.
- Si el partido se marca como jugado con NP y sin marcador manual, el trigger existente aplica el marcador reglamentario (por defecto 3-0 / 0-3).
- Si después se importa un `.stt`, se mantienen sus estadísticas y el trigger recalcula el marcador oficial según la regla configurada de la competición.
- No requiere SQL nuevo si ya están aplicadas las migraciones V31.18/V31.21 de NO PRESENTADO.
