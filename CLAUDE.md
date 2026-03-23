# Quickstart Project

## Report fetching pattern

POST returns full report data directly — store it and return. Only GET if stored response is missing (fallback).

1. **POST** to create the report (returns full report data including `report_id`)
2. Store the response in the DB — this is the primary source of report data
3. **GET** to fetch the report by `report_id` only if the stored response is missing (fallback)

Report endpoints by product type:
- **Income** (VOIE): `POST /v1/users/{user_id}/reports/` with `{ is_voe: false }` → `GET /v1/users/{user_id}/reports/{report_id}/`
- **Employment** (VOE): `POST /v1/users/{user_id}/reports/` with `{ is_voe: true }` → `GET /v1/users/{user_id}/reports/{report_id}/`
- **Assets**: `POST /v1/users/{user_id}/assets/reports/` → `GET /v1/users/{user_id}/assets/reports/{report_id}/`
- **Income Insights**: `POST /v1/users/{user_id}/income_insights/reports/` with `{ days_requested: 60, consumer_report_permissible_purpose: 'EXTENSION_OF_CREDIT' }` → `GET /v1/users/{user_id}/income_insights/reports/{report_id}/`

Rules:
- Do NOT fetch order data (`GET /v1/orders/{id}`) in the report endpoint — order data is irrelevant for reports
- Create the report ONCE, store the `report_id` in the DB, then only GET on subsequent requests
- The `report_id` field in the POST response is the key for the GET
- Each product type uses its own report endpoint — don't call all of them, only the relevant one
- The report endpoint should know the product type from `order.product_type` stored in DB (not from re-fetching the order from Truv)

## Database: reports table
Separate `reports` table with: `order_id`, `report_type`, `truv_report_id`, `status`, `response`.
- `report_type` values: `voie`, `voe`, `assets`, `income_insights`
- POST creates the row with `truv_report_id` and status `created`
- GET fetches the report and updates status to `ready` with full response
- On subsequent requests, skips POST (report_id already stored), only does GET
- `product_type` on the orders table determines which report types to create

## Truv sandbox

- Valid sandbox employers: Home Depot (use `goodlogin` / `goodpassword`)
- Sandbox bank: Chase Bank (auto-connected for assets)
- `external_user_id` links multiple orders to the same Truv user
