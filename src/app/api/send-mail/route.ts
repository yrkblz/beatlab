import { NextResponse } from 'next/server';

function createMimeMessage(to: string, subject: string, html: string) {
  const message = [
    `To: ${to}`,
    `Subject: =?utf-8?B?${Buffer.from(subject).toString('base64')}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=utf-8`,
    '',
    html
  ].join('\r\n');
  
  return Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function POST(request: Request) {
  try {
    const { emails, subject, message, accessToken, senderEmail, campaignName, attachments, userId, userToken } = await request.json();
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const origin = `${protocol}://${host}`;

    if (!accessToken) {
      return NextResponse.json({ error: 'Missing Google access token.' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Use service role key if available, otherwise authenticated user JWT, fallback to anon key
    const authHeaderFromReq = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    const userAuthToken = userToken || authHeaderFromReq;
    const authBearer = supabaseServiceKey || userAuthToken || supabaseAnonKey;

    // 1. Save Campaign in Supabase (scoped to userId for user isolation)
    const campaignBody: Record<string, any> = {
      subject: campaignName,
      total_sent: emails.length,
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
    let campaignData = await campaignRes.json();

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
        body: JSON.stringify({ subject: campaignName, total_sent: emails.length })
      });
      campaignData = await campaignRes.json();
    }

    if (!campaignRes.ok || !campaignData || !campaignData[0]) {
      throw new Error(campaignData?.message || 'Failed to create campaign in database');
    }

    const campaignId = campaignData[0].id;

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
                  <a href="${att.link}" target="_blank" style="text-decoration: none; color: #202124; font-family: Roboto, Arial, sans-serif; font-size: 14px; display: block; line-height: 20px;">
                    <table cellpadding="0" cellspacing="0" border="0" width="100%">
                      <tr>
                        <td width="24" valign="middle">
                          <img src="https://ssl.gstatic.com/docs/doclist/images/mediatype/icon_1_audio_x32.png" style="width: 20px; height: 20px; display: block; border: none;" alt="Audio" />
                        </td>
                        <td valign="middle" style="padding-left: 8px; font-weight: normal; max-width: 380px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                          ${att.name}
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
    for (const email of emails) {
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
      const logData = await logRes.json();
      const logId = logData[0].id;

      // Tracking pixel (hidden 1x1 image at the end of the email)
      const trackingPixelUrl = `${origin}/api/track?log_id=${logId}`;
      
      const htmlMessage = `
        <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.6;">
          ${message.replace(/\n/g, '<br/>')}
          ${attachmentsHtml}
          <br/><br/>
          <img src="${trackingPixelUrl}" width="1" height="1" alt="" style="display:none; border:none; outline:none;" />
        </div>
      `;

      const rawMessage = createMimeMessage(email, subject, htmlMessage);

      await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: rawMessage })
      });
    }

    return NextResponse.json({ success: true, campaignId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
