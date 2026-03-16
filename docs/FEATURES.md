# Features

## Authentication and Roles

- Email/password authentication via Supabase.
- Account type stored in auth metadata (`client`, `creator`).
- Creator subtype stored as `creator_type` (`studio_owner`, `freelancer`).
- Post-login route split:
  - Client -> `/dashboard`
  - Creator -> `/creator-dashboard`

## Booking

### Quick Booking

4-step guided workflow:
1. Event selection
2. Crew counts
3. Shoot date
4. Budget

Includes:
- Slider-based budget input
- Optional fixed budget override

### Build Your Crew

- Select role cards
- Increment/decrement quantity
- Set shoot days
- Auto cost breakdown (subtotal + platform fee)

### Equipment Booking

- Dedicated equipment catalog
- Quantity controls
- Rental days
- Cost breakdown and booking request submission

### Script Analysis

- Text input or `.txt` file upload
- Local rule-based analysis endpoint
- Outputs recommended roles/equipment/requirements/duration

## Dashboards

### Client Dashboard

- Project list and status
- Escrow funding action
- Project detail route (`/dashboard/[id]`)

### Creator Dashboard

- Booking requests
- Profile editor
- Mandatory validation by creator subtype

## Branding and UI

- Brand standardized to ShotcutCrew
- Sunrise/sunset themed visuals
- CTA and page copy updated to current brand language
