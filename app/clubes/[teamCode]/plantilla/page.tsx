import PlayersTable from "@/components/PlayersTable";
import ClubSectionCard from "@/components/ClubSectionCard";
import { getDropboxClient, getDropboxRosterPath } from "@/lib/dropbox";
import { parseEsmsPlantilla } from "@/lib/parser-esms";
import { getPlayerIdMap, getPlayerIdentityKey } from "@/lib/player-history";
export const dynamic="force-dynamic"; export const revalidate=0;
export default async function ClubSquadPage({params}:{params:Promise<{teamCode:string}>}){const {teamCode}=await params;const team=teamCode.toUpperCase();const dbx=await getDropboxClient();const path=await getDropboxRosterPath(team,"live");const download=await dbx.filesDownload({path});const blob=download.result.fileBlob;if(!blob)throw new Error(`No se pudo descargar la plantilla ${team}`);const parsed=parseEsmsPlantilla(await blob.text());let ids=new Map<string,string>();try{ids=await getPlayerIdMap()}catch{}const players=parsed.map(p=>({...p,playerId:ids.get(getPlayerIdentityKey(p.name,p.nat))??null}));return <ClubSectionCard title="Plantilla" subtitle={`${players.length} jugadores · Plantilla oficial ESMS`}><div className="club-v34-table-wrap"><PlayersTable players={players} team={team}/></div></ClubSectionCard>}
