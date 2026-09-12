import {
  notFound,
  redirect,
} from "next/navigation";

import CompetitionMatchAdmin
  from "@/components/CompetitionMatchAdmin";

import {
  isAdminSession,
} from "@/lib/admin-auth";

import {
  getCompetitionPageData,
} from "@/lib/competitions";

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function AdminCompetitionPage({
  params,
}: PageProps) {
  const isAdmin =
    await isAdminSession();

  if (!isAdmin) {
    redirect("/admin");
  }

  const {
    id,
  } = await params;

  const data =
    await getCompetitionPageData(
      id
    );

  if (!data) {
    notFound();
  }

  return (
    <CompetitionMatchAdmin
      data={
        data
      }
    />
  );
}
