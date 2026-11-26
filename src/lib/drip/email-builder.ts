export interface DripAttachment {
  name: string;
  link: string;
}

export function escapeHtml(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function safeLink(link: string): string {
  return typeof link === 'string' && /^https?:\/\//i.test(link) ? escapeHtml(link) : '#';
}

export function buildAttachmentsHtml(attachments: DripAttachment[]): string {
  if (!attachments || attachments.length === 0) return '';
  return `
    <br/><br/>
    <div style="margin-top: 10px;">
      ${attachments
        .map(
          (att) => `
        <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 12px; background-color: #f1f3f4; border: 1px solid #dadce0; border-radius: 4px; max-width: 450px; width: 100%;">
          <tr>
            <td style="padding: 10px 14px;">
              <a href="${safeLink(att.link)}" target="_blank" style="text-decoration: none; color: #202124; font-family: Roboto, Arial, sans-serif; font-size: 14px; display: block; line-height: 20px;">
                <table cellpadding="0" cellspacing="0" border="0" width="100%">
                  <tr>
                    <td width="24" valign="middle">
                      <img src="https://ssl.gstatic.com/docs/doclist/images/mediatype/icon_1_audio_x32.png" style="width: 20px; height: 20px; display: block; border: none;" alt="Audio" />
                    </td>
                    <td valign="middle" style="padding-left: 8px; max-width: 380px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      ${escapeHtml(att.name)}
                    </td>
                  </tr>
                </table>
              </a>
            </td>
          </tr>
        </table>`
        )
        .join('')}
    </div>`;
}

/** `message` must already be spun (spintax resolved) – it is escaped here. */
export function buildDripHtml(opts: {
  message: string;
  attachments: DripAttachment[];
  trackingUrl?: string | null;
}): string {
  const pixel = opts.trackingUrl
    ? `<br/><br/><img src="${escapeHtml(opts.trackingUrl)}" width="1" height="1" alt="" style="display:none; border:none; outline:none;" />`
    : '';
  return `
    <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.6;">
      ${escapeHtml(opts.message).replace(/\r?\n/g, '<br/>')}
      ${buildAttachmentsHtml(opts.attachments)}
      ${pixel}
    </div>`;
}
