const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");

const cdekService = require("../services/cdek");
const { app } = require("../server");

const ORDERS_FILE = path.resolve(__dirname, "..", "data", "orders.json");

async function startServer() {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => resolve(server));
    server.on("error", reject);
  });
}

test("checkout flow reaches CDEK order creation endpoint", async () => {
  let originalOrdersContent = "[]";
  try {
    originalOrdersContent = await fs.readFile(ORDERS_FILE, "utf8");
  } catch {
    originalOrdersContent = "[]";
  }

  const originalMethods = {
    calculate: cdekService.calculate,
    createOrder: cdekService.createOrder,
  };

  cdekService.calculate = async (payload) => ({
    deliveryPrice: 510.5,
    deliveryDetails: {
      tariffCode: 136,
      tariffName: "Warehouse-Warehouse",
      periodMin: 3,
      periodMax: 5,
      deliverySum: 510.5,
      totalSum: 510.5,
      vatSum: 0,
      services: [],
    },
    city: String(payload.city || ""),
    cityCode: Number(payload.cityCode || 44),
    pickupPointCode: String(payload.pickupPointCode || "MSK123"),
    source: "cdek",
  });

  cdekService.createOrder = async (payload) => ({
    orderNumber: String(payload.number || "BM-TEST-ORDER"),
    cityCode: Number(payload.cityCode || 44),
    cdekOrderUuid: "cdek-test-uuid-1",
    raw: { requests: [{ state: "SUCCESSFUL" }] },
  });

  await fs.mkdir(path.dirname(ORDERS_FILE), { recursive: true });
  await fs.writeFile(ORDERS_FILE, "[]", "utf8");

  const server = await startServer();
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const calculateResponse = await fetch(`${baseUrl}/api/cdek/calculate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        city: "Moscow",
        cityCode: 44,
        pickupPointCode: "MSK123",
        packageWeightGrams: 1000,
        packageLengthCm: 30,
        packageWidthCm: 20,
        packageHeightCm: 10,
        itemsCount: 1,
        orderSum: 5000,
      }),
    });
    assert.equal(calculateResponse.status, 200);
    const calculateBody = await calculateResponse.json();
    assert.equal(calculateBody.deliveryPrice, 510.5);

    const createOrderResponse = await fetch(`${baseUrl}/api/cdek/create-order`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        number: "BM-TEST-ORDER",
        recipientName: "Test User",
        recipientPhone: "+79990000000",
        recipientEmail: "test@example.com",
        city: "Moscow",
        cityCode: 44,
        pickupPointCode: "MSK123",
        comment: "Automated test",
        orderSum: 5510.5,
        itemName: "Test item",
      }),
    });
    assert.equal(createOrderResponse.status, 200);
    const createOrderBody = await createOrderResponse.json();
    assert.equal(createOrderBody.ok, true);
    assert.equal(createOrderBody.cdekOrderUuid, "cdek-test-uuid-1");
    assert.ok(createOrderBody.savedOrderId);

    const ordersResponse = await fetch(`${baseUrl}/api/orders`);
    assert.equal(ordersResponse.status, 200);
    const ordersBody = await ordersResponse.json();
    assert.equal(ordersBody.ok, true);
    assert.equal(ordersBody.total, 1);
    assert.equal(ordersBody.orders[0].cdek.orderUuid, "cdek-test-uuid-1");
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    cdekService.calculate = originalMethods.calculate;
    cdekService.createOrder = originalMethods.createOrder;
    await fs.writeFile(ORDERS_FILE, originalOrdersContent, "utf8");
  }
});
