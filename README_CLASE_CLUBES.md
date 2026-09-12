# V31.31 · Clase de los clubes

## Qué cambia
- Nueva tabla `club_metadata` con un campo `club_class` editable.
- Nueva página `Administración → Clubes` (`/admin/clubes`).
- La clase aparece en la cabecera de la ficha pública de cada club, junto al código y país.
- El valor es texto libre para no limitar el sistema a A/B/C si más adelante cambian las categorías.

## Instalación
1. Ejecutar `sql/16-v31-31-clase-clubes.sql` en Supabase SQL Editor.
2. Sustituir los archivos del parche o usar el proyecto completo.
3. Entrar en `Administración → Clubes` y definir la clase de cada club.

Dejar el campo vacío elimina visualmente la clase de la ficha.
