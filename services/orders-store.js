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

module.exports = {
  appendOrder,
  readOrders,
};
