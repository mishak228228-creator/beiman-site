const header = document.getElementById("siteHeader");
const categoryPills = document.querySelectorAll(".category-pill");
const mainNavViewLinks = document.querySelectorAll(".main-nav [data-nav-view]");
const productGrid = document.getElementById("productGrid");
const sortSelect = document.getElementById("sortSelect");
const catalogCountEl = document.getElementById("catalogCount");
const cartToggleBtn = document.getElementById("cartToggleBtn");
const cartBadge = document.getElementById("cartBadge");
const cartToast = document.getElementById("cartToast");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let revealObserver = null;
const CART_STORAGE_KEY = "beiman_cart_v1";

/** Порядок карточек из вёрстки — для стабильной сортировки и режима «Новинки». */
const originalCardIndex = new WeakMap();

let activeCategory = "all";
let cartToastTimer = null;

function initProductOrder() {
  if (!productGrid) return;
  productGrid.querySelectorAll(".product-card").forEach((card, i) => {
    originalCardIndex.set(card, i);
  });
}

function applyCategoryFilter() {
  if (!productGrid) return;

  const cards = productGrid.querySelectorAll(".product-card");
  const total = cards.length;
  let visible = 0;

  cards.forEach((card) => {
    const cat = card.getAttribute("data-category") ?? "";
    const show = activeCategory === "all" || cat === activeCategory;
    card.classList.toggle("is-filtered-out", !show);
    if (show) visible += 1;
  });

  if (catalogCountEl) {
    catalogCountEl.textContent = `Показано ${visible} из ${total} товаров`;
  }
}

function getRevealTargets() {
  return [
    ...document.querySelectorAll(
      ".category-tabs, .catalog-topbar, .product-card, .site-footer, .product-back, .product-detail-visual, .product-detail-body, .product-preorder, .cart-hero, .cart-empty, .cart-item, .cart-summary, .checkout-hero, .checkout-form, .checkout-order, .about-hero, .about-story, .contacts-hero, .contact-card"
    ),
  ];
}

function setupRevealAnimations() {
  if (prefersReducedMotion.matches) return;
  document.body.classList.add("has-motion");

  if (!revealObserver) {
    revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          revealObserver?.unobserve(entry.target);
        });
      },
      { threshold: 0.05, rootMargin: "0px 0px 14% 0px" }
    );
  }

  const targets = getRevealTargets();
  targets.forEach((el, idx) => {
    if (!el.classList.contains("reveal-on-scroll")) {
      el.classList.add("reveal-on-scroll");
      el.style.setProperty("--reveal-delay", `${Math.min(idx * 10, 70)}ms`);
    }
    revealObserver.observe(el);
  });

  requestAnimationFrame(() => {
    targets.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.92) {
        el.classList.add("is-visible");
      }
    });
  });
}

function animateCatalogInteraction() {
  if (prefersReducedMotion.matches || !productGrid) return;
  const visibleCards = [...productGrid.querySelectorAll(".product-card:not(.is-filtered-out)")];
  if (!visibleCards.length) return;

  animateElementsEntrance(visibleCards, {
    staggerMs: 28,
    maxDelayMs: 180,
    durationMs: 480,
    yPx: 10,
    scaleFrom: 0.992,
  });
}

function animateElementsEntrance(elements, options = {}) {
  if (prefersReducedMotion.matches) return;
  const {
    staggerMs = 30,
    maxDelayMs = 220,
    durationMs = 520,
    yPx = 14,
    scaleFrom = 0.988,
  } = options;

  elements.forEach((el, idx) => {
    if (!el || !(el instanceof HTMLElement) || el.offsetParent === null) return;
    const delay = Math.min(idx * staggerMs, maxDelayMs);
    el.getAnimations().forEach((anim) => anim.cancel());
    const anim = el.animate(
      [
        { opacity: 0, transform: `translateY(${yPx}px) scale(${scaleFrom})` },
        { opacity: 1, transform: "translateY(0) scale(1)" },
      ],
      {
        duration: durationMs,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        delay,
        fill: "both",
      }
    );
    anim.onfinish = () => {
      el.style.opacity = "";
      el.style.transform = "";
    };
  });
}

function animateCatalogEntrance() {
  if (prefersReducedMotion.matches || !productGrid) return;
  const visibleCards = [...productGrid.querySelectorAll(".product-card:not(.is-filtered-out)")];
  if (!visibleCards.length) return;

  animateElementsEntrance(visibleCards, {
    staggerMs: 34,
    maxDelayMs: 240,
    durationMs: 520,
    yPx: 14,
    scaleFrom: 0.988,
  });
}

const onScroll = () => {
  if (window.scrollY > 8) {
    header.classList.add("scrolled");
  } else {
    header.classList.remove("scrolled");
  }
};

window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

function selectCategory(slug) {
  activeCategory = slug || "all";
  categoryPills.forEach((item) => {
    const itemCat = item.dataset.category || "all";
    item.classList.toggle("is-active", itemCat === activeCategory);
  });
  applyCategoryFilter();
  if (sortSelect?.value) {
    sortProductGrid(sortSelect.value);
  }
  animateCatalogInteraction();
}

categoryPills.forEach((pill) => {
  pill.addEventListener("click", () => {
    selectCategory(pill.dataset.category || "all");
  });
});

document.querySelectorAll("[data-footer-category]").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    if (/^#p=/.test(location.hash) || location.hash === "#cart" || location.hash === "#checkout" || location.hash === "#about" || location.hash === "#contacts") {
      goToCatalog();
    }
    selectCategory(link.dataset.footerCategory || "all");
    document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

document.querySelectorAll("[data-footer-view]").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const view = link.getAttribute("data-footer-view");
    if (view === "about") {
      location.hash = "about";
      return;
    }
    if (view === "contacts") {
      location.hash = "contacts";
      return;
    }
    if (view === "catalog") {
      goToCatalog();
    }
  });
});

function getCardMeta(card) {
  const priceEl = card.querySelector(".product-price span");
  const priceText = priceEl?.textContent ?? "";
  const price = parseInt(String(priceText).replace(/\D/g, ""), 10) || 0;
  const title = card.querySelector(".product-title")?.textContent?.trim() ?? "";
  const badgeEl = card.querySelector(".product-badge:not(.product-badge--empty)");
  const badge = badgeEl?.textContent?.trim() ?? "";
  return {
    price,
    title,
    isNew: badge === "NEW",
    isHit: badge === "HIT",
    originalIndex: originalCardIndex.get(card) ?? 0,
  };
}

function popularScore(meta) {
  return (meta.isHit ? 2 : 0) + (meta.isNew ? 1 : 0);
}

function sortProductGrid(mode) {
  if (!productGrid) return;

  const cards = [...productGrid.querySelectorAll(".product-card")];
  const wrapped = cards.map((card) => ({
    card,
    meta: getCardMeta(card),
  }));

  const cmpIndex = (a, b) => a.meta.originalIndex - b.meta.originalIndex;

  wrapped.sort((a, b) => {
    const { meta: ma } = a;
    const { meta: mb } = b;

    switch (mode) {
      case "new": {
        if (ma.isNew !== mb.isNew) return mb.isNew ? 1 : -1;
        return cmpIndex(a, b);
      }
      case "popular": {
        const sa = popularScore(ma);
        const sb = popularScore(mb);
        if (sa !== sb) return sb - sa;
        return cmpIndex(a, b);
      }
      case "price-asc":
        if (ma.price !== mb.price) return ma.price - mb.price;
        return cmpIndex(a, b);
      case "price-desc":
        if (ma.price !== mb.price) return mb.price - ma.price;
        return cmpIndex(a, b);
      case "name":
        return ma.title.localeCompare(mb.title, "ru", { sensitivity: "base" });
      default:
        return cmpIndex(a, b);
    }
  });

  wrapped.forEach(({ card }) => productGrid.appendChild(card));
}

sortSelect?.addEventListener("change", () => {
  sortProductGrid(sortSelect.value);
  animateCatalogInteraction();
});

initProductOrder();
applyCategoryFilter();
if (sortSelect?.value) {
  sortProductGrid(sortSelect.value);
}
setupRevealAnimations();

/* ---------- Страница товара: данные, #p=id, предзаказ, модалка ---------- */

