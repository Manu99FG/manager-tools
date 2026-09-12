import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { buildStandings } from "@/lib/competitions";

type Row = Record<string, any>;

export type HistoryMatch = {
  id: string; seasonId: string; season: string; competitionId: string; competition: string; competitionType: string;
  date: string | null; rival: string; home: boolean; gf: number; gc: number; result: "V"|"E"|"D";
};
export type HistoryParticipation = {
  seasonId: string; season: string; competitionId: string; competition: string; competitionType: string; status: string;
  played: number; wins: number; draws: number; losses: number; gf: number; gc: number; points: number | null; position: number | null;
  outcome: string; isTitle: boolean; isRunnerUp: boolean;
};
export type HistoryPlayer = {
  playerId: string | null; name: string; appearances: number; minutes: number; goals: number; assists: number; mom: number; dp: number;
  seasons: number; youngestAge: number | null; oldestAge: number | null;
};
export type HistoryPlayerSeason = {
  playerId: string | null; name: string; seasonId: string; season: string; appearances: number; minutes: number; goals: number; assists: number; mom: number; dp: number; cleanSheets: number;
};
export type HistoryTransfer = {
  id: string; playerId: string | null; playerName: string; seasonId: string | null; season: string; direction: "IN"|"OUT";
  type: string; otherClub: string; fee: number | null; date: string | null;
};
export type ClubHistoryDashboardData = {
  teamCode: string;
  seasons: Array<{id:string; name:string}>;
  competitions: Array<{id:string; name:string}>;
  matches: HistoryMatch[];
  participations: HistoryParticipation[];
  players: HistoryPlayer[];
  playerSeasons: HistoryPlayerSeason[];
  transfers: HistoryTransfer[];
};

const s=(r:Row|undefined,...ks:string[])=>{for(const k of ks){const v=r?.[k];if(typeof v==="string"&&v.trim())return v;}return null};
const n=(r:Row|undefined,...ks:string[])=>{for(const k of ks){const v=r?.[k];if(typeof v==="number"&&Number.isFinite(v))return v;if(typeof v==="string"&&v.trim()&&Number.isFinite(Number(v)))return Number(v);}return 0};
const nn=(r:Row|undefined,...ks:string[])=>{for(const k of ks){const v=r?.[k];if(typeof v==="number"&&Number.isFinite(v))return v;if(typeof v==="string"&&v.trim()&&Number.isFinite(Number(v)))return Number(v);}return null};
const seasonName=(c:Row, seasonById:Map<string,string>)=>seasonById.get(String(c.season_id)) ?? (typeof c.season?.name === "string" ? c.season.name : "Temporada");
const isPlayed=(m:Row)=>s(m,"status")==="PLAYED"&&m.home_score!==null&&m.away_score!==null;
const dateOf=(m:Row)=>s(m,"played_at","scheduled_at","created_at");

