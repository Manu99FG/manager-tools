# Copa de Leyendas por clases

La Copa de Leyendas usa la clase administrativa del club como grupo de competición.

- Clase A -> grupo Clase A
- Clase B -> grupo Clase B
- ...
- Clase H -> grupo Clase H

Reglas:
- 32 equipos.
- 8 clases (A-H).
- 4 equipos exactos por clase.
- Los 2 primeros de cada clase acceden a octavos.

La asignación se sincroniza desde `club_metadata.club_class` al crear la Copa y nuevamente justo antes de generar su calendario. Si una clase cambia antes de generar el calendario, se toma el valor actualizado.
