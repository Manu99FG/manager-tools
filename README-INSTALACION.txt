MANAGER TOOLS - FOTO DE JUGADOR SIN FONDO, 100% GRATUITA
=========================================================

1) INSTALA LA LIBRERÍA

Desde C:\Users\manue\manager-tools:

npm install @imgly/background-removal onnxruntime-web@1.21.0-dev.20250206-d981b153d3

No necesitas REMOVE_BG_API_KEY.

2) VARIABLE DE ADMINISTRADOR

En .env.local:

ADMIN_PHOTO_PASSWORD=TU_CONTRASEÑA

Añádela también en Vercel.

3) SUPABASE

Ejecuta supabase-player-photo-manual.sql en SQL Editor.

Eso añade:
- players.photo_url
- players.photo_path
- bucket público player-photos

4) COPIA / REEMPLAZA

components/PlayerPhotoAdmin.tsx
app/api/player-photo/upload/route.ts
app/api/player-photo/delete/route.ts
app/jugadores/[id]/page.tsx
next.config.ts

5) BORRA EL SISTEMA WIKIMEDIA ANTIGUO

Puedes borrar:
- components/PlayerPhotoSelector.tsx
- lib/player-photo.ts
- app/api/player-photo/search/
- app/api/player-photo/save/

6) IMPORTANTE

La eliminación de fondo ocurre EN EL NAVEGADOR con @imgly/background-removal.
La imagen original nunca se sube a Manager Tools.
Solo se envía a tu API el PNG transparente ya procesado.

La primera eliminación puede tardar bastante más porque el navegador descarga los archivos del modelo de IA. Después quedan en caché.

7) PRUEBA

npm run dev

Abre una ficha de jugador:
- selecciona JPG/PNG/WEBP
- pulsa "Eliminar fondo gratis"
- revisa la previsualización transparente
- introduce contraseña admin
- pulsa "Guardar fotografía"

8) BUILD

npm run build

Si compila:

git add .
git commit -m "Add free in-browser player background removal"
git push origin main
