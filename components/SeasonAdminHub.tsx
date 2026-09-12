"use client";

import Link from "next/link";

import {
  FormEvent,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import type {
  AdminSeasonRow,
  AdminSeasonStatus,
} from "@/lib/admin-seasons";

type Props = {
  rows:
    AdminSeasonRow[];
};

type StatusFilter =
  | "ALL"
  | AdminSeasonStatus;

type SortMode =
  | "RECENT"
  | "OLDEST"
  | "NAME_ASC"
  | "NAME_DESC";

type FormMode =
  | "CREATE"
  | "EDIT";

type ApiResponse = {
  ok?: boolean;
  error?: string;
};

const STATUS_LABEL:
  Record<
    AdminSeasonStatus,
    string
  > = {
    ACTIVE:
      "Activa",
    SCHEDULED:
      "Programada",
    FINISHED:
      "Finalizada",
  };

function formatDate(
  value:
    | string
    | null
) {
  if (!value) {
    return "—";
  }

  const date =
    new Date(
      `${value}T12:00:00`
    );

  if (
    !Number.isFinite(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "es-ES",
    {
      day:
        "2-digit",
      month:
        "2-digit",
      year:
        "numeric",
    }
  ).format(date);
}

async function readJson(
  response: Response
) {
  const data =
    (await response.json()) as
      ApiResponse;

  if (
    !response.ok
  ) {
    throw new Error(
      data.error ??
        "Error desconocido."
    );
  }

  return data;
}

export default function SeasonAdminHub({
  rows,
}: Props) {
  const router =
    useRouter();

  const formRef =
    useRef<
      HTMLDivElement
    >(null);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<StatusFilter>(
      "ALL"
    );

  const [
    sortMode,
    setSortMode,
  ] =
    useState<SortMode>(
      "RECENT"
    );

  const [
    formMode,
    setFormMode,
  ] =
    useState<FormMode>(
      "CREATE"
    );

  const [
    editId,
    setEditId,
  ] = useState("");

  const [
    busy,
    setBusy,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState<
    string | null
  >(null);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const editRow =
    useMemo(
      () =>
        rows.find(
          (row) =>
            row.season.id ===
            editId
        ) ?? null,
      [
        rows,
        editId,
      ]
    );

  const visibleRows =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      const filtered =
        rows.filter(
          (row) => {
            if (
              statusFilter !==
                "ALL" &&
              row.status !==
                statusFilter
            ) {
              return false;
            }

            if (
              query &&
              !row.season.name
                .toLowerCase()
                .includes(
                  query
                )
            ) {
              return false;
            }

            return true;
          }
        );

      return filtered.sort(
        (a, b) => {
          if (
            sortMode ===
            "NAME_ASC"
          ) {
            return a.season.name.localeCompare(
              b.season.name,
              "es"
            );
          }

          if (
            sortMode ===
            "NAME_DESC"
          ) {
            return b.season.name.localeCompare(
              a.season.name,
              "es"
            );
          }

          const aDate =
            a.season.starts_at ??
            a.season.created_at;

          const bDate =
            b.season.starts_at ??
            b.season.created_at;

          if (
            sortMode ===
            "OLDEST"
          ) {
            return aDate.localeCompare(
              bDate
            );
          }

          return bDate.localeCompare(
            aDate
          );
        }
      );
    }, [
      rows,
      search,
      statusFilter,
      sortMode,
    ]);

  const activeCount =
    rows.filter(
      (row) =>
        row.status ===
        "ACTIVE"
    ).length;

  const scheduledCount =
    rows.filter(
      (row) =>
        row.status ===
        "SCHEDULED"
    ).length;

  const finishedCount =
    rows.filter(
      (row) =>
        row.status ===
        "FINISHED"
    ).length;

  function resetForm() {
    setFormMode(
      "CREATE"
    );

    setEditId("");

    setError(null);
    setMessage(null);

    requestAnimationFrame(
      () => {
        formRef.current?.scrollIntoView(
          {
            behavior:
              "smooth",
            block:
              "start",
          }
        );
      }
    );
  }

  function startEdit(
    id: string
  ) {
    setFormMode(
      "EDIT"
    );

    setEditId(
      id
    );

    setError(null);
    setMessage(null);

    requestAnimationFrame(
      () => {
        formRef.current?.scrollIntoView(
          {
            behavior:
              "smooth",
            block:
              "start",
          }
        );
      }
    );
  }

  async function submitSeason(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setBusy(true);
    setError(null);
    setMessage(null);

    const form =
      new FormData(
        event.currentTarget
      );

    try {
      const editing =
        formMode ===
        "EDIT" &&
        editRow;

      const response =
        await fetch(
          "/api/admin/seasons",
          {
            method:
              editing
                ? "PATCH"
                : "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify(
                editing
                  ? {
                      id:
                        editRow
                          .season
                          .id,
                      name:
                        form.get(
                          "name"
                        ),
                      startsAt:
                        form.get(
                          "startsAt"
                        ),
                      endsAt:
                        form.get(
                          "endsAt"
                        ),
                      isActive:
                        form.get(
                          "isActive"
                        ) ===
                        "on",
                    }
                  : {
                      name:
                        form.get(
                          "name"
                        ),
                      startsAt:
                        form.get(
                          "startsAt"
                        ),
                      endsAt:
                        form.get(
                          "endsAt"
                        ),
                      activate:
                        form.get(
                          "isActive"
                        ) ===
                        "on",
                    }
              ),
          }
        );

      await readJson(
        response
      );

      setMessage(
        editing
          ? "Temporada actualizada correctamente."
          : "Temporada creada correctamente."
      );

      if (!editing) {
        event.currentTarget.reset();
      }

      router.refresh();
    } catch (
      submitError
    ) {
      setError(
        submitError instanceof
          Error
          ? submitError.message
          : "Error desconocido."
      );
    } finally {
      setBusy(false);
    }
  }

  async function deleteSeason(
    row:
      AdminSeasonRow
  ) {
    const summary = [
      `${row.competitionCount} competición${row.competitionCount === 1 ? "" : "es"}`,
      `${row.teamCount} equipo${row.teamCount === 1 ? "" : "s"}`,
      `${row.matchCount} partido${row.matchCount === 1 ? "" : "s"}`,
    ].join(" · ");

    if (
      !window.confirm(
        `¿Eliminar definitivamente "${row.season.name}"?\n\nSe eliminarán también sus datos de competición (${summary}).\n\nEsta acción no se puede deshacer.`
      )
    ) {
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const response =
        await fetch(
          "/api/admin/seasons",
          {
            method:
              "DELETE",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                id:
                  row.season
                    .id,
              }),
          }
        );

      await readJson(
        response
      );

      if (
        editId ===
        row.season.id
      ) {
        setEditId("");
        setFormMode(
          "CREATE"
        );
      }

      setMessage(
        "Temporada eliminada."
      );

      router.refresh();
    } catch (
      deleteError
    ) {
      setError(
        deleteError instanceof
          Error
          ? deleteError.message
          : "Error desconocido."
      );
    } finally {
      setBusy(false);
    }
  }

  async function activateSeason(
    row:
      AdminSeasonRow
  ) {
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const response =
        await fetch(
          "/api/admin/seasons",
          {
            method:
              "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                id:
                  row.season
                    .id,
                name:
                  row.season
                    .name,
                startsAt:
                  row.season
                    .starts_at,
                endsAt:
                  row.season
                    .ends_at,
                isActive:
                  true,
              }),
          }
        );

      await readJson(
        response
      );

      setMessage(
        `${row.season.name} es ahora la temporada activa.`
      );

      router.refresh();
    } catch (
      activateError
    ) {
      setError(
        activateError instanceof
          Error
          ? activateError.message
          : "Error desconocido."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="v31211-seasons-admin">
      <header className="v31211-seasons-head">
        <div>
          <div className="v31211-breadcrumb">
            Administración
            <span>/</span>
            Temporadas
          </div>

          <div className="v31211-title-row">
            <span className="v31211-title-icon">
              ◫
            </span>

            <div>
              <h1>
                Temporadas
              </h1>

              <p>
                Gestiona las temporadas globales de la Liga de Leyendas y las competiciones asociadas a cada una.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="v31211-primary"
          onClick={
            resetForm
          }
        >
          + Nueva temporada
        </button>
      </header>

      <section className="v31211-summary">
        <SummaryCard
          label="Temporadas"
          value={
            rows.length
          }
        />

        <SummaryCard
          label="Activas"
          value={
            activeCount
          }
          tone="active"
        />

        <SummaryCard
          label="Programadas"
          value={
            scheduledCount
          }
          tone="scheduled"
        />

        <SummaryCard
          label="Finalizadas"
          value={
            finishedCount
          }
          tone="finished"
        />
      </section>

      <section className="v31211-filters">
        <label>
          <span>
            Estado
          </span>

          <select
            value={
              statusFilter
            }
            onChange={
              (event) =>
                setStatusFilter(
                  event.target
                    .value as
                    StatusFilter
                )
            }
          >
            <option value="ALL">
              Todas
            </option>

            <option value="ACTIVE">
              Activas
            </option>

            <option value="SCHEDULED">
              Programadas
            </option>

            <option value="FINISHED">
              Finalizadas
            </option>
          </select>
        </label>

        <label>
          <span>
            Ordenar por
          </span>

          <select
            value={
              sortMode
            }
            onChange={
              (event) =>
                setSortMode(
                  event.target
                    .value as
                    SortMode
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

        <label className="v31211-search">
          <span>
            Buscar
          </span>

          <input
            value={
              search
            }
            onChange={
              (event) =>
                setSearch(
                  event.target
                    .value
                )
            }
            placeholder="Buscar temporada..."
          />
        </label>
      </section>

      {(message ||
        error) && (
        <div
          className={
            error
              ? "v31211-notice is-error"
              : "v31211-notice is-success"
          }
        >
          {error ??
            message}
        </div>
      )}

      <div className="v31211-layout">
        <section className="v31211-list-card">
          <div className="v31211-card-head">
            <div>
              <h2>
                Temporadas
                {" "}
                <span>
                  ({visibleRows.length})
                </span>
              </h2>

              <p>
                Una temporada puede contener varias competiciones.
              </p>
            </div>
          </div>

          <div className="v31211-table-scroll">
            <div className="v31211-table-head">
              <span>
                Temporada
              </span>

              <span>
                Inicio
              </span>

              <span>
                Fin
              </span>

              <span>
                Estado
              </span>

              <span>
                Comp.
              </span>

              <span>
                Equipos
              </span>

              <span>
                Partidos
              </span>

              <span>
                Acciones
              </span>
            </div>

            {visibleRows.length ? (
              visibleRows.map(
                (row) => (
                  <div
                    className="v31211-table-row"
                    key={
                      row.season
                        .id
                    }
                  >
                    <div className="v31211-season-name">
                      <strong>
                        {
                          row.season
                            .name
                        }
                      </strong>

                      <small>
                        ID{" "}
                        {row.season.id.slice(
                          0,
                          8
                        )}
                      </small>
                    </div>

                    <span>
                      {formatDate(
                        row.season
                          .starts_at
                      )}
                    </span>

                    <span>
                      {formatDate(
                        row.season
                          .ends_at
                      )}
                    </span>

                    <StatusBadge
                      status={
                        row.status
                      }
                    />

                    <strong>
                      {
                        row.competitionCount
                      }
                    </strong>

                    <strong>
                      {
                        row.teamCount
                      }
                    </strong>

                    <strong>
                      {
                        row.matchCount
                      }
                    </strong>

                    <div className="v31211-row-actions">
                      <button
                        type="button"
                        title="Editar temporada"
                        onClick={
                          () =>
                            startEdit(
                              row.season
                                .id
                            )
                        }
                      >
                        ✎
                      </button>

                      <Link
                        href={`/temporadas/${row.season.id}`}
                        title="Ver temporada"
                      >
                        ◫
                      </Link>

                      {row.status !==
                      "ACTIVE" ? (
                        <button
                          type="button"
                          title="Marcar como temporada activa"
                          onClick={
                            () =>
                              activateSeason(
                                row
                              )
                          }
                          disabled={
                            busy
                          }
                        >
                          ✓
                        </button>
                      ) : null}

                      <button
                        type="button"
                        className="is-danger"
                        title="Eliminar temporada"
                        onClick={
                          () =>
                            deleteSeason(
                              row
                            )
                        }
                        disabled={
                          busy
                        }
                      >
                        ×
                      </button>
                    </div>
                  </div>
                )
              )
            ) : (
              <div className="v31211-empty">
                No hay temporadas que coincidan con los filtros.
              </div>
            )}
          </div>
        </section>

        <aside
          className="v31211-side"
          ref={
            formRef
          }
        >
          <section className="v31211-form-card">
            <div className="v31211-card-head">
              <div>
                <h2>
                  {formMode ===
                  "EDIT"
                    ? "Editar temporada"
                    : "Crear nueva temporada"}
                </h2>

                <p>
                  {formMode ===
                  "EDIT"
                    ? "Actualiza los datos generales de la temporada."
                    : "Crea primero la temporada y después asígnala a las competiciones."}
                </p>
              </div>
            </div>

            <form
              key={
                formMode ===
                  "EDIT" &&
                editRow
                  ? editRow
                      .season
                      .id
                  : "create"
              }
              onSubmit={
                submitSeason
              }
              className="v31211-form"
            >
              <label>
                <span>
                  Temporada *
                </span>

                <input
                  name="name"
                  required
                  defaultValue={
                    formMode ===
                      "EDIT" &&
                    editRow
                      ? editRow
                          .season
                          .name
                      : ""
                  }
                  placeholder="2027/2028"
                />
              </label>

              <div className="v31211-date-grid">
                <label>
                  <span>
                    Fecha de inicio
                  </span>

                  <input
                    name="startsAt"
                    type="date"
                    defaultValue={
                      formMode ===
                        "EDIT" &&
                      editRow
                        ? editRow
                            .season
                            .starts_at ??
                          ""
                        : ""
                    }
                  />
                </label>

                <label>
                  <span>
                    Fecha de fin
                  </span>

                  <input
                    name="endsAt"
                    type="date"
                    defaultValue={
                      formMode ===
                        "EDIT" &&
                      editRow
                        ? editRow
                            .season
                            .ends_at ??
                          ""
                        : ""
                    }
                  />
                </label>
              </div>

              <label className="v31211-active-toggle">
                <input
                  name="isActive"
                  type="checkbox"
                  defaultChecked={
                    formMode ===
                      "EDIT" &&
                    editRow
                      ? editRow
                          .season
                          .is_active
                      : false
                  }
                />

                <span>
                  <b>
                    Temporada activa
                  </b>

                  <small>
                    Si la activas, las demás temporadas pasarán automáticamente a inactivas.
                  </small>
                </span>
              </label>

              <button
                type="submit"
                className="v31211-primary v31211-submit"
                disabled={
                  busy
                }
              >
                {busy
                  ? "Guardando..."
                  : formMode ===
                      "EDIT"
                    ? "Guardar cambios"
                    : "Crear temporada"}
              </button>

              {formMode ===
              "EDIT" ? (
                <button
                  type="button"
                  className="v31211-secondary"
                  onClick={
                    resetForm
                  }
                >
                  Cancelar edición
                </button>
              ) : null}
            </form>

            <div className="v31211-info-box">
              <strong>
                Información
              </strong>

              <p>
                La temporada es el contenedor global. Después, desde Administración → Competiciones, crearás las ligas, copas o supercopas asociadas a ella.
              </p>
            </div>
          </section>

          <section className="v31211-status-card">
            <h3>
              Estados de temporada
            </h3>

            <StatusHelp
              status="ACTIVE"
              text="Temporada marcada como actual."
            />

            <StatusHelp
              status="SCHEDULED"
              text="Temporada creada y todavía no finalizada."
            />

            <StatusHelp
              status="FINISHED"
              text="La fecha de fin ya ha pasado."
            />
          </section>

          <section className="v31211-shortcuts">
            <h3>
              Accesos rápidos
            </h3>

            <Link href="/admin?section=competiciones">
              Gestionar competiciones
              <span>
                →
              </span>
            </Link>

            <Link href="/temporadas">
              Ver temporadas públicas
              <span>
                →
              </span>
            </Link>
          </section>
        </aside>
      </div>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?:
    | "default"
    | "active"
    | "scheduled"
    | "finished";
}) {
  return (
    <div
      className={`v31211-summary-card is-${tone}`}
    >
      <span>
        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status:
    AdminSeasonStatus;
}) {
  return (
    <span
      className={`v31211-status is-${status.toLowerCase()}`}
    >
      <i />
      {
        STATUS_LABEL[
          status
        ]
      }
    </span>
  );
}

function StatusHelp({
  status,
  text,
}: {
  status:
    AdminSeasonStatus;
  text: string;
}) {
  return (
    <div className="v31211-status-help">
      <StatusBadge
        status={
          status
        }
      />

      <span>
        {text}
      </span>
    </div>
  );
}
