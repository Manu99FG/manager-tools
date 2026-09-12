# Panel de administracion de Mercado

Se ha rehecho el panel `Admin > Fichajes` para crear y gestionar movimientos de mercado desde la web.

Funcionalidades incluidas:

- Crear traspasos por dinero.
- Crear intercambios de jugadores.
- Crear intercambios con dinero adicional.
- Crear cesiones con propietario, fechas, coste, opcion de compra y condiciones.
- Registrar fin de cesion usando una cesion activa o dejando que el sistema la busque.
- Crear movimientos pendientes sin tocar plantillas.
- Filtrar movimientos por jugador, club, tipo y temporada.
- Editar fecha, clubes, temporada, importes y detalles de cesion.
- Ver resumen de traspasos, cesiones, regresos e intercambios.

Sincronizacion:

- Al crear un movimiento definitivo, la API actualiza primero las plantillas ESMS en Dropbox.
- Si despues falla Supabase, se restauran las plantillas originales.
- Los intercambios se validan antes de tocar Dropbox.
- Despues se actualiza `players.current_team_code`, `players.owner_team_code` y `transfers`, por lo que el movimiento aparece en la web de Mercado.

Supabase:

- No hace falta anadir columnas nuevas.
- Se reutilizan los campos ya existentes en `transfers`: `movement_type`, `owner_team_code`, `loan_start_date`, `loan_end_date`, `loan_fee`, `purchase_option`, `purchase_option_fee`, `parent_movement_id`, `notes`, `deal_id` y `deal_role`.

Archivos principales modificados:

- `components/TransferHistoryAdmin.tsx`
- `app/api/admin/fichajes/route.ts`
- `app/mercado/page.tsx`
- `lib/market-history.ts`

Comprobaciones realizadas:

- ESLint limpio en los archivos tocados.
- TypeScript sin errores nuevos respecto al estado anterior del proyecto.

Limitacion conocida:

- El proyecto mantiene errores de tipos heredados en temporadas, competiciones e historial de clubes. No pertenecen a este cambio y se han conservado.
