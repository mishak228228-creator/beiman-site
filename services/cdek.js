const CDEK_API_BASE = process.env.CDEK_API_BASE || "https://api.cdek.ru/v2";
const CDEK_CALCULATOR_PATH = process.env.CDEK_CALCULATOR_PATH || "/calculator/tariff";
const CDEK_CLIENT_ID = process.env.CDEK_CLIENT_ID || "";
const CDEK_CLIENT_SECRET = process.env.CDEK_CLIENT_SECRET || "";
const CDEK_FROM_LOCATION_CODE = Number(process.env.CDEK_FROM_LOCATION_CODE || 5444);
const CDEK_TARIFF_CODE = Number(process.env.CDEK_TARIFF_CODE || 136);
const CDEK_PACKAGE_WEIGHT_GRAMS = Number(process.env.CDEK_PACKAGE_WEIGHT_GRAMS || 700);
const CDEK_PACKAGE_LENGTH_CM = Number(process.env.CDEK_PACKAGE_LENGTH_CM || 30);
const CDEK_PACKAGE_WIDTH_CM = Number(process.env.CDEK_PACKAGE_WIDTH_CM || 20);
const CDEK_PACKAGE_HEIGHT_CM = Number(process.env.CDEK_PACKAGE_HEIGHT_CM || 8);
const CDEK_SENDER_NAME = process.env.CDEK_SENDER_NAME || "Бикиев Байэл Беделбаевич";
const CDEK_SENDER_CONTRAGENT = process.env.CDEK_SENDER_CONTRAGENT || CDEK_SENDER_NAME;
const CDEK_SENDER_PHONE = process.env.CDEK_SENDER_PHONE || "";
const CDEK_SENDER_COUNTRY_CODE = process.env.CDEK_SENDER_COUNTRY_CODE || "KG";
const CDEK_SENDER_CITY = process.env.CDEK_SENDER_CITY || "Бишкек";
const CDEK_SENDER_ADDRESS = process.env.CDEK_SENDER_ADDRESS || "";
const CDEK_USE_CUSTOM_SENDER = String(process.env.CDEK_USE_CUSTOM_SENDER || "0") === "1";

const CDEK_API_BASE_CANDIDATES = Array.from(new Set([CDEK_API_BASE, "https://api.edu.cdek.ru/v2"].filter(Boolean)));
const authCacheByBase = new Map();

function toInt(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Math.round(num);
}

function toMoney(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Number(num.toFixed(2));
}

function normalizePhoneNumber(rawPhone) {
  const value = String(rawPhone || "").trim();
  if (!value) return "";
  const hasPlus = value.startsWith("+");
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 11 && digits.startsWith("8")) return `+7${digits.slice(1)}`;
  if (hasPlus) return `+${digits}`;
  if (digits.length === 11 && digits.startsWith("7")) return `+${digits}`;
  if (digits.length === 12 && digits.startsWith("996")) return `+${digits}`;
  return `+${digits}`;
}

