import Image from "next/image";
import Link from "next/link";

type ClubCardProps = {
  code: string;
  name: string;
  logo: string;
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
        p-4
        transition

        hover:-translate-y-1
        hover:border-blue-500
        hover:bg-slate-900

        sm:p-5
      "
    >
      <div
        className="
          flex
          items-center
          gap-4

          sm:gap-5
        "
      >
        {/* ESCUDO */}

        <div
          className="
            relative
            h-16
            w-16
            shrink-0
            rounded-xl
            bg-slate-900

            sm:h-20
            sm:w-20
          "
        >
          <Image
            src={logo}
            alt={`Escudo de ${name}`}
            fill
            sizes="
              (max-width: 640px)
              64px,
              80px
            "
            className="
              object-contain
              p-2
            "
          />
        </div>

        {/* DATOS */}

        <div className="min-w-0">
          <h2
            className="
              truncate
              text-sm
              font-bold
              text-white
              transition
              group-hover:text-blue-400

              sm:text-base
            "
          >
            {name}
          </h2>

          <p
            className="
              mt-1
              text-xs
              font-semibold
              text-slate-500

              sm:text-sm
            "
          >
            {code}
          </p>

          <p
            className="
              mt-2
              text-[11px]
              text-slate-600

              sm:mt-3
              sm:text-xs
            "
          >
            Actualizado{" "}
            {new Date(
              modified
            ).toLocaleDateString(
              "es-ES"
            )}
          </p>
        </div>
      </div>
    </Link>
  );
}