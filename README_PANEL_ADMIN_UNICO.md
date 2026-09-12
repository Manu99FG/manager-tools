# Panel de administración único

La administración queda centralizada en `/admin`.

Secciones del mismo panel:
- Resumen
- Clubes
- Temporadas
- Competiciones
- Sorteos
- Alineaciones
- Mercado
- Votaciones
- Histórico

Las antiguas rutas `/admin/clubes`, `/admin/temporadas`, etc. redirigen al apartado correspondiente de `/admin?section=...`, por lo que los enlaces o favoritos antiguos no se rompen.

El detalle de una competición (`/admin/competiciones/[id]`) se conserva como vista de trabajo profunda, pero vuelve al panel único mediante la sección Competiciones.

No requiere SQL.