function normalizeSenderPhoneNumber(rawPhone) {
  const value = String(rawPhone || "").trim();
  if (!value) return "";
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (value.startsWith("+")) return `+${digits}`;
  return digits;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createError(message, status = 500, details) {
  const error = new Error(message);
  error.status = status;
  if (details) error.details = details;
  return error;
}

function buildCdekUrlForBase(base, relativePath) {
  return `${String(base || "").replace(/\/+$/, "")}${relativePath}`;
}

function getMissingAuthConfig() {
  const missing = [];
  if (!CDEK_CLIENT_ID) missing.push("CDEK_CLIENT_ID");
  if (!CDEK_CLIENT_SECRET) missing.push("CDEK_CLIENT_SECRET");
  return missing;
}

function getMissingCoreConfig() {
  const missing = getMissingAuthConfig();
  if (!CDEK_FROM_LOCATION_CODE) missing.push("CDEK_FROM_LOCATION_CODE");
  if (!CDEK_TARIFF_CODE) missing.push("CDEK_TARIFF_CODE");
  return missing;
}

function ensureAuthConfigured() {
  const missing = getMissingAuthConfig();
  if (missing.length) throw createError(`CDEK auth config is incomplete. Missing: ${missing.join(", ")}`, 500);
}

function ensureConfigured() {
  const missing = getMissingCoreConfig();
  if (missing.length) throw createError(`CDEK config is incomplete. Missing: ${missing.join(", ")}`, 500);
}

async function getTokenForBase(base) {
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
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  if (!response.ok) {
    throw createError(`CDEK auth failed (${response.status})`, 502, await response.text());
  }

  const data = await response.json();
  const token = data?.access_token;
  if (!token) throw createError("CDEK auth response has no access_token", 502);
  const expiresIn = Number(data?.expires_in || 3600);
  authCacheByBase.set(base, { token, expiresAtMs: Date.now() + expiresIn * 1000, expiresIn });
  return token;
}

async function getToken() {
  ensureAuthConfigured();
  for (const base of CDEK_API_BASE_CANDIDATES) {
    try {
      return await getTokenForBase(base);
    } catch {
      // try next base
    }
  }
  throw createError("Unable to obtain CDEK token on all configured API bases", 502);
}

async function authorizedFetch(relativePath, options = {}) {
  let lastResponse = null;
  let lastError = null;
  for (const base of CDEK_API_BASE_CANDIDATES) {
    try {
      const token = await getTokenForBase(base);
      const headers = { Authorization: `Bearer ${token}`, ...(options.headers || {}) };
      const response = await fetch(buildCdekUrlForBase(base, relativePath), { ...options, headers });
      lastResponse = response;
      if (response.ok) return response;
      if (![404, 410].includes(response.status)) return response;
    } catch (error) {
      lastError = error;
    }
  }
  if (lastResponse) return lastResponse;
  throw lastError || createError("CDEK request failed on all configured API bases", 502);
}

async function authorizedFetchPrimary(relativePath, options = {}) {
  const token = await getTokenForBase(CDEK_API_BASE);
  const headers = { Authorization: `Bearer ${token}`, ...(options.headers || {}) };
  return fetch(buildCdekUrlForBase(CDEK_API_BASE, relativePath), { ...options, headers });
}

function mapCitySuggestion(row) {
  const code = Number(row?.code || 0);
  const cityName = String(row?.city || row?.city_name || "").trim();
  if (!code || !cityName) return null;
  return {
    code,
    cityName,
    region: String(row?.region || row?.sub_region || "").trim(),
    country: String(row?.country || row?.country_name || "").trim(),
  };
}

async function fetchCities(query, size = 10) {
  ensureAuthConfigured();
  const text = String(query || "").trim();
  if (text.length < 2) return [];
  const params = new URLSearchParams({ city: text, size: String(size) });
  const response = await authorizedFetch(`/location/cities?${params.toString()}`);
  if (!response.ok) throw createError("CDEK cities request failed", 502, await response.text());
  const rows = await response.json();
  const seen = new Set();
  return (Array.isArray(rows) ? rows : [])
    .map(mapCitySuggestion)
    .filter(Boolean)
    .filter((item) => {
      const key = `${item.code}:${item.cityName}:${item.region}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);
}

async function resolveCityCode(city) {
  const rows = await fetchCities(city, 1);
  const code = Number(rows[0]?.code || 0);
  if (!code) throw createError(`City not found in CDEK: ${city}`, 400);
  return code;
}

async function fetchPickupPoints(cityCode) {
  ensureAuthConfigured();
  const code = Number(cityCode || 0);
  if (!code) throw createError("cityCode is required", 400);
  const params = new URLSearchParams({ city_code: String(code), type: "PVZ" });
  const response = await authorizedFetch(`/deliverypoints?${params.toString()}`);
  if (!response.ok) throw createError("CDEK pickup points request failed", 502, await response.text());
  const rows = await response.json();
  return (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      code: String(row?.code || "").trim(),
      name: String(row?.name || "ПВЗ СДЭК").trim(),
      address: String(row?.location?.address_full || row?.location?.address || "").trim(),
      workTime: String(row?.work_time || "").trim(),
      phone: String(row?.phones?.[0]?.number || row?.phone || "").trim(),
      note: String(row?.note || row?.location?.address_comment || "").trim(),
      latitude: Number(row?.location?.latitude),
      longitude: Number(row?.location?.longitude),
    }))
    .filter((point) => point.code && point.address)
    .slice(0, 200);
}

function parseDeliveryPrice(calcData) {
  const direct = Number(
    calcData?.delivery_detail?.total_sum ??
      calcData?.total_sum ??
      calcData?.total_sum_rub ??
      calcData?.total_sum?.value ??
      calcData?.delivery_detail?.delivery_sum ??
      calcData?.delivery_sum
  );
  if (Number.isFinite(direct)) return Number(direct.toFixed(2));
  const tariffs = Array.isArray(calcData?.tariff_codes) ? calcData.tariff_codes : [];
  const selected = tariffs.find((item) => Number(item?.tariff_code || 0) === CDEK_TARIFF_CODE) || tariffs[0];
  const value = Number(selected?.total_sum ?? selected?.delivery_sum);
  return Number.isFinite(value) ? Number(value.toFixed(2)) : null;
}

function extractDeliveryDetails(calcData) {
  const tariffs = Array.isArray(calcData?.tariff_codes) ? calcData.tariff_codes : [];
  const selected =
    tariffs.find((item) => Number(item?.tariff_code || 0) === Number(calcData?.tariff_code || 0)) ||
    tariffs.find((item) => Number(item?.tariff_code || 0) === CDEK_TARIFF_CODE) ||
    tariffs[0] ||
    null;
  if (!selected && !calcData) return null;
  return {
    tariffCode: toInt(calcData?.tariff_code ?? selected?.tariff_code ?? CDEK_TARIFF_CODE),
    tariffName: String(calcData?.tariff_name ?? selected?.tariff_name ?? selected?.name ?? "").trim() || null,
    periodMin: toInt(calcData?.period_min ?? selected?.period_min ?? calcData?.calendar_min ?? selected?.calendar_min),
    periodMax: toInt(calcData?.period_max ?? selected?.period_max ?? calcData?.calendar_max ?? selected?.calendar_max),
    deliverySum: toMoney(
      calcData?.delivery_detail?.delivery_sum ?? calcData?.delivery_sum ?? selected?.delivery_sum ?? selected?.total_sum
    ),
    totalSum: toMoney(
      calcData?.delivery_detail?.total_sum ?? calcData?.total_sum ?? selected?.total_sum ?? calcData?.delivery_sum
    ),
    vatSum: toMoney(calcData?.vat_sum ?? selected?.vat_sum),
    services: [],
  };
}

async function calculate(params = {}) {
  ensureConfigured();
  const city = String(params.city || "").trim();
  const cityCode = Number(params.cityCode || 0);
  const toLocationCode = cityCode || (await resolveCityCode(city));
  const packageWeight = Math.max(100, Math.round(Number(params.packageWeightGrams) || CDEK_PACKAGE_WEIGHT_GRAMS));
  const packageLength = Math.max(10, Math.round(Number(params.packageLengthCm) || CDEK_PACKAGE_LENGTH_CM));
  const packageWidth = Math.max(10, Math.round(Number(params.packageWidthCm) || CDEK_PACKAGE_WIDTH_CM));
  const packageHeight = Math.max(2, Math.round(Number(params.packageHeightCm) || CDEK_PACKAGE_HEIGHT_CM));
  const toLocation = { code: toLocationCode };
  if (Number.isFinite(Number(params.pickupPointLatitude)) && Number.isFinite(Number(params.pickupPointLongitude))) {
    toLocation.latitude = Number(params.pickupPointLatitude);
    toLocation.longitude = Number(params.pickupPointLongitude);
  }
  const payload = {
    type: 1,
    tariff_code: CDEK_TARIFF_CODE,
    from_location: { code: CDEK_FROM_LOCATION_CODE },
    to_location: toLocation,
    packages: [{ weight: packageWeight, length: packageLength, width: packageWidth, height: packageHeight }],
    services: [],
  };
  const response = await authorizedFetch(CDEK_CALCULATOR_PATH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw createError("CDEK calculator request failed", 502, await response.text());
  const calcData = await response.json();
  const deliveryPrice = parseDeliveryPrice(calcData);
  if (deliveryPrice === null) throw createError("Failed to parse delivery price from CDEK response", 502, calcData);
  return {
    deliveryPrice,
    deliveryDetails: extractDeliveryDetails(calcData),
    city,
    cityCode: toLocationCode,
    pickupPointCode: String(params.pickupPointCode || "").trim(),
    pickupPointLatitude: Number(params.pickupPointLatitude) || null,
    pickupPointLongitude: Number(params.pickupPointLongitude) || null,
    packageWeightGrams: packageWeight,
    packageLengthCm: packageLength,
    packageWidthCm: packageWidth,
    packageHeightCm: packageHeight,
    orderSum: Math.max(0, Number(params.orderSum) || 0),
    itemsCount: Math.max(1, Number(params.itemsCount) || 1),
    source: "cdek",
  };
}

async function createOrder(params = {}) {
  ensureConfigured();
  const recipientName = String(params.recipientName || "").trim();
  const recipientPhone = normalizePhoneNumber(params.recipientPhone);
  if (!recipientName || !recipientPhone) throw createError("recipientName and recipientPhone are required", 400);
  const senderPhone = normalizeSenderPhoneNumber(CDEK_SENDER_PHONE);
  if (CDEK_USE_CUSTOM_SENDER && !senderPhone) throw createError("CDEK_SENDER_PHONE is invalid", 500);

  const city = String(params.city || "").trim();
  const cityCode = Number(params.cityCode || 0);
  const toLocationCode = cityCode || (await resolveCityCode(city));
  const orderNumber = String(params.number || `BM-${Date.now()}-${Math.floor(Math.random() * 1000)}`).slice(0, 50);
  const packageWeight = Math.max(100, Math.round(Number(params.packageWeightGrams) || CDEK_PACKAGE_WEIGHT_GRAMS));
  const packageLength = Math.max(10, Math.round(Number(params.packageLengthCm) || CDEK_PACKAGE_LENGTH_CM));
  const packageWidth = Math.max(10, Math.round(Number(params.packageWidthCm) || CDEK_PACKAGE_WIDTH_CM));
  const packageHeight = Math.max(2, Math.round(Number(params.packageHeightCm) || CDEK_PACKAGE_HEIGHT_CM));

  const payload = {
    type: 1,
    number: orderNumber,
    tariff_code: CDEK_TARIFF_CODE,
    comment: String(params.comment || "").trim() || undefined,
    recipient: {
      name: recipientName,
      phones: [{ number: recipientPhone }],
      email: String(params.recipientEmail || "").trim() || undefined,
    },
    from_location: {
      code: CDEK_FROM_LOCATION_CODE,
      country_code: CDEK_SENDER_COUNTRY_CODE,
      city: CDEK_SENDER_CITY,
      address: CDEK_SENDER_ADDRESS || undefined,
    },
    packages: [
      {
        number: "1",
        weight: packageWeight,
        length: packageLength,
        width: packageWidth,
        height: packageHeight,
        items: [
          {
            name: String(params.itemName || "Заказ BEIMAN"),
            ware_key: String(params.itemSku || "beiman-order"),
            payment: { value: 0 },
            cost: Math.max(0, Number(params.orderSum) || 0),
            weight: packageWeight,
            amount: 1,
          },
        ],
      },
    ],
  };
  if (CDEK_USE_CUSTOM_SENDER) {
    payload.sender = {
      company: CDEK_SENDER_CONTRAGENT,
      name: CDEK_SENDER_NAME,
      phones: [{ number: senderPhone }],
    };
  }

  const pickupPointCode = String(params.pickupPointCode || "").trim();
  if (pickupPointCode) {
    payload.delivery_point = pickupPointCode;
  } else {
    payload.to_location = { code: toLocationCode };
  }

  const response = await authorizedFetchPrimary("/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw createError("CDEK create order request failed", 502, await response.text());
  const data = await response.json();
  const entityUuid = data?.entity?.uuid;
  let orderDetails = null;
  if (entityUuid) {
    const maxAttempts = 5;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (attempt > 0) await sleep(1200);
      const detailsResponse = await authorizedFetchPrimary(`/orders/${entityUuid}`);
      if (!detailsResponse.ok) continue;
      orderDetails = await detailsResponse.json();
      const requestState = String(orderDetails?.requests?.[0]?.state || "").toUpperCase();
      const hasInvalidStatus = Array.isArray(orderDetails?.entity?.statuses)
        ? orderDetails.entity.statuses.some((status) => String(status?.code || "").toUpperCase() === "INVALID")
        : false;
      if (requestState === "INVALID" || hasInvalidStatus) {
        throw createError("CDEK create order request was rejected after validation", 502, JSON.stringify(orderDetails));
      }
      if (requestState === "SUCCESSFUL") {
        break;
      }
    }
  }
  return {
    orderNumber,
    cityCode: toLocationCode,
    cdekOrderUuid: entityUuid || data?.entity?.cdek_number || null,
    raw: orderDetails || data,
  };
}

function getConfigStatus() {
  const missing = getMissingCoreConfig();
  return {
    ok: missing.length === 0,
    missing,
    configured: {
      hasClientId: Boolean(CDEK_CLIENT_ID),
      hasClientSecret: Boolean(CDEK_CLIENT_SECRET),
      fromLocationCode: CDEK_FROM_LOCATION_CODE || null,
      fromLocationCity: "Бишкек",
      tariffCode: CDEK_TARIFF_CODE || null,
      apiBase: CDEK_API_BASE,
      apiBaseCandidates: CDEK_API_BASE_CANDIDATES,
      calculatorPath: CDEK_CALCULATOR_PATH,
      senderName: CDEK_SENDER_NAME,
      senderContragent: CDEK_SENDER_CONTRAGENT,
      hasSenderPhone: Boolean(CDEK_SENDER_PHONE),
      senderCountryCode: CDEK_SENDER_COUNTRY_CODE,
      senderCity: CDEK_SENDER_CITY,
      senderAddress: CDEK_SENDER_ADDRESS || null,
      useCustomSender: CDEK_USE_CUSTOM_SENDER,
    },
  };
}

module.exports = {
  getToken,
  fetchCities,
  fetchPickupPoints,
  calculate,
  createOrder,
  getConfigStatus,
  ensureAuthConfigured,
  ensureConfigured,
};
