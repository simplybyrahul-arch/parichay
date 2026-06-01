import { sendEmail } from '../resend';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.shotcutcrew.com';
const ADMIN_EMAIL = process.env.EMAIL_SUPPORT || 'support@shotcutcrew.com'; // Using support as default admin inbox

export async function sendAdminNewBookingEmail(
    bookingId: string,
    clientName: string,
    projectName: string
) {
    const content = `
        <h2>New Booking Initialized</h2>
        <p>A new booking request has been created on the platform.</p>
        
        <table class="data-table">
            <tr>
                <th>Booking Ref</th>
                <td>${bookingId}</td>
            </tr>
            <tr>
                <th>Client</th>
                <td>${clientName}</td>
            </tr>
            <tr>
                <th>Project</th>
                <td>${projectName}</td>
            </tr>
        </table>
        
        <a href="${APP_URL}/admin/finance" class="btn">View in Admin Panel</a>
    `;

    return sendEmail({
        to: ADMIN_EMAIL,
        subject: `[ADMIN] New Booking: ${projectName}`,
        title: 'Admin: New Booking',
        preheader: `New booking initialized for ${projectName}.`,
        content,
    });
}

export async function sendAdminNewCreatorEmail(
    creatorName: string,
    creatorId: string
) {
    const content = `
        <h2>New Creator Signup</h2>
        <p>A new creator has joined the platform and is pending verification.</p>
        
        <table class="data-table">
            <tr>
                <th>Creator Name</th>
                <td>${creatorName}</td>
            </tr>
            <tr>
                <th>User ID</th>
                <td><code>${creatorId}</code></td>
            </tr>
        </table>
        
        <a href="${APP_URL}/admin/users" class="btn">Review Creator</a>
    `;

    return sendEmail({
        to: ADMIN_EMAIL,
        subject: `[ADMIN] New Creator Signup: ${creatorName}`,
        title: 'Admin: New Creator',
        preheader: `${creatorName} just signed up as a Creator.`,
        content,
    });
}

export async function sendAdminNewVendorEmail(
    vendorName: string,
    vendorId: string
) {
    const content = `
        <h2>New Equipment Vendor Signup</h2>
        <p>A new equipment vendor has joined the platform and is pending verification.</p>
        
        <table class="data-table">
            <tr>
                <th>Business Name</th>
                <td>${vendorName}</td>
            </tr>
            <tr>
                <th>User ID</th>
                <td><code>${vendorId}</code></td>
            </tr>
        </table>
        
        <a href="${APP_URL}/admin/users" class="btn">Review Vendor</a>
    `;

    return sendEmail({
        to: ADMIN_EMAIL,
        subject: `[ADMIN] New Vendor Signup: ${vendorName}`,
        title: 'Admin: New Vendor',
        preheader: `${vendorName} just signed up as an Equipment Vendor.`,
        content,
    });
}

export async function sendAdminDisputeCreatedEmail(
    bookingId: string,
    raisedBy: string,
    reason: string
) {
    const content = `
        <h2>🚨 New Dispute Raised</h2>
        <p>A dispute has been raised requiring immediate admin intervention.</p>
        
        <table class="data-table">
            <tr>
                <th>Booking Ref</th>
                <td>${bookingId}</td>
            </tr>
            <tr>
                <th>Raised By</th>
                <td>${raisedBy}</td>
            </tr>
            <tr>
                <th>Reason</th>
                <td>${reason}</td>
            </tr>
        </table>
        
        <p>Please review the escrow status and contact the parties involved.</p>
        <a href="${APP_URL}/admin/disputes" class="btn">Manage Dispute</a>
    `;

    return sendEmail({
        to: ADMIN_EMAIL,
        subject: `[ADMIN URGENT] Dispute Raised for Booking ${bookingId}`,
        title: 'Admin: Dispute Raised',
        preheader: `Dispute raised on booking ${bookingId} by ${raisedBy}.`,
        content,
    });
}

export async function sendAdminPaymentAlertEmail(
    bookingId: string,
    amount: string,
    status: string
) {
    const content = `
        <h2>💰 Payment / Escrow Alert</h2>
        <p>There has been an update to the financial status of a booking.</p>
        
        <table class="data-table">
            <tr>
                <th>Booking Ref</th>
                <td>${bookingId}</td>
            </tr>
            <tr>
                <th>Amount</th>
                <td><strong style="color: #16a34a;">${amount}</strong></td>
            </tr>
            <tr>
                <th>Status</th>
                <td><span style="background: #fee2e2; color: #991b1b; padding: 4px 8px; border-radius: 4px; font-weight: bold;">${status}</span></td>
            </tr>
        </table>
        
        <a href="${APP_URL}/admin/finance" class="btn">View Finance Dashboard</a>
    `;

    return sendEmail({
        to: ADMIN_EMAIL,
        subject: `[ADMIN] Payment Alert: ${status} for ${bookingId}`,
        title: 'Admin: Payment Alert',
        preheader: `Payment status changed to ${status} for ${bookingId}.`,
        content,
    });
}
