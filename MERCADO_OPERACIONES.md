# Mercado de fichajes

Se ha actualizado el apartado `Mercado` para separar visualmente los cuatro tipos de operación:

- Traspasos por dinero.
- Intercambios de jugadores.
- Intercambios de jugadores con dinero de un lado.
- Cesiones.

Las cesiones muestran fechas reales, coste, opción de compra y un bloque de condiciones cuando el movimiento tiene notas registradas. Esas condiciones se pueden gestionar desde `Admin > Fichajes` en el nuevo campo `Condiciones de cesión`.

No hace falta añadir nada nuevo a Supabase para este cambio. La tabla `transfers` ya tenía el campo `notes`, y se reutiliza para guardar cláusulas como minutos mínimos, reparto salarial, objetivos, penalizaciones, restricciones contra el club propietario, opción u obligación de compra y regreso anticipado.

Archivos principales modificados:

- `app/mercado/page.tsx`
- `lib/market-history.ts`
- `components/TransferHistoryAdmin.tsx`

Comprobaciones realizadas:

- ESLint limpio en los tres archivos modificados.
- Comparación de TypeScript sin errores nuevos respecto al estado anterior del proyecto.

Limitación conocida:

- El proyecto sigue teniendo errores de tipos heredados en módulos de temporadas, competiciones e historial de clubes. No los he tocado en este cambio porque no pertenecen a Mercado.
