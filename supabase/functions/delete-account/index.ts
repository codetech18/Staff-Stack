// StaffStack — Account deletion
// Supabase Edge Function (Deno runtime)
//
// Deletes every organisation the caller owns (cascades to all staff, payroll,
// leave, attendance, subjects, documents), removes their org memberships, then
// deletes the auth user itself. Irreversible.
//
// Deploy:  supabase functions deploy delete-account

import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const authHeader = req.headers.get('Authorization') ?? ''
    const jwt = authHeader.replace('Bearer ', '')
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt)
    if (userErr || !userData.user) return json({ error: 'Unauthorized' }, 401, cors)

    const userId = userData.user.id

    // Delete every organisation this user owns — cascades to employees,
    // payroll_runs, payslips, leave_requests, attendance, subjects, documents.
    const { error: orgDeleteErr } = await supabase
      .from('organisations')
      .delete()
      .eq('owner_id', userId)
    if (orgDeleteErr) return json({ error: orgDeleteErr.message }, 500, cors)

    // Remove membership rows for orgs this user belongs to but doesn't own.
    await supabase.from('org_members').delete().eq('user_id', userId)

    // Finally delete the auth user itself.
    const { error: authDeleteErr } = await supabase.auth.admin.deleteUser(userId)
    if (authDeleteErr) return json({ error: authDeleteErr.message }, 500, cors)

    return json({ deleted: true }, 200, cors)
  } catch (e) {
    console.error(e)
    return json({ error: 'Internal error' }, 500, cors)
  }
})

function json(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}
