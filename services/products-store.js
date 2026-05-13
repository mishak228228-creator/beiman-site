const fs = require("fs/promises");
const path = require("path");

const DATA_DIR = path.resolve(__dirname, "..", "data");
const PRODUCTS_FILE = path.resolve(DATA_DIR, "products.json");

const DEFAULT_PRODUCTS = [
  {
    id: "real-white",
    title: 'ZIP JACKET "REAL" WHITE',
    category: "hoodie",
    price: 5090,
    oldPrice: 7990,
    badge: "HIT",
    image: "/assets/real-white.png",
    imageAlt: "Белая спортивная куртка Real Madrid",
    isActive: true,
  },
  {
    id: "barca-white",
    title: 'ZIP JACKET "BARCA" WHITE',
    category: "hoodie",
    price: 5090,
    oldPrice: 7990,
    badge: "HIT",
    image: "/assets/barca-white.png",
    imageAlt: "Белая спортивная куртка FC Barcelona",
    isActive: true,
  },
  {
    id: "barca-bordeaux",
    title: 'ZIP JACKET "BARCA" BORDEAUX',
    category: "hoodie",
    price: 5090,
    oldPrice: 7990,
    badge: "",
    image: "/assets/barca-bordeaux.png",
    imageAlt: "Бордовая куртка FC Barcelona",
    isActive: true,
  },
  {
    id: "real-blue",
    title: 'ZIP JACKET "REAL" BLUE',
    category: "hoodie",
    price: 5090,
    oldPrice: 7990,
    badge: "",
    image: "/assets/real-blue.png",
    imageAlt: "Сине-белая спортивная куртка Real Madrid",
    isActive: true,
  },
  {
    id: "tee-barca",
    title: "Футболка BARCA CLASSIC POLO",
    category: "tee",
    price: 3100,
    oldPrice: 4090,
    badge: "NEW",
    image: "/assets/tee-barca.png",
    imageAlt: "Футболка BARCA CLASSIC POLO",
    isActive: true,
  },
  {
    id: "tee-real",
    title: 'JERSEY "MADRID" WHITE / GREY',
    category: "tee",
    price: 3100,
    oldPrice: 4090,
    badge: "NEW",
    image: "/assets/tee-real.png",
    imageAlt: "Футболка Real Madrid",
    isActive: true,
  },
];

