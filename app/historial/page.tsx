import PlayerHistoryImporter from "@/components/PlayerHistoryImporter";

export const dynamic =
  "force-dynamic";

export default function HistorialPage() {
  return (
    <main
      className="
        mx-auto
        w-full
        max-w-7xl
        p-4

        sm:p-6
      "
    >
      <h1
        className="
          text-2xl
          font-bold
          text-white
        "
      >
        Historial
      </h1>

      <p
        className="
          mt-2
          text-sm
          text-slate-400
        "
      >
        Actualiza el registro histórico de todas las plantillas.
      </p>

      <div className="mt-6">
        <PlayerHistoryImporter />
      </div>
    </main>
  );
}