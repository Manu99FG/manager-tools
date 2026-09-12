# Historial: club de origen de los jugadores

## Objetivo
La Plantilla BASE define el club en el que cada jugador inicia la partida.
Ese dato se conserva aunque el jugador cambie después de club.

Ejemplo:
- BASE: R. Centurión está en RIV
- Plantilla actual: R. Centurión está en CEL
- Ficha del jugador: Club inicial = River Plate, y después aparecen los movimientos posteriores.

## Instalación
1. Ejecutar `sql/23-v31-34-origen-historico-jugadores.sql` en Supabase.
2. Desplegar el código actualizado.
3. En Administración > Integraciones > Dropbox, volver a ejecutar `Reconstruir jugadores desde BASE`.

El paso 3 es imprescindible para jugadores existentes: la BASE vuelve a fijar correctamente `origin_team_code` sin cambiar `current_team_code`.

## Comportamiento
- Jugador nuevo importado desde BASE: origen, propietario y club actual = club de la BASE.
- Jugador ya existente que actualmente está en otro club: solo se actualiza `origin_team_code`; no se le devuelve al club de origen.
- La sincronización de plantillas actuales nunca borra el origen.
- La ficha muestra el club inicial aunque no exista una transferencia histórica previa.
