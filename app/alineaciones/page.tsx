import Link from "next/link";

import LineupSubmissionForm from "@/components/LineupSubmissionForm";
import ManualShtChecker from "@/components/ManualShtChecker";
import ShtCreator from "@/components/ShtCreator";
import { getAllPlayers } from "@/lib/all-players";
import { getLineupSubmissionCompetitions } from "@/lib/lineup-submissions";

export const dynamic = "force-dynamic";

export const revalidate = 0;

const toolCards = [
  {
    href: "#cargar",
    label: "1",
    title: "Cargar alineación",
    text: "Sube el archivo .txt/.sht, la web lo comprueba y lo guarda en Dropbox para la jornada correcta.",
  },
  {
    href: "#comprobar",
    label: "2",
    title: "Comprobar alineación",
    text: "Pega una alineación o importa un archivo para revisar errores antes de enviarla.",
  },
  {
    href: "#crear",
    label: "3",
    title: "Crear alineación",
    text: "Construye una alineación desde la plantilla oficial y descarga el archivo listo para enviar.",
  },
];

export default async function LineupToolsPage() {
  const [competitions, players] = await Promise.all([
    getLineupSubmissionCompetitions(),
    getAllPlayers(),
  ]);

  return (
    <main className="mx-auto w-full max-w-[1440px] space-y-6 p-4 sm:p-6">
      <section className="app-panel overflow-hidden rounded-[32px] p-6 sm:p-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-end">
          <div>
            <div className="app-eyebrow">Herramientas</div>
            <h1 className="mt-2 max-w-4xl text-3xl font-black tracking-[-0.05em] text-[var(--mt-text)] sm:text-5xl">
              Alineaciones: comprobar, cargar y crear
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--mt-muted)] sm:text-base">
              Este apartado queda centrado al 100 % en las alineaciones. Aquí puedes crear el archivo, comprobar que está bien y enviarlo a la competición correspondiente.
            </p>
          </div>

          <div className="rounded-3xl border border-[var(--mt-line)] bg-[var(--mt-surface-soft)] p-4">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--mt-gold-dark)]">
              Flujo recomendado
            </div>
            <ol className="mt-3 space-y-2 text-sm leading-6 text-[var(--mt-muted)]">
              <li><b className="text-[var(--mt-text)]">1.</b> Crea o prepara tu alineación.</li>
              <li><b className="text-[var(--mt-text)]">2.</b> Compruébala antes de enviarla.</li>
              <li><b className="text-[var(--mt-text)]">3.</b> Cárgala para que quede guardada en Dropbox.</li>
            </ol>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {toolCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="group rounded-2xl border border-[var(--mt-line)] bg-[var(--mt-surface)] p-4 transition hover:border-[var(--mt-gold)] hover:bg-[var(--mt-surface-soft)]"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--mt-gold)] text-sm font-black text-white shadow-lg shadow-yellow-900/10">
                {card.label}
              </span>
              <strong className="mt-3 block text-base font-black text-[var(--mt-text)]">
                {card.title}
              </strong>
              <span className="mt-2 block text-xs leading-5 text-[var(--mt-muted)]">
                {card.text}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section id="cargar" className="scroll-mt-24 space-y-4">
        <ToolHeader
          eyebrow="Cargar"
          title="Enviar alineación oficial"
          text="Elige competición, equipo y archivo. La web valida la alineación antes de guardarla."
        />
        <LineupSubmissionForm competitions={competitions} />
      </section>

      <section id="comprobar" className="scroll-mt-24 space-y-4">
        <ToolHeader
          eyebrow="Comprobar"
          title="Revisar una alineación antes de enviarla"
          text="Sirve para detectar errores de formato, jugadores que no pertenecen al roster, sanciones, lesiones y reglas básicas."
        />
        <ManualShtChecker players={players} />
      </section>

      <section id="crear" className="scroll-mt-24 space-y-4">
        <ToolHeader
          eyebrow="Crear"
          title="Crear archivo de alineación"
          text="Usa las plantillas oficiales para montar una alineación ESMS y descargarla lista para comprobar o enviar."
        />
        <ShtCreator players={players} />
      </section>
    </main>
  );
}

function ToolHeader({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div className="app-panel-soft rounded-3xl p-5 sm:p-6">
      <div className="app-eyebrow">{eyebrow}</div>
      <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-[var(--mt-text)]">
        {title}
      </h2>
      <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--mt-muted)]">
        {text}
      </p>
    </div>
  );
}
