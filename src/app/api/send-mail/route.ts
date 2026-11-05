import { NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter';

export const maxDuration = 60;

function escapeHtml(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function createMimeMessage(to: string, senderEmail: string, subject: string, html: string) {
  const headers = [
    `To: ${to}`,
    senderEmail ? `From: ${senderEmail}` : '',
    `Subject: =?utf-8?B?${Buffer.from(subject, 'utf-8').toString('base64')}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
  ].filter(Boolean);

  const rawMime = headers.join('\r\n') + '\r\n\r\n' + Buffer.from(html, 'utf-8').toString('base64');
  return Buffer.from(rawMime, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const rate = checkRateLimit(`send_mail_${clientIp}`, 120, 60000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded: Please wait before sending more campaign emails.' },
        { status: 429, headers: { 'Retry-After': String(rate.resetSeconds) } }
      );
    }
    const { 
      emails, 
      subject, 
      message, 
      accessToken, 
      senderEmail, 
      campaignName, 
      attachments, 
      userId, 
      userToken, 
      campaignId: incomingCampaignId, 
      totalRecipients 
    } = await request.json();

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const origin = `${protocol}://${host}`;

    if (!accessToken) {
      return NextResponse.json({ error: 'Missing Google access token. Please reconnect your Google account.' }, { status: 401 });
    }

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: 'Please provide at least one recipient email.' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Use service role key if available, otherwise authenticated user JWT, fallback to anon key
    const authHeaderFromReq = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    const userAuthToken = userToken || authHeaderFromReq;
    const authBearer = supabaseServiceKey || userAuthToken || supabaseAnonKey;

    let campaignId = incomingCampaignId;

    // 1. Save Campaign in Supabase only if not already provided
    if (!campaignId) {
      const campaignBody: Record<string, any> = {
        subject: campaignName || subject || 'Campaign',
        total_sent: totalRecipients || emails.length,
      };
      if (userId) {
        campaignBody.user_id = userId;
      }

      let campaignRes = await fetch(`${supabaseUrl}/rest/v1/campaigns`, {
        method: 'POST',
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${authBearer}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(campaignBody)
      });
      
      const campaignText = await campaignRes.text();
      let campaignData: any;
      try {
        campaignData = JSON.parse(campaignText);
      } catch {
        campaignData = null;
      }

      // Graceful fallback if user_id column has not yet been added to Supabase table
      if (!campaignRes.ok && campaignData?.message?.includes('user_id')) {
        campaignRes = await fetch(`${supabaseUrl}/rest/v1/campaigns`, {
          method: 'POST',
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${authBearer}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({ subject: campaignName || subject || 'Campaign', total_sent: totalRecipients || emails.length })
        });
        const retryText = await campaignRes.text();
        try {
          campaignData = JSON.parse(retryText);
        } catch {
          campaignData = null;
        }
      }

      if (!campaignRes.ok || !campaignData || !campaignData[0]) {
        throw new Error(campaignData?.message || 'Failed to create campaign in database');
      }

      campaignId = campaignData[0].id;
    }

    // Prepare HTML block for attachments (similar to Google Drive attachment cards)
    let attachmentsHtml = '';
    if (attachments && attachments.length > 0) {
      attachmentsHtml = `
        <br/><br/>
        <div style="margin-top: 10px;">
          ${attachments.map((att: any) => `
            <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 12px; background-color: #f1f3f4; border: 1px solid #dadce0; border-radius: 4px; max-width: 450px; width: 100%;">
              <tr>
                <td style="padding: 10px 14px;">
                  <a href="${typeof att.link === 'string' && (att.link.startsWith('https://') || att.link.startsWith('http://')) ? att.link : '#'}" target="_blank" style="text-decoration: none; color: #202124; font-family: Roboto, Arial, sans-serif; font-size: 14px; display: block; line-height: 20px;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td width="24" valign="middle">
                          <img src="https://ssl.gstatic.com/docs/doclist/images/mediatype/icon_1_audio_x32.png" style="width: 20px; height: 20px; display: block; border: none;" alt="Audio" />
                        </td>
                        <td valign="middle" style="padding-left: 8px; font-weight: normal; max-width: 380px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                          ${escapeHtml(att.name)}
                        </td>
                      </tr>
                    </table>
                  </a>
                </td>
              </tr>
            </table>
          `).join('')}
        </div>
      `;
    }

    // 2. Dispatch emails and record tracking logs for each
    const isHttpsPublicOrigin = origin.startsWith('https://') && !origin.includes('localhost');
    const delayMs = process.env.NODE_ENV === 'test' ? 10 : (emails.length > 1 ? 50 : 0);

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];

      if (i > 0 && delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      let logId: string | undefined = undefined;
      try {
        const logRes = await fetch(`${supabaseUrl}/rest/v1/email_logs`, {
          method: 'POST',
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${authBearer}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify({ campaign_id: campaignId, recipient_email: email })
        });
        const logText = await logRes.text();
        const logData = JSON.parse(logText);
        logId = logData?.[0]?.id;
      } catch {}

      // Tracking pixel: only use on secure public domains so local test servers don't trigger spam filters
      const trackingPixelHtml = (isHttpsPublicOrigin && logId)
        ? `<br/><br/><img src="${origin}/api/track?log_id=${logId}" width="1" height="1" alt="" style="display:none; border:none; outline:none;" />`
        : '';
      
      const htmlMessage = `
        <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.6;">
          ${escapeHtml(message).replace(/\n/g, '<br/>')}
          ${attachmentsHtml}
          ${trackingPixelHtml}
        </div>
      `;

      const rawMessage = createMimeMessage(email, senderEmail, subject, htmlMessage);

      const gmailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: rawMessage })
      });

      if (!gmailRes.ok) {
        const errorText = await gmailRes.text().catch(() => '');
        let parsedError = errorText;
        try {
          const errJson = JSON.parse(errorText);
          parsedError = errJson?.error?.message || errorText;
        } catch {}
        console.error(`[Mailer API] Gmail send failed (${gmailRes.status}) for ${email}:`, parsedError);

        let userFriendlyMsg = `Gmail API (${gmailRes.status}): ${parsedError}`;
        if (gmailRes.status === 401) {
          userFriendlyMsg = 'Twoja sesja Google (token) wygasła. W zakładce Mailer kliknij "Reconnect Google Account", aby odnowić uprawnienia Gmail.';
        } else if (gmailRes.status === 403 && (parsedError.toLowerCase().includes('has not been used in project') || parsedError.toLowerCase().includes('disabled'))) {
          userFriendlyMsg = 'Gmail API nie jest włączone w Twoim projekcie Google Cloud. Wejdź w Google Cloud Console -> APIs & Services -> Włącz bibliotekę "Gmail API".';
        } else if (gmailRes.status === 403 && parsedError.toLowerCase().includes('insufficient')) {
          userFriendlyMsg = 'Brak uprawnień do wysyłania (scope gmail.send). Kliknij "Reconnect Google Account" i zaznacz wszystkie zgody Google.';
        } else if (gmailRes.status === 429 || parsedError.toLowerCase().includes('quota') || parsedError.toLowerCase().includes('rate limit')) {
          userFriendlyMsg = 'Przekroczono limit wysyłki konta Gmail (Gmail daily quota). Spróbuj ponownie za kilka godzin.';
        }

        throw new Error(userFriendlyMsg);
      }
    }

    return NextResponse.json({ success: true, campaignId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
