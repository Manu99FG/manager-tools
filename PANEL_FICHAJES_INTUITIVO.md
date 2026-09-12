# Panel de fichajes más intuitivo

Se ha simplificado el panel de administración para que cualquier administrador pueda crear operaciones de mercado sin conocer detalles internos del sistema.

## Cambios principales

- El formulario ahora empieza con tarjetas claras para elegir qué ha pasado: traspaso, cesión, fin de cesión o pendiente.
- Cada tipo de operación muestra una guía de 3 pasos con lenguaje sencillo.
- Los campos cambian según el caso elegido para evitar confusión.
- Los textos se han adaptado al uso real:
  - En cesión: “Club propietario” y “Juega cedido en”.
  - En traspaso: “Solo dinero” o “Jugadores”.
  - En intercambio: Equipo A, Equipo B, jugadores de cada lado y dinero de cada lado.
- Antes de crear, aparece un resumen en lenguaje normal de lo que va a pasar.
- Si falta algo, el panel dice exactamente qué falta.
- El botón cambia según el caso: “Crear y sincronizar” o “Guardar pendiente”.

## Funcionalidades cubiertas

- Traspasos por dinero.
- Traspasos con varios jugadores del mismo lado.
- Intercambios de varios jugadores entre dos equipos.
- Intercambios con dinero desde cualquiera de los dos lados.
- Cesiones con coste, fechas, opción de compra y condiciones.
- Fin de cesión enlazable con cesiones activas.
- Pendientes sin tocar plantillas.

## Integración

No hace falta añadir columnas nuevas a Supabase. Se mantiene la integración actual con Dropbox, Supabase y Mercado.

## Validación

- ESLint correcto en `components/TransferHistoryAdmin.tsx`.
- TypeScript sin errores nuevos respecto al estado previo del proyecto.