const catalogSection = document.getElementById("catalog");
const aboutPage = document.getElementById("aboutPage");
const contactsPage = document.getElementById("contactsPage");
const productPage = document.getElementById("productPage");
const cartPage = document.getElementById("cartPage");
const checkoutPage = document.getElementById("checkoutPage");
const productBack = document.getElementById("productBack");
const productPreorderBack = document.getElementById("productPreorderBack");
const cartBackBtn = document.getElementById("cartBackBtn");
const cartGoCatalogBtn = document.getElementById("cartGoCatalogBtn");
const cartSubtitle = document.getElementById("cartSubtitle");
const cartEmptyState = document.getElementById("cartEmptyState");
const cartLayout = document.getElementById("cartLayout");
const cartItems = document.getElementById("cartItems");
const cartTotalItems = document.getElementById("cartTotalItems");
const cartTotalPrice = document.getElementById("cartTotalPrice");
const cartCheckoutBtn = document.getElementById("cartCheckoutBtn");
const checkoutBackBtn = document.getElementById("checkoutBackBtn");
const checkoutForm = document.getElementById("checkoutForm");
const checkoutPhoneInput = document.getElementById("checkoutPhone");
const checkoutCityInput = document.getElementById("checkoutCity");
const checkoutCitySuggest = document.getElementById("checkoutCitySuggest");
const checkoutPickupSearch = document.getElementById("checkoutPickupSearch");
const checkoutPickupPoint = document.getElementById("checkoutPickupPoint");
const checkoutPickupSelected = document.getElementById("checkoutPickupSelected");
const checkoutPickupList = document.getElementById("checkoutPickupList");
const checkoutPickupHint = document.getElementById("checkoutPickupHint");
const checkoutPickupSection = document.getElementById("checkoutPickupSection");
const checkoutOrderList = document.getElementById("checkoutOrderList");
const checkoutOrderItems = document.getElementById("checkoutOrderItems");
const checkoutOrderSum = document.getElementById("checkoutOrderSum");
const checkoutOrderDelivery = document.getElementById("checkoutOrderDelivery");
const checkoutOrderDeliveryDetails = document.getElementById("checkoutOrderDeliveryDetails");
const checkoutOrderTotal = document.getElementById("checkoutOrderTotal");
const checkoutSubmitBtn = document.getElementById("checkoutSubmitBtn");
const productDetailImg = document.getElementById("productDetailImg");
const productDetailBadge = document.getElementById("productDetailBadge");
const productDetailCategory = document.getElementById("productDetailCategory");
const productDetailTitle = document.getElementById("productDetailTitle");
const productDetailPrice = document.getElementById("productDetailPrice");
const productDetailLead = document.getElementById("productDetailLead");
const productDetailHeading = document.querySelector(".product-detail-heading");
const productDetailSpecs = document.getElementById("productDetailSpecs");
const sizeChipRow = document.getElementById("sizeChipRow");
const sizeChips = sizeChipRow ? [...sizeChipRow.querySelectorAll(".size-chip")] : [];
const sizeHint = document.getElementById("sizeHint");
const sizeChartBtn = document.getElementById("sizeChartBtn");
const sizeChartModal = document.getElementById("sizeChartModal");
const sizeChartBackdrop = document.getElementById("sizeChartBackdrop");
const sizeChartClose = document.getElementById("sizeChartClose");
const sizeChartBody = document.getElementById("sizeChartBody");
const sizeChartContext = document.getElementById("sizeChartContext");
const productPreorderBtn = document.getElementById("productPreorderBtn");
const addCartModal = document.getElementById("addCartModal");
const addCartBackdrop = document.getElementById("addCartBackdrop");
const addCartClose = document.getElementById("addCartClose");
const addCartCancelBtn = document.getElementById("addCartCancelBtn");
const addCartConfirmBtn = document.getElementById("addCartConfirmBtn");
const addCartProductImg = document.getElementById("addCartProductImg");
const addCartProductTitle = document.getElementById("addCartProductTitle");
const addCartProductPrice = document.getElementById("addCartProductPrice");
const addCartSizeGrid = document.getElementById("addCartSizeGrid");
const defaultDocTitle = document.title;
let currentProductId = null;
let addCartProductId = null;
let addCartSelectedSize = null;
let addCartModalHideTimer = null;
const CDEK_BASE_DELIVERY_PRICE = 690;
const CDEK_CITY_DELIVERY_RATES = new Map([
  ["москва", 390],
  ["санкт-петербург", 420],
  ["петербург", 420],
  ["казань", 490],
  ["екатеринбург", 520],
  ["новосибирск", 560],
  ["краснодар", 540],
  ["ростов-на-дону", 540],
  ["самара", 520],
  ["нижний новгород", 520],
  ["челябинск", 560],
  ["уфа", 540],
  ["омск", 560],
  ["пермь", 540],
  ["волгоград", 560],
  ["воронеж", 520],
  ["красноярск", 590],
  ["тюмень", 560],
  ["иркутск", 690],
  ["владивосток", 890],
]);
const CDEK_CALCULATOR_API_URL = "/api/cdek/calculate";
const CDEK_CITIES_API_URL = "/api/cdek/cities";
const CDEK_PICKUP_POINTS_API_URL = "/api/cdek/pickup-points";
const CDEK_CREATE_ORDER_API_URL = "/api/cdek/create-order";
let cdekQuoteState = {
  status: "idle",
  city: "",
  cityCode: "",
  pickupPointCode: "",
  packageKey: "",
  items: 0,
  sum: 0,
  price: null,
  details: null,
};
let cdekQuoteRequestId = 0;
let cdekQuoteTimer = null;
let citySuggestRequestId = 0;
let citySuggestTimer = null;
let pickupPointsRequestId = 0;
let citySuggestHideTimer = null;
let checkoutPickupPointsCache = [];
let checkoutSelectedPickupPoint = null;
let checkoutSelectedCityCode = "";
let checkoutIsSubmitting = false;

function setActiveMainNav(view) {
  mainNavViewLinks.forEach((link) => {
    link.classList.toggle("is-active", link.getAttribute("data-nav-view") === view);
  });
}

/** Полные описания и те же пути к фото, что в карточках каталога */
const PRODUCTS = {
  "real-white": {
    title: "ZIP JACKET “REAL” WHITE",
    category: "ХУДИ",
    price: "5 090 ₽",
    oldPrice: "7 990 ₽",
    badge: "HIT",
    image:
      "/assets/c__Users_User_AppData_Roaming_Cursor_User_workspaceStorage_73735b8900f2d3f26b177be60bb74018_images_photo_2026-04-08_21-24-44-be7e1c7f-c3e7-496b-ae99-5784770accf7.png",
    imageAlt: "Белая спортивная куртка Real Madrid",
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
    title: "ZIP JACKET “BARCA” WHITE",
    category: "ХУДИ",
    price: "5 090 ₽",
    oldPrice: "7 990 ₽",
    badge: "HIT",
    image:
      "/assets/c__Users_User_AppData_Roaming_Cursor_User_workspaceStorage_73735b8900f2d3f26b177be60bb74018_images_photo_2026-04-08_21-24-40-f0b3b725-8b15-4229-8097-77b86de7e3b5.png",
    imageAlt: "Спортивная куртка на молнии",
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
    title: "ZIP JACKET “BARCA” BORDEAUX",
    category: "ХУДИ",
    price: "5 090 ₽",
    oldPrice: "7 990 ₽",
    badge: "",
    image:
      "/assets/c__Users_User_AppData_Roaming_Cursor_User_workspaceStorage_73735b8900f2d3f26b177be60bb74018_images_photo_2026-04-08_21-24-38-e1b935f4-01fb-498c-a73a-d2ea1cbc1de3.png",
    imageAlt: "Бордовая куртка FC Barcelona Nike",
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
    title: "ZIP JACKET “REAL” BLUE",
    category: "ХУДИ",
    price: "5 090 ₽",
    oldPrice: "7 990 ₽",
    badge: "",
    image:
      "/assets/c__Users_User_AppData_Roaming_Cursor_User_workspaceStorage_73735b8900f2d3f26b177be60bb74018_images_photo_2026-04-08_21-24-42-a0e7e20f-536e-4a68-864b-d4ba0186667c.png",
    imageAlt: "Сине-белая спортивная куртка",
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
    title: "Футболка BARCA CLASSIC POLO",
    category: "ФУТБОЛКА",
    price: "3 100 ₽",
    oldPrice: "4 090 ₽",
    badge: "NEW",
    image:
      "/assets/c__Users_User_AppData_Roaming_Cursor_User_workspaceStorage_73735b8900f2d3f26b177be60bb74018_images_photo_2026-04-09_13-58-09-60c1492f-9428-4f54-b47f-7ea217c83894.png",
    imageAlt: "Футболка BARCA CLASSIC POLO",
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
    title: "JERSEY “MADRID” WHITE / GREY",
    category: "ФУТБОЛКА",
    price: "3 100 ₽",
    oldPrice: "4 090 ₽",
    badge: "NEW",
    image:
      "/assets/c__Users_User_AppData_Roaming_Cursor_User_workspaceStorage_73735b8900f2d3f26b177be60bb74018_images_photo_2026-04-09_14-00-25-fe701520-ac18-4e7b-b2ea-a274f6469e88.png",
    imageAlt: "JERSEY MADRID WHITE GREY",
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

let selectedSize = null;
const ALL_SIZES = ["XS", "S", "M", "L", "XL", "2XL"];

const SIZE_CHART_MEASUREMENTS = {
  XS: { chest: "92–96", length: "64–66", sleeve: "58–60" },
  S: { chest: "96–100", length: "66–68", sleeve: "60–62" },
  M: { chest: "100–104", length: "68–70", sleeve: "62–64" },
  L: { chest: "104–108", length: "70–72", sleeve: "64–66" },
  XL: { chest: "108–114", length: "72–74", sleeve: "66–68" },
  "2XL": { chest: "114–120", length: "74–76", sleeve: "68–70" },
};

const SIZE_CHART_HOODIE_MEASUREMENTS = {
  L: { chest: "124", length: "69", shoulder: "47", sleeve: "67" },
  XL: { chest: "128", length: "71", shoulder: "49", sleeve: "69" },
  "2XL": { chest: "130", length: "72", shoulder: "50", sleeve: "71" },
};

/** Худи: в предзаказ только L / XL / 2XL; остальные визуально «нет». */
const HOODIE_PRODUCT_IDS = new Set(["real-white", "barca-white", "barca-bordeaux", "real-blue"]);
/** Футболки: без XS и 2XL. */
const TEE_PRODUCT_IDS = new Set(["tee-barca", "tee-real"]);
/** Real jersey: доступны S-2XL. */
const TEE_REAL_PRODUCT_IDS = new Set(["tee-real"]);
/** Товары с оформлением подробного блока как у футболок. */
const PREMIUM_DETAIL_IDS = new Set([
  "tee-barca",
  "tee-real",
  "real-white",
  "barca-white",
  "barca-bordeaux",
  "real-blue",
]);
let cart = [];

function parsePriceValue(priceText) {
  return parseInt(String(priceText ?? "").replace(/\D/g, ""), 10) || 0;
}

function formatPrice(value) {
  return `${new Intl.NumberFormat("ru-RU").format(Math.max(0, value))} ₽`;
}

function formatCdekPrice(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  return `${new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.max(0, amount))} ₽`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderSelectedPickupChip() {
  if (!checkoutPickupSelected) return;
  if (!checkoutSelectedPickupPoint) {
    checkoutPickupSelected.textContent = "";
    checkoutPickupSelected.classList.add("is-hidden");
    return;
  }
  checkoutPickupSelected.textContent = `Выбран пункт: ${checkoutSelectedPickupPoint.name} [${checkoutSelectedPickupPoint.code}]`;
  checkoutPickupSelected.classList.remove("is-hidden");
}

function showPickupSection() {
  checkoutPickupSection?.classList.remove("is-hidden");
}

function hidePickupSection() {
  checkoutPickupSection?.classList.add("is-hidden");
}

function showCartToast(message = "Товар добавлен в корзину") {
  if (!cartToast) return;
  if (cartToastTimer) {
    clearTimeout(cartToastTimer);
    cartToastTimer = null;
  }

  cartToast.textContent = message;
  cartToast.classList.remove("is-hidden", "is-visible");

  requestAnimationFrame(() => {
    cartToast.classList.add("is-visible");
  });

  cartToastTimer = window.setTimeout(() => {
    cartToast.classList.remove("is-visible");
    window.setTimeout(() => {
      cartToast.classList.add("is-hidden");
    }, 240);
    cartToastTimer = null;
  }, 1800);
}

function sanitizeCartItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => ({
      productId: String(item?.productId ?? ""),
      size: String(item?.size ?? ""),
      qty: Math.max(1, Number(item?.qty) || 1),
    }))
    .filter((item) => item.productId && PRODUCTS[item.productId]);
}

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    return sanitizeCartItems(JSON.parse(raw));
  } catch {
    return [];
  }
}

