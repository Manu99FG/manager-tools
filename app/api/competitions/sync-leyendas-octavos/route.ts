import { NextResponse } from "next/server";
import { isAdminSession } from "@/lib/admin-auth";
import { syncLeyendasRoundOf16 } from "@/lib/leyendas-knockout";

export async function POST(request:Request){
  if(!(await isAdminSession())) return NextResponse.json({error:"No autorizado"},{status:401});
  try{
    const {competitionId}=await request.json();
    if(typeof competitionId!=="string"||!competitionId.trim())
      return NextResponse.json({error:"competitionId obligatorio"},{status:400});
    return NextResponse.json({ok:true,...await syncLeyendasRoundOf16(competitionId.trim())});
  }catch(error){
    return NextResponse.json({error:error instanceof Error?error.message:"Error desconocido"},{status:409});
  }
}
