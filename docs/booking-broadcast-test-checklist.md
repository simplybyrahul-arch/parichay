# Booking Broadcast Manual Test Checklist

Use local development data only. Do not run these checks against production Supabase unless you intentionally migrate and seed a staging environment.

## Core Booking Flow

- [ ] A. Client creates a booking from `/book`.
- [ ] B. Verified creators receive `project_invites` rows and in-app notifications.
- [ ] C. Unverified creator receives no invite or notification.
- [ ] D. Two creators can mark `Interested` for the same booking.
- [ ] E. Client can shortlist one interested creator.
- [ ] F. Client can select one interested or shortlisted creator.
- [ ] G. Project becomes `pending_payment` and `payment_status = pending_payment`.
- [ ] H. Client pays advance through Razorpay test mode.
- [ ] I. Project becomes `confirmed` and `payment_status = escrowed` after server verification.

## Operations

- [ ] J. Admin assigns a Parichay coordinator to a confirmed booking.
- [ ] K. Expiry cron expires an old unselected booking and marks active invites inactive.
- [ ] L. WhatsApp cron skips sending when `WHATSAPP_ENABLED=false`.
- [ ] M. WhatsApp token marks an invite viewed when token, creator and project match.
- [ ] N. Client raises a dispute after project delivery within 48 hours.
- [ ] O. Admin resolves the dispute with a resolution note.
- [ ] P. Admin manual invite creates an invite and notification without selecting the creator.
- [ ] Q. Admin analytics loads funnel, invite, payment, WhatsApp and alert metrics.

## Safety Checks

- [ ] Creator cannot view or respond to another creator's opportunity.
- [ ] Client cannot select a creator for another client's project.
- [ ] Admin routes redirect non-admin users.
- [ ] WhatsApp does not send during 10 PM to 8 AM IST quiet hours.
- [ ] Expired, cancelled, completed, disputed, pending payment, confirmed and in-progress projects do not receive WhatsApp invites.
- [ ] Payment confirmation happens only through `/api/payments/verify-advance`.