function saveCart() {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch {
    /* ignore storage write errors */
  }
}

function cartItemKey(productId, size) {
  return `${productId}::${size}`;
}

function getDefaultCartSize(productId) {
  const available = getAvailableSizes(productId);
  const first = ALL_SIZES.find((size) => available.has(size));
  return first || "ONE";
}

function getCartTotals() {
  return cart.reduce(
    (acc, item) => {
      const product = PRODUCTS[item.productId];
      if (!product) return acc;
      acc.items += item.qty;
      acc.sum += parsePriceValue(product.price) * item.qty;
      return acc;
    },
    { items: 0, sum: 0 }
  );
}

function updateCartBadge() {
  const { items } = getCartTotals();
  if (cartBadge) {
    cartBadge.textContent = String(items);
    cartBadge.classList.toggle("is-hidden", items <= 0);
  }
  cartToggleBtn?.classList.toggle("has-items", items > 0);
}

function addCartItem(productId, size) {
  const product = PRODUCTS[productId];
  if (!product) return;
  const finalSize = size || getDefaultCartSize(productId);
  const key = cartItemKey(productId, finalSize);
  const existing = cart.find((item) => cartItemKey(item.productId, item.size) === key);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ productId, size: finalSize, qty: 1 });
  }
  saveCart();
  updateCartBadge();
  renderCart();
  showCartToast("Товар добавлен в корзину");
}

function closeAddCartModal() {
  if (!addCartModal) return;
  if (addCartModalHideTimer) {
    clearTimeout(addCartModalHideTimer);
    addCartModalHideTimer = null;
  }
  addCartModal.classList.remove("is-open");
  addCartModal.setAttribute("aria-hidden", "true");
  addCartModalHideTimer = window.setTimeout(() => {
    addCartModal?.classList.add("is-hidden");
    addCartModalHideTimer = null;
    addCartProductId = null;
    addCartSelectedSize = null;
    document.body.style.overflow = "";
  }, 340);
}

function renderAddCartSizes(productId) {
  if (!addCartSizeGrid) return;
  const available = getAvailableSizes(productId);
  addCartSizeGrid.innerHTML = ALL_SIZES.map((size) => {
    const isAvailable = available.has(size);
    return `
      <button
        type="button"
        class="add-cart-size-option${isAvailable ? "" : " is-unavailable"}"
        data-size="${size}"
        ${isAvailable ? "" : "disabled"}
      >
        <span class="add-cart-size-label">${size}</span>
        <span class="add-cart-size-note">${isAvailable ? "" : "Нет"}</span>
      </button>
    `;
  }).join("");
}

function openAddCartModal(productId) {
  const product = PRODUCTS[productId];
  if (!product || !addCartModal) return;
  if (addCartModalHideTimer) {
    clearTimeout(addCartModalHideTimer);
    addCartModalHideTimer = null;
  }
  addCartProductId = productId;
  addCartSelectedSize = null;
  if (addCartProductImg) {
    addCartProductImg.src = product.image;
    addCartProductImg.alt = product.imageAlt;
  }
  if (addCartProductTitle) addCartProductTitle.textContent = product.title;
  if (addCartProductPrice) addCartProductPrice.textContent = product.price;
  if (addCartConfirmBtn) {
    addCartConfirmBtn.disabled = true;
    addCartConfirmBtn.textContent = "ВЫБЕРИТЕ РАЗМЕР";
  }
  renderAddCartSizes(productId);
  addCartModal.classList.remove("is-hidden");
  requestAnimationFrame(() => {
    addCartModal?.classList.add("is-open");
  });
  addCartModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  addCartClose?.focus();
}

function changeCartItemQty(productId, size, delta) {
  const key = cartItemKey(productId, size);
  const item = cart.find((i) => cartItemKey(i.productId, i.size) === key);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter((i) => cartItemKey(i.productId, i.size) !== key);
  }
  saveCart();
  updateCartBadge();
  renderCart();
}

function removeCartItem(productId, size) {
  const key = cartItemKey(productId, size);
  cart = cart.filter((item) => cartItemKey(item.productId, item.size) !== key);
  saveCart();
  updateCartBadge();
  renderCart();
}

function renderCart() {
  if (!cartItems || !cartLayout || !cartEmptyState || !cartSubtitle || !cartTotalItems || !cartTotalPrice) return;

  const visibleItems = cart.filter((item) => PRODUCTS[item.productId]);
  const { items, sum } = getCartTotals();
  cartSubtitle.textContent = `${items} товаров на сумму ${formatPrice(sum)}`;
  cartTotalItems.textContent = String(items);
  cartTotalPrice.textContent = formatPrice(sum);
  if (cartCheckoutBtn) cartCheckoutBtn.disabled = items <= 0;

  if (!visibleItems.length) {
    cartItems.innerHTML = "";
    cartLayout.classList.add("is-hidden");
    cartEmptyState.classList.remove("is-hidden");
    renderCheckoutOrder();
    return;
  }

  cartEmptyState.classList.add("is-hidden");
  cartLayout.classList.remove("is-hidden");

  cartItems.innerHTML = visibleItems
    .map((item) => {
      const product = PRODUCTS[item.productId];
      if (!product) return "";
      const unitPrice = parsePriceValue(product.price);
      const lineSum = formatPrice(unitPrice * item.qty);
      return `
        <article class="cart-item reveal-on-scroll is-visible">
          <div class="cart-item-media">
            <img src="${product.image}" alt="${product.imageAlt}" loading="lazy" />
          </div>
          <div class="cart-item-body">
            <p class="cart-item-category">${product.category}</p>
            <h3 class="cart-item-title">${product.title}</h3>
            <p class="cart-item-size">Размер: ${item.size}</p>
            <div class="cart-item-controls">
              <button type="button" class="cart-qty-btn" data-action="dec" data-product-id="${item.productId}" data-size="${item.size}" aria-label="Уменьшить количество">−</button>
              <span class="cart-qty-value">${item.qty}</span>
              <button type="button" class="cart-qty-btn" data-action="inc" data-product-id="${item.productId}" data-size="${item.size}" aria-label="Увеличить количество">+</button>
            </div>
          </div>
          <div class="cart-item-meta">
            <p class="cart-item-price">${lineSum}</p>
            <button type="button" class="cart-remove-btn" data-action="remove" data-product-id="${item.productId}" data-size="${item.size}">
              Удалить
            </button>
          </div>
        </article>
      `;
    })
    .join("");
  renderCheckoutOrder();
}

