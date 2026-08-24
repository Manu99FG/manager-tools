import Image from "next/image";
import Link from "next/link";

type ClubCardProps = {
  code: string;
  name: string;
  logo: string | null;
  modified: string;
};

export default function ClubCard({
  code,
  name,
  logo,
  modified,
}: ClubCardProps) {
  return (
    <Link
      href={`/plantillas/${code}`}
      className="
        group
        rounded-2xl
        border
        border-slate-800
        bg-slate-950
        p-5
        transition
        hover:-translate-y-1
        hover:border-blue-500
        hover:bg-slate-900
      "
    >
      <div className="flex items-center gap-5">
        <div
          className="
            relative
            flex
            h-20
            w-20
            shrink-0
            items-center
            justify-center
            rounded-xl
            bg-slate-900
          "
        >
          {logo ? (
            <Image
              src={logo}
              alt={`Escudo de ${name}`}
              fill
              sizes="80px"
              className="object-contain p-2"
            />
          ) : (
            <span className="text-xl font-black text-slate-500">
              {code}
            </span>
          )}
        </div>

        <div className="min-w-0">
          <h2
            className="
              truncate
              font-bold
              text-white
              transition
              group-hover:text-blue-400
            "
          >
            {name}
          </h2>

          <p className="mt-1 text-sm font-semibold text-slate-500">
            {code}
          </p>

          <p className="mt-3 text-xs text-slate-600">
            Actualizado{" "}
            {new Date(modified).toLocaleDateString(
              "es-ES"
            )}
          </p>
        </div>
      </div>
    </Link>
  );
}