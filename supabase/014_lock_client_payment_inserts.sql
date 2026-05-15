-- Payment rows should be created only by trusted server routes/actions.
-- Clients can still view their own payments through the existing select policy.

drop policy if exists "Clients can insert payments." on public.payments;
