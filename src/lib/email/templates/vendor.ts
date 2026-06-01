import { sendEmail } from '../resend';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.shotcutcrew.com';

export async function sendRentalRequestEmail(
    to: string,
    vendorName: string,
    clientName: string,
    projectName: string,
    eventDate: string
) {
    const content = `
        <h2>New Equipment Rental Request!</h2>
        <p>Hi ${vendorName},</p>
        <p>You have received a new equipment rental request on ShotcutCrew.</p>
        
        <table class="data-table">
            <tr>
                <th>Client</th>
                <td>${clientName}</td>
            </tr>
            <tr>
                <th>Project</th>
                <td>${projectName}</td>
            </tr>
            <tr>
                <th>Dates</th>
                <td>${eventDate}</td>
            </tr>
        </table>
        
        <p>Please log in to your dashboard to review the requested gear list and submit a quote or confirm availability.</p>
        <a href="${APP_URL}/vendor-dashboard" class="btn">View Rental Request</a>
    `;

    return sendEmail({
        to,
        subject: `New Rental Request from ${clientName} - ShotcutCrew`,
        title: 'New Rental Request',
        preheader: `You have a new equipment rental request for ${projectName}.`,
        content,
    });
}

export async function sendRentalApprovedEmail(
    to: string,
    vendorName: string,
    projectName: string
) {
    const content = `
        <h2>Rental Approved & Confirmed</h2>
        <p>Hi ${vendorName},</p>
        <p>The client has accepted your quote and confirmed the rental for <strong>${projectName}</strong>.</p>
        <p>Please ensure the equipment is prepped and ready for dispatch/pickup as per your logistics settings.</p>
        <a href="${APP_URL}/vendor-dashboard" class="btn">Go to Dashboard</a>
    `;

    return sendEmail({
        to,
        subject: `Rental Confirmed: ${projectName} - ShotcutCrew`,
        title: 'Rental Confirmed',
        preheader: `Your rental quote for ${projectName} has been approved.`,
        content,
    });
}

export async function sendRentalCompletedEmail(
    to: string,
    vendorName: string,
    projectName: string
) {
    const content = `
        <h2>Rental Completed</h2>
        <p>Hi ${vendorName},</p>
        <p>The rental period for <strong>${projectName}</strong> has officially ended.</p>
        <p>Please confirm the safe return of all equipment in your dashboard. Any disputes regarding damages or late returns must be raised within 24 hours.</p>
        <a href="${APP_URL}/vendor-dashboard" class="btn">Manage Return</a>
    `;

    return sendEmail({
        to,
        subject: `Rental Completed: ${projectName} - ShotcutCrew`,
        title: 'Rental Completed',
        preheader: `The rental for ${projectName} is complete. Please confirm gear return.`,
        content,
    });
}
