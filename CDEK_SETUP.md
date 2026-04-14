# CDEK Setup (Quick Start)

## 1) What you need from CDEK

From your CDEK account/API section:

- `CDEK_CLIENT_ID`
- `CDEK_CLIENT_SECRET`
- Sender location code: `CDEK_FROM_LOCATION_CODE` (для Бишкека: `5444`)
- Working tariff code for your contract: `CDEK_TARIFF_CODE`

## 2) Create local env file

1. Copy `.env.example` to `.env`.
2. Fill all `CDEK_*` values with your real data.

Minimum required:

- `CDEK_CLIENT_ID`
- `CDEK_CLIENT_SECRET`
- `CDEK_FROM_LOCATION_CODE` (оставь `5444`, если отправка всегда из Бишкека)

Optional but recommended:

- `CDEK_TARIFF_CODE`
- package dimensions and weight (`CDEK_PACKAGE_*`)

## 3) Install and run

```bash
npm install
npm start
```

Server URL:

- `http://localhost:3000`

Frontend uses backend endpoint:

- `POST /api/cdek/calculate`

Quick config check endpoint:

- `GET /api/cdek/config-check`
- Example: `http://localhost:3000/api/cdek/config-check`

## 4) How calculation works

- Frontend sends `city`, `itemsCount`, `orderSum`.
- Backend requests CDEK OAuth token.
- Backend resolves destination city code.
- Backend asks CDEK tariff calculator.
- Backend returns:

```json
{ "deliveryPrice": 490, "source": "cdek" }
```

## 5) If price is not returned

Check in this order:

1. `CDEK_CLIENT_ID` / `CDEK_CLIENT_SECRET` are correct.
2. `CDEK_FROM_LOCATION_CODE` is valid.
3. `CDEK_TARIFF_CODE` is available for your contract.
4. Package dimensions/weight are realistic.
5. Destination city exists in CDEK directory.

If API is temporarily unavailable, frontend shows fallback estimate so checkout still works.
