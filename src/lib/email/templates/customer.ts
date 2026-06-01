import { sendEmail } from '../resend';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.shotcutcrew.com';

export async function sendBookingCreatedEmail(
    to: string,
    clientName: string,
    eventName: string,
    bookingId: string
) {
    const content = `
        <h2>Booking Request Received</h2>
        <p>Hi ${clientName},</p>
        <p>We've received your booking request for <strong>${eventName}</strong>. Your request has been sent to the creator/vendor.</p>
        <p>We will notify you as soon as they respond.</p>
        <a href="${APP_URL}/dashboard" class="btn">View Booking Status</a>
    `;

    return sendEmail({
        to,
        subject: `Booking Request Received: ${eventName} - ShotcutCrew`,
        title: 'Booking Request Received',
        preheader: `Your booking request for ${eventName} has been submitted successfully.`,
        content,
    });
}

export async function sendBookingConfirmedEmail(
    to: string,
    clientName: string,
    eventName: string,
    providerName: string,
    shootDate: string
) {
    const content = `
        <h2>Booking Confirmed!</h2>
        <p>Hi ${clientName},</p>
        <p>Great news! <strong>${providerName}</strong> has accepted your booking request for <strong>${eventName}</strong> on ${shootDate}.</p>
        <p>Please log in to your dashboard to view the next steps, including any pending payments or escrow requirements.</p>
        <a href="${APP_URL}/dashboard" class="btn">Go to Dashboard</a>
    `;

    return sendEmail({
        to,
        subject: `Booking Confirmed: ${eventName} - ShotcutCrew`,
        title: 'Booking Confirmed',
        preheader: `${providerName} has accepted your booking for ${eventName}.`,
        content,
    });
}

export async function sendPaymentReceivedEmail(
    to: string,
    clientName: string,
    eventName: string,
    bookingId: string,
    amount: string
) {
    const content = `
        <h2>Payment Successfully Escrowed</h2>
        <p>Hi ${clientName},</p>
        <p>We have successfully received your payment. Your funds are securely held in escrow and will only be released to the provider upon successful completion of the project.</p>
        
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
                <th>Amount Escrowed</th>
                <td><strong style="color: #16a34a;">${amount}</strong></td>
            </tr>
        </table>
        
        <p>Thank you for trusting ShotcutCrew!</p>
    `;

    return sendEmail({
        to,
        subject: `Payment Receipt: ${eventName} - ShotcutCrew`,
        title: 'Payment Received',
        preheader: `We've received your payment of ${amount} for ${eventName}.`,
        content,
    });
}

export async function sendProjectCompletedEmail(
    to: string,
    clientName: string,
    eventName: string,
    providerName: string
) {
    const content = `
        <h2>Project Completed</h2>
        <p>Hi ${clientName},</p>
        <p>Your project <strong>${eventName}</strong> with <strong>${providerName}</strong> has been marked as completed.</p>
        <p>If you have any issues or disputes, please raise them in your dashboard within the next 24 hours before the final payout is released from escrow.</p>
        <a href="${APP_URL}/dashboard" class="btn">View Project Details</a>
    `;

    return sendEmail({
        to,
        subject: `Project Completed: ${eventName} - ShotcutCrew`,
        title: 'Project Completed',
        preheader: `Your project ${eventName} has been marked as completed.`,
        content,
    });
}

export async function sendQuoteReceivedEmail(to: string, clientName: string, eventName: string, amount: number) {
    return sendEmail({
        to,
        subject: `New Interest/Quote Received: ${eventName}`,
        title: 'New Creator Interest',
        preheader: `A creator is interested in ${eventName}.`,
        content: `<h2>Creator Interested</h2><p>Hi ${clientName},</p><p>A creator has shown interest in your booking for <strong>${eventName}</strong>.</p><p>Please log in to review their profile and confirm the booking.</p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="btn">View Dashboard</a>`
    });
}
