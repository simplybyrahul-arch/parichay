import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@shotcutcrew.com';
const EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO || 'rahul@shotcutcrew.com';
const EMAIL_SUPPORT = process.env.EMAIL_SUPPORT || 'support@shotcutcrew.com';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.shotcutcrew.com';

const resend = new Resend(RESEND_API_KEY);

function getBaseTemplate(title: string, preheader: string, content: string) {
    const logoUrl = `${APP_URL}/logo.jpg`;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #1c1917;
      background-color: #f5f5f4;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      margin-top: 40px;
      margin-bottom: 40px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    .header {
      background-color: #ffffff;
      padding: 24px 24px;
      text-align: center;
      border-bottom: 4px solid #f97316; /* ShotcutCrew Orange accent */
    }
    .header img {
      max-height: 40px;
      width: auto;
    }
    .content {
      padding: 32px 24px;
    }
    .content p {
      margin-bottom: 16px;
      font-size: 16px;
    }
    .footer {
      background-color: #fafaf9;
      padding: 24px;
      text-align: center;
      border-top: 1px solid #e7e5e4;
    }
    .footer p {
      margin: 0;
      font-size: 14px;
      color: #78716c;
    }
    .footer a {
      color: #7c3aed;
      text-decoration: none;
    }
    .btn {
      display: inline-block;
      background-color: #7c3aed; /* ShotcutCrew Violet */
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: bold;
      margin-top: 16px;
      margin-bottom: 16px;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 24px 0;
    }
    .data-table th, .data-table td {
      padding: 12px;
      border-bottom: 1px solid #e7e5e4;
      text-align: left;
    }
    .data-table th {
      color: #78716c;
      font-weight: 600;
      font-size: 14px;
      width: 40%;
    }
    @media (max-width: 600px) {
      .container {
        margin: 0;
        border-radius: 0;
      }
    }
  </style>
</head>
<body>
  <div style="display: none; max-height: 0px; overflow: hidden;">${preheader}</div>
  <div class="container">
    <div class="header">
      <img src="${logoUrl}" alt="ShotcutCrew Logo" />
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>Questions? Contact us at <a href="mailto:${EMAIL_SUPPORT}">${EMAIL_SUPPORT}</a></p>
      <p>&copy; ${new Date().getFullYear()} ShotcutCrew. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

export type EmailOptions = {
    to: string | string[];
    subject: string;
    title: string;
    preheader: string;
    content: string;
};

/**
 * Core send email function.
 * Wraps Resend SDK and adds our base HTML template.
 * NEVER throws an error, fails silently and logs to ensure business workflows aren't blocked.
 */
export async function sendEmail({ to, subject, title, preheader, content }: EmailOptions) {
    if (!RESEND_API_KEY) {
        console.warn('RESEND_API_KEY is missing. Skipping email send.', { to, subject });
        return { success: false, error: 'RESEND_API_KEY is not configured.' };
    }

    try {
        const html = getBaseTemplate(title, preheader, content);

        const data = await resend.emails.send({
            from: `ShotcutCrew <${EMAIL_FROM}>`,
            to,
            replyTo: EMAIL_REPLY_TO,
            subject,
            html,
        });

        if (data.error) {
            console.error('[Resend Error]', data.error);
            return { success: false, error: data.error.message };
        }

        console.log(`[Email Sent] ${subject} to ${to} (ID: ${data.data?.id})`);
        return { success: true, id: data.data?.id };
    } catch (error) {
        console.error('[Email Exception]', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
}
