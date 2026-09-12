"use client";

import {
  FormEvent,
  useMemo,
  useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import type {
  AdminSeasonRow,
} from "@/lib/season-admin";

type ApiResponse = {
  ok?: boolean;
  error?: string;
};

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(
    new Date(`${value}T12:00:00`)
  );
}

function derivedStatus(
  row: AdminSeasonRow
) {
  if (row.season.is_active) {
    return {
      label: "Activa",
      className: "is-active",
    };
  }

  const today =
    new Date().toISOString().slice(0, 10);

  if (
    row.season.ends_at &&
    row.season.ends_at < today
  ) {
    return {
      label: "Finalizada",
      className: "is-finished",
    };
  }

  return {
    label: "Programada",
    className: "is-scheduled",
  };
}

export default function SeasonAdmin({
  rows,
}: {
  rows: AdminSeasonRow[];
}) {
  const router = useRouter();

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("ALL");

  const [busy, setBusy] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return rows.filter((row) => {
      const status =
        derivedStatus(row).label;

      if (
        statusFilter !== "ALL" &&
        status !== statusFilter
      ) {
        return false;
      }

      if (
        q &&
        !row.season.name
          .toLowerCase()
          .includes(q)
      ) {
        return false;
      }

      return true;
    });
  }, [rows, search, statusFilter]);

  async function createSeason(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const form = event.currentTarget;
    const data = new FormData(form);

    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch(
        "/api/competitions/season",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            name:
              data.get("name"),
            startsAt:
              data.get("startsAt"),
            endsAt:
              data.get("endsAt"),
            isActive:
              data.get("isActive") === "on",
          }),
        }
      );

      const payload =
        (await response.json()) as ApiResponse;

      if (!response.ok) {
        throw new Error(
          payload.error ??
            "No se pudo crear la temporada."
        );
      }

      form.reset();

      setMessage(
        "Temporada creada correctamente. Ya puedes crear competiciones dentro de ella."
      );

      router.refresh();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Error desconocido."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mt-season-admin">
      <section className="mt-season-admin-title">
        <div>
          <div className="mt-season-breadcrumb">
            Administración / Temporadas
          </div>

          <h1>Temporadas</h1>

          <p>
            Crea y consulta las temporadas globales
            de Manager Tools. Después podrás crear
            varias competiciones dentro de una misma
            temporada.
          </p>
        </div>

        <a
          href="#crear-temporada"
          className="mt-season-new-button"
        >
          + Nueva temporada
        </a>
      </section>

      <div className="mt-season-admin-layout">
        <section className="mt-season-main">
          <div className="mt-season-filters">
            <label>
              <span>Estado</span>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value
                  )
                }
              >
                <option value="ALL">
                  Todas
                </option>
                <option value="Activa">
                  Activas
                </option>
                <option value="Programada">
                  Programadas
                </option>
                <option value="Finalizada">
                  Finalizadas
                </option>
              </select>
            </label>

            <label className="mt-season-search">
              <span>Buscar</span>
              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Buscar temporada..."
              />
            </label>
          </div>

          <section className="mt-season-table-card">
            <div className="mt-season-card-head">
              <div>
                <h2>
                  Temporadas ({filteredRows.length})
                </h2>
                <p>
                  Una temporada puede contener varias
                  competiciones.
                </p>
              </div>
            </div>

            <div className="mt-season-table-wrap">
              <div className="mt-season-table-head">
                <span>Temporada</span>
                <span>Inicio</span>
                <span>Fin</span>
                <span>Estado</span>
                <span>Comp.</span>
                <span>Equipos</span>
                <span>Partidos</span>
                <span>Acciones</span>
              </div>

              {filteredRows.length ? (
                filteredRows.map((row) => {
                  const status =
                    derivedStatus(row);

                  return (
                    <div
                      key={row.season.id}
                      className="mt-season-table-row"
                    >
                      <strong>
                        {row.season.name}
                      </strong>

                      <span>
                        {formatDate(
                          row.season.starts_at
                        )}
                      </span>

                      <span>
                        {formatDate(
                          row.season.ends_at
                        )}
                      </span>

                      <span>
                        <b
                          className={`mt-season-status ${status.className}`}
                        >
                          {status.label}
                        </b>
                      </span>

                      <span>
                        {row.competitionCount}
                      </span>

                      <span>
                        {row.teamCount}
                      </span>

                      <span>
                        {row.matchCount}
                      </span>

                      <span className="mt-season-actions">
                        <Link
                          href={`/temporadas/${row.season.id}`}
                          title="Ver temporada"
                        >
                          Ver
                        </Link>

                        <Link
                          href={`/admin?section=competiciones&season=${row.season.id}`}
                          title="Crear o gestionar competiciones"
                        >
                          Competiciones
                        </Link>
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="mt-season-empty">
                  No hay temporadas que coincidan con
                  los filtros.
                </div>
              )}
            </div>
          </section>
        </section>

        <aside className="mt-season-side">
          <section
            id="crear-temporada"
            className="mt-season-create-card"
          >
            <div className="mt-season-card-head">
              <div>
                <h2>Crear nueva temporada</h2>
                <p>
                  La temporada es global, no pertenece
                  a una única competición.
                </p>
              </div>
            </div>

            <form
              onSubmit={createSeason}
              className="mt-season-create-form"
            >
              <label>
                <span>
                  Nombre de temporada *
                </span>

                <input
                  name="name"
                  required
                  placeholder="2027/2028"
                  autoComplete="off"
                />
              </label>

              <div className="mt-season-date-grid">
                <label>
                  <span>
                    Fecha de inicio
                  </span>

                  <input
                    name="startsAt"
                    type="date"
                  />
                </label>

                <label>
                  <span>
                    Fecha de fin
                  </span>

                  <input
                    name="endsAt"
                    type="date"
                  />
                </label>
              </div>

              <label className="mt-season-active-check">
                <input
                  name="isActive"
                  type="checkbox"
                />

                <span>
                  <b>
                    Marcar como temporada activa
                  </b>
                  <small>
                    Si la activas, las demás temporadas
                    se marcarán como inactivas.
                  </small>
                </span>
              </label>

              <button
                type="submit"
                disabled={busy}
              >
                {busy
                  ? "Creando..."
                  : "Crear temporada"}
              </button>
            </form>

            {message ? (
              <div className="mt-season-notice is-success">
                {message}
              </div>
            ) : null}

            {error ? (
              <div className="mt-season-notice is-error">
                {error}
              </div>
            ) : null}
          </section>

          <section className="mt-season-help-card">
            <h3>¿Qué ocurre después?</h3>

            <p>
              Crear una temporada no genera jornadas
              ni partidos por sí sola. Después ve a
              Administración → Competiciones, crea la
              competición en esta temporada, añade los
              clubes y genera su calendario.
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}
