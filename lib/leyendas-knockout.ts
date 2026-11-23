import { buildGroupStandings } from "@/lib/competitions";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { Competition, CompetitionTeam, CompetitionMatch } from "@/lib/competition-types";

const PAIRS: Array<[string,string]> = [
  ["1º Clase A","2º Clase B"],["2º Clase A","1º Clase B"],
  ["1º Clase C","2º Clase D"],["2º Clase C","1º Clase D"],
  ["1º Clase E","2º Clase F"],["2º Clase E","1º Clase F"],
  ["1º Clase G","2º Clase H"],["2º Clase G","1º Clase H"]
];

export async function syncLeyendasRoundOf16(competitionId: string) {
  const db=getSupabaseAdmin();
  const [{data:competition,error:ce},{data:teams,error:te},{data:rounds,error:re},{data:matches,error:me}] = await Promise.all([
    db.from("competitions").select("*").eq("id",competitionId).maybeSingle(),
    db.from("competition_teams").select("*").eq("competition_id",competitionId),
    db.from("competition_rounds").select("id,stage,number").eq("competition_id",competitionId),
    db.from("matches").select("*").eq("competition_id",competitionId)
  ]);
  if(ce||te||re||me) throw ce||te||re||me;
  if(!competition) throw new Error("Competición inexistente.");
  if(!String(competition.name).toLowerCase().includes("leyendas")) return {updated:false,reason:"No es Copa de Leyendas"};
  const roundIds=new Set((rounds||[]).filter(r=>r.stage==="GROUP").map(r=>r.id));
  const groupMatches=(matches||[]).filter(m=>roundIds.has(m.round_id));
  if(groupMatches.length!==96 || groupMatches.some(m=>m.status!=="PLAYED"||m.home_score==null||m.away_score==null))
    return {updated:false,reason:"La fase de grupos no tiene 96 partidos jugados con marcador."};

  const tables=buildGroupStandings(competition as Competition,teams as CompetitionTeam[],groupMatches as CompetitionMatch[]);
  const qualified=new Map<string,string>();
  for(const table of tables){
    const label=table.groupName.trim();
    const letter=label.match(/(?:Clase|Grupo)\s*([A-H])$/i)?.[1]?.toUpperCase();
    if(!letter) continue;
    if(table.standings.length<2) throw new Error(`Faltan equipos en ${label}`);
    qualified.set(`1º Clase ${letter}`,table.standings[0].teamCode);
    qualified.set(`2º Clase ${letter}`,table.standings[1].teamCode);
  }
  if(qualified.size!==16) throw new Error("No se pudieron identificar los 16 clasificados de las clases A-H.");
  const octavosRound=(rounds||[]).find(r=>r.stage==="ROUND_OF_16");
  if(!octavosRound) throw new Error("No existe la ronda de octavos.");
  const octavos=(matches||[]).filter(m=>m.round_id===octavosRound.id);
  if(octavos.length!==8) throw new Error("No hay exactamente 8 octavos.");

  // Emparejamos por los textos provisionales, no por el orden de retorno de Supabase.
  const updates=[];
  for(const [home,away] of PAIRS){
    const found=octavos.find(m=>m.home_team_code===home&&m.away_team_code===away);
    const actualHome=qualified.get(home)!;
    const actualAway=qualified.get(away)!;
    if(found) {
      if(found.status!=="SCHEDULED"||found.home_score!=null||found.away_score!=null)
        throw new Error("Un octavo provisional ya tiene resultado; se cancela la sincronización.");
      updates.push({id:found.id,home:actualHome,away:actualAway});
    } else {
      const already=octavos.find(m=>m.home_team_code===actualHome&&m.away_team_code===actualAway);
      if(!already) throw new Error(`No se encuentra el cruce ${home} - ${away}. No se ha modificado nada.`);
    }
  }
  // Validación completa antes de cualquier escritura.
  for(const u of updates){
    const {error}=await db.from("matches").update({home_team_code:u.home,away_team_code:u.away})
      .eq("id",u.id).eq("status","SCHEDULED");
    if(error) throw error;
  }
  return {updated:updates.length>0,updatedMatches:updates.length,qualified:16};
}
