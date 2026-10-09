import { createClient } from 'jsr:@supabase/supabase-js@2'
Deno.serve(async req => {
 const origin=Deno.env.get('APP_URL') ?? ''
 const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Content-Type':'application/json','Cache-Control':'no-store'}
 const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers})
 if(req.method==='OPTIONS')return new Response('ok',{headers})
 if(req.method!=='POST')return respond({error:'Method not allowed'},405)
 try {
  const {confirmation}=await req.json();if(confirmation!=='DELETE')return respond({error:'Explicit confirmation required'},400)
  const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const jwt=(req.headers.get('authorization')??'').replace(/^Bearer /i,'')
  const {data,error}=await admin.auth.getUser(jwt);if(error||!data.user)return respond({error:'Unauthorized'},401)
  const {count,error:lookup}=await admin.from('organisations').select('id',{count:'exact',head:true}).eq('owner_id',data.user.id)
  if(lookup)return respond({error:'Unable to check workspace ownership'},500)
  if(count)return respond({error:'Transfer or remove owned workspaces first. Account deletion does not delete organisations.'},409)
  // Auth FK cascades remove memberships; historical reviewer/actor references become null.
  const {error:deleted}=await admin.auth.admin.deleteUser(data.user.id)
  if(deleted)return respond({error:'Account could not be deleted. Contact support.'},500)
  return respond({deleted:true})
 }catch{return respond({error:'Account could not be deleted'},500)}
})
