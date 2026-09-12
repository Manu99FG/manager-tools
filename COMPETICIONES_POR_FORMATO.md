# Competiciones: presentación por formato

Esta entrega incluye la web completa con la unificación visual anterior y la nueva presentación de Competiciones.

| Tipo | Presentación |
| --- | --- |
| Liga normal | Identidad de liga, clasificación general, puntos y jornadas. |
| Eliminatorias directas | Cuadro horizontal por rondas, encuentros y marcadores; sin clasificación Top 5 de liga. |
| Fase de grupos | Identidad de grupos y tablas independientes por grupo. |
| Grupos + eliminatorias | Tablas de grupos y cuadro de la segunda fase, con accesos entre ambas. |

Las tarjetas del listado también identifican el formato mediante una ilustración, nombre y descripción específicos. La Supercopa utiliza la presentación de eliminatorias. Se conserva la paleta dorada y neutra, con colores semánticos para estados.

## Comprobaciones

- Cuatro formatos comprobados en navegador con el componente real de detalle y datos de ejemplo locales.
- Pestaña de eliminatorias y enlaces entre fases comprobados; vista de grupos sin cuadro de eliminatorias y liga con clasificación general.
- Revisión en escritorio y a 390 × 844 px. Tablas y cuadro admiten desplazamiento horizontal en pantallas estrechas.
- Once comprobaciones de identificación de formatos y nombres de fases superadas.
- Los nuevos componentes y la configuración de formatos pasan ESLint. El detalle conserva sus incidencias previas.
- TypeScript devuelve los mismos errores previos, descontando los desplazamientos de líneas. La construcción completa sigue pendiente de resolver esos errores del proyecto original.
- Las páginas de prueba no están incluidas en el ZIP. No se han conectado credenciales de Supabase ni publicado la web.

## Datos y alcance

El cuadro utiliza partidos y rondas existentes; no genera cruces, clasificados ni ganadores. Enfrentamientos de ida y vuelta se muestran como partidos registrados, sin inventar resultados globales o desempates. Tampoco se dibujan conexiones entre cruces que los datos no identifican.

El modelo actual de rondas no contiene un campo explícito de fase. Para competiciones mixtas, nombres como «Jornada 1» se identifican como grupos; «Cuartos de final», «Semifinales» y «Final» como eliminatorias. Los nombres ambiguos aparecen en «Otras rondas publicadas» y los partidos sin ronda tienen su propio apartado. Si la segunda fase está guardada en otra competición, sus cruces no se importan automáticamente a esta ficha.

## Archivos de esta actualización

- `components/CompetitionDetailHub.tsx`: integración de formatos, navegación y cuadro.
- `components/CompetitionsHub.tsx`: tarjetas diferenciadas por formato.
- `components/CompetitionFormatView.tsx`: ilustraciones, resumen de formato y partidos por ronda.
- `lib/competition-format.ts`: etiquetas e identificación de fases.
- `app/competition-formats.css`: estilos específicos y ajustes de contraste.
- `app/layout.tsx`: carga de los estilos de formatos.

El informe anterior incluido en el ZIP documenta la primera revisión visual; este documento recoge la ampliación posterior.
