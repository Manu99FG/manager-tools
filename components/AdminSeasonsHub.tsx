"use client";

import Link from "next/link";
import {
  FormEvent,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import type {
  AdminSeasonRow,
} from "@/lib/admin-seasons";

type FilterStatus =
  | "ALL"
  | "ACTIVE"
  | "PLANNED"
  | "FINISHED"
  | "CREATED";

type SortMode =
  | "RECENT"
  | "OLDEST"
  | "NAME_ASC"
  | "NAME_DESC";

type ApiResult = {
  ok?: boolean;
  error?: string;
};

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function dateInput(value: string | null) {
  return value?.slice(0, 10) ?? "";
}

function getSeasonState(
  season: AdminSeasonRow
): {
  key: Exclude<FilterStatus, "ALL">;
  label: string;
} {
  if (season.isActive) {
    return {
      key: "ACTIVE",
      label: "Activa",
    };
  }

  const now = Date.now();

  if (
    season.endsAt &&
    new Date(`${season.endsAt}T23:59:59`).getTime() <
      now
  ) {
    return {
      key: "FINISHED",
      label: "Finalizada",
    };
  }

  if (
    season.startsAt &&
    new Date(`${season.startsAt}T00:00:00`).getTime() >
      now
  ) {
    return {
      key: "PLANNED",
      label: "Programada",
    };
  }

  return {
    key: "CREATED",
    label: "Creada",
  };
}

function postJson(
  method: "POST" | "PATCH" | "DELETE",
  body: unknown
) {
  return fetch("/api/admin/seasons", {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

export default function AdminSeasonsHub({
  seasons,
}: {
  seasons: AdminSeasonRow[];
}) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [status, setStatus] =
    useState<FilterStatus>("ALL");
  const [sortMode, setSortMode] =
    useState<SortMode>("RECENT");

  const [selectedId, setSelectedId] =
    useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [message, setMessage] =
    useState<string | null>(null);
  const [error, setError] =
    useState<string | null>(null);

  const selected =
    seasons.find(
      (season) => season.id === selectedId
    ) ?? null;

  const filtered = useMemo(() => {
    const needle = search
      .trim()
      .toLocaleLowerCase("es");

    const rows = seasons.filter((season) => {
      const state = getSeasonState(season);

      const matchesSearch =
        !needle ||
        season.name
          .toLocaleLowerCase("es")
          .includes(needle);

      const matchesStatus =
        status === "ALL" ||
        state.key === status;

      return matchesSearch && matchesStatus;
    });

    return rows.sort((a, b) => {
      if (sortMode === "NAME_ASC") {
        return a.name.localeCompare(
          b.name,
          "es"
        );
      }

      if (sortMode === "NAME_DESC") {
        return b.name.localeCompare(
          a.name,
          "es"
        );
      }

      const aTime = new Date(
        a.startsAt ??
          a.createdAt
      ).getTime();

      const bTime = new Date(
        b.startsAt ??
          b.createdAt
      ).getTime();

      return sortMode === "OLDEST"
        ? aTime - bTime
        : bTime - aTime;
    });
  }, [
    seasons,
    search,
    status,
    sortMode,
  ]);

  const activeSeason =
    seasons.find(
      (season) => season.isActive
    ) ?? null;

  async function handleResponse(
    response: Response,
    success: string
  ) {
    const data =
      (await response.json()) as ApiResult;

    if (!response.ok) {
      throw new Error(
        data.error ??
          "No se pudo completar la operación."
      );
    }

    setMessage(success);
    router.refresh();
  }

  async function createSeason(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const form = new FormData(
      event.currentTarget
    );

    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      const response = await postJson(
        "POST",
        {
          name: form.get("name"),
          startsAt: form.get("startsAt"),
          endsAt: form.get("endsAt"),
          isActive:
            form.get("isActive") === "on",
        }
      );

      await handleResponse(
        response,
        "Temporada creada correctamente."
      );

      event.currentTarget.reset();
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

  async function editSeason(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!selected) return;

    const form = new FormData(
      event.currentTarget
    );

    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      const response = await postJson(
        "PATCH",
        {
          id: selected.id,
          name: form.get("name"),
          startsAt: form.get("startsAt"),
          endsAt: form.get("endsAt"),
          isActive:
            form.get("isActive") === "on",
        }
      );

      await handleResponse(
        response,
        "Temporada actualizada."
      );

      setSelectedId(null);
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

  async function activateSeason(
    season: AdminSeasonRow
  ) {
    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      const response = await postJson(
        "PATCH",
        {
          id: season.id,
          name: season.name,
          startsAt: season.startsAt,
          endsAt: season.endsAt,
          isActive: true,
        }
      );

      await handleResponse(
        response,
        `${season.name} es ahora la temporada activa.`
      );
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

  async function deleteSeason(
    season: AdminSeasonRow
  ) {
    const summary = [
      `${season.competitions} competición${season.competitions === 1 ? "" : "es"}`,
      `${season.teams} equipo${season.teams === 1 ? "" : "s"}`,
      `${season.matches} partido${season.matches === 1 ? "" : "s"}`,
    ].join(" · ");

    if (
      !window.confirm(
        `¿Eliminar definitivamente "${season.name}"?\n\nSe eliminarán también todos sus datos asociados (${summary}).\n\nEsta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    setBusy(true);
    setMessage(null);
    setError(null);

    try {
      const response = await postJson(
        "DELETE",
        { id: season.id }
      );

      await handleResponse(
        response,
        "Temporada eliminada."
      );

      if (selectedId === season.id) {
        setSelectedId(null);
      }
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
    <main className="v3121-seasons-admin">
      <header className="v3121-seasons-heading">
        <div>
          <div className="v3121-breadcrumb">
            <Link href="/admin">
              Administración
            </Link>
            <span>/</span>
            <strong>Temporadas</strong>
          </div>

          <div className="v3121-heading-row">
            <span className="v3121-heading-icon">
              <CalendarIcon />
            </span>
            <div>
              <h1>Temporadas</h1>
              <p>
                Gestiona las temporadas de todas
                las competiciones.
              </p>
            </div>
          </div>
        </div>

        <a
          href="#crear-temporada"
          className="v3121-primary-action"
        >
          <span>+</span>
          Nueva temporada
        </a>
      </header>

      <nav className="v3121-admin-tabs">
        <Link href="/admin?section=competiciones">
          Competiciones
        </Link>
        <Link
          href="/admin?section=temporadas"
          className="is-active"
        >
          Temporadas
        </Link>
        <Link href="/admin?section=alineaciones">
          Alineaciones
        </Link>
        <Link href="/admin?section=mercado">
          Mercado
        </Link>
        <Link href="/admin?section=votaciones">
          Votaciones
        </Link>
      </nav>

      <section className="v3121-season-summary">
        <div>
          <small>Temporadas</small>
          <strong>{seasons.length}</strong>
          <span>registradas</span>
        </div>
        <div>
          <small>Temporada activa</small>
          <strong>
            {activeSeason?.name ?? "—"}
          </strong>
          <span>
            {activeSeason
              ? `${activeSeason.competitions} competiciones`
              : "Ninguna activa"}
          </span>
        </div>
        <div>
          <small>Competiciones</small>
          <strong>
            {seasons.reduce(
              (sum, season) =>
                sum + season.competitions,
              0
            )}
          </strong>
          <span>acumuladas</span>
        </div>
        <div>
          <small>Partidos</small>
          <strong>
            {seasons.reduce(
              (sum, season) =>
                sum + season.matches,
              0
            )}
          </strong>
          <span>registrados</span>
        </div>
      </section>

      <section className="v3121-season-toolbar">
        <label>
          <span>Estado</span>
          <select
            value={status}
            onChange={(event) =>
              setStatus(
                event.target
                  .value as FilterStatus
              )
            }
          >
            <option value="ALL">
              Todas
            </option>
            <option value="ACTIVE">
              Activa
            </option>
            <option value="PLANNED">
              Programada
            </option>
            <option value="FINISHED">
              Finalizada
            </option>
            <option value="CREATED">
              Creada
            </option>
          </select>
        </label>

        <label>
          <span>Ordenar por</span>
          <select
            value={sortMode}
            onChange={(event) =>
              setSortMode(
                event.target
                  .value as SortMode
              )
            }
          >
            <option value="RECENT">
              Más reciente
            </option>
            <option value="OLDEST">
              Más antigua
            </option>
            <option value="NAME_ASC">
              Nombre A-Z
            </option>
            <option value="NAME_DESC">
              Nombre Z-A
            </option>
          </select>
        </label>

        <label className="v3121-season-search">
          <span>Buscar</span>
          <div>
            <SearchIcon />
            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Buscar temporada..."
            />
          </div>
        </label>
      </section>

      <div className="v3121-season-layout">
        <section className="v3121-season-list-card">
          <div className="v3121-card-head">
            <div>
              <h2>
                Temporadas ({filtered.length})
              </h2>
              <p>
                Una temporada puede contener varias
                competiciones.
              </p>
            </div>
          </div>

          <div className="v3121-season-table-wrap">
            <div className="v3121-season-table-head">
              <span>Temporada</span>
              <span>Inicio</span>
              <span>Fin</span>
              <span>Estado</span>
              <span>Comp.</span>
              <span>Equipos</span>
              <span>Partidos</span>
              <span>Acciones</span>
            </div>

            {filtered.length ? (
              filtered.map((season) => {
                const state =
                  getSeasonState(season);

                return (
                  <div
                    className="v3121-season-row"
                    key={season.id}
                  >
                    <div className="v3121-season-name">
                      <span className="v3121-season-calendar">
                        <CalendarIcon />
                      </span>
                      <div>
                        <strong>
                          {season.name}
                        </strong>
                        <small>
                          ID ·{" "}
                          {season.id.slice(
                            0,
                            8
                          )}
                        </small>
                      </div>
                    </div>

                    <span>
                      {formatDate(
                        season.startsAt
                      )}
                    </span>

                    <span>
                      {formatDate(
                        season.endsAt
                      )}
                    </span>

                    <span
                      className={`v3121-status is-${state.key.toLowerCase()}`}
                    >
                      <i />
                      {state.label}
                    </span>

                    <strong>
                      {season.competitions}
                    </strong>
                    <strong>
                      {season.teams}
                    </strong>
                    <strong>
                      {season.matches}
                    </strong>

                    <div className="v3121-row-actions">
                      <button
                        type="button"
                        title="Editar"
                        onClick={() =>
                          setSelectedId(
                            season.id
                          )
                        }
                      >
                        <EditIcon />
                      </button>

                      {!season.isActive ? (
                        <button
                          type="button"
                          title="Activar temporada"
                          disabled={busy}
                          onClick={() =>
                            activateSeason(
                              season
                            )
                          }
                        >
                          <PowerIcon />
                        </button>
                      ) : (
                        <span
                          className="v3121-active-dot"
                          title="Temporada activa"
                        />
                      )}

                      <button
                        type="button"
                        title="Eliminar"
                        disabled={busy}
                        onClick={() =>
                          deleteSeason(
                            season
                          )
                        }
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="v3121-empty">
                No hay temporadas que coincidan
                con los filtros.
              </div>
            )}
          </div>
        </section>

        <aside className="v3121-season-side">
          {selected ? (
            <form
              className="v3121-season-form"
              onSubmit={editSeason}
            >
              <div className="v3121-side-title">
                <div>
                  <small>EDITAR</small>
                  <h2>
                    {selected.name}
                  </h2>
                </div>

                <button
                  type="button"
                  className="v3121-close-button"
                  onClick={() =>
                    setSelectedId(null)
                  }
                >
                  ×
                </button>
              </div>

              <SeasonFormFields
                season={selected}
              />

              <button
                type="submit"
                className="v3121-save-button"
                disabled={busy}
              >
                {busy
                  ? "Guardando..."
                  : "Guardar cambios"}
              </button>
            </form>
          ) : (
            <form
              id="crear-temporada"
              className="v3121-season-form"
              onSubmit={createSeason}
            >
              <div className="v3121-side-title">
                <div>
                  <small>NUEVA</small>
                  <h2>
                    Crear temporada
                  </h2>
                </div>
              </div>

              <SeasonFormFields />

              <button
                type="submit"
                className="v3121-save-button"
                disabled={busy}
              >
                {busy
                  ? "Creando..."
                  : "Crear temporada"}
              </button>

              <div className="v3121-form-info">
                <InfoIcon />
                <p>
                  Crear una temporada no genera
                  competiciones ni calendarios por sí
                  sola. Después podrás crear o
                  duplicar las competiciones que
                  pertenezcan a esta temporada.
                </p>
              </div>
            </form>
          )}

          <section className="v3121-status-help">
            <h3>
              Estados de temporada
            </h3>

            <div>
              <i className="is-active" />
              <span>
                <b>Activa</b>
                <small>
                  Temporada marcada como actual
                </small>
              </span>
            </div>

            <div>
              <i className="is-planned" />
              <span>
                <b>Programada</b>
                <small>
                  Su fecha de inicio todavía no ha
                  llegado
                </small>
              </span>
            </div>

            <div>
              <i className="is-finished" />
              <span>
                <b>Finalizada</b>
                <small>
                  Su fecha de fin ya ha pasado
                </small>
              </span>
            </div>

            <div>
              <i className="is-created" />
              <span>
                <b>Creada</b>
                <small>
                  Existe, pero no está activa
                </small>
              </span>
            </div>
          </section>
        </aside>
      </div>

      {message ? (
        <div className="v3121-toast is-success">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="v3121-toast is-error">
          {error}
        </div>
      ) : null}
    </main>
  );
}

function SeasonFormFields({
  season,
}: {
  season?: AdminSeasonRow;
}) {
  return (
    <>
      <label>
        <span>
          Temporada <b>*</b>
        </span>
        <input
          name="name"
          required
          defaultValue={
            season?.name ?? ""
          }
          placeholder="2027/2028"
        />
      </label>

      <div className="v3121-date-grid">
        <label>
          <span>Fecha de inicio</span>
          <input
            name="startsAt"
            type="date"
            defaultValue={dateInput(
              season?.startsAt ??
                null
            )}
          />
        </label>

        <label>
          <span>Fecha de fin</span>
          <input
            name="endsAt"
            type="date"
            defaultValue={dateInput(
              season?.endsAt ??
                null
            )}
          />
        </label>
      </div>

      <label className="v3121-active-check">
        <input
          name="isActive"
          type="checkbox"
          defaultChecked={
            season?.isActive ??
            false
          }
        />
        <span>
          <b>
            Marcar como temporada activa
          </b>
          <small>
            Al activarla, cualquier otra temporada
            activa pasará a inactiva.
          </small>
        </span>
      </label>
    </>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path
        d="M6 3v3M18 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M8 12h3M13 12h3M8 16h3M13 16h3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <circle
        cx="11"
        cy="11"
        r="6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="m16 16 4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path
        d="m5 19 3.5-.7L18 8.8 15.2 6 5.7 15.5 5 19Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PowerIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path
        d="M12 3v8M7.2 6.4a7 7 0 1 0 9.6 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path
        d="M6 7h12M9 7V4h6v3M8 9v10h8V9M10.5 11v5M13.5 11v5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M12 10v6M12 7.2h.01"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
