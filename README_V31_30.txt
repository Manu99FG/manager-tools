V31.30 - Copa Intercontinental por sorteo

- La Copa Intercontinental ya no recibe automáticamente los 32 equipos al crear el formato oficial.
- Al programar un sorteo se limpia cualquier asignación previa de la Copa Intercontinental si todavía no tiene calendario/partidos.
- Al llegar la hora del sorteo, se generan los 4 bombos, se sortean los 4 grupos y el resultado se aplica automáticamente a competition_teams.
- Cada grupo recibe 8 equipos, con 2 equipos procedentes de cada bombo.
- El sorteo pasa a estado APPLIED una vez que los equipos y grupos han sido guardados.
- SQL opcional 14-v31-30-intercontinental-solo-sorteo.sql limpia asignaciones antiguas en Copas Intercontinentales sin partidos.
