import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@shotcutcrew.com';
const EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO || 'rahul@shotcutcrew.com';
const EMAIL_SUPPORT = process.env.EMAIL_SUPPORT || 'support@shotcutcrew.com';

const resend = new Resend(RESEND_API_KEY);

function getBaseTemplate(title: string, preheader: string, content: string) {
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
      background-color: #f97316; /* ShotcutCrew Orange */
      padding: 32px 24px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
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
      <h1>ShotcutCrew</h1>
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

type EmailOptions = {
    to: string | string[];
    subject: string;
    title: string;
    preheader: string;
    content: string;
};

/**
 * Core send email function.
 * Wraps Resend SDK and adds our base HTML template.
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
            console.error('Resend API error:', data.error);
            return { success: false, error: data.error.message };
        }

        console.log(`Email sent successfully to ${to}. ID: ${data.data?.id}`);
        return { success: true, id: data.data?.id };
    } catch (error) {
        console.error('Failed to send email:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' };
    }
}

/**
 * Sends an email notification to a creator or vendor about a new booking request.
 */
export async function sendBookingEmail(
    to: string,
    recipientName: string,
    clientName: string,
    eventName: string,
    shootDate: string,
    dashboardUrl: string
) {
    const content = `
        <h2>New Booking Request!</h2>
        <p>Hi ${recipientName},</p>
        <p>You have received a new booking request on ShotcutCrew.</p>
        
        <table class="data-table">
            <tr>
                <th>Client</th>
                <td>${clientName}</td>
            </tr>
            <tr>
                <th>Event / Requirement</th>
                <td>${eventName}</td>
            </tr>
            <tr>
                <th>Date</th>
                <td>${shootDate}</td>
            </tr>
        </table>
        
        <p>Please review and respond to this request as soon as possible.</p>
        <a href="${dashboardUrl}" class="btn">View Request in Dashboard</a>
    `;

    return sendEmail({
        to,
        subject: `New Booking Request from ${clientName} - ShotcutCrew`,
        title: 'New Booking Request',
        preheader: `You have a new request for ${eventName} on ${shootDate}.`,
        content,
    });
}

/**
 * Sends an invite/welcome email to a new creator.
 */
export async function sendCreatorInviteEmail(to: string, creatorName: string, dashboardUrl: string) {
    const content = `
        <h2>Welcome to ShotcutCrew!</h2>
        <p>Hi ${creatorName},</p>
        <p>We are thrilled to welcome you to the ShotcutCrew creator network! As a creator on our platform, you'll get access to verified client requests, seamless booking flows, and secure payments.</p>
        <p>Your next step is to log in, complete your profile, and make sure your portfolio shines.</p>
        <a href="${dashboardUrl}" class="btn">Go to Creator Dashboard</a>
    `;

    return sendEmail({
        to,
        subject: 'Welcome to ShotcutCrew! Finish setting up your profile.',
        title: 'Welcome to the Crew',
        preheader: 'Welcome to ShotcutCrew! Complete your profile to start receiving bookings.',
        content,
    });
}

/**
 * Sends an invite/welcome email to a new equipment vendor.
 */
export async function sendVendorInviteEmail(to: string, vendorName: string, dashboardUrl: string) {
    const content = `
        <h2>Welcome to ShotcutCrew!</h2>
        <p>Hi ${vendorName},</p>
        <p>We are excited to have you join ShotcutCrew as an Equipment Vendor. Our platform helps rental houses and independent vendors connect directly with verified production crews and clients.</p>
        <p>Please log in to add your inventory, define your service areas, and set up your delivery options.</p>
        <a href="${dashboardUrl}" class="btn">Go to Vendor Dashboard</a>
    `;

    return sendEmail({
        to,
        subject: 'Welcome to ShotcutCrew! Start adding your inventory.',
        title: 'Welcome Vendor',
        preheader: 'Welcome to ShotcutCrew! Add your gear to start receiving rental requests.',
        content,
    });
}

/**
 * Sends a confirmation email to the client when a payment is successfully escrowed/confirmed.
 */
export async function sendPaymentEmail(
    to: string,
    clientName: string,
    bookingId: string,
    amount: string,
    eventName: string
) {
    const content = `
        <h2>Payment Received</h2>
        <p>Hi ${clientName},</p>
        <p>We have successfully received your payment for the upcoming booking.</p>
        
        <table class="data-table">
            <tr>
                <th>Booking Ref</th>
                <td>${bookingId}</td>
            </tr>
            <tr>
                <th>Project</th>
                <td>${eventName}</td>
            </tr>
            <tr>
                <th>Amount Paid</th>
                <td>${amount}</td>
            </tr>
        </table>
        
        <p>Your funds are securely held and will be released to the provider upon successful completion of the project.</p>
    `;

    return sendEmail({
        to,
        subject: `Payment Confirmation: ${eventName} - ShotcutCrew`,
        title: 'Payment Received',
        preheader: `We've received your payment of ${amount} for ${eventName}.`,
        content,
    });
}

/**
 * Sends an email to a creator/vendor when their payout has been released.
 */
export async function sendPayoutEmail(
    to: string,
    providerName: string,
    amount: string,
    bookingId: string,
    utrNumber?: string
) {
    const content = `
        <h2>Payout Released!</h2>
        <p>Hi ${providerName},</p>
        <p>Good news! A payout for your recent booking has been released to your registered bank account.</p>
        
        <table class="data-table">
            <tr>
                <th>Booking Ref</th>
                <td>${bookingId}</td>
            </tr>
            <tr>
                <th>Payout Amount</th>
                <td><strong style="color: #16a34a;">${amount}</strong></td>
            </tr>
            ${utrNumber ? `<tr><th>UTR Number</th><td><code>${utrNumber}</code></td></tr>` : ''}
        </table>
        
        <p>It may take up to 24-48 business hours for the funds to reflect in your account, depending on your bank.</p>
        <p>Thank you for your fantastic work on ShotcutCrew!</p>
    `;

    return sendEmail({
        to,
        subject: `Payout Released: ${amount} - ShotcutCrew`,
        title: 'Payout Processed',
        preheader: `Your payout of ${amount} has been released successfully.`,
        content,
    });
}
