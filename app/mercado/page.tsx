import Image from "next/image";
import Link from "next/link";

import { getClubLogo } from "@/lib/club-logo";
import { getClubName } from "@/lib/club-names";
import {
  getMarketHistoryData,
  type MarketClub,
  type MarketTransfer,
} from "@/lib/market-history";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const money = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function formatMoney(value: number) {
  return money.format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Fecha no registrada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no registrada";
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export default async function MarketPage() {
  const data = await getMarketHistoryData();

  const topBuyer =
    [...data.clubs].sort(
      (a, b) => b.spent - a.spent
    )[0] ?? null;

  const topSeller =
    [...data.clubs].sort(
      (a, b) => b.income - a.income
    )[0] ?? null;

  const bestBalance =
    [...data.clubs].sort(
      (a, b) => b.balance - a.balance
    )[0] ?? null;

  const biggestTransfer =
    data.biggestTransfers[0] ?? null;

  return (
    <div className="mx-auto w-full max-w-[1280px] space-y-8">
      <section className="app-panel relative overflow-hidden rounded-[28px] p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[var(--mt-gold)]/5 blur-3xl" />

        <div className="relative">
          <div className="app-eyebrow">
            Economía histórica
          </div>

          <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-[var(--mt-text)] sm:text-4xl">
            Mercado de fichajes y cesiones
          </h1>

          <p className="mt-3 max-w-4xl text-sm leading-6 text-[var(--mt-muted)]">
            El mercado separa traspasos por dinero,
            intercambios de jugadores, intercambios con dinero
            adicional y cesiones. Las condiciones de una
            cesión se muestran dentro de la propia operación.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7">
            <Kpi
              label="Movimientos"
              value={String(data.totals.movements)}
            />
            <Kpi
              label="Fichajes"
              value={String(data.totals.transfers)}
            />
            <Kpi
              label="Cesiones"
              value={String(data.totals.loans)}
            />
            <Kpi
              label="Pendientes"
              value={String(data.totals.pending)}
            />
            <Kpi
              label="Intercambios"
              value={String(data.totals.exchangeDeals)}
            />
            <Kpi
              label="Vol. fichajes"
              value={formatMoney(
                data.totals.transferVolume
              )}
            />
            <Kpi
              label="Coste cesiones"
              value={formatMoney(
                data.totals.loanVolume
              )}
            />
          </div>
        </div>
      </section>

      {data.limitations.length > 0 ? (
        <section className="rounded-[13px] border border-[var(--mt-gold)] bg-[var(--mt-surface-soft)] p-4">
          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--mt-gold-dark)]">
            Datos pendientes
          </div>

          <div className="mt-2 space-y-1 text-sm leading-6 text-[var(--mt-muted)]">
            {data.limitations.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <SectionHeader
          eyebrow="Operaciones"
          title="Tipos de mercado"
          description="Cada operación conserva su lógica económica: el dinero de un intercambio se cuenta una vez y las cesiones mantienen propietario, fechas y condiciones."
        />

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <OperationPanel
            title="Traspasos por dinero"
            description="Jugador que cambia de propietario con importe de fichaje."
            movements={data.byOperationType.cashTransfers}
          />
          <OperationPanel
            title="Intercambios de jugadores"
            description="Dos clubes se entregan jugadores sin importe asociado."
            movements={data.byOperationType.playerExchanges}
          />
          <OperationPanel
            title="Intercambios con dinero"
            description="Intercambio de jugadores con compensación económica de un lado."
            movements={data.byOperationType.playerExchangesWithCash}
          />
          <OperationPanel
            title="Cesiones"
            description="Jugador cedido con fechas, coste, opción de compra y condiciones."
            movements={data.byOperationType.loans}
          />
        </div>
      </section>

      <section>
        <SectionHeader
          eyebrow="Cesiones activas"
          title="Jugadores actualmente cedidos"
          description="La vigencia se determina mediante las fechas reales de inicio y fin, no por una temporada completa."
        />

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.activeLoans.map((loan) => (
            <Link
              key={loan.id}
              href={loan.playerId ? `/jugadores/${loan.playerId}` : "/mercado"}
              className="app-panel-soft rounded-[13px] p-5 transition hover:border-[var(--mt-gold)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-[9px] font-black uppercase tracking-[0.12em] text-[var(--mt-gold-dark)]">
                    Cesión
                  </div>
                  <div className="mt-1 truncate font-black text-[var(--mt-text)]">
                    {loan.playerName.replaceAll("_", " ")}
                  </div>
                </div>

                <span className="rounded-full bg-[var(--mt-surface-soft)] px-2.5 py-1 text-[9px] font-black text-[var(--mt-gold-dark)]">
                  ACTIVA
                </span>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <Team teamCode={loan.ownerTeamCode ?? loan.fromTeamCode} />
                <span className="text-[var(--mt-muted)]">→</span>
                <Team teamCode={loan.toTeamCode} />
              </div>

              <div className="mt-4 text-xs leading-5 text-[var(--mt-muted)]">
                {loan.loanStartDate
                  ? formatDate(loan.loanStartDate)
                  : "—"}
                {" → "}
                {loan.loanEndDate
                  ? formatDate(loan.loanEndDate)
                  : "—"}
              </div>

              {loan.purchaseOption ? (
                <div className="mt-3 text-xs font-bold text-[var(--mt-gold-dark)]">
                  Opción de compra
                  {loan.purchaseOptionFee !== null
                    ? ` · ${formatMoney(
                        loan.purchaseOptionFee
                      )}`
                    : ""}
                  </div>
              ) : null}

              {loan.notes ? (
                <div className="mt-3 rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)] p-3 text-xs leading-5 text-[var(--mt-muted)]">
                  <b className="block text-[10px] uppercase tracking-wide text-[var(--mt-gold-dark)]">
                    Condiciones
                  </b>
                  {loan.notes}
                </div>
              ) : null}
            </Link>
          ))}

          {data.activeLoans.length === 0 ? (
            <div className="app-panel-soft rounded-[13px] p-5 text-sm text-[var(--mt-muted)]">
              No hay cesiones activas.
            </div>
          ) : null}
        </div>
      </section>

      <section>
        <SectionHeader
          eyebrow="Récords"
          title="Mercado permanente"
          description="Las cesiones no inflan los récords de fichajes: su coste se contabiliza aparte."
        />

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <RecordCard
            label="Fichaje más caro"
            value={
              biggestTransfer?.fee !== null &&
              biggestTransfer
                ? formatMoney(biggestTransfer.fee)
                : "—"
            }
            detail={
              biggestTransfer
                ? biggestTransfer.playerName
                : "Sin datos"
            }
            href={
              biggestTransfer?.playerId
                ? `/jugadores/${biggestTransfer.playerId}`
                : undefined
            }
          />

          <ClubRecord
            label="Más gasto en fichajes"
            club={topBuyer}
            value={
              topBuyer
                ? formatMoney(topBuyer.spent)
                : "—"
            }
          />

          <ClubRecord
            label="Más ingresos en ventas"
            club={topSeller}
            value={
              topSeller
                ? formatMoney(topSeller.income)
                : "—"
            }
          />

          <ClubRecord
            label="Mejor balance total"
            club={bestBalance}
            value={
              bestBalance
                ? signedMoney(bestBalance.balance)
                : "—"
            }
          />
        </div>
      </section>

      <section>
        <SectionHeader
          eyebrow="Top histórico"
          title="Fichajes más caros"
          description="Solo traspasos permanentes con importe conocido."
        />

        <MovementTable
          movements={data.biggestTransfers}
          ranked
        />
      </section>

      <section>
        <SectionHeader
          eyebrow="Clubes"
          title="Economía por club"
          description="Fichajes y cesiones tienen columnas independientes. El balance suma ventas y costes de cesión ingresados, y resta compras y costes de cesión pagados."
        />

        <div className="app-panel-soft mt-4 overflow-hidden rounded-2xl">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="text-[9px] font-black uppercase tracking-[0.11em] text-[var(--mt-muted)]">
                <tr>
                  <th className="px-4 py-3 text-left">Club</th>
                  <th className="px-3 py-3 text-right">Compras</th>
                  <th className="px-3 py-3 text-right">Ventas</th>
                  <th className="px-3 py-3 text-right">Ces. entran</th>
                  <th className="px-3 py-3 text-right">Ces. salen</th>
                  <th className="px-3 py-3 text-right">Gasto fich.</th>
                  <th className="px-3 py-3 text-right">Ingresos</th>
                  <th className="px-3 py-3 text-right">Coste ces.</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                </tr>
              </thead>

              <tbody>
                {data.clubs.map((club) => (
                  <tr
                    key={club.teamCode}
                    className="border-t border-[var(--mt-line)]"
                  >
                    <td className="px-4 py-3">
                      <ClubCell
                        teamCode={club.teamCode}
                      />
                    </td>
                    <td className="px-3 py-3 text-right text-[var(--mt-muted)]">
                      {club.purchases}
                    </td>
                    <td className="px-3 py-3 text-right text-[var(--mt-muted)]">
                      {club.sales}
                    </td>
                    <td className="px-3 py-3 text-right text-[var(--mt-gold-dark)]">
                      {club.loansIn}
                    </td>
                    <td className="px-3 py-3 text-right text-[var(--mt-gold-dark)]">
                      {club.loansOut}
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-red-700">
                      {formatMoney(club.spent)}
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-emerald-700">
                      {formatMoney(club.income)}
                    </td>
                    <td className="px-3 py-3 text-right text-[var(--mt-muted)]">
                      {formatMoney(club.loanSpent)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-black ${
                        club.balance >= 0
                          ? "text-emerald-700"
                          : "text-red-700"
                      }`}
                    >
                      {signedMoney(club.balance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section>
        <SectionHeader
          eyebrow="Temporadas"
          title="Mercado por temporada"
          description="Un jugador puede aparecer con dos clubes en una misma temporada porque la cesión se delimita por fechas reales."
        />

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.seasons.map((season) => (
            <Link
              key={season.seasonId}
              href={`/temporadas/${season.seasonId}`}
              className="app-panel-soft rounded-[13px] p-5 transition hover:border-[var(--mt-gold)]"
            >
              <div className="font-black text-[var(--mt-text)]">
                {season.seasonName}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <Mini
                  label="Fichajes"
                  value={String(season.transfers)}
                />
                <Mini
                  label="Cesiones"
                  value={String(season.loans)}
                />
                <Mini
                  label="Vol. fichajes"
                  value={formatMoney(
                    season.transferVolume
                  )}
                />
                <Mini
                  label="Coste cesiones"
                  value={formatMoney(
                    season.loanVolume
                  )}
                />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader
          eyebrow="Actividad"
          title="Últimos movimientos"
          description="Incluye fichajes, cesiones, regresos y cambios pendientes de clasificar."
        />

        <MovementTable
          movements={data.latestMovements}
        />
      </section>
    </div>
  );
}

function MovementTable({
  movements,
  ranked = false,
}: {
  movements: MarketTransfer[];
  ranked?: boolean;
}) {
  const visibleMovements = uniqueOperations(movements);

  return (
    <div className="app-panel-soft mt-4 overflow-hidden rounded-2xl">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1050px] text-sm">
          <thead className="text-[9px] font-black uppercase tracking-[0.11em] text-[var(--mt-muted)]">
            <tr>
              {ranked ? (
                <th className="px-4 py-3 text-left">
                  #
                </th>
              ) : null}
              <th className="px-4 py-3 text-left">
                Jugador
              </th>
              <th className="px-3 py-3 text-left">
                Tipo
              </th>
              <th className="px-3 py-3 text-center">
                De
              </th>
              <th className="px-3 py-3 text-center">
                A
              </th>
              <th className="px-3 py-3 text-left">
                Periodo
              </th>
              <th className="px-3 py-3 text-left">
                Temporada
              </th>
              <th className="px-4 py-3 text-right">
                Importe
              </th>
            </tr>
          </thead>

          <tbody>
            {visibleMovements.map((movement, index) => (
              <tr
                key={movement.id}
                className="border-t border-[var(--mt-line)]"
              >
                {ranked ? (
                  <td className="px-4 py-3 font-black text-[var(--mt-muted)]">
                    {index + 1}
                  </td>
                ) : null}

                <td className="px-4 py-3">
                  {(() => {
                    const sameDirectionMembers = (movement.dealMembers ?? []).filter(
                      (member) =>
                        member.fromTeamCode === movement.fromTeamCode &&
                        member.toTeamCode === movement.toTeamCode
                    );
                    const label = (sameDirectionMembers.length > 1
                      ? sameDirectionMembers.map((member) => member.playerName).join(" · ")
                      : movement.playerName
                    ).replaceAll("_", " ");

                    return movement.playerId ? (
                      <Link
                        href={movement.playerId ? `/jugadores/${movement.playerId}` : "/mercado"}
                        className="font-black text-[var(--mt-text)] hover:text-[var(--mt-gold-dark)]"
                      >
                        {label}
                      </Link>
                    ) : (
                      <span className="font-black text-[var(--mt-text)]">{label}</span>
                    );
                  })()}
                </td>

                <td className="px-3 py-3">
                <MovementBadge
                  type={movement.movementType}
                  isExchange={movement.isExchange}
                  dealRole={movement.dealRole}
                  dealCash={movement.dealCash}
                />
              </td>

                <td className="px-3 py-3 text-center">
                  <Team
                    teamCode={
                      movement.movementType === "LOAN"
                        ? movement.ownerTeamCode ??
                          movement.fromTeamCode
                        : movement.fromTeamCode
                    }
                  />
                </td>

                <td className="px-3 py-3 text-center">
                  <Team
                    teamCode={movement.toTeamCode}
                  />
                </td>

                <td className="px-3 py-3 text-xs text-[var(--mt-muted)]">
                  {movement.movementType === "LOAN" ? (
                    <>
                      {movement.loanStartDate
                        ? formatDate(
                            movement.loanStartDate
                          )
                        : "—"}
                      {" → "}
                      {movement.loanEndDate
                        ? formatDate(
                            movement.loanEndDate
                          )
                        : "—"}
                    </>
                  ) : (
                    formatDate(movement.transferDate)
                  )}
                </td>

                <td className="px-3 py-3 text-xs font-bold text-[var(--mt-muted)]">
                  {movement.seasonName ?? "—"}
                </td>

                <td className="px-4 py-3 text-right font-black text-[var(--mt-gold-dark)]">
                  {movement.movementType === "TRANSFER"
                    ? movement.isExchange &&
                      (movement.dealCash ?? 0) > 0
                      ? formatMoney(movement.dealCash ?? 0)
                      : movement.fee === null
                      ? "Sin precio"
                      : formatMoney(movement.fee)
                    : movement.movementType === "LOAN"
                      ? movement.loanFee === null
                        ? "Gratis"
                        : formatMoney(
                            movement.loanFee
                          )
                      : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function OperationPanel({
  title,
  description,
  movements,
}: {
  title: string;
  description: string;
  movements: MarketTransfer[];
}) {
  const visibleMovements = uniqueOperations(movements);

  return (
    <div className="app-panel-soft rounded-[13px] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-black text-[var(--mt-text)]">
            {title}
          </h3>
          <p className="mt-1 text-xs leading-5 text-[var(--mt-muted)]">
            {description}
          </p>
        </div>
        <span className="rounded-full bg-[var(--mt-surface)] px-3 py-1 text-[10px] font-black text-[var(--mt-gold-dark)]">
          {visibleMovements.length}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {visibleMovements.map((movement) => (
          <MovementCard key={movement.id} movement={movement} />
        ))}

        {visibleMovements.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--mt-line)] p-4 text-sm text-[var(--mt-muted)]">
            Sin operaciones registradas.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function uniqueOperations(movements: MarketTransfer[]) {
  const seen = new Set<string>();

  return movements.filter((movement) => {
    const key = movement.dealId ?? movement.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function MovementCard({
  movement,
}: {
  movement: MarketTransfer;
}) {
  const isLoan = movement.movementType === "LOAN";
  const members =
    movement.isExchange && movement.dealMembers?.length
      ? movement.dealMembers
      : [];
  const leftTeam = movement.fromTeamCode;
  const rightTeam = movement.toTeamCode;
  const leftPlayers = members.filter(
    (member) => member.fromTeamCode === leftTeam
  );
  const rightPlayers = members.filter(
    (member) => member.fromTeamCode === rightTeam
  );

  return (
    <Link
      href={movement.playerId ? `/jugadores/${movement.playerId}` : "/mercado"}
      className="block rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)] p-4 transition hover:border-[var(--mt-gold)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-black text-[var(--mt-text)]">
            {movement.isExchange
              ? "Intercambio de jugadores"
              : (movement.dealMembers?.filter(
                    (member) =>
                      member.fromTeamCode === movement.fromTeamCode &&
                      member.toTeamCode === movement.toTeamCode
                  ).length ?? 0) > 1
                ? (movement.dealMembers ?? [])
                    .filter(
                      (member) =>
                        member.fromTeamCode === movement.fromTeamCode &&
                        member.toTeamCode === movement.toTeamCode
                    )
                    .map((member) => member.playerName.replaceAll("_", " "))
                    .join(" · ")
                : movement.playerName.replaceAll("_", " ")}
          </div>
          <div className="mt-1 text-xs text-[var(--mt-muted)]">
            {movement.seasonName ?? formatDate(movement.transferDate)}
          </div>
        </div>
        <MovementBadge
          type={movement.movementType}
          isExchange={movement.isExchange}
          dealRole={movement.dealRole}
          dealCash={movement.dealCash}
        />
      </div>

      {movement.isExchange && members.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-start">
          <ExchangeSide
            teamCode={leftTeam}
            players={leftPlayers}
          />
          <span className="hidden pt-2 text-[var(--mt-muted)] sm:block">
            ↔
          </span>
          <ExchangeSide
            teamCode={rightTeam}
            players={rightPlayers}
          />
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-3">
          <Team
            teamCode={
              isLoan
                ? movement.ownerTeamCode ?? movement.fromTeamCode
                : movement.fromTeamCode
            }
          />
          <span className="text-[var(--mt-muted)]">→</span>
          <Team teamCode={movement.toTeamCode} />
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-[var(--mt-muted)]">
        <span className="rounded-full bg-[var(--mt-surface-soft)] px-2.5 py-1">
          {isLoan
            ? `${movement.loanStartDate ? formatDate(movement.loanStartDate) : "—"} → ${
                movement.loanEndDate
                  ? formatDate(movement.loanEndDate)
                  : "—"
              }`
            : formatDate(movement.transferDate)}
        </span>
        <span className="rounded-full bg-[var(--mt-surface-soft)] px-2.5 py-1 text-[var(--mt-gold-dark)]">
          {amountLabel(movement)}
        </span>
        {isLoan && movement.purchaseOption ? (
          <span className="rounded-full bg-[var(--mt-surface-soft)] px-2.5 py-1 text-[var(--mt-gold-dark)]">
            Opción de compra
            {movement.purchaseOptionFee !== null
              ? ` · ${formatMoney(movement.purchaseOptionFee)}`
              : ""}
          </span>
        ) : null}
        {isLoan && movement.notes ? (
          <span className="rounded-full bg-[var(--mt-surface-soft)] px-2.5 py-1 text-[var(--mt-gold-dark)]">
            Con condiciones
          </span>
        ) : null}
      </div>

      {isLoan && movement.notes ? (
        <div className="mt-3 rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface-soft)] p-3 text-xs leading-5 text-[var(--mt-muted)]">
          <b className="block text-[10px] uppercase tracking-wide text-[var(--mt-gold-dark)]">
            Condiciones
          </b>
          {movement.notes}
        </div>
      ) : null}
    </Link>
  );
}

function ExchangeSide({
  teamCode,
  players,
}: {
  teamCode: string | null;
  players: MarketTransfer[];
}) {
  return (
    <div className="rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface-soft)] p-3">
      <Team teamCode={teamCode} />
      <div className="mt-2 space-y-1">
        {players.map((player) => (
          <div
            key={player.id}
            className="text-xs font-bold text-[var(--mt-text)]"
          >
            {player.playerName.replaceAll("_", " ")}
            {player.fee ? (
              <span className="ml-1 text-[var(--mt-gold-dark)]">
                + {formatMoney(player.fee)}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function amountLabel(movement: MarketTransfer) {
  if (movement.movementType === "LOAN") {
    return movement.loanFee === null
      ? "Cesión gratis"
      : formatMoney(movement.loanFee);
  }

  if (
    movement.isExchange &&
    movement.dealCash !== null &&
    movement.dealCash > 0
  ) {
    return `Compensación ${formatMoney(movement.dealCash)}`;
  }

  if (movement.isExchange) {
    return "Sin dinero";
  }

  return movement.fee === null
    ? "Sin precio"
    : formatMoney(movement.fee);
}

function MovementBadge({
  type,
  isExchange,
  dealRole,
  dealCash,
}: {
  type: MarketTransfer["movementType"];
  isExchange: boolean;
  dealRole: MarketTransfer["dealRole"];
  dealCash: number | null;
}) {
  if (isExchange && type === "TRANSFER") {
    return (
      <span className="inline-flex rounded-full bg-[var(--mt-surface-soft)] px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-[var(--mt-gold-dark)]">
        {(dealCash ?? 0) > 0
          ? "Intercambio + dinero"
          : dealRole === "EXCHANGE"
          ? "Jugador incluido"
          : "Intercambio"}
      </span>
    );
  }

  const map = {
    PENDING: [
      "Pendiente",
      "bg-[var(--mt-surface-soft)] text-[var(--mt-gold-dark)]",
    ],
    TRANSFER: [
      "Fichaje",
      "bg-emerald-400/10 text-emerald-700",
    ],
    LOAN: [
      "Cesión",
      "bg-[var(--mt-surface-soft)] text-[var(--mt-gold-dark)]",
    ],
    LOAN_RETURN: [
      "Regreso",
      "bg-[var(--mt-surface-soft)] text-[var(--mt-gold-dark)]",
    ],
  } as const;

  const [label, className] = map[type];

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wide ${className}`}
    >
      {label}
    </span>
  );
}

function Team({
  teamCode,
}: {
  teamCode: string | null;
}) {
  if (!teamCode) {
    return (
      <span className="text-[var(--mt-muted)]">—</span>
    );
  }

  return (
    <Link
      href={`/clubes/${teamCode}/historial`}
      className="inline-flex items-center gap-2 font-black text-[var(--mt-muted)] hover:text-[var(--mt-text)]"
    >
      <Image
        src={getClubLogo(teamCode)}
        alt=""
        width={24}
        height={24}
        className="h-6 w-6 object-contain"
      />
      {teamCode}
    </Link>
  );
}

function ClubCell({
  teamCode,
}: {
  teamCode: string;
}) {
  return (
    <Link
      href={`/clubes/${teamCode}/historial`}
      className="inline-flex items-center gap-3 font-black text-[var(--mt-text)] hover:text-[var(--mt-gold-dark)]"
    >
      <Image
        src={getClubLogo(teamCode)}
        alt=""
        width={30}
        height={30}
        className="h-8 w-8 object-contain"
      />
      <span>{getClubName(teamCode)}</span>
    </Link>
  );
}

function ClubRecord({
  label,
  club,
  value,
}: {
  label: string;
  club: MarketClub | null;
  value: string;
}) {
  return (
    <RecordCard
      label={label}
      value={value}
      detail={
        club
          ? getClubName(club.teamCode)
          : "Sin datos"
      }
      href={
        club
          ? `/clubes/${club.teamCode}/historial`
          : undefined
      }
    />
  );
}

function RecordCard({
  label,
  value,
  detail,
  href,
}: {
  label: string;
  value: string;
  detail: string;
  href?: string;
}) {
  const body = (
    <div className="app-panel-soft h-full rounded-[13px] p-5 transition hover:border-[var(--mt-gold)]">
      <div className="text-[9px] font-black uppercase tracking-[0.12em] text-[var(--mt-gold-dark)]">
        {label}
      </div>
      <div className="mt-2 text-2xl font-black text-[var(--mt-text)]">
        {value}
      </div>
      <div className="mt-2 truncate text-xs font-bold text-[var(--mt-muted)]">
        {detail.replaceAll("_", " ")}
      </div>
    </div>
  );

  return href ? (
    <Link href={href}>{body}</Link>
  ) : (
    body
  );
}

function Kpi({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--mt-line)] bg-[var(--mt-surface)] px-3 py-3 text-center">
      <div className="truncate text-lg font-black text-[var(--mt-text)]">
        {value}
      </div>
      <div className="mt-1 text-[9px] font-black uppercase tracking-[0.11em] text-[var(--mt-muted)]">
        {label}
      </div>
    </div>
  );
}

function Mini({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-[var(--mt-surface)] p-3">
      <div className="font-black text-[var(--mt-text)]">
        {value}
      </div>
      <div className="mt-1 text-[9px] font-black uppercase tracking-wider text-[var(--mt-muted)]">
        {label}
      </div>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <div className="app-eyebrow">
        {eyebrow}
      </div>
      <h2 className="mt-1.5 text-xl font-black text-[var(--mt-text)]">
        {title}
      </h2>
      <p className="mt-1 max-w-4xl text-sm leading-6 text-[var(--mt-muted)]">
        {description}
      </p>
    </div>
  );
}

function signedMoney(value: number) {
  if (value > 0) {
    return `+${formatMoney(value)}`;
  }

  return formatMoney(value);
}
