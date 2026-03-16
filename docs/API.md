# API Documentation

## `POST /api/ai/analyze`

Local script analysis endpoint. No third-party AI key required.

### Request

```json
{
  "scriptText": "your script or production brief"
}
```

### Validation

- `scriptText` must be present and non-empty.

### Response

```json
{
  "roles": ["1x Director of Photography", "..."],
  "equipment": ["Camera Body + Standard Lens Kit", "..."],
  "duration": "2-3 shoot days + 4-6 days post-production",
  "requirements": ["Location scouting and permissions checklist", "..."]
}
```

### Behavior

- Uses keyword/rule matching on script text.
- Adds baseline defaults plus matched role/equipment/requirements.
- Estimates duration from script word count.

## `POST /api/razorpay/order`

Creates Razorpay order for project escrow funding.

## `POST /api/razorpay/verify`

Verifies Razorpay payment signature and updates project/payment state.
