const fs = require('fs');

let c1 = fs.readFileSync('src/lib/email/templates/customer.ts', 'utf8');
c1 += `

export async function sendQuoteReceivedEmail(to: string, clientName: string, eventName: string, amount: number) {
    return sendEmail({
        to,
        subject: \`New Interest/Quote Received: \${eventName}\`,
        title: 'New Creator Interest',
        preheader: \`A creator is interested in \${eventName}.\`,
        content: \`<h2>Creator Interested</h2><p>Hi \${clientName},</p><p>A creator has shown interest in your booking for <strong>\${eventName}</strong>.</p><p>Please log in to review their profile and confirm the booking.</p><a href="\${process.env.NEXT_PUBLIC_APP_URL}/dashboard" class="btn">View Dashboard</a>\`
    });
}
`;
fs.writeFileSync('src/lib/email/templates/customer.ts', c1, 'utf8');

let c2 = fs.readFileSync('src/lib/email/templates/creator.ts', 'utf8');
c2 += `

export async function sendBookingCancelledEmail(to: string, userName: string, eventName: string) {
    return sendEmail({
        to,
        subject: \`Booking Cancelled: \${eventName} - ShotcutCrew\`,
        title: 'Booking Cancelled',
        preheader: \`The booking \${eventName} has been cancelled.\`,
        content: \`<h2>Booking Cancelled</h2><p>Hi \${userName},</p><p>The client has cancelled the booking for <strong>\${eventName}</strong>. No further action is required.</p>\`
    });
}
`;
fs.writeFileSync('src/lib/email/templates/creator.ts', c2, 'utf8');
