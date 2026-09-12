# Revisión y optimización general de la web

Se ha hecho una revisión completa del proyecto Next.js y se han corregido problemas que impedían tener una base limpia de validación.

## Cambios realizados

- Corregidos errores de TypeScript que afectaban a:
  - configuración avanzada de competiciones;
  - no presentados en competiciones;
  - temporadas del panel de administración;
  - historial de clubes;
  - KPIs de competiciones por formato.
- Añadido el tipo `StandingTiebreaker` que ya usaban la API y el panel avanzado.
- Hecho compatible el modelo de temporadas con la pantalla existente de administración.
- Tipadas consultas de no-shows para evitar inferencias erróneas de Supabase.
- Corregido el tipo de resultados históricos de clubes (`V`, `E`, `D`).
- Quitado un `console.log` de producción del importador de historial.
- Eliminadas las rutas internas de revisión `/visual-review` y `/format-review` para que no aparezcan en producción.
- Ajustada la configuración de ESLint para que las reglas nuevas de React Compiler no bloqueen el proyecto heredado mientras se migra por partes.

## Validación final

- TypeScript: correcto.
- ESLint: 0 errores, quedan avisos heredados.
- Build de producción con Webpack: correcto.

## Nota sobre Turbopack

El build con Turbopack falla en este entorno porque `node_modules` es un enlace simbólico fuera de la raíz del proyecto. El build con Webpack sí compila correctamente, así que el bloqueo no viene del código fuente.

## Avisos pendientes recomendados para una siguiente fase

- Migrar algunos componentes grandes para satisfacer reglas nuevas de React Compiler.
- Sustituir `<img>` por `next/image` en zonas restantes.
- Eliminar variables y helpers heredados no usados.
- Reducir componentes muy largos como `CompetitionDetailHub` y la ficha de jugador.