function renderCheckoutOrder() {
  if (!checkoutOrderList || !checkoutOrderTotal) return;
  const visibleItems = cart.filter((item) => PRODUCTS[item.productId]);
  const { items, sum } = getCartTotals();
  const packageMetrics = getCheckoutPackageMetrics();
  const city = checkoutCityInput?.value || "";
  const cityCode = checkoutSelectedCityCode || "";
  const pickupPointCode = checkoutPickupPoint?.value || "";
  const deliverySummary = getCheckoutDeliverySummary(city, cityCode, pickupPointCode, packageMetrics.key, items, sum);
  const hasExactDeliveryPrice = typeof deliverySummary.price === "number" && Number.isFinite(deliverySummary.price);
  const totalToPay = hasExactDeliveryPrice ? sum + deliverySummary.price : null;
  if (checkoutOrderItems) checkoutOrderItems.textContent = `${items} шт`;
  if (checkoutOrderSum) checkoutOrderSum.textContent = formatPrice(sum);
  if (checkoutOrderDelivery) {
    checkoutOrderDelivery.textContent = deliverySummary.label;
  }
  renderCheckoutDeliveryDetails(deliverySummary);
  checkoutOrderTotal.textContent = totalToPay === null ? "—" : formatPrice(totalToPay);
  requestCdekQuoteDebounced(city, cityCode, pickupPointCode, packageMetrics, items, sum);

  if (!visibleItems.length) {
    checkoutOrderList.innerHTML = `<p class="checkout-order-empty">Корзина пока пустая. Добавьте товары из каталога.</p>`;
    updateCheckoutSubmitState();
    return;
  }

  checkoutOrderList.innerHTML = visibleItems
    .map((item) => {
      const product = PRODUCTS[item.productId];
      if (!product) return "";
      const lineSum = formatPrice(parsePriceValue(product.price) * item.qty);
      return `
        <article class="checkout-order-item">
          <div class="checkout-order-item-media">
            <img src="${product.image}" alt="${product.imageAlt}" loading="lazy" />
          </div>
          <div class="checkout-order-item-body">
            <div class="checkout-order-item-head">
              <p class="checkout-order-item-title">${product.title}</p>
              <span class="checkout-order-item-category">${product.category}</span>
            </div>
            <p class="checkout-order-item-meta">Размер: ${item.size} · Кол-во: ${item.qty}</p>
          </div>
          <div class="checkout-order-item-side">
            <p class="checkout-order-item-price">${lineSum}</p>
            <button
              type="button"
              class="checkout-order-remove-btn"
              data-product-id="${item.productId}"
              data-size="${item.size}"
              aria-label="Удалить товар из заказа"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M4 7h16 M9 7V5h6v2 M7 7l1 12h8l1-12 M10 11v5 M14 11v5"
                />
              </svg>
            </button>
          </div>
        </article>
      `;
    })
    .join("");

  updateCheckoutSubmitState();
}

function updateCheckoutSubmitState() {
  if (!checkoutForm) return;
  const submitBtn =
    (checkoutSubmitBtn instanceof HTMLButtonElement && checkoutSubmitBtn) ||
    checkoutForm.querySelector(".checkout-submit-btn");
  if (!(submitBtn instanceof HTMLButtonElement)) return;
  const { items } = getCartTotals();
  const cityReady = Boolean(checkoutSelectedCityCode);
  const pickupReady = Boolean(checkoutPickupPoint?.value);
  const sum = Math.max(0, getCartTotals().sum || 0);
  const packageMetrics = getCheckoutPackageMetrics();
  const deliverySummary = getCheckoutDeliverySummary(
    checkoutCityInput?.value || "",
    checkoutSelectedCityCode || "",
    checkoutPickupPoint?.value || "",
    packageMetrics.key,
    items,
    sum
  );
  const exactDeliveryReady = deliverySummary.source === "api" && typeof deliverySummary.price === "number";
  submitBtn.disabled =
    items <= 0 || !checkoutForm.checkValidity() || !cityReady || !pickupReady || !exactDeliveryReady || checkoutIsSubmitting;
}

function normalizeCityName(city) {
  return String(city || "")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\s+/g, " ");
}

function getCheckoutPackageMetrics() {
  const packageSignature = [];
  let totalWeightGrams = 0;
  let totalVolumeCm3 = 0;

  cart.forEach((item) => {
    const product = PRODUCTS[item.productId];
    if (!product || item.qty <= 0) return;
    const category = String(product.category || "").toUpperCase();
    const profile = category.includes("ХУДИ")
      ? { weightGrams: 1250, lengthCm: 40, widthCm: 32, heightCm: 10 }
      : { weightGrams: 620, lengthCm: 34, widthCm: 26, heightCm: 5 };
    const count = Math.max(1, Number(item.qty) || 1);
    totalWeightGrams += profile.weightGrams * count;
    totalVolumeCm3 += profile.lengthCm * profile.widthCm * profile.heightCm * count;
    packageSignature.push(`${item.productId}:${count}`);
  });

  if (!packageSignature.length) {
    packageSignature.push("default:1");
    totalWeightGrams = 700;
    totalVolumeCm3 = 30 * 20 * 8;
  }

  const summaryLengthCm = 36;
  const summaryWidthCm = 28;
  const summaryWeightGrams = Math.max(100, Math.round(totalWeightGrams));
  const summaryHeightCm = Math.max(
    6,
    Math.min(70, Math.ceil(Math.max(summaryLengthCm * summaryWidthCm * 6, totalVolumeCm3) / (summaryLengthCm * summaryWidthCm)))
  );
  const key = packageSignature
    .slice()
    .sort((a, b) => String(a).localeCompare(String(b)))
    .join("|");

  return {
    lengthCm: summaryLengthCm,
    widthCm: summaryWidthCm,
    heightCm: summaryHeightCm,
    weightGrams: summaryWeightGrams,
    key,
  };
}

function getCheckoutDeliverySummary(city, cityCode, pickupPointCode, packageKey, itemsCount, sum) {
  if (!itemsCount) {
    return { price: 0, label: "—", source: "empty", details: null };
  }

  if (!cityCode) {
    return { price: null, label: "Выберите город", source: "none", details: null };
  }
  if (!pickupPointCode) {
    return { price: null, label: "Выберите ПВЗ", source: "none", details: null };
  }

  const normalized = normalizeCityName(city);
  if (!normalized) {
    return { price: null, label: "Введите город", source: "none", details: null };
  }

  const stateMatches =
    cdekQuoteState.city === normalized &&
    cdekQuoteState.cityCode === cityCode &&
    cdekQuoteState.pickupPointCode === pickupPointCode &&
    cdekQuoteState.packageKey === packageKey &&
    cdekQuoteState.items === itemsCount &&
    cdekQuoteState.sum === sum;

  if (stateMatches && cdekQuoteState.status === "ok" && typeof cdekQuoteState.price === "number") {
    return {
      price: cdekQuoteState.price,
      label: formatCdekPrice(cdekQuoteState.price),
      source: "api",
      details: cdekQuoteState.details || null,
    };
  }

  if (stateMatches && cdekQuoteState.status === "loading") {
    return { price: null, label: "Расчёт СДЭК...", source: "loading", details: null };
  }

  if (stateMatches && cdekQuoteState.status === "error") {
    return { price: null, label: "Не удалось рассчитать", source: "error", details: null };
  }

  return { price: null, label: "Ожидаем расчёт СДЭК", source: "idle", details: null };
}

function normalizeCdekDetails(rawDetails) {
  if (!rawDetails || typeof rawDetails !== "object") return null;
  const toInt = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? Math.round(num) : null;
  };
  const toMoney = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? Number(num.toFixed(2)) : null;
  };
  const list = Array.isArray(rawDetails.services) ? rawDetails.services : [];
  const services = list
    .map((service) => {
      const sum = toMoney(service?.sum);
      if (sum === null || sum === 0) return null;
      const name = String(service?.name || service?.code || "Услуга").trim();
      if (!name) return null;
      return { name, sum };
    })
    .filter(Boolean);

  const details = {
    tariffCode: toInt(rawDetails.tariffCode),
    tariffName: String(rawDetails.tariffName || "").trim() || null,
    periodMin: toInt(rawDetails.periodMin),
    periodMax: toInt(rawDetails.periodMax),
    deliverySum: toMoney(rawDetails.deliverySum),
    totalSum: toMoney(rawDetails.totalSum),
    vatSum: toMoney(rawDetails.vatSum),
    services,
  };

  const hasValue =
    details.tariffCode !== null ||
    Boolean(details.tariffName) ||
    details.periodMin !== null ||
    details.periodMax !== null ||
    details.deliverySum !== null ||
    details.totalSum !== null ||
    details.vatSum !== null ||
    details.services.length > 0;

  return hasValue ? details : null;
}

function renderCheckoutDeliveryDetails(deliverySummary) {
  if (!checkoutOrderDeliveryDetails) return;
  if (!deliverySummary || deliverySummary.source !== "api" || !deliverySummary.details) {
    checkoutOrderDeliveryDetails.innerHTML = "";
    checkoutOrderDeliveryDetails.classList.add("is-hidden");
    return;
  }

  const details = deliverySummary.details;
  const periodFrom = details.periodMin ?? details.periodMax;
  const periodTo = details.periodMax ?? details.periodMin;
  const periodLabel =
    periodFrom === null || periodTo === null
      ? "—"
      : periodFrom === periodTo
      ? `${periodFrom}-${periodTo} дней`
      : `${periodFrom}-${periodTo} дней`;
  const priceValue = details.totalSum ?? details.deliverySum ?? deliverySummary.price;
  const rows = [
    { label: "Стоимость доставки", value: formatCdekPrice(priceValue) },
    { label: "Срок доставки", value: periodLabel },
  ];

  checkoutOrderDeliveryDetails.innerHTML = rows
    .map(
      (row) =>
        `<div class="checkout-delivery-detail-row"><span>${escapeHtml(row.label)}:</span><strong>${escapeHtml(
          row.value
        )}</strong></div>`
    )
    .join("");
  checkoutOrderDeliveryDetails.classList.remove("is-hidden");
}

function hideCitySuggestions() {
  if (!checkoutCitySuggest) return;
  checkoutCitySuggest.classList.add("is-hidden");
  checkoutCitySuggest.innerHTML = "";
}

