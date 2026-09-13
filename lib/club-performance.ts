import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getPositionPerformanceScore, normalizeScoresByPositionAndSeason, type EsmsHistoryPosition } from "@/lib/performance-score";
import { getPlayerProfile } from "@/lib/esms-player";

type AnyRow = Record<string, any>;

type PlayerTotals = {
  appearances: number;
  minutes: number;
  goals: number;
  assists: number;
  keyPasses: number;
  tackles: number;
  shots: number;
  saves: number;
  conceded: number;
  discipline: number;
};
export type ClubPerformanceRow = {
  playerId: string; esmsName: string; displayName: string; photoUrl: string | null; nationality: string | null;
  naturalPosition: EsmsHistoryPosition | null; dominantPosition: EsmsHistoryPosition; appearances: number; minutes: number;
  goals: number; assists: number; keyPasses: number; tackles: number; shots: number; saves: number; conceded: number; discipline: number;
  rawScore: number; zScore: number; percentile: number; normalizedIndex: number;
  byPosition: Array<{ position: EsmsHistoryPosition; appearances: number; minutes: number; rawScore: number }>;
};
export type ClubPerformanceData = { season: {id:string;name:string}|null; seasons:Array<{id:string;name:string;isActive:boolean}>; rows: ClubPerformanceRow[] };
const POSITIONS: EsmsHistoryPosition[] = ["GK","DF","DM","MF","AM","FW"];
const n=(v:unknown)=>{const x=Number(v??0);return Number.isFinite(x)?x:0};
const pos=(v:unknown):EsmsHistoryPosition|null=>{const x=String(v??"").toUpperCase() as EsmsHistoryPosition;return POSITIONS.includes(x)?x:null};

