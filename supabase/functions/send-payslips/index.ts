// StaffStack — Payslip email delivery
// Supabase Edge Function (Deno runtime)
//
// Deploy:  supabase functions deploy send-payslips
// Secrets: supabase secrets set RESEND_API_KEY=re_xxx APP_URL=https://yourapp.vercel.app FROM_EMAIL="StaffStack <payroll@yourdomain.ng>"

import { createClient } from 'jsr:@supabase/supabase-js@2'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

Deno.serve(async (req) => {
  const cors = {
    'Access-Control-Allow-Origin': Deno.env.get('APP_URL') ?? '',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  if(req.method !== 'POST')return json({error:'Method not allowed'},405,cors)
  try {
    if(!Deno.env.get('RESEND_API_KEY') || !Deno.env.get('APP_URL') || !Deno.env.get('FROM_EMAIL'))return json({error:'Email delivery is not configured'},503,cors)
    const { payroll_run_id } = await req.json()
    if (!payroll_run_id) {
      return json({ error: 'payroll_run_id is required' }, 400, cors)
    }

    // Service-role client (bypasses RLS — safe inside edge function only)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Verify the caller is an authenticated member of the run's org
    const authHeader = req.headers.get('Authorization') ?? ''
    const jwt = authHeader.replace('Bearer ', '')
    const { data: userData, error: userErr } = await supabase.auth.getUser(jwt)
    if (userErr || !userData.user) return json({ error: 'Unauthorized' }, 401, cors)
    const claims=JSON.parse(atob(jwt.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')))
    if(claims.aal!=='aal2')return json({error:'Two-step verification required'},403,cors)

    const { data: run } = await supabase
      .from('payroll_runs')
      .select('*, organisations(*)')
      .eq('id', payroll_run_id)
      .single()
    if (!run) return json({ error: 'Payroll run not found' }, 404, cors)

    const { data: membership } = await supabase
      .from('org_members')
      .select('id,role')
      .eq('org_id', run.org_id)
      .eq('user_id', userData.user.id)
      .maybeSingle()
    if(run.organisations.owner_id !== userData.user.id && !['owner','payroll_manager'].includes(membership?.role ?? '')) return json({ error: 'Payroll permission required' }, 403, cors)
    if(!['approved','paid'].includes(run.status))return json({error:'Only approved payroll can be delivered'},409,cors)

    // Fetch unsent payslips with employee emails
    const { data: slips } = await supabase
      .from('payslips')
      .select('*, employees(first_name, last_name, email)')
      .eq('payroll_run_id', payroll_run_id)
      .is('sent_at', null)
      .is('token_revoked_at',null)
      .gt('token_expires_at',new Date().toISOString())
      .limit(100)

    if (!slips || slips.length === 0) {
      return json({ sent: 0, skipped: 0, message: 'No unsent payslips for this run' }, 200, cors)
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
    const APP_URL = Deno.env.get('APP_URL') ?? 'http://localhost:5173'
    const FROM = Deno.env.get('FROM_EMAIL') ?? 'StaffStack <onboarding@resend.dev>'

    const period = `${MONTHS[run.period_month - 1]} ${run.period_year}`
    const orgName = run.organisations.name

    let sent = 0
    let skipped = 0
    let failed = 0

    for (const slip of slips) {
      const emp = slip.employee_snapshot ?? slip.employees
      const cutoff=new Date(Date.now()-10*60*1000).toISOString()
      const {data:claimed,error:claimError}=await supabase.from('payslips').update({delivery_claimed_at:new Date().toISOString()}).eq('id',slip.id).is('sent_at',null).or(`delivery_claimed_at.is.null,delivery_claimed_at.lt.${cutoff}`).select('id').maybeSingle()
      if(claimError){failed++;continue}
      if(!claimed){skipped++;continue}
      if (!emp?.email) { skipped++; continue }

      const payslipUrl = `${APP_URL}/payslip/${slip.token}`

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': `staffstack-payslip-${slip.id}-${slip.token}`,
        },
        body: JSON.stringify({
          from: FROM,
          to: emp.email,
          subject: `Your ${period} Payslip — ${orgName}`,
          html: emailTemplate({
            firstName: emp.first_name,
            orgName,
            period,
            netPay: Number(slip.net_pay),
            payslipUrl,
          }),
        }),
      })

      if (res.ok) {
        const {error:markError}=await supabase
          .from('payslips')
          .update({ sent_at: new Date().toISOString() })
          .eq('id', slip.id)
        if(markError)failed++;else sent++
      } else {
        failed++
        await supabase.from('payslips').update({delivery_claimed_at:null}).eq('id',slip.id)
        console.error('Payslip delivery provider rejected request', res.status)
      }
    }

    return json({ sent, skipped, failed }, 200, cors)
  } catch (e) {
    console.error('Payslip delivery failed')
    return json({ error: 'Internal error' }, 500, cors)
  }
})

function json(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

function emailTemplate(p: {
  firstName: string
  orgName: string
  period: string
  netPay: number
  payslipUrl: string
}): string {
  const naira = '₦' + p.netPay.toLocaleString('en-NG', { maximumFractionDigits: 0 })
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f7f8fa;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f8fa;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border:1px solid #e8ece9;border-radius:14px;overflow:hidden;">

        <tr><td style="padding:24px 28px;border-bottom:1px solid #e8ece9;">
          <table role="presentation" width="100%"><tr>
            <td style="font-size:17px;font-weight:800;color:#ffffff;">${escapeHtml(p.orgName)}</td>
            <td align="right"><span style="display:inline-block;background:#216449;color:#fff;font-size:12px;font-weight:800;border-radius:8px;padding:6px 10px;">S</span></td>
          </tr></table>
        </td></tr>

        <tr><td style="padding:28px;">
          <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">Payslip · ${p.period}</p>
          <h1 style="margin:0 0 14px;font-size:20px;color:#ffffff;">Hi ${escapeHtml(p.firstName)},</h1>
          <p style="margin:0 0 22px;font-size:14px;line-height:1.6;color:#586b61;">
            Your payslip for ${p.period} is ready. Your net pay of
            <strong style="color:#22c55e;">${naira}</strong> has been processed.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:10px;background:#216449;">
            <a href="${p.payslipUrl}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">View payslip</a>
          </td></tr></table>
          <p style="margin:22px 0 0;font-size:12px;line-height:1.6;color:#64748b;">
            You can view, print, or save your payslip as a PDF from that page. Keep it for your records. This private link expires after 30 days.
          </p>
        </td></tr>

        <tr><td style="padding:16px 28px;border-top:1px solid #e8ece9;">
          <p style="margin:0;font-size:11px;color:#475569;">Sent by StaffStack on behalf of ${escapeHtml(p.orgName)}. If you weren't expecting this email, you can ignore it.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
