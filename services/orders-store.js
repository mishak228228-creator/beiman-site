const fs = require("fs/promises");
const path = require("path");

const DATA_DIR = path.resolve(__dirname, "..", "data");
const ORDERS_FILE = path.resolve(DATA_DIR, "orders.json");

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(ORDERS_FILE);
  } catch {
    await fs.writeFile(ORDERS_FILE, "[]", "utf8");
  }
}

async function readOrders() {
  await ensureStore();
  const raw = await fs.readFile(ORDERS_FILE, "utf8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

async function writeOrders(orders) {
  await ensureStore();
  await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2), "utf8");
}

async function appendOrder(order) {
  const orders = await readOrders();
  const next = [order, ...orders].slice(0, 500);
  await writeOrders(next);
  return order;
}

async function updateOrderStatus(orderId, status) {
  const normalizedId = String(orderId || "").trim();
  const normalizedStatus = String(status || "").trim().toUpperCase();
  if (!normalizedId) throw new Error("Order id is required");
  if (!normalizedStatus) throw new Error("Order status is required");

  const orders = await readOrders();
  const index = orders.findIndex((order) => String(order?.id || "") === normalizedId);
  if (index < 0) {
    throw new Error(`Order "${normalizedId}" not found`);
  }

  const existing = orders[index] || {};
  const nextOrder = {
    ...existing,
    updatedAt: new Date().toISOString(),
    cdek: {
      ...(existing.cdek || {}),
      status: normalizedStatus,
    },
  };
  const nextOrders = [...orders];
  nextOrders[index] = nextOrder;
  await writeOrders(nextOrders);
  return nextOrder;
}

module.exports = {
  appendOrder,
  readOrders,
  updateOrderStatus,
};
