import { Dropbox } from "dropbox";

export function getDropboxClient() {
  const refreshToken = process.env.DROPBOX_REFRESH_TOKEN;
  const clientId = process.env.DROPBOX_APP_KEY;
  const clientSecret = process.env.DROPBOX_APP_SECRET;

  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error("Faltan variables de entorno de Dropbox");
  }

  return new Dropbox({
    refreshToken,
    clientId,
    clientSecret,
  });
}