# ShotcutCrew Financial Lifecycle

```mermaid
flowchart TD
    A["Client creates booking"] --> B["Create booking_financials row<br/>status: pending<br/>provider_id: empty if not selected"]
    B --> C{"Booking type"}
    C -->|"Quick Booking"| D["Client selects creator<br/>status: quote_selected"]
    C -->|"Custom Project"| E["Creator quote/interest selected<br/>status: quote_selected"]
    C -->|"Equipment Rental"| F["Vendor submits/selected quote<br/>status: quote_selected"]
    D --> G["Payment received and verified server-side"]
    E --> G
    F --> G
    G --> H["booking_financials<br/>status: payment_received<br/>escrow_status: escrow_held<br/>escrow_amount: gross_amount"]
    H --> I{"Delivery outcome"}
    I -->|"Approved"| J["Mark payout ready<br/>status: payout_ready<br/>wallet.pending_balance += provider_amount"]
    I -->|"Dispute/refund"| K["Refund issued<br/>status: refunded<br/>escrow_amount: 0<br/>refund_amount recorded"]
    J --> L["Admin releases payout<br/>payout_transactions row created"]
    L --> M["booking_financials<br/>status: payout_released<br/>payout_status: completed<br/>escrow_amount: 0"]
    M --> N["Wallet totals updated<br/>pending reduced<br/>lifetime/withdrawn increased"]
```

## Finance Record Shape

Every booking finance row carries the canonical finance fields plus launch-facing compatibility fields:

- `booking_id`
- `customer_id`
- `provider_id`
- `booking_type`
- `gross_amount`
- `platform_commission`
- `provider_amount`
- `escrow_amount`
- `status`

The admin finance dashboard reads from `booking_financials` and `payout_transactions`; it does not calculate totals from booking UI state.
