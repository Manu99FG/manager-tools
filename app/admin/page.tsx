import Link from "next/link";

import {
  isAdminSession,
} from "@/lib/admin-auth";

export const dynamic =
  "force-dynamic";

export const revalidate = 0;

type Props = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function AdminPage({
  searchParams,
}: Props) {
  const isAdmin =
    await isAdminSession();

  const {
    error,
  } = await searchParams;

  return (
    <main
      className="
        mx-auto
        flex
        min-h-[70vh]
        w-full
        max-w-xl
        items-center
        p-4

        sm:p-6
      "
    >
      <section
        className="
          w-full
          rounded-2xl
          border
          border-slate-800
          bg-slate-950/80
          p-6
          shadow-xl
        "
      >
        <div
          className="
            text-xs
            font-bold
            uppercase
            tracking-[0.18em]
            text-blue-400
          "
        >
          Manager Tools
        </div>

        <h1
          className="
            mt-2
            text-2xl
            font-black
            text-white
          "
        >
          Administración
        </h1>

        {isAdmin ? (
          <div
            className="
              mt-6
              space-y-5
            "
          >
            <div
              className="
                rounded-xl
                border
                border-emerald-900
                bg-emerald-950/30
                p-4
                text-sm
                text-emerald-300
              "
            >
              Sesión de administrador activa.
              Las herramientas de administración
              ya aparecerán en las fichas de los
              jugadores.
            </div>

            <div
              className="
                flex
                flex-col
                gap-3

                sm:flex-row
              "
            >
              <Link
                href="/buscador"
                className="
                  inline-flex
                  items-center
                  justify-center
                  rounded-xl
                  bg-blue-600
                  px-4
                  py-3
                  text-sm
                  font-bold
                  text-white
                  transition

                  hover:bg-blue-500
                "
              >
                Ir al buscador
              </Link>

              <form
                action="/api/admin/logout"
                method="post"
                className="sm:flex-1"
              >
                <button
                  type="submit"
                  className="
                    w-full
                    rounded-xl
                    border
                    border-slate-700
                    bg-slate-900
                    px-4
                    py-3
                    text-sm
                    font-bold
                    text-slate-200
                    transition

                    hover:bg-slate-800
                  "
                >
                  Cerrar sesión
                </button>
              </form>
            </div>
          </div>
        ) : (
          <form
            action="/api/admin/login"
            method="post"
            className="mt-6 space-y-4"
          >
            <div>
              <label
                htmlFor="password"
                className="
                  mb-2
                  block
                  text-sm
                  font-semibold
                  text-slate-200
                "
              >
                Contraseña de administrador
              </label>

              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="
                  w-full
                  rounded-xl
                  border
                  border-slate-700
                  bg-slate-900
                  px-4
                  py-3
                  text-white
                  outline-none

                  focus:border-blue-500
                "
              />
            </div>

            {error === "1" && (
              <div
                className="
                  rounded-xl
                  border
                  border-red-900
                  bg-red-950/30
                  p-3
                  text-sm
                  text-red-300
                "
              >
                Contraseña incorrecta.
              </div>
            )}

            {error === "config" && (
              <div
                className="
                  rounded-xl
                  border
                  border-red-900
                  bg-red-950/30
                  p-3
                  text-sm
                  text-red-300
                "
              >
                No se pudo iniciar la sesión.
                Revisa las variables de entorno
                del servidor.
              </div>
            )}

            <button
              type="submit"
              className="
                w-full
                rounded-xl
                bg-blue-600
                px-4
                py-3
                text-sm
                font-black
                text-white
                transition

                hover:bg-blue-500
              "
            >
              Entrar como administrador
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
