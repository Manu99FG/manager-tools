import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

let client: SupabaseClient | null =
  null;

export function getSupabaseAdmin() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const secretKey =
    process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      "Faltan las variables de entorno de Supabase"
    );
  }

  if (!client) {
    client = createClient(
      url,
      secretKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
  }

  return client;
}