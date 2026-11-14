import { NextResponse } from 'next/server';
import { authenticateProject } from '@/lib/auth';
export const runtime = 'nodejs';
export async function GET(request: Request) {
  try {
    const project = await authenticateProject(request);
    if (!project) return NextResponse.json({error:'unauthorized',message:'Provide a valid Nexora project API key.'},{status:401});
    return NextResponse.json({project:{id:project.id,slug:project.slug,name:project.name,description:project.description,environment:project.environment,status:project.status},scopes:project.scopes});
  } catch { return NextResponse.json({error:'service_unavailable'},{status:503}); }
}
