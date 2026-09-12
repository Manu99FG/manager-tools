# Intercambios multiples en Mercado

Se ha ampliado el panel `Admin > Fichajes` para que los intercambios de jugadores puedan incluir varios jugadores por cada lado.

Ahora un intercambio puede ser:

- 1 jugador por 1 jugador.
- Varios jugadores por 1 jugador.
- 1 jugador por varios jugadores.
- Varios jugadores por varios jugadores.
- Cualquiera de los anteriores con dinero adicional.

Funcionamiento:

- El primer jugador elegido sigue siendo la operacion principal.
- En `Tambien salen` se anaden mas jugadores del club actual que van al destino.
- En `El destino entrega` se anaden jugadores del club comprador que pasan al club origen.
- Todos los movimientos se guardan con el mismo `deal_id`, por lo que la web los interpreta como una sola operacion.
- Dropbox mueve todas las lineas ESMS en una unica operacion reversible.
- Si falla Supabase despues de tocar Dropbox, se restauran las plantillas originales.

No hace falta modificar Supabase. Se reutiliza `deal_id` para agrupar todas las filas del intercambio y `deal_role` para marcar las filas incluidas.

Archivos principales modificados:

- `components/TransferHistoryAdmin.tsx`
- `app/api/admin/fichajes/route.ts`
- `lib/roster-market.ts`

Comprobaciones realizadas:

- ESLint limpio en los archivos de Mercado/Admin/Dropbox tocados.
- TypeScript sin errores nuevos respecto al estado anterior del proyecto.
