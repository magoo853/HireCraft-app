# HireCraft — military verification vendor signup steps

Prepared 2026-10-11. James approved SheerID + ID.me as the verification layer for the military 6-month free trial (both offered as primary buttons; attestation + .mil email as dev fallback). He said "yeah I will need all of that."

## SheerID

1. Create a **sandbox account**: https://services-sandbox.sheerid.com/home/signup.html
2. Log in to the Control Center → **Settings > API Access Tokens** → "Issue New Access Token" → this is your free sandbox key. Use one key for testing, one for production later (tokens are free to create).
3. Create a **program (campaign)** for the **military/veteran** segment — walk through the Template Guide in the Control Center. Enable **Test Mode** on the program to simulate verification outcomes without hitting live data sources.
4. Integration: REST API at `https://services.sheerid.com/rest/v2/` with `Authorization: Bearer <token>`. Typical flow: `POST /verification` with your `programId` → handle the `currentStep` response (`success` / `docUpload` / `pending`) → poll `statusUrl` or use the webhook.
5. When ready for real verifications, SheerID provisions a production account — production pricing is contract-based (not published); confirm per-verification cost before launch so it doesn't eat the $25/yr margin.

Docs: https://developer.sheerid.com/api-quickstart · https://github.com/sheerid/getting-started

## ID.me

1. Register a developer account: https://api.id.me/en/registration/new
2. Sign in to ID.me Developer Resources for API & SDK → **View My Applications** → **Create new** → enter Name, Display Name, and the app's **Redirect URI** → **Continue** → copy the **Client ID** and **Client Secret**.
3. Integration is OAuth2: send users to ID.me, they verify their military status once (many already have an ID.me wallet from VA/military use), ID.me returns a token asserting the military attribute back to HireCraft — your app grants the trial.
4. Pricing is partnership-based (reported ~up to $1 per verification response in their partner docs — confirm current rates in the registration flow).

Docs: https://api.id.me/en/registration/new · OAuth Integration Guide (linked from the developer portal after registration)

## Honest flag

Both vendors are paid enterprise services with contract/partner pricing — neither publishes a flat consumer rate. With a $25/year paid tier and a free 6-month military trial, per-verification cost matters. Before wiring real verification in: (a) get written per-verification pricing from both, (b) decide the abuse threshold (how many free-trial attempts per device/IP before manual review), (c) keep the attestation + .mil-email fallback as the zero-cost option for users who bounce off the vendor flow. The crew's code should keep the verification layer behind an interface so the vendor can be swapped without touching the trial logic.
