"use client";

import type {
  EsmsPosition,
} from "@/lib/esms-player";

type Props = {
  src: string;
  alt: string;
  position: EsmsPosition;
  shadowClass?: string;
};

const POSITION_GLOW: Record<
  EsmsPosition,
  string
> = {
  GK: "from-yellow-400/12",
  DF: "from-blue-500/12",
  DM: "from-cyan-500/12",
  MF: "from-green-500/12",
  AM: "from-violet-500/12",
  FW: "from-red-500/12",
};

export default function PlayerRender({
  src,
  alt,
  position,
  shadowClass = "",
}: Props) {
  return (
    <div
      className="
        pointer-events-none
        absolute
        inset-0
        z-20
        overflow-hidden
      "
    >
      {/*
        Halo integrado en el fondo de la ficha.
        Ayuda a que el render no parezca una imagen pegada encima.
      */}
      <div
        className={`
          absolute
          left-[20%]
          right-[-8%]
          top-[14%]
          bottom-[3%]

          bg-gradient-to-t
          ${POSITION_GLOW[position]}
          via-transparent
          to-transparent

          blur-3xl
        `}
      />

      {/*
        RENDER DEL JUGADOR
        ------------------
        1. La cabeza queda desplazada claramente a la derecha de la media.
        2. La imagen mantiene toda la altura disponible.
        3. No existe un segundo recorte interior.
        4. El corte inferior se difumina para integrarlo en la tarjeta.
        5. En imágenes muy horizontales puede perderse parte de brazos/manos,
           pero nunca se corta deliberadamente la cabeza.
      */}
      <div
        className="
          absolute
          inset-0

          [mask-image:linear-gradient(to_bottom,#000_0%,#000_78%,rgba(0,0,0,0.96)_84%,rgba(0,0,0,0.72)_90%,transparent_100%)]
          [-webkit-mask-image:linear-gradient(to_bottom,#000_0%,#000_78%,rgba(0,0,0,0.96)_84%,rgba(0,0,0,0.72)_90%,transparent_100%)]
        "
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          draggable={false}
          className={`
            absolute
            top-0
            left-[70%]
            z-10

            h-full
            w-auto
            max-w-none

            -translate-x-1/2

            object-contain
            object-top

            select-none

            sm:left-[69%]
            xl:left-[68%]
            2xl:left-[67%]

            ${shadowClass}
          `}
        />
      </div>

      {/*
        Pequeño degradado frontal para terminar de fundir
        el torso con el fondo oscuro de la zona inferior.
      */}
      <div
        className="
          absolute
          inset-x-0
          bottom-0
          z-30
          h-[19%]
          bg-gradient-to-t
          from-slate-950
          via-slate-950/55
          to-transparent
        "
      />
    </div>
  );
}