const DEFAULT_PRODUCT_DETAILS = {
  "real-white": {
    cardDescription: "спортивная кофта...",
    lead:
      "Стильная спортивная кофта на молнии в винтажном стиле. Выполнена из плотной ткани lining собственного производства, которая сохраняет форму и обеспечивает комфортную посадку без лишнего объема. Контрастные вставки и аккуратная вышивка придают изделию премиальный внешний вид, делая его универсальным выбором как для повседневной носки, так и для стильных образов. Мягкий и приятный к телу материал обеспечивает комфорт в течение всего дня, а продуманный крой гарантирует удобство и свободу движений. Фирменные элементы выполнены с высокой износостойкостью, сохраняя внешний вид даже после множества стирок.",
    specs: [
      ["Composition & Materials", "• Основная ткань: lining"],
      ["—", "— Плотный, износостойкий материал"],
      ["—", "— Дышащая структура для ежедневного комфорта"],
      ["—", "— Сохраняет форму после стирок"],
      ["—", "— Мягкая внутренняя поверхность"],
    ],
  },
  "barca-white": {
    cardDescription: "спортивная кофта...",
    lead:
      "Стильная спортивная кофта на молнии в винтажном стиле. Выполнена из плотной ткани lining собственного производства, которая сохраняет форму и обеспечивает комфортную посадку без лишнего объема. Контрастные вставки и аккуратная вышивка придают изделию премиальный внешний вид, делая его универсальным выбором как для повседневной носки, так и для стильных образов. Мягкий и приятный к телу материал обеспечивает комфорт в течение всего дня, а продуманный крой гарантирует удобство и свободу движений. Фирменные элементы выполнены с высокой износостойкостью, сохраняя внешний вид даже после множества стирок.",
    specs: [
      ["Composition & Materials", "• Основная ткань: lining"],
      ["—", "— Плотный, износостойкий материал"],
      ["—", "— Дышащая структура для ежедневного комфорта"],
      ["—", "— Сохраняет форму после стирок"],
      ["—", "— Мягкая внутренняя поверхность"],
    ],
  },
  "barca-bordeaux": {
    cardDescription: "спортивная кофта...",
    lead:
      "Стильная спортивная кофта на молнии в винтажном стиле. Выполнена из плотной ткани lining собственного производства, которая сохраняет форму и обеспечивает комфортную посадку без лишнего объема. Контрастные вставки и аккуратная вышивка придают изделию премиальный внешний вид, делая его универсальным выбором как для повседневной носки, так и для стильных образов. Мягкий и приятный к телу материал обеспечивает комфорт в течение всего дня, а продуманный крой гарантирует удобство и свободу движений. Фирменные элементы выполнены с высокой износостойкостью, сохраняя внешний вид даже после множества стирок.",
    specs: [
      ["Composition & Materials", "• Основная ткань: lining"],
      ["—", "— Плотный, износостойкий материал"],
      ["—", "— Дышащая структура для ежедневного комфорта"],
      ["—", "— Сохраняет форму после стирок"],
      ["—", "— Мягкая внутренняя поверхность"],
    ],
  },
  "real-blue": {
    cardDescription: "спортивная кофта...",
    lead:
      "Стильная спортивная кофта на молнии в винтажном стиле. Выполнена из плотной ткани lining собственного производства, которая сохраняет форму и обеспечивает комфортную посадку без лишнего объема. Контрастные вставки и аккуратная вышивка придают изделию премиальный внешний вид, делая его универсальным выбором как для повседневной носки, так и для стильных образов. Мягкий и приятный к телу материал обеспечивает комфорт в течение всего дня, а продуманный крой гарантирует удобство и свободу движений. Фирменные элементы выполнены с высокой износостойкостью, сохраняя внешний вид даже после множества стирок.",
    specs: [
      ["Composition & Materials", "• Основная ткань: lining"],
      ["—", "— Плотный, износостойкий материал"],
      ["—", "— Дышащая структура для ежедневного комфорта"],
      ["—", "— Сохраняет форму после стирок"],
      ["—", "— Мягкая внутренняя поверхность"],
    ],
  },
  "tee-barca": {
    cardDescription: "винтажное polo...",
    lead:
      "Винтажная футболка в стиле легендарного клуба FC Barcelona — баланс спортивной эстетики и повседневной моды. Классические цвета с вертикальными вставками, аккуратный polo-воротник, логотип Nike и эмблема клуба создают премиальный и узнаваемый образ. Модель легко сочетается с джинсами, шортами и спортивными брюками.",
    specs: [
      ["Материал", "плотный и комфортный трикотаж"],
      ["Дизайн", "уникальный винтажный стиль с вертикальными вставками"],
      ["Посадка", "свободная: берите свой размер для оверсайза"],
      ["Стиль", "универсальный (спорт + casual)"],
      ["Уход", "стирка до 30 °C, вывернув наизнанку"],
      ["Размеры", "S — XL"],
    ],
  },
  "tee-real": {
    cardDescription: "винтажная джерси..",
    lead:
      "Винтажная футбольная джерси, вдохновленная эстетикой Real Madrid — символом истории, стиля и доминирования на поле. Модель выполнена из легкой дышащей ткани, которая обеспечивает комфорт даже при активном движении. Контрастные вставки и аккуратная вышивка создают премиальный внешний вид с акцентом на ретро-футбольную культуру. Идеальный выбор как для повседневного стиля, так и для создания спортивного образа.",
    specs: [
      ["Особенности", "— Легкая и дышащая ткань"],
      ["—", "— Комфортная посадка"],
      ["—", "— Качественная вышивка"],
      ["—", "— Винтажный футбольный дизайн"],
      ["С чем носить", "джинсы, карго, спортивные штаны и шорты"],
      ["Размеры", "S / M / L / XL / XXL"],
      ["Посадка", "соответствует размеру"],
      ["Уход", "стирка до 30 °C"],
    ],
  },
};

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(PRODUCTS_FILE);
  } catch {
    await fs.writeFile(PRODUCTS_FILE, JSON.stringify(DEFAULT_PRODUCTS, null, 2), "utf8");
  }
}