function renderCitySuggestions(cities) {
  if (!checkoutCitySuggest) return;
  if (!Array.isArray(cities) || cities.length === 0) {
    hideCitySuggestions();
    return;
  }
  checkoutCitySuggest.innerHTML = cities
    .map(
      (city) => `
        <button
          type="button"
          class="checkout-city-option"
          data-city-code="${city.code}"
          data-city-name="${city.cityName}"
          data-city-region="${city.region || ""}"
          data-city-country="${city.country || ""}"
        >
          ${city.cityName}
          <small>${[city.region, city.country].filter(Boolean).join(", ") || "Без региона"}</small>
        </button>
      `
    )
    .join("");
  checkoutCitySuggest.classList.remove("is-hidden");
}

function showCitySuggestionsMessage(message) {
  if (!checkoutCitySuggest) return;
  checkoutCitySuggest.innerHTML = `<div class="checkout-city-option" aria-hidden="true">${escapeHtml(message)}</div>`;
  checkoutCitySuggest.classList.remove("is-hidden");
}

function resetPickupPoints(message = "Сначала выберите город") {
  if (!checkoutPickupPoint || !checkoutPickupList) return;
  checkoutPickupPointsCache = [];
  checkoutSelectedPickupPoint = null;
  checkoutPickupPoint.value = "";
  renderSelectedPickupChip();
  checkoutPickupList.innerHTML = `<p class="checkout-pickup-empty">${escapeHtml(message)}</p>`;
  if (checkoutPickupSearch) {
    checkoutPickupSearch.value = "";
    checkoutPickupSearch.disabled = true;
  }
  if (checkoutPickupHint) {
    checkoutPickupHint.textContent = "Пункты выдачи подгружаются автоматически по городу";
  }
}

function applyPickupPointFilter(query) {
  if (!checkoutPickupList || !checkoutPickupPoint) return;
  const search = normalizeCityName(query);
  const filtered = checkoutPickupPointsCache.filter((point) => {
    if (!search) return true;
    return normalizeCityName(`${point.name} ${point.address}`).includes(search);
  });

  if (!filtered.length) {
    checkoutPickupPoint.value = "";
    checkoutSelectedPickupPoint = null;
    renderSelectedPickupChip();
    checkoutPickupList.innerHTML = '<p class="checkout-pickup-empty">По вашему запросу ПВЗ не найдены</p>';
    if (checkoutPickupHint) checkoutPickupHint.textContent = "Измените запрос поиска или выберите другой город";
    updateCheckoutSubmitState();
    return;
  }

  if (filtered.length === 1 && (!checkoutSelectedPickupPoint || checkoutSelectedPickupPoint.code !== filtered[0].code)) {
    checkoutSelectedPickupPoint = filtered[0];
    checkoutPickupPoint.value = filtered[0].code;
  }
  renderSelectedPickupChip();
  checkoutPickupList.innerHTML = filtered
    .map((point) => {
      const isActive = checkoutSelectedPickupPoint?.code === point.code;
      const meta = [point.workTime, point.phone].filter(Boolean).join("  •  ");
      return `
        <button type="button" class="checkout-pvz-item${isActive ? " is-active" : ""}" data-pvz-code="${escapeHtml(point.code)}">
          <span class="checkout-pvz-head">
            <span class="checkout-pvz-name">${escapeHtml(point.name)}</span>
            <span class="checkout-pvz-code">${escapeHtml(point.code)}</span>
          </span>
          <span class="checkout-pvz-address">${escapeHtml(point.address)}</span>
          ${meta ? `<span class="checkout-pvz-meta">${escapeHtml(meta)}</span>` : ""}
          ${point.note ? `<span class="checkout-pvz-meta">${escapeHtml(point.note)}</span>` : ""}
        </button>
      `;
    })
    .join("");
  if (checkoutPickupHint) {
    checkoutPickupHint.textContent =
      filtered.length === 1
        ? `Автоматически выбран ПВЗ: ${filtered[0].name}`
        : `Пунктов выдачи: ${filtered.length}${search ? ` из ${checkoutPickupPointsCache.length}` : ""}`;
  }
  updateCheckoutSubmitState();
}

function renderPickupPoints(points) {
  checkoutPickupPointsCache = Array.isArray(points) ? points : [];
  if (!checkoutPickupPointsCache.length) {
    resetPickupPoints("Пункты выдачи не найдены");
    if (checkoutPickupHint) checkoutPickupHint.textContent = "Для этого города СДЭК не вернул ПВЗ";
    showPickupSection();
    return;
  }
  if (checkoutPickupSearch) {
    checkoutPickupSearch.disabled = false;
    checkoutPickupSearch.value = "";
  }
  checkoutSelectedPickupPoint = null;
  checkoutPickupPoint.value = "";
  renderSelectedPickupChip();
  applyPickupPointFilter("");
  showPickupSection();
}