export async function getClubPerformance(teamCodeInput:string, requestedSeasonId?:string|null):Promise<ClubPerformanceData>{
 const supabase=getSupabaseAdmin(); const teamCode=teamCodeInput.toUpperCase();
 const seasonsRes=await supabase.from("seasons").select("id,name,is_active,created_at").order("created_at",{ascending:false});
 if(seasonsRes.error) throw seasonsRes.error;
 const seasons=((seasonsRes.data??[]) as AnyRow[]).map(r=>({id:String(r.id),name:String(r.name),isActive:Boolean(r.is_active)}));
 const season=seasons.find(s=>requestedSeasonId&&s.id===requestedSeasonId)??seasons.find(s=>s.isActive)??seasons[0]??null;
 if(!season)return {season:null,seasons,rows:[]};
 const compsRes=await supabase.from("competitions").select("id").eq("season_id",season.id); if(compsRes.error)throw compsRes.error;
 const compIds=((compsRes.data??[]) as AnyRow[]).map(r=>String(r.id)); if(!compIds.length)return {season,seasons,rows:[]};
 const matchesRes=await supabase
  .from("matches")
  .select("id,competition_id,status,home_team_code,away_team_code")
  .in("competition_id",compIds)
  .eq("status","PLAYED");
 if(matchesRes.error)throw matchesRes.error;

 const playedMatches=((matchesRes.data??[]) as AnyRow[]);
 const matchIds=playedMatches.map(r=>String(r.id));
 if(!matchIds.length)return {season,seasons,rows:[]};

 const matchById=new Map(
  playedMatches.map(r=>[String(r.id),r] as const)
 );
 const stats:AnyRow[]=[]; for(let i=0;i<matchIds.length;i+=100){const r=await supabase.from("match_player_stats").select("match_id,player_id,team_code,esms_name,participated,minutes,saves,conceded,tackles,key_passes,shots,goals,assists,dp,position_at_match").in("match_id",matchIds.slice(i,i+100));if(r.error)throw r.error;stats.push(...(r.data??[]));}
 const directIds=[...new Set(stats.map(r=>r.player_id&&String(r.player_id)).filter(Boolean))] as string[];
 const statNames=[...new Set(stats.map(r=>String(r.esms_name??"").trim()).filter(Boolean))];

 const playerRows:AnyRow[]=[];
 for(let i=0;i<directIds.length;i+=100){
  const r=await supabase
   .from("players")
   .select("id,esms_name,full_name,photo_url,nationality")
   .in("id",directIds.slice(i,i+100));
  if(r.error)throw r.error;
  playerRows.push(...(r.data??[]));
 }
 // Recupera también jugadores de importaciones antiguas donde match_player_stats.player_id es NULL.
 for(let i=0;i<statNames.length;i+=100){
  const r=await supabase
   .from("players")
   .select("id,esms_name,full_name,photo_url,nationality")
   .in("esms_name",statNames.slice(i,i+100));
  if(r.error)throw r.error;
  playerRows.push(...(r.data??[]));
 }

 const uniquePlayers=new Map<string,AnyRow>();
 for(const r of playerRows)uniquePlayers.set(String(r.id),r);
 const ids=[...uniquePlayers.keys()];

 const snapsRows:AnyRow[]=[];
 for(let i=0;i<ids.length;i+=100){
  const r=await supabase
   .from("latest_player_snapshots")
   .select("player_id,st,tk,ps,sh")
   .in("player_id",ids.slice(i,i+100));
  if(r.error)throw r.error;
  snapsRows.push(...(r.data??[]));
 }

 const meta=new Map([...uniquePlayers.entries()]);
 const snaps=new Map(snapsRows.map(r=>[String(r.player_id),r]));
 const normalizeEsmsName=(value:unknown)=>String(value??"").trim().toLowerCase();
 const playerIdByEsmsName=new Map<string,string>();
 for(const [id,r] of meta){
  const key=normalizeEsmsName(r.esms_name);
  if(key&&!playerIdByEsmsName.has(key))playerIdByEsmsName.set(key,id);
 }
 const resolvePlayerId=(r:AnyRow):string|null=>{
  if(r.player_id)return String(r.player_id);
  return playerIdByEsmsName.get(normalizeEsmsName(r.esms_name))??null;
 };

 type Acc={playerId:string;position:EsmsHistoryPosition;rawScore:number;minutes:number;appearances:number}; const acc=new Map<string,Acc>(); const mins=new Map<string,Map<EsmsHistoryPosition,number>>();
 const accAppearanceKeys=new Set<string>();
 for(const r of stats){
  const id=resolvePlayerId(r);
  if(!id)continue;
  const p=pos(r.position_at_match);
  if(!p)continue;
  const pm=mins.get(id)??new Map();
  pm.set(p,(pm.get(p)??0)+n(r.minutes));
  mins.set(id,pm);
  const k=`${id}::${p}`;
  const a=acc.get(k)??{playerId:id,position:p,rawScore:0,minutes:0,appearances:0};
  a.rawScore+=getPositionPerformanceScore({
   position:p,
   saves:n(r.saves),
   conceded:n(r.conceded),
   minutes:n(r.minutes),
   discipline:n(r.dp),
   tackles:n(r.tackles),
   keyPasses:n(r.key_passes),
   assists:n(r.assists),
   goals:n(r.goals),
   shots:n(r.shots)
  });
  a.minutes+=n(r.minutes);
  const appearanceKey=`${id}::${String(r.match_id)}::${p}`;
  if(!accAppearanceKeys.has(appearanceKey)){
   a.appearances+=1;
   accAppearanceKeys.add(appearanceKey);
  }
  acc.set(k,a);
 }
 const dominant:Acc[]=[];
 for(const [id,m] of mins){
  const ordered=[...m].sort(
    (a,b)=>b[1]-a[1]||POSITIONS.indexOf(a[0])-POSITIONS.indexOf(b[0])
  );
  const dominantPosition=ordered[0]?.[0];
  if(!dominantPosition)continue;

  // IMPORTANTE:
  // La posición dominante se decide únicamente por los minutos jugados.
  // Sin embargo, el rendimiento NO se pierde si el jugador actuó en otras
  // posiciones: sumamos el Performance Score obtenido en TODAS ellas y
  // atribuimos el total a su posición dominante para la normalización.
  const allPositionAccumulators=POSITIONS
    .map(position=>acc.get(`${id}::${position}`))
    .filter((value):value is Acc=>Boolean(value));

  const totalRawScore=allPositionAccumulators.reduce(
    (sum,value)=>sum+value.rawScore,
    0
  );
  const totalMinutes=allPositionAccumulators.reduce(
    (sum,value)=>sum+value.minutes,
    0
  );
  const totalAppearances=allPositionAccumulators.reduce(
    (sum,value)=>sum+value.appearances,
    0
  );

  dominant.push({
    playerId:id,
    position:dominantPosition,
    rawScore:totalRawScore,
    minutes:totalMinutes,
    appearances:totalAppearances,
  });
 }
 const normalized=normalizeScoresByPositionAndSeason(
  dominant.map(a=>({
    playerId:a.playerId,
    seasonId:season.id,
    position:a.position,
    rawScore:a.rawScore
  }))
 );
 const norm=new Map(normalized.map(r=>[r.playerId,r]));
 const playedMatchIds=new Set(matchIds);

 const belongsToClubMatch=(r:AnyRow)=>{
  const match=matchById.get(String(r.match_id));
  if(!match)return false;

  const home=String(match.home_team_code??"").toUpperCase();
  const away=String(match.away_team_code??"").toUpperCase();

  if(home!==teamCode && away!==teamCode)return false;

  // Si el stat trae team_code fiable, lo usamos. Si es legacy/incorrecto,
  // no descartamos automáticamente el registro: basta con que el jugador
  // esté registrado en un partido oficial del club y podamos resolver su identidad.
  const statTeam=String(r.team_code??"").toUpperCase();
  if(statTeam===teamCode)return true;

  // Fallback legacy: en partidos antiguos el team_code individual puede venir
  // con alias/código viejo. Permitimos el registro si el jugador puede resolverse
  // y el partido pertenece al club actual.
  return Boolean(resolvePlayerId(r));
 };

 const clubStats=stats.filter(r=>belongsToClubMatch(r));
 const totals=new Map<string,PlayerTotals>();

 const totalAppearanceKeys=new Set<string>();
 for(const r of clubStats){
  if(!playedMatchIds.has(String(r.match_id)))continue;

  const id=resolvePlayerId(r);
  if(!id)continue;

  const t:PlayerTotals=totals.get(id)??{
    appearances:0,
    minutes:0,
    goals:0,
    assists:0,
    keyPasses:0,
    tackles:0,
    shots:0,
    saves:0,
    conceded:0,
    discipline:0
  };

  // Un PJ por jugador y partido PLAYED, incluso si una importación antigua
  // dejó player_id/participated incompletos. El esms_name permite recuperar
  // la identidad del jugador.
  const appearanceKey=`${id}::${String(r.match_id)}`;
  if(!totalAppearanceKeys.has(appearanceKey)){
   t.appearances+=1;
   totalAppearanceKeys.add(appearanceKey);
  }

  // Se acumulan SIEMPRE las estadísticas reales guardadas en el partido.
  t.minutes+=n(r.minutes);
  t.goals+=n(r.goals);
  t.assists+=n(r.assists);
  t.keyPasses+=n(r.key_passes);
  t.tackles+=n(r.tackles);
  t.shots+=n(r.shots);
  t.saves+=n(r.saves);
  t.conceded+=n(r.conceded);
  t.discipline+=n(r.dp);

  totals.set(id,t);
 }
 const rows:ClubPerformanceRow[]=[];for(const [id,t] of totals){const nr=norm.get(id);if(!nr)continue;const m=meta.get(id),s=snaps.get(id);let natural:EsmsHistoryPosition|null=null;if(s){natural=getPlayerProfile({st:n(s.st),tk:n(s.tk),ps:n(s.ps),sh:n(s.sh)} as any) as EsmsHistoryPosition}const byPosition=POSITIONS.map(position=>acc.get(`${id}::${position}`)).filter(Boolean).map(a=>({position:a!.position,appearances:a!.appearances,minutes:a!.minutes,rawScore:Math.round(a!.rawScore*10)/10}));rows.push({
    playerId:id,
    esmsName:String(m?.esms_name??id),
    displayName:String(m?.full_name??m?.esms_name??id).replaceAll("_"," "),
    photoUrl:m?.photo_url?String(m.photo_url):null,
    nationality:m?.nationality?String(m.nationality):null,
    naturalPosition:natural,
    dominantPosition:nr.position,
    appearances:t.appearances,
    minutes:t.minutes,
    goals:t.goals,
    assists:t.assists,
    keyPasses:t.keyPasses,
    tackles:t.tackles,
    shots:t.shots,
    saves:t.saves,
    conceded:t.conceded,
    discipline:t.discipline,
    rawScore:Math.round(nr.rawScore*10)/10,
    zScore:nr.zScore,
    percentile:nr.percentile,
    normalizedIndex:nr.normalizedIndex,
    byPosition
  })}
 rows.sort((a,b)=>b.normalizedIndex-a.normalizedIndex||b.minutes-a.minutes);return {season,seasons,rows};
}