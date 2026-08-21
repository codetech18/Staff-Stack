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
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
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

    const { data: run } = await supabase
      .from('payroll_runs')
      .select('*, organisations(*)')
      .eq('id', payroll_run_id)
      .single()
    if (!run) return json({ error: 'Payroll run not found' }, 404, cors)

    const { data: membership } = await supabase
      .from('org_members')
      .select('id')
      .eq('org_id', run.org_id)
      .eq('user_id', userData.user.id)
      .maybeSingle()
    if (!membership) return json({ error: 'Not a member of this organisation' }, 403, cors)

    // Fetch unsent payslips with employee emails
    const { data: slips } = await supabase
      .from('payslips')
      .select('*, employees(first_name, last_name, email)')
      .eq('payroll_run_id', payroll_run_id)
      .is('sent_at', null)

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

    for (const slip of slips) {
      const emp = slip.employees
      if (!emp?.email) { skipped++; continue }

      const payslipUrl = `${APP_URL}/payslip/${slip.token}`

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
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
        await supabase
          .from('payslips')
          .update({ sent_at: new Date().toISOString() })
          .eq('id', slip.id)
        sent++
      } else {
        skipped++
        console.error('Resend error for', emp.email, await res.text())
      }
    }

    return json({ sent, skipped }, 200, cors)
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
<body style="margin:0;padding:0;background:#0a0b0d;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a0b0d;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#111318;border:1px solid #1e2330;border-radius:14px;overflow:hidden;">

        <tr><td style="padding:24px 28px;border-bottom:1px solid #1e2330;">
          <table role="presentation" width="100%"><tr>
            <td style="font-size:17px;font-weight:800;color:#ffffff;">${escapeHtml(p.orgName)}</td>
            <td align="right"><span style="display:inline-block;background:#3b82f6;color:#fff;font-size:12px;font-weight:800;border-radius:8px;padding:6px 10px;">S</span></td>
          </tr></table>
        </td></tr>

        <tr><td style="padding:28px;">
          <p style="margin:0 0 6px;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">Payslip · ${p.period}</p>
          <h1 style="margin:0 0 14px;font-size:20px;color:#ffffff;">Hi ${escapeHtml(p.firstName)},</h1>
          <p style="margin:0 0 22px;font-size:14px;line-height:1.6;color:#94a3b8;">
            Your payslip for ${p.period} is ready. Your net pay of
            <strong style="color:#22c55e;">${naira}</strong> has been processed.
          </p>
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:10px;background:#3b82f6;">
            <a href="${p.payslipUrl}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">View payslip</a>
          </td></tr></table>
          <p style="margin:22px 0 0;font-size:12px;line-height:1.6;color:#64748b;">
            You can view, print, or save your payslip as a PDF from that page. Keep it for your records — it's valid for bank and rental applications.
          </p>
        </td></tr>

        <tr><td style="padding:16px 28px;border-top:1px solid #1e2330;">
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
