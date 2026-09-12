# Auditoría gráfica quirúrgica — Liga de Leyendas

## Alcance
Se recorrió el proyecto completo (285 archivos), excluyendo únicamente artefactos generados/dependencias no presentes (`.git`, `.next`, `node_modules`). Se revisaron rutas de `app/`, componentes, CSS global, utilidades y configuración para localizar estilos directos, colores hardcodeados, clases Tailwind heredadas y patrones visuales incoherentes.

## Sistema visual oficial
Paleta de identidad:
- #9A7425 — dorado principal
- #6B5019 — dorado oscuro / hover
- #F4F2ED — fondo principal
- #FFFFFF — superficies
- #E9E8E5 — bordes y separadores
- #181818 — texto principal
- #686868 — texto secundario
- #252525 — fondos oscuros / navegación

Colores semánticos estandarizados (solo estados):
- #2E8B57 — éxito / victoria / validación
- #C83B37 — error / derrota / tarjeta roja
- #D6A318 — advertencia / tarjeta amarilla

## Correcciones realizadas
- Eliminados los azules, violetas, cianes y otras familias decorativas de la identidad visual.
- Unificados colores directos (`#...`) en CSS y JSX/TSX.
- Unificadas clases Tailwind heredadas `slate/gray/blue/sky/cyan/indigo/violet/purple/pink/rose/amber/yellow/orange` hacia la paleta oficial.
- Normalizadas sombras azuladas a sombras neutras.
- Conservados únicamente colores externos con función semántica clara.
- Conservada la lógica de datos, Supabase, rutas y cálculos: esta pasada es visual.

## Resultado de la auditoría
Después de la corrección, los archivos visuales usan únicamente la paleta oficial y los tres colores semánticos estandarizados para valores hex directos. No quedan colores decorativos hardcodeados fuera de ese sistema.

## Validación técnica
Se ejecutó TypeScript de forma global para detectar errores de parseo. El proyecto exportado no incluye `node_modules`, por lo que el chequeo completo reporta módulos Next/React ausentes y errores de tipado preexistentes; no se detectó un error sintáctico provocado por la sustitución visual.
