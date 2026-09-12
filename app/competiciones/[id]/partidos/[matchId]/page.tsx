import {
  redirect,
} from "next/navigation";

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

type Props = {
  params:
    Promise<{
      id: string;
      matchId: string;
    }>;
};

export default async function CompetitionMatchRedirect({
  params,
}: Props) {
  const {
    matchId,
  } = await params;

  redirect(
    `/partidos/${matchId}`
  );
}
