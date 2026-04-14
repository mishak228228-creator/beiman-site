const path = require("path");
const express = require("express");
const dotenv = require("dotenv");

dotenv.config();
const cdekService = require("./services/cdek");
const ordersStore = require("./services/orders-store");

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT || 3000);
const CDEK_API_BASE = process.env.CDEK_API_BASE || "https://api.cdek.ru/v2";
const CDEK_CALCULATOR_PATH = process.env.CDEK_CALCULATOR_PATH || "/calculator/tariff";
const CDEK_CLIENT_ID = process.env.CDEK_CLIENT_ID || "";
const CDEK_CLIENT_SECRET = process.env.CDEK_CLIENT_SECRET || "";
const CDEK_FROM_LOCATION_CODE = Number(process.env.CDEK_FROM_LOCATION_CODE || 0);
const CDEK_TARIFF_CODE = Number(process.env.CDEK_TARIFF_CODE || 136);
const CDEK_PACKAGE_WEIGHT_GRAMS = Number(process.env.CDEK_PACKAGE_WEIGHT_GRAMS || 700);
const CDEK_PACKAGE_LENGTH_CM = Number(process.env.CDEK_PACKAGE_LENGTH_CM || 30);
const CDEK_PACKAGE_WIDTH_CM = Number(process.env.CDEK_PACKAGE_WIDTH_CM || 20);
const CDEK_PACKAGE_HEIGHT_CM = Number(process.env.CDEK_PACKAGE_HEIGHT_CM || 8);
const EXTRA_ASSETS_DIR = process.env.EXTRA_ASSETS_DIR || "";

const CDEK_API_BASE_CANDIDATES = Array.from(
  new Set([CDEK_API_BASE, "https://api.edu.cdek.ru/v2"].filter(Boolean))
);
const authCacheByBase = new Map();

function buildCdekUrl(relativePath) {
  return `${CDEK_API_BASE.replace(/\/+$/, "")}${relativePath}`;
}

function buildCdekUrlForBase(base, relativePath) {
  return `${String(base || "").replace(/\/+$/, "")}${relativePath}`;
}

function getMissingCdekConfig() {
  const missing = [];
  if (!CDEK_CLIENT_ID) missing.push("CDEK_CLIENT_ID");
  if (!CDEK_CLIENT_SECRET) missing.push("CDEK_CLIENT_SECRET");
  if (!CDEK_FROM_LOCATION_CODE) missing.push("CDEK_FROM_LOCATION_CODE");
  if (!CDEK_TARIFF_CODE) missing.push("CDEK_TARIFF_CODE");
  return missing;
}

function getMissingCdekAuthConfig() {
  const missing = [];
  if (!CDEK_CLIENT_ID) missing.push("CDEK_CLIENT_ID");
  if (!CDEK_CLIENT_SECRET) missing.push("CDEK_CLIENT_SECRET");
  return missing;
}

function ensureCdekAuthConfigured() {
  const missing = getMissingCdekAuthConfig();
  if (missing.length > 0) {
    const err = new Error(`CDEK auth config is incomplete. Missing: ${missing.join(", ")}`);
    err.status = 500;
    throw err;
  }
}

function ensureCdekConfigured() {
  const missing = getMissingCdekConfig();
  if (missing.length > 0) {
    const err = new Error(`CDEK config is incomplete. Missing: ${missing.join(", ")}`);
    err.status = 500;
    throw err;
  }
}

async function getCdekTokenForBase(base) {
  const cached = authCacheByBase.get(base);
  if (cached?.token && Date.now() < cached.expiresAtMs - 60_000) {
    return cached.token;
  }

  const params = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: CDEK_CLIENT_ID,
    client_secret: CDEK_CLIENT_SECRET,
  });

  const response = await fetch(buildCdekUrlForBase(base, "/oauth/token"), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`CDEK auth failed (${response.status}): ${payload}`);
  }

  const data = await response.json();
  const expiresIn = Number(data?.expires_in || 3600);
  const token = data?.access_token;
  if (!token) {
    throw new Error("CDEK auth response has no access_token");
  }

  authCacheByBase.set(base, {
    token,
    expiresAtMs: Date.now() + expiresIn * 1000,
  });
  return token;
}