async function requestPickupPoints(cityCode) {
  if (!cityCode || !checkoutPickupPoint || !checkoutPickupList) return;
  const requestId = ++pickupPointsRequestId;
  checkoutPickupPointsCache = [];
  checkoutPickupPoint.value = "";
  checkoutSelectedPickupPoint = null;
  checkoutPickupList.innerHTML = '<p class="checkout-pickup-empty">Загрузка пунктов выдачи...</p>';
  renderSelectedPickupChip();
  if (checkoutPickupSearch) {
    checkoutPickupSearch.value = "";
    checkoutPickupSearch.disabled = true;
  }
  if (checkoutPickupHint) checkoutPickupHint.textContent = "Получаем список ПВЗ СДЭК...";

  try {
    const response = await fetch(`${CDEK_PICKUP_POINTS_API_URL}?cityCode=${encodeURIComponent(cityCode)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (requestId !== pickupPointsRequestId) return;
    renderPickupPoints(Array.isArray(data?.points) ? data.points : []);
  } catch {
    if (requestId !== pickupPointsRequestId) return;
    checkoutPickupPoint.value = "";
    checkoutPickupList.innerHTML = '<p class="checkout-pickup-empty">Ошибка загрузки пунктов выдачи</p>';
    if (checkoutPickupSearch) checkoutPickupSearch.disabled = true;
    if (checkoutPickupHint) checkoutPickupHint.textContent = "Не удалось загрузить ПВЗ, попробуйте выбрать город снова";
  }
}

function selectCheckoutCity(cityCode, cityName) {
  if (checkoutCityInput) checkoutCityInput.value = cityName;
  checkoutSelectedCityCode = String(cityCode || "");
  hideCitySuggestions();
  void requestPickupPoints(cityCode);
  updateCheckoutSubmitState();
  renderCheckoutOrder();
}

function requestCitySuggestionsDebounced(query) {
  const normalized = normalizeCityName(query);
  if (!normalized || normalized.length < 2) {
    hideCitySuggestions();
    return;
  }

  if (citySuggestTimer) {
    clearTimeout(citySuggestTimer);
    citySuggestTimer = null;
  }

  citySuggestTimer = window.setTimeout(() => {
    citySuggestTimer = null;
    void requestCitySuggestions(query);
  }, 280);
}

async function requestCitySuggestions(query) {
  const normalized = normalizeCityName(query);
  if (!normalized || normalized.length < 2) {
    hideCitySuggestions();
    return;
  }

  const requestId = ++citySuggestRequestId;
  try {
    const response = await fetch(`${CDEK_CITIES_API_URL}?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    if (requestId !== citySuggestRequestId) return;
    renderCitySuggestions(Array.isArray(data?.cities) ? data.cities : []);
  } catch {
    if (requestId !== citySuggestRequestId) return;
    showCitySuggestionsMessage("Не удалось загрузить подсказки. Проверьте CDEK API и попробуйте снова.");
  }
}

function requestCdekQuoteDebounced(city, cityCode, pickupPointCode, packageMetrics, itemsCount, sum) {
  const normalized = normalizeCityName(city);
  const packageKey = String(packageMetrics?.key || "");
  if (!normalized || !cityCode || !pickupPointCode || !itemsCount || !packageKey) return;

  const isFreshLoading =
    cdekQuoteState.status === "loading" &&
    cdekQuoteState.city === normalized &&
    cdekQuoteState.cityCode === cityCode &&
    cdekQuoteState.pickupPointCode === pickupPointCode &&
    cdekQuoteState.packageKey === packageKey &&
    cdekQuoteState.items === itemsCount &&
    cdekQuoteState.sum === sum;
  const isFreshQuote =
    cdekQuoteState.status === "ok" &&
    cdekQuoteState.city === normalized &&
    cdekQuoteState.cityCode === cityCode &&
    cdekQuoteState.pickupPointCode === pickupPointCode &&
    cdekQuoteState.packageKey === packageKey &&
    cdekQuoteState.items === itemsCount &&
    cdekQuoteState.sum === sum;

  if (isFreshLoading || isFreshQuote) return;

  if (cdekQuoteTimer) {
    clearTimeout(cdekQuoteTimer);
    cdekQuoteTimer = null;
  }

  cdekQuoteTimer = window.setTimeout(() => {
    cdekQuoteTimer = null;
    void requestCdekQuote(city, cityCode, pickupPointCode, packageMetrics, itemsCount, sum);
  }, 420);
}

async function requestCdekQuote(city, cityCode, pickupPointCode, packageMetrics, itemsCount, sum) {
  const normalized = normalizeCityName(city);
  const packageKey = String(packageMetrics?.key || "");
  if (!normalized || !cityCode || !pickupPointCode || !itemsCount || !packageKey) return;

  const requestId = ++cdekQuoteRequestId;
  cdekQuoteState = {
    status: "loading",
    city: normalized,
    cityCode,
    pickupPointCode,
    packageKey,
    items: itemsCount,
    sum,
    price: null,
    details: null,
  };
  renderCheckoutOrder();

  try {
    const response = await fetch(CDEK_CALCULATOR_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        city,
        cityCode: Number(cityCode),
        pickupPointCode,
        pickupPointLatitude: checkoutSelectedPickupPoint?.latitude ?? null,
        pickupPointLongitude: checkoutSelectedPickupPoint?.longitude ?? null,
        packageWeightGrams: Number(packageMetrics.weightGrams),
        packageLengthCm: Number(packageMetrics.lengthCm),
        packageWidthCm: Number(packageMetrics.widthCm),
        packageHeightCm: Number(packageMetrics.heightCm),
        itemsCount,
        orderSum: sum,
      }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const rawPrice = Number(data?.deliveryPrice);
    if (!Number.isFinite(rawPrice) || rawPrice < 0) throw new Error("Invalid delivery price");
    const details = normalizeCdekDetails(data?.deliveryDetails);

    if (requestId !== cdekQuoteRequestId) return;
    cdekQuoteState = {
      status: "ok",
      city: normalized,
      cityCode,
      pickupPointCode,
      packageKey,
      items: itemsCount,
      sum,
      price: Number(rawPrice.toFixed(2)),
      details,
    };
  } catch {
    if (requestId !== cdekQuoteRequestId) return;
    cdekQuoteState = {
      status: "error",
      city: normalized,
      cityCode,
      pickupPointCode,
      packageKey,
      items: itemsCount,
      sum,
      price: null,
      details: null,
    };
  }

  renderCheckoutOrder();
}

function formatRussianPhone(rawValue) {
  const digits = String(rawValue || "").replace(/\D/g, "");
  let normalized = digits;
  if (normalized.startsWith("8")) normalized = `7${normalized.slice(1)}`;
  if (!normalized.startsWith("7")) normalized = `7${normalized}`;
  normalized = normalized.slice(0, 11);

  const national = normalized.slice(1);
  const p1 = national.slice(0, 3);
  const p2 = national.slice(3, 6);
  const p3 = national.slice(6, 8);
  const p4 = national.slice(8, 10);

  let out = "+7";
  if (p1) out += ` (${p1}`;
  if (p1.length === 3) out += ")";
  if (p2) out += ` ${p2}`;
  if (p3) out += `-${p3}`;
  if (p4) out += `-${p4}`;
  return out;
}

function getCaretByDigitCount(formattedValue, digitCount) {
  if (digitCount <= 0) return 0;
  let seenDigits = 0;
  for (let i = 0; i < formattedValue.length; i += 1) {
    if (/\d/.test(formattedValue[i])) {
      seenDigits += 1;
      if (seenDigits >= digitCount) return i + 1;
    }
  }
  return formattedValue.length;
}

function getAvailableSizes(productId) {
  if (HOODIE_PRODUCT_IDS.has(productId)) {
    return new Set(["L", "XL", "2XL"]);
  }
  if (TEE_REAL_PRODUCT_IDS.has(productId)) {
    return new Set(["S", "M", "L", "XL", "2XL"]);
  }
  if (TEE_PRODUCT_IDS.has(productId)) {
    return new Set(["S", "M", "L", "XL"]);
  }
  return new Set(ALL_SIZES);
}

function renderSizeChart(productId) {
  if (!sizeChartBody) return;

  const availableSizes = getAvailableSizes(productId);
  const measureMap = HOODIE_PRODUCT_IDS.has(productId) ? SIZE_CHART_HOODIE_MEASUREMENTS : SIZE_CHART_MEASUREMENTS;
  sizeChartBody.innerHTML = ALL_SIZES.map((size) => {
    const measure = measureMap[size];
    if (!measure) return "";
    const isAvailable = availableSizes.has(size);
    const shoulder = measure.shoulder ?? "—";
    return `
      <tr class="${isAvailable ? "" : "is-unavailable"}">
        <td>
          <span class="size-chart-size">${size === "2XL" ? "XXL" : size}</span>
          ${isAvailable ? "" : '<span class="size-chart-tag">нет размера</span>'}
        </td>
        <td>${isAvailable ? measure.chest : "—"}</td>
        <td>${isAvailable ? measure.length : "—"}</td>
        <td>${isAvailable ? shoulder : "—"}</td>
        <td>${isAvailable ? measure.sleeve : "—"}</td>
      </tr>
    `;
  }).join("");

  if (!sizeChartContext) return;
  const product = PRODUCTS[productId];
  const visibleSizes = ALL_SIZES.filter((size) => availableSizes.has(size)).join(", ");
  sizeChartContext.textContent = product
    ? `${product.title}: доступны размеры ${visibleSizes}.`
    : `Доступные размеры: ${visibleSizes}.`;
}

function applySizeAvailability(productId) {
  if (!sizeChips.length) return;
  const available = getAvailableSizes(productId);

  sizeChips.forEach((chip) => {
    const size = chip.getAttribute("data-size") ?? "";
    const ok = available.has(size);
    chip.classList.toggle("is-unavailable", !ok);
    chip.disabled = !ok;
    chip.setAttribute("aria-disabled", ok ? "false" : "true");
    if (!ok) {
      chip.classList.remove("is-selected");
      chip.setAttribute("aria-checked", "false");
    }
  });
}

function getProductIdFromHash() {
  const raw = location.hash.replace(/^#/, "");
  const m = /^p=([^&]+)$/.exec(raw);
  return m ? decodeURIComponent(m[1]) : null;
}

function resetSizeSelection() {
  selectedSize = null;
  sizeChips.forEach((chip) => {
    chip.classList.remove("is-selected");
    chip.setAttribute("aria-checked", "false");
  });
  if (sizeHint) {
    sizeHint.textContent = "";
    sizeHint.classList.remove("is-error");
  }
}

function renderProductDetail(id) {
  const data = PRODUCTS[id];
  if (!data) return;
  currentProductId = id;
  const isPremiumDetailProduct = PREMIUM_DETAIL_IDS.has(id);

  if (productDetailImg) {
    productDetailImg.src = data.image;
    productDetailImg.alt = data.imageAlt;
  }
  if (productDetailBadge) {
    const has = Boolean(data.badge);
    productDetailBadge.textContent = has ? data.badge : "";
    productDetailBadge.classList.toggle("product-badge--empty", !has);
    productDetailBadge.setAttribute("aria-hidden", has ? "false" : "true");
  }
  if (productDetailCategory) productDetailCategory.textContent = data.category;
  if (productDetailTitle) productDetailTitle.textContent = data.title;
  if (productDetailPrice) {
    productDetailPrice.innerHTML = `<span>${data.price}</span> <s>${data.oldPrice}</s>`;
  }
  if (productDetailLead) productDetailLead.textContent = data.lead;
  productDetailLead?.classList.toggle("is-tee-lead", isPremiumDetailProduct);
  productDetailHeading?.classList.toggle("is-tee-heading", isPremiumDetailProduct);
  if (productDetailSpecs) {
    productDetailSpecs.classList.toggle("is-tee-specs", isPremiumDetailProduct);
    productDetailSpecs.innerHTML = data.specs
      .map(([k, v]) => {
        const key = String(k ?? "").trim();
        const isBullet = key === "—";
        const value = isBullet ? String(v).replace(/^—\s*/, "") : String(v);
        return `<li class="product-spec-row${isBullet ? " is-bullet" : ""}"><span class="product-spec-key">${key}</span><span class="product-spec-value">${value}</span></li>`;
      })
      .join("");
  }

  document.title = `${data.title} | BEIMAN`;
  applySizeAvailability(id);
  renderSizeChart(id);
}

function showCatalogView() {
  closeSizeChartModal();
  closeAddCartModal();
  document.title = defaultDocTitle;
  setActiveMainNav("catalog");
  catalogSection?.classList.remove("is-hidden");
  aboutPage?.classList.add("is-hidden");
  aboutPage?.setAttribute("aria-hidden", "true");
  contactsPage?.classList.add("is-hidden");
  contactsPage?.setAttribute("aria-hidden", "true");
  productPage?.classList.add("is-hidden");
  productPage?.setAttribute("aria-hidden", "true");
  cartPage?.classList.add("is-hidden");
  cartPage?.setAttribute("aria-hidden", "true");
  checkoutPage?.classList.add("is-hidden");
  checkoutPage?.setAttribute("aria-hidden", "true");
  window.scrollTo({ top: 0, behavior: "auto" });
  setupRevealAnimations();
  requestAnimationFrame(() => {
    animateCatalogEntrance();
  });
}

function showProductView(id) {
  if (!PRODUCTS[id] || !productPage || !catalogSection) {
    showCatalogView();
    return;
  }

  catalogSection.classList.add("is-hidden");
  setActiveMainNav("catalog");
  aboutPage?.classList.add("is-hidden");
  aboutPage?.setAttribute("aria-hidden", "true");
  contactsPage?.classList.add("is-hidden");
  contactsPage?.setAttribute("aria-hidden", "true");
  closeAddCartModal();
  cartPage?.classList.add("is-hidden");
  cartPage?.setAttribute("aria-hidden", "true");
  checkoutPage?.classList.add("is-hidden");
  checkoutPage?.setAttribute("aria-hidden", "true");
  productPage.classList.remove("is-hidden");
  productPage.setAttribute("aria-hidden", "false");
  renderProductDetail(id);
  resetSizeSelection();
  window.scrollTo({ top: 0, behavior: "smooth" });
  setupRevealAnimations();
  requestAnimationFrame(() => {
    animateElementsEntrance(
      [
        productBack,
        document.querySelector(".product-detail-visual"),
        document.querySelector(".product-detail-body"),
        document.querySelector(".product-preorder"),
      ].filter(Boolean),
      { staggerMs: 46, maxDelayMs: 200, durationMs: 540, yPx: 14, scaleFrom: 0.992 }
    );
  });
}

function showCartView() {
  closeSizeChartModal();
  closeAddCartModal();
  document.title = `Корзина | BEIMAN`;
  setActiveMainNav("catalog");
  catalogSection?.classList.add("is-hidden");
  aboutPage?.classList.add("is-hidden");
  aboutPage?.setAttribute("aria-hidden", "true");
  contactsPage?.classList.add("is-hidden");
  contactsPage?.setAttribute("aria-hidden", "true");
  productPage?.classList.add("is-hidden");
  productPage?.setAttribute("aria-hidden", "true");
  cartPage?.classList.remove("is-hidden");
  cartPage?.setAttribute("aria-hidden", "false");
  checkoutPage?.classList.add("is-hidden");
  checkoutPage?.setAttribute("aria-hidden", "true");
  renderCart();
  window.scrollTo({ top: 0, behavior: "smooth" });
  setupRevealAnimations();
  requestAnimationFrame(() => {
    animateElementsEntrance(
      [
        document.querySelector(".cart-hero"),
        ...document.querySelectorAll(".cart-item"),
        document.querySelector(".cart-summary"),
        cartEmptyState && !cartEmptyState.classList.contains("is-hidden") ? cartEmptyState : null,
      ].filter(Boolean),
      { staggerMs: 34, maxDelayMs: 220, durationMs: 520, yPx: 12, scaleFrom: 0.992 }
    );
  });
}

function showCheckoutView() {
  closeSizeChartModal();
  closeAddCartModal();
  document.title = `Оформление заказа | BEIMAN`;
  setActiveMainNav("catalog");
  catalogSection?.classList.add("is-hidden");
  aboutPage?.classList.add("is-hidden");
  aboutPage?.setAttribute("aria-hidden", "true");
  contactsPage?.classList.add("is-hidden");
  contactsPage?.setAttribute("aria-hidden", "true");
  productPage?.classList.add("is-hidden");
  productPage?.setAttribute("aria-hidden", "true");
  cartPage?.classList.add("is-hidden");
  cartPage?.setAttribute("aria-hidden", "true");
  checkoutPage?.classList.remove("is-hidden");
  checkoutPage?.setAttribute("aria-hidden", "false");
  renderCheckoutOrder();
  window.scrollTo({ top: 0, behavior: "smooth" });
  setupRevealAnimations();
  requestAnimationFrame(() => {
    animateElementsEntrance(
      [document.querySelector(".checkout-hero"), checkoutForm, document.querySelector(".checkout-order")].filter(Boolean),
      { staggerMs: 36, maxDelayMs: 140, durationMs: 520, yPx: 12, scaleFrom: 0.992 }
    );
  });
}

function showAboutView() {
  closeSizeChartModal();
  closeAddCartModal();
  document.title = `О компании | BEIMAN`;
  setActiveMainNav("about");
  catalogSection?.classList.add("is-hidden");
  contactsPage?.classList.add("is-hidden");
  contactsPage?.setAttribute("aria-hidden", "true");
  productPage?.classList.add("is-hidden");
  productPage?.setAttribute("aria-hidden", "true");
  cartPage?.classList.add("is-hidden");
  cartPage?.setAttribute("aria-hidden", "true");
  checkoutPage?.classList.add("is-hidden");
  checkoutPage?.setAttribute("aria-hidden", "true");
  aboutPage?.classList.remove("is-hidden");
  aboutPage?.setAttribute("aria-hidden", "false");
  window.scrollTo({ top: 0, behavior: "smooth" });
  setupRevealAnimations();
  requestAnimationFrame(() => {
    animateElementsEntrance(
      [document.querySelector(".about-hero"), document.querySelector(".about-story")].filter(Boolean),
      { staggerMs: 55, maxDelayMs: 120, durationMs: 540, yPx: 14, scaleFrom: 0.992 }
    );
  });
}

function showContactsView() {
  closeSizeChartModal();
  closeAddCartModal();
  document.title = `Контакты | BEIMAN`;
  setActiveMainNav("contacts");
  catalogSection?.classList.add("is-hidden");
  aboutPage?.classList.add("is-hidden");
  aboutPage?.setAttribute("aria-hidden", "true");
  productPage?.classList.add("is-hidden");
  productPage?.setAttribute("aria-hidden", "true");
  cartPage?.classList.add("is-hidden");
  cartPage?.setAttribute("aria-hidden", "true");
  checkoutPage?.classList.add("is-hidden");
  checkoutPage?.setAttribute("aria-hidden", "true");
  contactsPage?.classList.remove("is-hidden");
  contactsPage?.setAttribute("aria-hidden", "false");
  window.scrollTo({ top: 0, behavior: "smooth" });
  setupRevealAnimations();
  requestAnimationFrame(() => {
    animateElementsEntrance(
      [document.querySelector(".contacts-hero"), ...document.querySelectorAll(".contact-card")].filter(Boolean),
      { staggerMs: 45, maxDelayMs: 220, durationMs: 540, yPx: 14, scaleFrom: 0.992 }
    );
  });
}

function syncRouteFromHash() {
  if (location.hash === "#cart") {
    showCartView();
    return;
  }
  if (location.hash === "#checkout") {
    showCheckoutView();
    return;
  }
  if (location.hash === "#about") {
    showAboutView();
    return;
  }
  if (location.hash === "#contacts") {
    showContactsView();
    return;
  }
  const id = getProductIdFromHash();
  if (id && PRODUCTS[id]) {
    showProductView(id);
  } else {
    if (id) {
      history.replaceState(null, "", `${location.pathname}${location.search}`);
    }
    showCatalogView();
  }
}

function goToCatalog() {
  history.replaceState(null, "", `${location.pathname}${location.search}`);
  showCatalogView();
}

function openSizeChartModal() {
  if (!sizeChartModal) return;
  renderSizeChart(currentProductId || getProductIdFromHash());
  sizeChartModal.classList.remove("is-hidden");
  sizeChartModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  sizeChartClose?.focus();
}

function closeSizeChartModal() {
  if (!sizeChartModal) return;
  sizeChartModal.classList.add("is-hidden");
  sizeChartModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function selectSizeChip(chip) {
  if (!chip || chip.disabled || chip.classList.contains("is-unavailable")) return;
  selectedSize = chip.getAttribute("data-size") || null;
  sizeChips.forEach((c) => {
    const on = c === chip;
    c.classList.toggle("is-selected", on);
    c.setAttribute("aria-checked", on ? "true" : "false");
  });
  if (sizeHint) {
    sizeHint.textContent = "";
    sizeHint.classList.remove("is-error");
  }
}

productGrid?.addEventListener("click", (e) => {
  const addBtn = e.target.closest(".btn-card");
  if (addBtn) {
    const card = addBtn.closest(".product-card");
    const productId = card?.dataset.productId;
    if (!productId || !PRODUCTS[productId]) return;
    e.preventDefault();
    openAddCartModal(productId);
    return;
  }

  const link = e.target.closest(".product-link");
  if (!link || !productGrid?.contains(link)) return;
  const card = link.closest(".product-card");
  const id = card?.dataset.productId;
  if (!id || !PRODUCTS[id]) return;
  e.preventDefault();
  location.hash = `p=${encodeURIComponent(id)}`;
});

productBack?.addEventListener("click", goToCatalog);
productPreorderBack?.addEventListener("click", goToCatalog);
cartBackBtn?.addEventListener("click", goToCatalog);
cartGoCatalogBtn?.addEventListener("click", goToCatalog);
checkoutBackBtn?.addEventListener("click", () => {
  location.hash = "cart";
});
cartToggleBtn?.addEventListener("click", () => {
  location.hash = "cart";
});

sizeChips.forEach((chip) => {
  chip.addEventListener("click", () => selectSizeChip(chip));
});

sizeChartBtn?.addEventListener("click", openSizeChartModal);
sizeChartBackdrop?.addEventListener("click", closeSizeChartModal);
sizeChartClose?.addEventListener("click", closeSizeChartModal);
addCartBackdrop?.addEventListener("click", closeAddCartModal);
addCartClose?.addEventListener("click", closeAddCartModal);
addCartCancelBtn?.addEventListener("click", closeAddCartModal);
addCartSizeGrid?.addEventListener("click", (e) => {
  const btn = e.target.closest(".add-cart-size-option");
  if (!btn || btn.disabled) return;
  addCartSelectedSize = btn.getAttribute("data-size");
  [...addCartSizeGrid.querySelectorAll(".add-cart-size-option")].forEach((el) => {
    el.classList.toggle("is-selected", el === btn);
  });
  if (addCartConfirmBtn) {
    addCartConfirmBtn.disabled = !addCartSelectedSize;
    addCartConfirmBtn.textContent = addCartSelectedSize ? "ДОБАВИТЬ В КОРЗИНУ" : "ВЫБЕРИТЕ РАЗМЕР";
  }
});
addCartConfirmBtn?.addEventListener("click", () => {
  if (!addCartProductId || !addCartSelectedSize) return;
  addCartItem(addCartProductId, addCartSelectedSize);
  animateCatalogInteraction();
  closeAddCartModal();
});

productPreorderBtn?.addEventListener("click", () => {
  if (!sizeHint) return;
  if (!selectedSize) {
    sizeHint.textContent = "Выберите размер";
    sizeHint.classList.add("is-error");
    return;
  }
  const productId = currentProductId || getProductIdFromHash();
  if (!productId || !PRODUCTS[productId]) return;
  addCartItem(productId, selectedSize);
  sizeHint.classList.remove("is-error");
  const title = PRODUCTS[productId]?.title ?? "Товар";
  sizeHint.textContent = `Добавлено в корзину: ${title} — размер ${selectedSize}.`;
});

cartItems?.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const productId = btn.getAttribute("data-product-id") || "";
  const size = btn.getAttribute("data-size") || "";
  const action = btn.getAttribute("data-action");
  if (!productId || !size) return;
  if (action === "inc") changeCartItemQty(productId, size, 1);
  if (action === "dec") changeCartItemQty(productId, size, -1);
  if (action === "remove") removeCartItem(productId, size);
});

checkoutOrderList?.addEventListener("click", (e) => {
  const removeBtn = e.target.closest(".checkout-order-remove-btn");
  if (!removeBtn) return;
  const productId = removeBtn.getAttribute("data-product-id") || "";
  const size = removeBtn.getAttribute("data-size") || "";
  if (!productId || !size) return;
  removeCartItem(productId, size);
});

cartCheckoutBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopImmediatePropagation();
  const { items } = getCartTotals();
  if (!items) return;
  location.hash = "#checkout";
});

checkoutForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (checkoutIsSubmitting) return;
  const { items, sum } = getCartTotals();
  if (!items) {
    showCartToast("Сначала добавьте товары в корзину");
    return;
  }
  if (!checkoutForm.reportValidity()) return;

  const formData = new FormData(checkoutForm);
  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const pickupPointCode = String(formData.get("pickupPoint") || "").trim();
  const pickupPointLabel = checkoutSelectedPickupPoint?.name || "";
  const comment = String(formData.get("comment") || "").trim();
  const packageMetrics = getCheckoutPackageMetrics();
  const deliverySummary = getCheckoutDeliverySummary(
    city,
    checkoutSelectedCityCode || "",
    pickupPointCode,
    packageMetrics.key,
    items,
    sum
  );
  if (deliverySummary.source !== "api" || typeof deliverySummary.price !== "number") {
    showCartToast("Дождитесь точного расчёта доставки СДЭК");
    return;
  }
  const safeDeliveryPrice = deliverySummary.price;
  const totalToPay = sum + safeDeliveryPrice;
  const orderNumber = `BM-${Date.now()}`;
  let cdekOrderStatusLine = "Заказ СДЭК: не создан";
  let cdekOrderToast = "";

  checkoutIsSubmitting = true;
  updateCheckoutSubmitState();
  let cdekOrder = null;
  try {
    const createOrderResponse = await fetch(CDEK_CREATE_ORDER_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        number: orderNumber,
        recipientName: name,
        recipientPhone: phone,
        recipientEmail: email,
        city,
        cityCode: Number(checkoutSelectedCityCode || 0),
        pickupPointCode,
        comment,
        orderSum: totalToPay,
        itemName: `Заказ BEIMAN (${items} шт)`,
        packageWeightGrams: Number(packageMetrics.weightGrams),
        packageLengthCm: Number(packageMetrics.lengthCm),
        packageWidthCm: Number(packageMetrics.widthCm),
        packageHeightCm: Number(packageMetrics.heightCm),
      }),
    });

    if (!createOrderResponse.ok) {
      const errorPayload = await createOrderResponse.json().catch(() => ({}));
      let detailsMessage = "";
      if (errorPayload?.details) {
        try {
          const parsed = JSON.parse(String(errorPayload.details));
          const firstError = parsed?.requests?.[0]?.errors?.[0]?.message || parsed?.errors?.[0]?.message || "";
          detailsMessage = firstError ? ` (${firstError})` : ` (${String(errorPayload.details).slice(0, 120)})`;
        } catch {
          detailsMessage = ` (${String(errorPayload.details).slice(0, 120)})`;
        }
      }
      throw new Error((errorPayload?.error || `HTTP ${createOrderResponse.status}`) + detailsMessage);
    }

    cdekOrder = await createOrderResponse.json();
    const cdekId = cdekOrder?.cdekOrderUuid || cdekOrder?.orderNumber || orderNumber;
    cdekOrderStatusLine = `Заказ СДЭК: создан (${cdekId})`;
    cdekOrderToast = `СДЭК: заказ создан (${cdekId})`;
  } catch (error) {
    cdekOrderStatusLine = `Заказ СДЭК: ошибка (${error?.message || "неизвестная"})`;
    const shortError = String(error?.message || "неизвестная ошибка").slice(0, 180);
    cdekOrderToast = `СДЭК: ${shortError}`;
    showCartToast(cdekOrderToast);
    return;
  } finally {
    checkoutIsSubmitting = false;
    updateCheckoutSubmitState();
  }

  const orderLines = cart
    .filter((item) => PRODUCTS[item.productId])
    .map((item) => {
      const product = PRODUCTS[item.productId];
      return `• ${product.title} — ${item.size} × ${item.qty}`;
    })
    .join("\n");

  const message = encodeURIComponent(
    [
      "Здравствуйте! Хочу оформить заказ BEIMAN:",
      "",
      `Имя: ${name}`,
      `Телефон: ${phone}`,
      `Почта: ${email}`,
      `Город: ${city}`,
      "Тип доставки: ПВЗ СДЭК",
      `Пункт выдачи: ${pickupPointCode ? `${pickupPointLabel} [${pickupPointCode}]` : "не выбран"}`,
      `Способ доставки: СДЭК (${formatPrice(safeDeliveryPrice)})`,
      cdekOrderStatusLine,
      `Комментарий: ${comment || "—"}`,
      "",
      "Состав заказа:",
      orderLines,
      "",
      `Сумма товаров: ${formatPrice(sum)}`,
      `К оплате: ${formatPrice(totalToPay)}`,
    ].join("\n")
  );

  window.open(`https://t.me/beimanns?text=${message}`, "_blank");
  showCartToast(cdekOrderToast || "Заказ готов к отправке");
});

