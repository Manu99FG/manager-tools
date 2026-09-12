import Image from "next/image";
import Link from "next/link";

type ClubCardProps = {
  code: string;
  name: string;
  logo: string;
  modified: string;
};

export default function ClubCard({ code, name, logo, modified }: ClubCardProps) {
  return (
    <Link
      href={`/plantillas/${code}`}
      className="group relative flex min-h-[118px] items-center gap-4 overflow-hidden rounded-[13px] border border-[var(--mt-line)] bg-[var(--mt-surface)] p-4 shadow-[0_4px_16px_rgba(42,35,20,.035)] transition duration-200 hover:-translate-y-0.5 hover:border-[var(--mt-gold)] hover:shadow-[0_10px_28px_rgba(42,35,20,.08)] sm:p-5"
    >
      <div className="absolute inset-y-0 left-0 w-[3px] bg-[var(--mt-gold)] opacity-0 transition group-hover:opacity-100" />

      <div className="relative h-[74px] w-[74px] shrink-0 overflow-hidden rounded-[13px] border border-[var(--mt-line)] bg-[var(--mt-surface)]">
        <Image src={logo} alt={`Escudo de ${name}`} fill sizes="74px" className="object-contain p-3" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[9px] font-black uppercase tracking-[.12em] text-[var(--mt-gold)]">{code}</div>
            <h2 className="mt-1 truncate text-[15px] font-black text-[var(--mt-text)] transition group-hover:text-[var(--mt-gold-dark)] sm:text-base">{name}</h2>
          </div>
          <span className="mt-1 text-lg text-[var(--mt-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--mt-gold-dark)]">→</span>
        </div>

        <div className="mt-3 flex items-center gap-2 text-[10px] font-semibold text-[var(--mt-muted)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--mt-gold)]" />
          Actualizado {new Date(modified).toLocaleDateString("es-ES")}
        </div>
      </div>
    </Link>
  );
}
