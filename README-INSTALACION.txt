MANAGER TOOLS - ADMINISTRACION PRIVADA
=====================================

OBJETIVO
--------
Los visitantes normales NO reciben ni ven PlayerPhotoAdmin.
Solo aparece en la ficha si existe una sesión de administrador válida.
Los endpoints de subir/borrar fotos también exigen esa sesión.

ARCHIVOS A COPIAR/REEMPLAZAR
----------------------------
lib/admin-auth.ts
app/admin/page.tsx
app/api/admin/login/route.ts
app/api/admin/logout/route.ts
components/PlayerPhotoAdmin.tsx
app/jugadores/[id]/page.tsx
app/api/player-photo/upload/route.ts
app/api/player-photo/delete/route.ts

VARIABLES DE ENTORNO
--------------------
En .env.local y Vercel:

ADMIN_PHOTO_PASSWORD=TU_CONTRASENA
ADMIN_SESSION_SECRET=ReCcqUsWblJNWPjH0NarXW-eL_POZNm6VPi5F0Bg3IaEbLmRXq5LCS4He3-dM7Wi

ADMIN_SESSION_SECRET debe ser distinto de la contraseña.
No uses NEXT_PUBLIC_ en ninguna de estas dos variables.

FUNCIONAMIENTO
--------------
1. Entra en /admin
2. Introduce ADMIN_PHOTO_PASSWORD
3. Se crea una cookie HttpOnly firmada, válida durante 7 días.
4. Ve a /buscador y abre cualquier jugador.
5. La sección Administración aparecerá solo en tu sesión.
6. Ya no tienes que volver a escribir la contraseña en cada jugador.
7. Para salir, vuelve a /admin y pulsa Cerrar sesión.

PRUEBA
------
npm run build
npm run dev

Comprueba también en una ventana de incógnito:
- ficha de jugador: no debe aparecer Administración
- /api/player-photo/upload sin sesión: debe responder 401
- /api/player-photo/delete sin sesión: debe responder 401

DEPLOY
------
git add .
git commit -m "Protect admin photo tools"
git push origin main
