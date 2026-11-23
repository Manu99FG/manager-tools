import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const bucket = "manager-media";
const allowed = new Map([["image/png","png"],["image/jpeg","jpg"],["image/webp","webp"]]);

export async function GET(request: Request) {
  if (!(await isAdminSession())) return NextResponse.json({error:"No autorizado"},{status:401});
  const url = new URL(request.url);
  const kind=url.searchParams.get("kind"), id=url.searchParams.get("id");
  if(!id || !["club","competition"].includes(kind||"")) return NextResponse.json({error:"Parámetros inválidos"},{status:400});
  const db=getSupabaseAdmin();
  const {data,error}=await db.from("manager_media").select("storage_path").eq("entity_type",kind).eq("entity_id",id).maybeSingle();
  if(error) return NextResponse.json({error:error.message},{status:500});
  const imageUrl=data?.storage_path ? db.storage.from(bucket).getPublicUrl(data.storage_path).data.publicUrl : null;
  return NextResponse.json({imageUrl});
}

export async function POST(request: Request) {
  if (!(await isAdminSession())) return NextResponse.json({error:"No autorizado"},{status:401});
  try {
    const form=await request.formData();
    const kind=String(form.get("kind")||"");
    const id=String(form.get("id")||"").trim();
    const file=form.get("file");
    if(!["club","competition"].includes(kind) || !id || id.length>100 || !/^[a-zA-Z0-9_-]+$/.test(id)) return NextResponse.json({error:"Identificador inválido"},{status:400});
    if(!(file instanceof File) || !allowed.has(file.type) || file.size>5*1024*1024 || file.size===0) return NextResponse.json({error:"Usa PNG, JPG o WebP de hasta 5 MB"},{status:400});
    const db=getSupabaseAdmin();
    if(kind==="competition") {
      const {data,error}=await db.from("competitions").select("id").eq("id",id).maybeSingle();
      if(error || !data) return NextResponse.json({error:"Competición inexistente"},{status:404});
    } else {
      const {data,error}=await db.from("club_metadata").select("team_code").eq("team_code",id.toUpperCase()).maybeSingle();
      if(error || !data) return NextResponse.json({error:"El club debe existir en club_metadata"},{status:404});
    }
    const {data:old}=await db.from("manager_media").select("storage_path").eq("entity_type",kind).eq("entity_id",id).maybeSingle();
    const path=`${kind}/${id}/${crypto.randomUUID()}.${allowed.get(file.type)}`;
    const {error:uploadError}=await db.storage.from(bucket).upload(path,await file.arrayBuffer(),{contentType:file.type,upsert:false});
    if(uploadError) throw uploadError;
    const {error:saveError}=await db.from("manager_media").upsert({entity_type:kind,entity_id:id,storage_path:path,updated_at:new Date().toISOString()},{onConflict:"entity_type,entity_id"});
    if(saveError){await db.storage.from(bucket).remove([path]);throw saveError;}
    if(old?.storage_path) await db.storage.from(bucket).remove([old.storage_path]);
    return NextResponse.json({ok:true,imageUrl:db.storage.from(bucket).getPublicUrl(path).data.publicUrl});
  } catch(e) {return NextResponse.json({error:e instanceof Error?e.message:"Error de subida"},{status:500});}
}

export async function DELETE(request: Request) {
  if (!(await isAdminSession())) return NextResponse.json({error:"No autorizado"},{status:401});
  const body=await request.json().catch(()=>({}));
  const kind=body.kind,id=body.id;
  if(!["club","competition"].includes(kind) || typeof id!=="string" || !/^[a-zA-Z0-9_-]+$/.test(id)) return NextResponse.json({error:"Datos inválidos"},{status:400});
  const db=getSupabaseAdmin();
  const {data}=await db.from("manager_media").select("storage_path").eq("entity_type",kind).eq("entity_id",id).maybeSingle();
  const {error}=await db.from("manager_media").delete().eq("entity_type",kind).eq("entity_id",id);
  if(error)return NextResponse.json({error:error.message},{status:500});
  if(data?.storage_path) await db.storage.from(bucket).remove([data.storage_path]);
  return NextResponse.json({ok:true});
}
