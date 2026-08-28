import Link from "next/link";

type Props = {
  playerId:
    | string
    | null
    | undefined;

  name: string;

  className?: string;
};

export default function PlayerNameLink({
  playerId,
  name,
  className = "",
}: Props) {
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
        cursor-pointer
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