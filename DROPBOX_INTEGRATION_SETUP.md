# Dropbox por instalación · configuración

Esta versión permite que la persona que usa la web conecte **su propia cuenta Dropbox** desde `Administración → Integraciones`.

## 1. Crear una sola app Dropbox

En Dropbox App Console crea una app con acceso **Full Dropbox** (necesario para que el usuario pueda escoger cualquier carpeta de su cuenta).

Scopes recomendados:

- `account_info.read`
- `files.metadata.read`
- `files.content.read`
- `files.content.write` (necesario si usas Mercado / movimientos que modifican plantillas)

## 2. Redirect URI

Añade exactamente:

- Local: `http://localhost:3000/api/integrations/dropbox/callback`
- Producción: `https://TU-DOMINIO/api/integrations/dropbox/callback`

## 3. Webhook

En la App Console configura:

`https://TU-DOMINIO/api/integrations/dropbox/webhook`

El webhook debe ser público. `localhost` no puede recibir avisos de Dropbox sin un túnel.

## 4. Variables de entorno

```env
DROPBOX_APP_KEY=...
DROPBOX_APP_SECRET=...
DROPBOX_REDIRECT_URI=https://TU-DOMINIO/api/integrations/dropbox/callback
DROPBOX_TOKEN_ENCRYPTION_KEY=una-clave-larga-y-privada
```

`DROPBOX_REFRESH_TOKEN` sigue funcionando como respaldo para instalaciones antiguas, pero deja de ser necesario una vez conectada una cuenta desde Administración.

## 5. Supabase

Ejecuta:

`sql/20-v31-33-dropbox-oauth-sync.sql`

El refresh token se cifra en servidor antes de guardarse. La tabla tiene RLS y no expone políticas públicas.

## 6. Uso

1. Administración → Integraciones.
2. Conectar Dropbox.
3. Autorizar la cuenta.
4. Elegir carpeta de Plantillas BASE.
5. Marcar las plantillas BASE deseadas.
6. Elegir la carpeta de Plantillas siempre actualizadas.
7. Guardar.

A partir de entonces las vistas de plantillas, buscador y operaciones de mercado usan la carpeta actual configurada. El webhook registra cada cambio y vuelve a validar automáticamente la carpeta. El botón `Sincronizar ahora` queda como respaldo manual.