export async function getClubHistoryDashboard(teamCodeInput:string):Promise<ClubHistoryDashboardData>{
  const teamCode=teamCodeInput.toUpperCase();
  const db=getSupabaseAdmin();
  const [seasonsR, competitionsR, participantR, playersR, transfersR] = await Promise.all([
    db.from("seasons").select("*").order("name",{ascending:true}),
    db.from("competitions").select("*"),
    db.from("competition_teams").select("*").eq("team_code",teamCode),
    db.from("players").select("id,esms_name,full_name"),
    db.from("transfers").select("*").or(`from_team_code.eq.${teamCode},to_team_code.eq.${teamCode}`),
  ]);
  for(const r of [seasonsR,competitionsR,participantR,playersR,transfersR]) if(r.error) throw r.error;
  const seasons=(seasonsR.data??[]) as Row[];
  const seasonById=new Map(seasons.map(x=>[String(x.id),s(x,"name")??"Temporada"]));
  const allCompetitions=(competitionsR.data??[]) as Row[];
  const compById=new Map(allCompetitions.map(x=>[String(x.id),x]));
  const participantIds=Array.from(new Set(((participantR.data??[]) as Row[]).map(x=>String(x.competition_id))));
  if(!participantIds.length) return {teamCode,seasons:seasons.map(x=>({id:String(x.id),name:s(x,"name")??"Temporada"})),competitions:[],matches:[],participations:[],players:[],playerSeasons:[],transfers:[]};

  const [teamsR, roundsR, matchesR, statsR] = await Promise.all([
    db.from("competition_teams").select("*").in("competition_id",participantIds),
    db.from("competition_rounds").select("*").in("competition_id",participantIds),
    db.from("matches").select("*").in("competition_id",participantIds),
    db.from("match_player_stats").select("*").eq("team_code",teamCode),
  ]);
  for(const r of [teamsR,roundsR,matchesR,statsR]) if(r.error) throw r.error;
  const allTeams=(teamsR.data??[]) as Row[];
  const rounds=(roundsR.data??[]) as Row[];
  const roundById=new Map(rounds.map(x=>[String(x.id),x]));
  const allMatches=(matchesR.data??[]) as Row[];
  const teamMatches=allMatches.filter(m=>isPlayed(m)&&(s(m,"home_team_code")===teamCode||s(m,"away_team_code")===teamCode));

  const matches:HistoryMatch[]=teamMatches.map((m): HistoryMatch=>{
    const c=compById.get(String(m.competition_id))??{};
    const home=s(m,"home_team_code")===teamCode; const gf=home?n(m,"home_score"):n(m,"away_score"); const gc=home?n(m,"away_score"):n(m,"home_score");
    return {id:String(m.id),seasonId:String(c.season_id??""),season:seasonName(c,seasonById),competitionId:String(c.id??m.competition_id),competition:s(c,"name")??"Competición",competitionType:s(c,"type")??"OTHER",date:dateOf(m),rival:home?(s(m,"away_team_code")??"Rival"):(s(m,"home_team_code")??"Rival"),home,gf,gc,result:gf>gc?"V":gf<gc?"D":"E"};
  }).sort((a,b)=>String(a.date??"").localeCompare(String(b.date??"")));

  const participations:HistoryParticipation[]=[];
  for(const compId of participantIds){
    const c=compById.get(compId); if(!c) continue;
    const compMatches=allMatches.filter(m=>String(m.competition_id)===compId&&isPlayed(m));
    const my=matches.filter(m=>m.competitionId===compId);
    const wins=my.filter(m=>m.result==="V").length, draws=my.filter(m=>m.result==="E").length, losses=my.filter(m=>m.result==="D").length;
    const gf=my.reduce((a,m)=>a+m.gf,0), gc=my.reduce((a,m)=>a+m.gc,0);
    let position:number|null=null, points:number|null=null, outcome="Participación"; let isTitle=false,isRunnerUp=false;
    const type=s(c,"type")??"OTHER";
    if(type==="LEAGUE"){
      const table=buildStandings(c as never, allTeams.filter(t=>String(t.competition_id)===compId) as never, compMatches as never);
      const row=table.find(x=>x.teamCode===teamCode); if(row){position=row.position;points=row.points;outcome=`${row.position}.º`;isTitle=row.position===1&&s(c,"status")==="FINISHED";isRunnerUp=row.position===2&&s(c,"status")==="FINISHED";}
    } else if(type==="GROUPS"||type==="GROUPS_KNOCKOUT"){
      const ownParticipant=allTeams.find(t=>String(t.competition_id)===compId&&s(t,"team_code")===teamCode); const group=s(ownParticipant,"group_name");
      if(group){const groupTeams=allTeams.filter(t=>String(t.competition_id)===compId&&s(t,"group_name")===group); const codes=new Set(groupTeams.map(t=>s(t,"team_code")??"")); const groupMatches=compMatches.filter(m=>codes.has(s(m,"home_team_code")??"")&&codes.has(s(m,"away_team_code")??"")); const table=buildStandings(c as never,groupTeams as never,groupMatches as never); const row=table.find(x=>x.teamCode===teamCode); if(row){position=row.position;points=row.points;outcome=`${row.position}.º (${group})`;}}
      if(type==="GROUPS_KNOCKOUT"){
        const myRounds=my.map(mm=>{const original=teamMatches.find(x=>String(x.id)===mm.id);return roundById.get(String(original?.round_id));}).filter(Boolean) as Row[];
        const deepest=[...myRounds].sort((a,b)=>n(b,"number")-n(a,"number"))[0]; const stage=s(deepest,"stage","name"); if(stage&&stage!=="GROUP") outcome=stage.replaceAll("_"," ");
      }
    } else {
      const originalMy=teamMatches.filter(m=>String(m.competition_id)===compId);
      const finals=originalMy.filter(m=>s(roundById.get(String(m.round_id)),"stage")==="FINAL");
      const final=finals.at(-1) ?? (originalMy.length===1&&s(c,"status")==="FINISHED"?originalMy[0]:undefined);
      if(final){const h=s(final,"home_team_code")===teamCode;const own=h?n(final,"home_score"):n(final,"away_score");const opp=h?n(final,"away_score"):n(final,"home_score");if(own>opp){outcome="Campeón";isTitle=s(c,"status")==="FINISHED";}else if(own<opp){outcome="Subcampeón";isRunnerUp=s(c,"status")==="FINISHED";}}
      if(!final&&originalMy.length){const deepest=[...originalMy].sort((a,b)=>n(roundById.get(String(b.round_id)),"number")-n(roundById.get(String(a.round_id)),"number"))[0];const label=s(roundById.get(String(deepest.round_id)),"name","stage");if(label) outcome=label.replaceAll("_"," ");}
    }
    participations.push({seasonId:String(c.season_id??""),season:seasonName(c,seasonById),competitionId:compId,competition:s(c,"name")??"Competición",competitionType:type,status:s(c,"status")??"DRAFT",played:my.length,wins,draws,losses,gf,gc,points,position,outcome,isTitle,isRunnerUp});
  }
  participations.sort((a,b)=>b.season.localeCompare(a.season,"es",{numeric:true})||a.competition.localeCompare(b.competition,"es"));

  const matchById=new Map(teamMatches.map(m=>[String(m.id),m]));
  const stats=(statsR.data??[]) as Row[];
  type Agg={playerId:string|null;name:string;appearances:number;minutes:number;goals:number;assists:number;mom:number;dp:number;seasons:Set<string>;youngest:number|null;oldest:number|null};
  const totalMap=new Map<string,Agg>();
  type SAgg=Omit<HistoryPlayerSeason,"season">;
  const seasonMap=new Map<string,SAgg>();
  for(const r of stats){const m=matchById.get(String(r.match_id));if(!m)continue;const c=compById.get(String(m.competition_id));if(!c)continue;const pid=s(r,"player_id");const name=s(r,"esms_name","player_name")??"Jugador";const key=pid??name;const min=n(r,"min","minutes");const age=nn(r,"age_at_match");const t=totalMap.get(key)??{playerId:pid,name,appearances:0,minutes:0,goals:0,assists:0,mom:0,dp:0,seasons:new Set<string>(),youngest:null,oldest:null};if(min>0)t.appearances++;t.minutes+=min;t.goals+=n(r,"gls","goals");t.assists+=n(r,"ass","assists");t.mom+=n(r,"mom");t.dp+=n(r,"dp");t.seasons.add(String(c.season_id??""));if(age!==null&&min>0){t.youngest=t.youngest===null?age:Math.min(t.youngest,age);t.oldest=t.oldest===null?age:Math.max(t.oldest,age);}totalMap.set(key,t);
    const sk=`${String(c.season_id??"")}|${key}`;const sa=seasonMap.get(sk)??{playerId:pid,name,seasonId:String(c.season_id??""),appearances:0,minutes:0,goals:0,assists:0,mom:0,dp:0,cleanSheets:0};if(min>0)sa.appearances++;sa.minutes+=min;sa.goals+=n(r,"gls","goals");sa.assists+=n(r,"ass","assists");sa.mom+=n(r,"mom");sa.dp+=n(r,"dp");if(s(r,"position_at_match")==="GK"&&min>0){const home=s(m,"home_team_code")===teamCode;const opp=home?n(m,"away_score"):n(m,"home_score");if(opp===0)sa.cleanSheets++;}seasonMap.set(sk,sa);
  }
  const players:HistoryPlayer[]=[...totalMap.values()].map(x=>({playerId:x.playerId,name:x.name,appearances:x.appearances,minutes:x.minutes,goals:x.goals,assists:x.assists,mom:x.mom,dp:x.dp,seasons:x.seasons.size,youngestAge:x.youngest,oldestAge:x.oldest}));
  const playerSeasons:HistoryPlayerSeason[]=[...seasonMap.values()].map(x=>({...x,season:seasonById.get(x.seasonId)??"Temporada"}));

  const playerById=new Map(((playersR.data??[]) as Row[]).map(p=>[String(p.id),s(p,"full_name")??s(p,"esms_name")??String(p.id)]));
  const transfers:HistoryTransfer[]=((transfersR.data??[]) as Row[]).filter(r=>s(r,"movement_type")!=="PENDING").map(r=>{const into=s(r,"to_team_code")===teamCode;const type=s(r,"movement_type")??"TRANSFER";const fee=type==="LOAN"?nn(r,"loan_fee"):nn(r,"fee");const sid=s(r,"season_id");return{id:String(r.id),playerId:s(r,"player_id"),playerName:playerById.get(String(r.player_id))??String(r.player_id??"Jugador"),seasonId:sid,season:sid?seasonById.get(sid)??"Temporada":"Temporada",direction:into?"IN":"OUT",type,otherClub:into?(s(r,"from_team_code")??s(r,"owner_team_code")??"—"):(s(r,"to_team_code")??"—"),fee,date:s(r,"transfer_date")};});

  return {teamCode,seasons:seasons.map(x=>({id:String(x.id),name:s(x,"name")??"Temporada"})),competitions:participantIds.map(id=>compById.get(id)).filter(Boolean).map(c=>({id:String(c!.id),name:s(c!,"name")??"Competición"})),matches,participations,players,playerSeasons,transfers};
}

