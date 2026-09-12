import {
  notFound,
} from "next/navigation";

import MatchDetail
  from "@/components/MatchDetail";

import {
  getMatchDetail,
} from "@/lib/match-detail";

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

type Props = {
  params:
    Promise<{
      id: string;
    }>;
};

export default async function MatchPage({
  params,
}: Props) {
  const {
    id,
  } = await params;

  const data =
    await getMatchDetail(
      id
    );

  if (!data) {
    notFound();
  }

  return (
    <MatchDetail
      data={data}
    />
  );
}