checkoutForm?.addEventListener("input", () => {
  updateCheckoutSubmitState();
  renderCheckoutOrder();
});

checkoutForm?.addEventListener("change", () => {
  updateCheckoutSubmitState();
  renderCheckoutOrder();
});

checkoutPhoneInput?.addEventListener("input", (e) => {
  const input = e.currentTarget;
  if (!(input instanceof HTMLInputElement)) return;
  const raw = input.value;
  const caret = input.selectionStart ?? raw.length;
  const digitsBeforeCaret = raw.slice(0, caret).replace(/\D/g, "").length;
  const formatted = formatRussianPhone(raw);
  input.value = formatted;
  const nextCaret = getCaretByDigitCount(formatted, digitsBeforeCaret);
  input.setSelectionRange(nextCaret, nextCaret);
  updateCheckoutSubmitState();
});

checkoutCityInput?.addEventListener("input", () => {
  checkoutSelectedCityCode = "";
  hidePickupSection();
  resetPickupPoints("Выберите город из подсказок СДЭК");
  requestCitySuggestionsDebounced(checkoutCityInput.value);
  updateCheckoutSubmitState();
});

checkoutCityInput?.addEventListener("focus", () => {
  if ((checkoutCityInput.value || "").trim().length >= 2) {
    requestCitySuggestionsDebounced(checkoutCityInput.value);
  }
});

checkoutCityInput?.addEventListener("blur", () => {
  if (citySuggestHideTimer) clearTimeout(citySuggestHideTimer);
  citySuggestHideTimer = window.setTimeout(() => {
    hideCitySuggestions();
  }, 120);
});

checkoutCitySuggest?.addEventListener("mousedown", (e) => {
  e.preventDefault();
});

checkoutCitySuggest?.addEventListener("click", (e) => {
  const option = e.target.closest(".checkout-city-option");
  if (!option) return;
  const cityCode = option.getAttribute("data-city-code") || "";
  const cityName = option.getAttribute("data-city-name") || "";
  if (!cityCode || !cityName) return;
  selectCheckoutCity(cityCode, cityName);
});

checkoutPickupSearch?.addEventListener("input", () => {
  applyPickupPointFilter(checkoutPickupSearch.value);
});

checkoutPickupList?.addEventListener("click", (e) => {
  const btn = e.target.closest(".checkout-pvz-item");
  if (!btn) return;
  const code = btn.getAttribute("data-pvz-code") || "";
  if (!code) return;
  const point = checkoutPickupPointsCache.find((item) => item.code === code);
  if (!point) return;
  checkoutSelectedPickupPoint = point;
  if (checkoutPickupPoint) checkoutPickupPoint.value = point.code;
  renderSelectedPickupChip();
  applyPickupPointFilter(checkoutPickupSearch?.value || "");
  renderCheckoutOrder();
});

window.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (addCartModal && !addCartModal.classList.contains("is-hidden")) {
    closeAddCartModal();
    return;
  }
  if (sizeChartModal && !sizeChartModal.classList.contains("is-hidden")) {
    closeSizeChartModal();
    return;
  }
  if (cartPage && !cartPage.classList.contains("is-hidden")) {
    goToCatalog();
    return;
  }
  if (checkoutPage && !checkoutPage.classList.contains("is-hidden")) {
    location.hash = "cart";
    return;
  }
  if (productPage && !productPage.classList.contains("is-hidden")) {
    goToCatalog();
  }
});

cart = loadCart();
updateCartBadge();
renderCart();
resetPickupPoints();
hidePickupSection();
renderCheckoutOrder();
window.addEventListener("hashchange", syncRouteFromHash);
syncRouteFromHash();
