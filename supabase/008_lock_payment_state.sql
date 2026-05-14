-- Payment state is advanced only by trusted server code after Razorpay verification.
drop policy if exists "Clients can update their own payments." on public.payments;
