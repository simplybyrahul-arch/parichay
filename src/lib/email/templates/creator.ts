import { sendEmail } from '../resend';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.shotcutcrew.com';

export async function sendBookingInvitationEmail(
    to: string,
    creatorName: string,
    clientName: string,
    eventName: string,
    shootDate: string
) {
    const content = `
        <h2>New Booking Request!</h2>
        <p>Hi ${creatorName},</p>
        <p>You have received a new booking request on ShotcutCrew.</p>
        
        <table class="data-table">
            <tr>
                <th>Client</th>
                <td>${clientName}</td>
            </tr>
            <tr>
                <th>Project</th>
                <td>${eventName}</td>
            </tr>
            <tr>
                <th>Date</th>
                <td>${shootDate}</td>
            </tr>
        </table>
        
        <p>Please log in to your dashboard to review the details and accept or decline the request.</p>
        <a href="${APP_URL}/creator-dashboard" class="btn">View Request</a>
    `;

    return sendEmail({
        to,
        subject: `New Booking Request from ${clientName} - ShotcutCrew`,
        title: 'New Booking Request',
        preheader: `You have a new request for ${eventName} on ${shootDate}.`,
        content,
    });
}

export async function sendBookingAcceptedEmail(
    to: string,
    creatorName: string,
    eventName: string
) {
    const content = `
        <h2>Booking Accepted</h2>
        <p>Hi ${creatorName},</p>
        <p>You have successfully accepted the booking for <strong>${eventName}</strong>.</p>
        <p>The client will now be prompted to securely escrow the payment. We will notify you once the funds are secured.</p>
        <a href="${APP_URL}/creator-dashboard" class="btn">Go to Dashboard</a>
    `;

    return sendEmail({
        to,
        subject: `Booking Accepted: ${eventName} - ShotcutCrew`,
        title: 'Booking Accepted',
        preheader: `You've accepted the booking for ${eventName}. Awaiting client payment.`,
        content,
    });
}

export async function sendMilestoneUpdateEmail(
    to: string,
    creatorName: string,
    eventName: string,
    milestoneName: string
) {
    const content = `
        <h2>Milestone Updated</h2>
        <p>Hi ${creatorName},</p>
        <p>There has been an update to the milestone <strong>${milestoneName}</strong> on your project <strong>${eventName}</strong>.</p>
        <p>Please log in to your dashboard to view the latest status.</p>
        <a href="${APP_URL}/creator-dashboard" class="btn">View Project</a>
    `;

    return sendEmail({
        to,
        subject: `Milestone Update: ${eventName} - ShotcutCrew`,
        title: 'Milestone Updated',
        preheader: `Update on milestone: ${milestoneName} for ${eventName}.`,
        content,
    });
}

export async function sendPayoutReleasedEmail(
    to: string,
    creatorName: string,
    amount: string,
    bookingId: string,
    utrNumber?: string
) {
    const content = `
        <h2>Payout Released!</h2>
        <p>Hi ${creatorName},</p>
        <p>Great work! A payout for your recent booking has been released to your registered bank account.</p>
        
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

export async function sendBookingCancelledEmail(to: string, userName: string, eventName: string) {
    return sendEmail({
        to,
        subject: `Booking Cancelled: ${eventName} - ShotcutCrew`,
        title: 'Booking Cancelled',
        preheader: `The booking ${eventName} has been cancelled.`,
        content: `<h2>Booking Cancelled</h2><p>Hi ${userName},</p><p>The client has cancelled the booking for <strong>${eventName}</strong>. No further action is required.</p>`
    });
}
