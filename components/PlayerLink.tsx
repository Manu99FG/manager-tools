import Link from "next/link";

import {
  findPlayerIdByEsmsIdentity,
} from "@/lib/player-history";

type Props = {
  name: string;
  nationality: string;

  className?: string;
};

export default async function PlayerLink({
  name,
  nationality,
  className = "",
}: Props) {
  const playerId =
    await findPlayerIdByEsmsIdentity(
      name,
      nationality
    );

  if (!playerId) {
    return (
      <span
        className={
          className
        }
      >
        {name}
      </span>
    );
  }

  return (
    <Link
      href={`/jugadores/${playerId}`}
      className={`
        transition
        hover:text-blue-400
        hover:underline
        ${className}
      `}
    >
      {name}
    </Link>
  );
}