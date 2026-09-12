import DrawLiveView from "@/components/draws/DrawLiveView";

export const dynamic = "force-dynamic";

export default async function DrawPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DrawLiveView drawId={id} />;
}