async function cdekAuthorizedFetch(relativePath, options = {}) {
  let lastResponse = null;
  let lastError = null;

  for (const base of CDEK_API_BASE_CANDIDATES) {
    try {
      const token = await getCdekTokenForBase(base);
      const headers = {
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      };
      const response = await fetch(buildCdekUrlForBase(base, relativePath), { ...options, headers });
      lastResponse = response;
      if (response.ok) return response;
      if (![404, 410].includes(response.status)) return response;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError || new Error("CDEK request failed on all configured API bases");
}

async function resolveCityCode(city) {
  const rows = await fetchCdekCities(city, 1);
  const first = Array.isArray(rows) ? rows[0] : null;
  const code = Number(first?.code || 0);
  if (!code) {
    throw new Error(`City not found in CDEK: ${city}`);
  }
  return code;
}

function parseDeliveryPrice(responseData) {
  if (!responseData || typeof responseData !== "object") return null;

  const directPrice =
    responseData.delivery_sum ??
    responseData.total_sum ??
    responseData.total_sum_rub ??
    responseData?.total_sum?.value;

  const directPriceNum = Number(directPrice);
  if (Number.isFinite(directPriceNum)) {
    return Number(directPriceNum.toFixed(2));
  }

  const tariffs = Array.isArray(responseData?.tariff_codes) ? responseData.tariff_codes : null;
  if (tariffs && tariffs.length > 0) {
    const selectedTariff =
      tariffs.find((item) => Number(item?.tariff_code || 0) === CDEK_TARIFF_CODE) || tariffs[0];
    const listPrice = selectedTariff?.delivery_sum ?? selectedTariff?.total_sum;
    const listPriceNum = Number(listPrice);
    if (Number.isFinite(listPriceNum)) {
      return Number(listPriceNum.toFixed(2));
    }
  }

  return null;
}

function toIntNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Math.round(num);
}

function toMoneyNumber(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Number(num.toFixed(2));
}

function extractDeliveryDetails(responseData) {
  if (!responseData || typeof responseData !== "object") return null;

  const tariffs = Array.isArray(responseData?.tariff_codes) ? responseData.tariff_codes : [];
  const responseTariffCode = Number(responseData?.tariff_code || 0);
  const selectedTariff =
    tariffs.find((item) => Number(item?.tariff_code || 0) === responseTariffCode) ||
    tariffs.find((item) => Number(item?.tariff_code || 0) === CDEK_TARIFF_CODE) ||
    tariffs[0] ||
    null;

  const periodMin = toIntNumber(
    responseData?.period_min ?? selectedTariff?.period_min ?? responseData?.calendar_min ?? selectedTariff?.calendar_min
  );
  const periodMax = toIntNumber(
    responseData?.period_max ?? selectedTariff?.period_max ?? responseData?.calendar_max ?? selectedTariff?.calendar_max
  );

  const tariffCode = toIntNumber(responseData?.tariff_code ?? selectedTariff?.tariff_code ?? CDEK_TARIFF_CODE);
  const tariffName = String(
    responseData?.tariff_name ?? selectedTariff?.tariff_name ?? selectedTariff?.name ?? ""
  ).trim();
  const deliverySum = toMoneyNumber(
    responseData?.delivery_sum ?? selectedTariff?.delivery_sum ?? responseData?.total_sum ?? selectedTariff?.total_sum
  );
  const totalSum = toMoneyNumber(
    responseData?.total_sum ?? selectedTariff?.total_sum ?? responseData?.delivery_sum ?? selectedTariff?.delivery_sum
  );
  const vatSum = toMoneyNumber(responseData?.vat_sum ?? selectedTariff?.vat_sum);

  const serviceSource = [
    ...(Array.isArray(selectedTariff?.services) ? selectedTariff.services : []),
    ...(Array.isArray(responseData?.services) ? responseData.services : []),
  ];
  const seenServices = new Set();
  const services = serviceSource
    .map((service) => {
      const sum = toMoneyNumber(service?.sum ?? service?.total_sum ?? service?.price);
      if (sum === null || sum === 0) return null;
      const code = String(service?.code || "").trim();
      const name = String(service?.name || service?.title || code || "Услуга").trim();
      const key = `${code}:${sum}:${name}`;
      if (seenServices.has(key)) return null;
      seenServices.add(key);
      return { code, name, sum };
    })
    .filter(Boolean);

  const hasDetails =
    tariffCode !== null ||
    Boolean(tariffName) ||
    periodMin !== null ||
    periodMax !== null ||
    deliverySum !== null ||
    totalSum !== null ||
    vatSum !== null ||
    services.length > 0;

  if (!hasDetails) return null;

  return {
    tariffCode,
    tariffName: tariffName || null,
    periodMin,
    periodMax,
    deliverySum,
    totalSum,
    vatSum,
    services,
  };
}

function mapCitySuggestion(row) {
  if (!row || typeof row !== "object") return null;
  const code = Number(row.code || 0);
  const cityName = String(row.city || row.city_name || "").trim();
  if (!code || !cityName) return null;
  const region = String(row.region || row.sub_region || "").trim();
  const country = String(row.country || row.country_name || "").trim();
  return { code, cityName, region, country };
}

async function fetchCdekCities(query, size = 10) {
  const endpoints = ["/location/cities", "/location"];
  let lastErrorText = "";
  let lastStatus = 500;

  for (const endpoint of endpoints) {
    const params = new URLSearchParams({
      city: query,
      size: String(size),
    });
    const response = await cdekAuthorizedFetch(`${endpoint}?${params.toString()}`);
    if (response.ok) {
      return response.json();
    }

    lastStatus = response.status;
    lastErrorText = await response.text();
    if (![404, 410].includes(response.status)) {
      break;
    }
  }

  const error = new Error(`CDEK cities request failed (${lastStatus}): ${lastErrorText}`);
  error.status = 502;
  throw error;
}

app.get("/api/cdek/config-check", (_, res) => {
  return res.json(cdekService.getConfigStatus());
});

app.get("/api/cdek/token", async (_, res) => {
  try {
    const token = await cdekService.getToken();
    return res.json({
      ok: true,
      token,
    });
  } catch (error) {
    return res.status(Number(error?.status || 500)).json({
      error: error?.message || "Failed to get CDEK token",
      details: error?.details || null,
    });
  }
});

app.get("/api/cdek/cities", async (req, res) => {
  try {
    const cities = await cdekService.fetchCities(req.query?.q, 10);
    return res.json({ cities });
  } catch (error) {
    return res.status(Number(error?.status || 500)).json({
      error: error?.message || "Failed to load cities",
      details: error?.details || null,
    });
  }
});

app.get("/api/cdek/pickup-points", async (req, res) => {
  try {
    const points = await cdekService.fetchPickupPoints(req.query?.cityCode);
    return res.json({ points });
  } catch (error) {
    return res.status(Number(error?.status || 500)).json({
      error: error?.message || "Failed to load pickup points",
      details: error?.details || null,
    });
  }
});

app.post("/api/cdek/calculate", async (req, res) => {
  try {
    const result = await cdekService.calculate(req.body || {});
    return res.json(result);
  } catch (error) {
    return res.status(Number(error?.status || 500)).json({
      error: error?.message || "Unexpected server error",
      details: error?.details || null,
    });
  }
});

app.post("/api/cdek/create-order", async (req, res) => {
  try {
    const payload = req.body || {};
    const result = await cdekService.createOrder(payload);
    const nowIso = new Date().toISOString();
    const localOrder = {
      id: `local-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      createdAt: nowIso,
      customer: {
        name: String(payload.recipientName || "").trim(),
        phone: String(payload.recipientPhone || "").trim(),
        email: String(payload.recipientEmail || "").trim(),
      },
      city: String(payload.city || "").trim(),
      cityCode: Number(payload.cityCode || 0) || result.cityCode || null,
      pickupPointCode: String(payload.pickupPointCode || "").trim(),
      package: {
        weightGrams: Number(payload.packageWeightGrams) || null,
        lengthCm: Number(payload.packageLengthCm) || null,
        widthCm: Number(payload.packageWidthCm) || null,
        heightCm: Number(payload.packageHeightCm) || null,
      },
      comment: String(payload.comment || "").trim(),
      cdek: {
        orderNumber: result.orderNumber || null,
        orderUuid: result.cdekOrderUuid || null,
        status: String(result?.raw?.requests?.[0]?.state || "CREATED"),
      },
    };
    await ordersStore.appendOrder(localOrder);
    return res.json({
      ok: true,
      savedOrderId: localOrder.id,
      ...result,
    });
  } catch (error) {
    return res.status(Number(error?.status || 500)).json({
      error: error?.message || "Failed to create CDEK order",
      details: error?.details || null,
    });
  }
});

app.get("/api/orders", async (_, res) => {
  try {
    const orders = await ordersStore.readOrders();
    return res.json({
      ok: true,
      total: orders.length,
      orders,
    });
  } catch (error) {
    return res.status(500).json({
      error: error?.message || "Failed to load saved orders",
    });
  }
});

app.use("/assets", express.static(path.resolve(__dirname, "assets")));
if (EXTRA_ASSETS_DIR) {
  app.use("/assets", express.static(path.resolve(EXTRA_ASSETS_DIR)));
}
app.use(express.static(path.resolve(__dirname)));

app.get("*", (_, res) => {
  res.sendFile(path.resolve(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`BEIMAN server running on http://localhost:${PORT}`);
});
