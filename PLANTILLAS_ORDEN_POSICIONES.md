# Orden de posiciones en plantillas

Se ha actualizado el motor que modifica las plantillas ESMS en Dropbox.

Cuando se crea un traspaso, intercambio multiple o cesion desde `Admin > Fichajes`, los jugadores ya no se insertan al final de la plantilla. Ahora se colocan segun este orden:

- GK
- DF
- DM
- MF
- AM
- FW

La clasificacion se calcula desde la linea ESMS del jugador:

- `ST` mas alto: GK.
- `TK` mas alto: DF.
- `SH` mas alto: FW.
- `PS` mas alto: se reparte entre DM, MF y AM segun perfil secundario.
  - Mas defensivo: DM.
  - Mas ofensivo: AM.
  - Perfil equilibrado: MF.

Esto se aplica tanto a movimientos simples como a intercambios con varios jugadores por cada lado.

Archivo modificado:

- `lib/roster-market.ts`

Comprobaciones realizadas:

- ESLint limpio en el motor de plantillas, API de fichajes y panel de administracion.
- TypeScript sin errores nuevos respecto al estado anterior del proyecto.
