# Panel de administración general

Se ha convertido `/admin` en un panel general de administración. Mantiene el login existente y, cuando hay sesión activa, muestra un dashboard central para acceder a todas las herramientas importantes de la web.

## Funcionalidades incluidas

- Acceso a Fichajes y Mercado.
- Acceso a Competiciones.
- Acceso a Temporadas.
- Acceso a Alineaciones.
- Acceso a Votaciones.
- Acceso a Records e histórico.
- Accesos rápidos a Mercado público, Competiciones, Buscador e Histórico de competiciones.
- Botón de cerrar sesión desde el panel.
- Orden recomendado de trabajo para administradores.

## Información rápida

El panel muestra contadores básicos para ayudar al administrador a orientarse:

- Temporadas creadas.
- Competiciones creadas.
- Movimientos de mercado.
- Jugadores registrados.
- Movimientos pendientes.
- Cesiones activas.
- Votaciones creadas.
- Series históricas.

Si alguna tabla no está disponible en una instalación concreta, el contador aparece como `—` y el panel sigue funcionando.

## Cambios técnicos

- Actualizado `app/admin/page.tsx`.
- Añadidos estilos visuales ligeros en `app/globals.css` para los indicadores de cada área.
- No se han añadido tablas ni columnas nuevas a Supabase.

## Validación

- ESLint correcto en `app/admin/page.tsx`.
- TypeScript sin errores nuevos respecto al estado previo del proyecto.