async function readProducts() {
  await ensureStore();
  const raw = await fs.readFile(PRODUCTS_FILE, "utf8");
  const parsed = JSON.parse(raw);
  const products = Array.isArray(parsed) ? parsed : [];
  let changed = false;

  const enriched = products.map((product) => {
    const id = String(product?.id || "").trim();
    const defaults = DEFAULT_PRODUCT_DETAILS[id];
    if (!defaults) return product;

    const nextProduct = { ...product };
    if (!String(nextProduct.cardDescription || "").trim() && defaults.cardDescription) {
      nextProduct.cardDescription = defaults.cardDescription;
      changed = true;
    }
    if (!String(nextProduct.lead || "").trim() && defaults.lead) {
      nextProduct.lead = defaults.lead;
      changed = true;
    }
    if (!Array.isArray(nextProduct.specs) || nextProduct.specs.length === 0) {
      nextProduct.specs = defaults.specs;
      changed = true;
    }
    return nextProduct;
  });

  if (changed) {
    await writeProducts(enriched);
  }

  return enriched;
}

async function writeProducts(products) {
  await ensureStore();
  await fs.writeFile(PRODUCTS_FILE, JSON.stringify(products, null, 2), "utf8");
}

function sanitizeId(id) {
  return String(id || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeProductPayload(payload, fallbackId = "") {
  const normalizedId = sanitizeId(payload?.id || fallbackId);
  const title = String(payload?.title || "").trim();
  const category = String(payload?.category || "other").trim().toLowerCase();
  const badge = String(payload?.badge || "").trim().toUpperCase();
  const image = String(payload?.image || "").trim();
  const imageAlt = String(payload?.imageAlt || "").trim();
  const cardDescription = String(payload?.cardDescription || "").trim();
  const lead = String(payload?.lead || "").trim();
  const specs = Array.isArray(payload?.specs)
    ? payload.specs
        .map((entry) => {
          if (!Array.isArray(entry)) return null;
          const key = String(entry[0] || "").trim();
          const value = String(entry[1] || "").trim();
          if (!key && !value) return null;
          return [key || "—", value || "—"];
        })
        .filter(Boolean)
    : [];
  const sizes = Array.isArray(payload?.sizes)
    ? payload.sizes
        .map((entry) => String(entry || "").trim().toUpperCase())
        .filter(Boolean)
    : [];
  const price = Number(payload?.price || 0);
  const oldPrice = Number(payload?.oldPrice || 0);
  const isActive = Boolean(payload?.isActive);

  if (!normalizedId) throw new Error("Product id is required");
  if (!title) throw new Error("Product title is required");
  if (!Number.isFinite(price) || price <= 0) throw new Error("Product price must be a positive number");

  return {
    id: normalizedId,
    title,
    category: category || "other",
    price: Math.round(price),
    oldPrice: Number.isFinite(oldPrice) && oldPrice > 0 ? Math.round(oldPrice) : 0,
    badge,
    image,
    imageAlt,
    cardDescription,
    lead,
    specs,
    sizes,
    isActive,
  };
}

async function createProduct(payload) {
  const products = await readProducts();
  const product = normalizeProductPayload(payload);
  if (products.some((item) => item.id === product.id)) {
    throw new Error(`Product "${product.id}" already exists`);
  }
  const next = [product, ...products];
  await writeProducts(next);
  return product;
}

async function updateProduct(productId, payload) {
  const products = await readProducts();
  const existing = products.find((item) => item.id === productId);
  if (!existing) {
    throw new Error(`Product "${productId}" not found`);
  }

  const merged = normalizeProductPayload({ ...existing, ...payload }, productId);
  if (merged.id !== productId && products.some((item) => item.id === merged.id)) {
    throw new Error(`Product "${merged.id}" already exists`);
  }

  const next = products.map((item) => (item.id === productId ? merged : item));
  await writeProducts(next);
  return merged;
}

async function deleteProduct(productId) {
  const products = await readProducts();
  const next = products.filter((item) => item.id !== productId);
  if (next.length === products.length) {
    throw new Error(`Product "${productId}" not found`);
  }
  await writeProducts(next);
}

module.exports = {
  readProducts,
  createProduct,
  updateProduct,
  deleteProduct,
};
