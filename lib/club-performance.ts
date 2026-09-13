import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getPositionPerformanceScore, normalizeScoresByPositionAndSeason, type EsmsHistoryPosition } from "@/lib/performance-score";
import { getPlayerProfile } from "@/lib/esms-player";

type AnyRow = Record<string, any>;
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
 const matchesRes=await supabase.from("matches").select("id,competition_id,status").in("competition_id",compIds).eq("status","PLAYED"); if(matchesRes.error)throw matchesRes.error;
 const matchIds=((matchesRes.data??[]) as AnyRow[]).map(r=>String(r.id)); if(!matchIds.length)return {season,seasons,rows:[]};
 const stats:AnyRow[]=[]; for(let i=0;i<matchIds.length;i+=100){const r=await supabase.from("match_player_stats").select("match_id,player_id,team_code,esms_name,participated,minutes,saves,conceded,tackles,key_passes,shots,goals,assists,dp,position_at_match").in("match_id",matchIds.slice(i,i+100));if(r.error)throw r.error;stats.push(...(r.data??[]));}
 const ids=[...new Set(stats.map(r=>r.player_id&&String(r.player_id)).filter(Boolean))] as string[];
 const playersRes=ids.length?await supabase.from("players").select("id,esms_name,full_name,photo_url,nationality").in("id",ids):{data:[],error:null} as any; if(playersRes.error)throw playersRes.error;
 const snapsRes=ids.length?await supabase.from("latest_player_snapshots").select("player_id,st,tk,ps,sh").in("player_id",ids):{data:[],error:null} as any;if(snapsRes.error)throw snapsRes.error;
 const meta=new Map(((playersRes.data??[]) as AnyRow[]).map(r=>[String(r.id),r])); const snaps=new Map(((snapsRes.data??[]) as AnyRow[]).map(r=>[String(r.player_id),r]));
 type Acc={playerId:string;position:EsmsHistoryPosition;rawScore:number;minutes:number;appearances:number}; const acc=new Map<string,Acc>(); const mins=new Map<string,Map<EsmsHistoryPosition,number>>();
 for(const r of stats){if(!r.player_id)continue;const p=pos(r.position_at_match);if(!p)continue;const id=String(r.player_id);const pm=mins.get(id)??new Map();pm.set(p,(pm.get(p)??0)+n(r.minutes));mins.set(id,pm);const k=`${id}::${p}`;const a=acc.get(k)??{playerId:id,position:p,rawScore:0,minutes:0,appearances:0};a.rawScore+=getPositionPerformanceScore({position:p,saves:n(r.saves),conceded:n(r.conceded),minutes:n(r.minutes),discipline:n(r.dp),tackles:n(r.tackles),keyPasses:n(r.key_passes),assists:n(r.assists),goals:n(r.goals),shots:n(r.shots)});a.minutes+=n(r.minutes);a.appearances+=n(r.participated)>0||n(r.minutes)>0?1:0;acc.set(k,a)}
 const dominant:Acc[]=[];for(const [id,m] of mins){const ordered=[...m].sort((a,b)=>b[1]-a[1]||POSITIONS.indexOf(a[0])-POSITIONS.indexOf(b[0]));const p=ordered[0]?.[0];if(p){const a=acc.get(`${id}::${p}`);if(a)dominant.push(a)}}
 const normalized=normalizeScoresByPositionAndSeason(dominant.map(a=>({playerId:a.playerId,seasonId:season.id,position:a.position,rawScore:a.rawScore})));
 const norm=new Map(normalized.map(r=>[r.playerId,r]));
 const clubStats=stats.filter(r=>String(r.team_code).toUpperCase()===teamCode); const totals=new Map<string,AnyRow>();
 for(const r of clubStats){if(!r.player_id)continue;const id=String(r.player_id),t=totals.get(id)??{appearances:0,minutes:0,goals:0,assists:0,keyPasses:0,tackles:0,shots:0,saves:0,conceded:0,discipline:0};t.appearances+=n(r.participated)>0||n(r.minutes)>0?1:0;t.minutes+=n(r.minutes);t.goals+=n(r.goals);t.assists+=n(r.assists);t.keyPasses+=n(r.key_passes);t.tackles+=n(r.tackles);t.shots+=n(r.shots);t.saves+=n(r.saves);t.conceded+=n(r.conceded);t.discipline+=n(r.dp);totals.set(id,t)}
 const rows:ClubPerformanceRow[]=[];for(const [id,t] of totals){const nr=norm.get(id);if(!nr)continue;const m=meta.get(id),s=snaps.get(id);let natural:EsmsHistoryPosition|null=null;if(s){natural=getPlayerProfile({st:n(s.st),tk:n(s.tk),ps:n(s.ps),sh:n(s.sh)} as any) as EsmsHistoryPosition}const byPosition=POSITIONS.map(position=>acc.get(`${id}::${position}`)).filter(Boolean).map(a=>({position:a!.position,appearances:a!.appearances,minutes:a!.minutes,rawScore:Math.round(a!.rawScore*10)/10}));rows.push({playerId:id,esmsName:String(m?.esms_name??id),displayName:String(m?.full_name??m?.esms_name??id).replaceAll("_"," "),photoUrl:m?.photo_url?String(m.photo_url):null,nationality:m?.nationality?String(m.nationality):null,naturalPosition:natural,dominantPosition:nr.position,...t,rawScore:Math.round(nr.rawScore*10)/10,zScore:nr.zScore,percentile:nr.percentile,normalizedIndex:nr.normalizedIndex,byPosition})}
 rows.sort((a,b)=>b.normalizedIndex-a.normalizedIndex||b.minutes-a.minutes);return {season,seasons,rows};
}
