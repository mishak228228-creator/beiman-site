const sectionButtons = Array.from(document.querySelectorAll("[data-section-target]"));
const sections = Array.from(document.querySelectorAll("[data-section]"));
const refreshBtn = document.getElementById("refreshBtn");
const logoutBtn = document.getElementById("logoutBtn");
const ordersSearch = document.getElementById("ordersSearch");
const mobileRefreshBtn = document.getElementById("mobileRefreshBtn");
const mobileNewProductBtn = document.getElementById("mobileNewProductBtn");

const authScreen = document.getElementById("authScreen");
const loginForm = document.getElementById("loginForm");
const loginUsername = document.getElementById("loginUsername");
const loginPassword = document.getElementById("loginPassword");
const loginError = document.getElementById("loginError");

const statTotalOrders = document.getElementById("statTotalOrders");
const statWeekOrders = document.getElementById("statWeekOrders");
const statCities = document.getElementById("statCities");
const statLastOrder = document.getElementById("statLastOrder");
const statLastOrderSub = document.getElementById("statLastOrderSub");
const miniChart = document.getElementById("miniChart");
const cityList = document.getElementById("cityList");
const ordersTableBody = document.getElementById("ordersTableBody");
const productsTableBody = document.getElementById("productsTableBody");

const productForm = document.getElementById("productForm");
const productEditId = document.getElementById("productEditId");
const productTitleInput = document.getElementById("productTitle");
const productCategoryInput = document.getElementById("productCategory");
const productPriceInput = document.getElementById("productPrice");
const productOldPriceInput = document.getElementById("productOldPrice");
const productBadgeInput = document.getElementById("productBadge");
const productImageFileInput = document.getElementById("productImageFile");
const productImageFileName = document.getElementById("productImageFileName");
const productImageThumb = document.getElementById("productImageThumb");
const productLeadDescriptionInput = document.getElementById("productLeadDescription");
const productSpecsInput = document.getElementById("productSpecs");
const productSizesPicker = document.getElementById("productSizesPicker");
const productSizesSelected = document.getElementById("productSizesSelected");
const productSizeButtons = Array.from(document.querySelectorAll("[data-size-option]"));
const resetProductFormBtn = document.getElementById("resetProductFormBtn");
const saveProductBtn = document.getElementById("saveProductBtn");
const productsSearch = document.getElementById("productsSearch");
const productFormMessage = document.getElementById("productFormMessage");
const productBuilder = document.getElementById("productBuilder");
const productBuilderTitle = document.getElementById("productBuilderTitle");
const closeProductBuilderBtn = document.getElementById("closeProductBuilderBtn");
const previewCard = document.getElementById("catalogPreviewCard");
const previewImage = document.getElementById("previewImage");
const previewBadge = document.getElementById("previewBadge");
const previewCategory = document.getElementById("previewCategory");
const previewTitle = document.getElementById("previewTitle");
const previewLead = document.getElementById("previewLead");
const previewPrice = document.getElementById("previewPrice");
const previewSpecs = document.getElementById("previewSpecs");

let allOrders = [];
let allProducts = [];
let allowedStatuses = ["CREATED", "PROCESSING", "READY_TO_SHIP", "SHIPPED", "DELIVERED", "CANCELLED"];
const PRODUCT_SIZE_OPTIONS = ["XS", "S", "M", "L", "XL", "2XL"];
const DEFAULT_PRODUCT_IMAGE = "/assets/real-white.png";
const BROWSER_PREVIEW_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
let selectedProductImage = DEFAULT_PRODUCT_IMAGE;
let previewProductImage = DEFAULT_PRODUCT_IMAGE;
let localProductImagePreviewUrl = "";
let lastAppliedPreviewImage = "";

function withCacheBust(url) {
  const base = String(url || "").trim();
  if (!base) return "";
  const joiner = base.includes("?") ? "&" : "?";
  return `${base}${joiner}v=${Date.now()}`;
}

function clearLocalImagePreviewUrl() {
  if (!localProductImagePreviewUrl) return;
  URL.revokeObjectURL(localProductImagePreviewUrl);
  localProductImagePreviewUrl = "";
}

function showProductImageThumb(src) {
  if (!productImageThumb) return;
  const nextSrc = String(src || "").trim();
  if (!nextSrc) {
    productImageThumb.classList.add("is-hidden");
    productImageThumb.removeAttribute("src");
    return;
  }
  productImageThumb.src = nextSrc;
  productImageThumb.classList.remove("is-hidden");
}

function setPreviewImageSource(src) {
  if (!previewImage) return;
  const nextSrc = String(src || "").trim() || DEFAULT_PRODUCT_IMAGE;
  if (nextSrc === lastAppliedPreviewImage) return;
  lastAppliedPreviewImage = nextSrc;
  const fallbackSrc = localProductImagePreviewUrl || selectedProductImage || DEFAULT_PRODUCT_IMAGE;
  const attemptId = `${Date.now()}-${Math.random()}`;
  previewImage.dataset.attemptId = attemptId;

  const probe = new Image();
  probe.onload = () => {
    if (previewImage.dataset.attemptId !== attemptId) return;
    previewImage.src = nextSrc;
  };
  probe.onerror = () => {
    if (previewImage.dataset.attemptId !== attemptId) return;
    previewImage.src = fallbackSrc !== nextSrc ? fallbackSrc : DEFAULT_PRODUCT_IMAGE;
  };
  probe.src = nextSrc;
}

function canRenderImagePreviewInBrowser(file) {
  const mimeType = String(file?.type || "").toLowerCase();
  if (BROWSER_PREVIEW_MIME_TYPES.has(mimeType)) return true;
  const fileName = String(file?.name || "").toLowerCase();
  return /\.(jpe?g|png|webp|gif|avif)$/i.test(fileName);
}

function getCategoryLabel(category) {
  const normalized = String(category || "").trim().toLowerCase();
  if (normalized === "hoodie") return "Худи";
  if (normalized === "tee") return "Футболка";
  return "Другое";
}

function getCategoryPreviewDesc(category) {
  const normalized = String(category || "").trim().toLowerCase();
  if (normalized === "hoodie") return "Спортивная кофта премиум-кроя.";
  if (normalized === "tee") return "Винтажная футболка в стиле streetwear.";
  return "Новая модель в каталоге.";
}

function openProductBuilder(mode = "create") {
  productBuilder?.classList.remove("is-hidden");
  if (productBuilderTitle) {
    productBuilderTitle.textContent = mode === "edit" ? "Редактирование товара" : "Новый товар";
  }
}

function closeProductBuilder() {
  productBuilder?.classList.add("is-hidden");
}

function renderProductPreview() {
  if (!previewCard) return;
  const title = String(productTitleInput?.value || "").trim() || "Название товара";
  const categoryRaw = String(productCategoryInput?.value || "other").trim();
  const categoryLabel = getCategoryLabel(categoryRaw).toUpperCase();
  const lead = String(productLeadDescriptionInput?.value || "").trim() || "Здесь будет длинное описание товара.";
  const badge = String(productBadgeInput?.value || "").trim().toUpperCase();
  const price = Number(productPriceInput?.value || 0);
  const oldPrice = Number(productOldPriceInput?.value || 0);
  const specs = parseSpecsText(productSpecsInput?.value || "");

  previewTitle.textContent = title;
  previewCategory.textContent = categoryLabel;
  previewLead.textContent = lead;
  setPreviewImageSource(previewProductImage || selectedProductImage || DEFAULT_PRODUCT_IMAGE);
  previewImage.alt = title;

  if (badge) {
    previewBadge.textContent = badge;
    previewBadge.classList.remove("is-hidden");
  } else {
    previewBadge.classList.add("is-hidden");
  }

  const prettyPrice = Number.isFinite(price) && price > 0 ? formatPrice(price) : "0 ₽";
  const prettyOldPrice = Number.isFinite(oldPrice) && oldPrice > 0 ? formatPrice(oldPrice) : "";
  previewPrice.innerHTML = `<span>${prettyPrice}</span>${prettyOldPrice ? ` <s>${prettyOldPrice}</s>` : ""}`;

  const previewRows = specs.length > 0 ? specs : [["Материал", "Хлопок 100%"], ["Посадка", "Свободная"]];
  previewSpecs.innerHTML = previewRows
    .map((row) => `<li><span>${row[0]}</span><span>${row[1]}</span></li>`)
    .join("");
}

function switchSection(sectionId) {
  sectionButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.sectionTarget === sectionId);
  });
  sections.forEach((section) => {
    section.classList.toggle("is-hidden", section.dataset.section !== sectionId);
  });
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPrice(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return "—";
  return `${new Intl.NumberFormat("ru-RU").format(Math.max(0, Math.round(amount)))} ₽`;
}

function getDayKey(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString().slice(0, 10);
}

function buildLastDays(daysCount) {
  const now = new Date();
  const values = [];
  for (let i = daysCount - 1; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    values.push(new Date(date.getFullYear(), date.getMonth(), date.getDate()));
  }
  return values;
}

function showLoginError(message) {
  loginError.textContent = message;
  loginError.classList.remove("is-hidden");
}

function clearLoginError() {
  loginError.textContent = "";
  loginError.classList.add("is-hidden");
}

function showAuthScreen() {
  authScreen.classList.add("is-visible");
  document.body.style.overflow = "hidden";
}

function hideAuthScreen() {
  authScreen.classList.remove("is-visible");
  document.body.style.overflow = "";
}

async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (response.status === 401) {
    showAuthScreen();
    throw new Error("Нужно войти в админ-панель");
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || `HTTP ${response.status}`);
  }
  return payload;
}

function renderChart(orders) {
  const lastDays = buildLastDays(7);
  const countsByDay = new Map(lastDays.map((date) => [date.toISOString().slice(0, 10), 0]));

  orders.forEach((order) => {
    const key = getDayKey(order.createdAt);
    if (key && countsByDay.has(key)) countsByDay.set(key, countsByDay.get(key) + 1);
  });

  const maxValue = Math.max(...countsByDay.values(), 1);
  miniChart.innerHTML = "";

  lastDays.forEach((date) => {
    const key = date.toISOString().slice(0, 10);
    const count = countsByDay.get(key) || 0;
    const height = Math.max(14, Math.round((count / maxValue) * 130));
    const dayLabel = date.toLocaleDateString("ru-RU", { weekday: "short" }).replace(".", "");

    const bar = document.createElement("div");
    bar.className = "mini-chart-bar";
    bar.innerHTML = `
      <i style="height:${height}px" title="Заказов: ${count}"></i>
      <span>${dayLabel}</span>
    `;
    miniChart.appendChild(bar);
  });
}

function renderCityList(orders) {
  const cityCount = new Map();
  orders.forEach((order) => {
    const city = String(order?.city || "").trim();
    if (!city) return;
    cityCount.set(city, (cityCount.get(city) || 0) + 1);
  });

  const topCities = Array.from(cityCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  cityList.innerHTML = "";
  if (!topCities.length) {
    cityList.innerHTML = "<li>Пока нет заказов.</li>";
    return;
  }

  topCities.forEach(([city, count]) => {
    const item = document.createElement("li");
    item.textContent = `${city} — ${count}`;
    cityList.appendChild(item);
  });
}

function renderStats(orders) {
  const total = orders.length;
  const now = Date.now();
  const weekAgoMs = now - 7 * 24 * 60 * 60 * 1000;
  const weekCount = orders.filter((order) => {
    const t = new Date(order.createdAt).getTime();
    return Number.isFinite(t) && t >= weekAgoMs;
  }).length;

  const uniqueCities = new Set(
    orders
      .map((order) => String(order?.city || "").trim())
      .filter(Boolean)
  );

  const lastOrder = orders[0] || null;

  statTotalOrders.textContent = String(total);
  statWeekOrders.textContent = String(weekCount);
  statCities.textContent = String(uniqueCities.size);
  statLastOrder.textContent = lastOrder ? formatDate(lastOrder.createdAt) : "—";
  statLastOrderSub.textContent = "";
}

function buildOrderStatusControl(order) {
  const currentStatus = String(order?.cdek?.status || "CREATED").toUpperCase();
  const options = allowedStatuses
    .map((status) => `<option value="${status}" ${status === currentStatus ? "selected" : ""}>${status}</option>`)
    .join("");

  return `
    <div class="row-actions">
      <select class="row-status-select" data-order-id="${order.id}">
        ${options}
      </select>
      <button class="row-action-btn" data-action="save-order-status" data-order-id="${order.id}">Сохранить</button>
    </div>
  `;
}

function renderOrdersTable(orders) {
  ordersTableBody.innerHTML = "";

  if (!orders.length) {
    ordersTableBody.innerHTML = `<tr><td class="table-empty" colspan="7">Заказы не найдены</td></tr>`;
    return;
  }

  const fragment = document.createDocumentFragment();
  orders.forEach((order) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td data-label="ID">${order?.id || "—"}</td>
      <td data-label="Клиент">${order?.customer?.name || "—"}</td>
      <td data-label="Контакты">
        ${order?.customer?.phone || "—"}<br />
        <small>${order?.customer?.email || ""}</small>
      </td>
      <td data-label="Город">${order?.city || "—"}</td>
      <td data-label="Статус"><span class="badge">${order?.cdek?.status || "CREATED"}</span></td>
      <td data-label="Управление">${buildOrderStatusControl(order)}</td>
      <td data-label="Дата">${formatDate(order?.createdAt)}</td>
    `;
    fragment.appendChild(row);
  });

  ordersTableBody.appendChild(fragment);
}

function renderProductsTable(products) {
  productsTableBody.innerHTML = "";

  if (!products.length) {
    productsTableBody.innerHTML = `<tr><td class="table-empty" colspan="6">Товары не найдены</td></tr>`;
    return;
  }

  const fragment = document.createDocumentFragment();
  products.forEach((product) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td data-label="ID">${product.id}</td>
      <td data-label="Название">${product.title}</td>
      <td data-label="Категория">${getCategoryLabel(product.category)}</td>
      <td data-label="Цена">${formatPrice(product.price)}</td>
      <td data-label="Активен">${product.isActive ? "Да" : "Нет"}</td>
      <td data-label="Действия">
        <div class="row-actions">
          <button class="row-action-btn" data-action="edit-product" data-product-id="${product.id}">Ред.</button>
          <button class="row-action-btn row-action-btn--danger" data-action="delete-product" data-product-id="${product.id}">Удалить</button>
        </div>
      </td>
    `;
    fragment.appendChild(row);
  });

  productsTableBody.appendChild(fragment);
}

function applySearch() {
  const query = String(ordersSearch.value || "").trim().toLowerCase();
  if (!query) {
    renderOrdersTable(allOrders);
    return;
  }

  const filtered = allOrders.filter((order) => {
    const haystack = [
      order?.id,
      order?.customer?.name,
      order?.customer?.phone,
      order?.customer?.email,
      order?.city,
      order?.cdek?.status,
    ]
      .map((value) => String(value || "").toLowerCase())
      .join(" ");
    return haystack.includes(query);
  });

  renderOrdersTable(filtered);
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_а-я]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/[а-я]/g, "");
}

function showProductFormMessage(type, message) {
  if (!productFormMessage) return;
  productFormMessage.textContent = message || "";
  productFormMessage.classList.remove("is-hidden", "is-success", "is-error");
  productFormMessage.classList.add(type === "success" ? "is-success" : "is-error");
}

function clearProductFormMessage() {
  if (!productFormMessage) return;
  productFormMessage.textContent = "";
  productFormMessage.classList.add("is-hidden");
  productFormMessage.classList.remove("is-success", "is-error");
}

function specsToText(specs) {
  if (!Array.isArray(specs) || specs.length === 0) return "";
  return specs
    .map((entry) => {
      if (!Array.isArray(entry)) return "";
      const key = String(entry[0] || "").trim();
      const value = String(entry[1] || "").trim();
      if (!key && !value) return "";
      return `${key} | ${value}`;
    })
    .filter(Boolean)
    .join("\n");
}

function parseSpecsText(value) {
  const lines = String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line) => {
    const separator = line.includes("|") ? "|" : line.includes(":") ? ":" : "";
    if (!separator) return ["—", line];
    const [keyPart, ...rest] = line.split(separator);
    const key = String(keyPart || "").trim() || "—";
    const parsedValue = rest.join(separator);
    const val = String(parsedValue || "").trim() || "—";
    return [key, val];
  });
}

function normalizeSizes(sizes) {
  if (!Array.isArray(sizes)) return [];
  const normalized = sizes
    .map((size) => String(size || "").trim().toUpperCase())
    .filter((size) => PRODUCT_SIZE_OPTIONS.includes(size));
  return Array.from(new Set(normalized));
}

function getSelectedSizes() {
  return productSizeButtons
    .filter((button) => button.classList.contains("is-selected"))
    .map((button) => String(button.getAttribute("data-size-option") || "").trim().toUpperCase())
    .filter((size) => PRODUCT_SIZE_OPTIONS.includes(size));
}

function updateSelectedSizesLabel() {
  if (!productSizesSelected) return;
  const selected = getSelectedSizes();
  productSizesSelected.textContent = selected.length ? `Выбрано: ${selected.join(", ")}` : "Выбрано: —";
}

function setSelectedSizes(sizes) {
  const selected = new Set(normalizeSizes(sizes));
  productSizeButtons.forEach((button) => {
    const size = String(button.getAttribute("data-size-option") || "").trim().toUpperCase();
    button.classList.toggle("is-selected", selected.has(size));
    button.setAttribute("aria-pressed", selected.has(size) ? "true" : "false");
  });
  updateSelectedSizesLabel();
}

function resetProductForm() {
  productEditId.value = "";
  productForm.reset();
  productCategoryInput.value = "hoodie";
  selectedProductImage = DEFAULT_PRODUCT_IMAGE;
  previewProductImage = DEFAULT_PRODUCT_IMAGE;
  if (productImageFileInput) {
    productImageFileInput.value = "";
  }
  if (productImageFileName) {
    productImageFileName.textContent = "Файл не выбран";
  }
  clearLocalImagePreviewUrl();
  showProductImageThumb("");
  setSelectedSizes([]);
  saveProductBtn.textContent = "Сохранить";
  clearProductFormMessage();
  renderProductPreview();
}

function fillProductForm(product) {
  productEditId.value = product.id;
  productTitleInput.value = product.title || "";
  productCategoryInput.value = product.category || "other";
  productPriceInput.value = String(product.price || "");
  productOldPriceInput.value = product.oldPrice ? String(product.oldPrice) : "";
  productBadgeInput.value = product.badge || "";
  selectedProductImage = String(product.image || "").trim() || DEFAULT_PRODUCT_IMAGE;
  previewProductImage = selectedProductImage;
  if (productImageFileInput) {
    productImageFileInput.value = "";
  }
  if (productImageFileName) {
    productImageFileName.textContent = "Файл не выбран";
  }
  clearLocalImagePreviewUrl();
  showProductImageThumb(previewProductImage);
  productLeadDescriptionInput.value = product.lead || "";
  productSpecsInput.value = specsToText(product.specs);
  setSelectedSizes(product.sizes);
  saveProductBtn.textContent = "Обновить";
  clearProductFormMessage();
  renderProductPreview();
}

function getProductFormPayload() {
  const editingId = String(productEditId.value || "").trim();
  const generatedId = slugify(productTitleInput.value || "");
  const fallbackId = `product-${Date.now()}`;
  const finalId = generatedId || editingId || fallbackId;

  return {
    id: finalId,
    title: String(productTitleInput.value || "").trim(),
    category: String(productCategoryInput.value || "").trim(),
    price: Number(productPriceInput.value || 0),
    oldPrice: Number(productOldPriceInput.value || 0),
    badge: String(productBadgeInput.value || "").trim(),
    image: selectedProductImage,
    imageAlt: String(productTitleInput.value || "").trim(),
    lead: String(productLeadDescriptionInput?.value || "").trim(),
    specs: parseSpecsText(productSpecsInput?.value || ""),
    sizes: getSelectedSizes(),
    isActive: true,
  };
}

async function loadOrders() {
  const payload = await apiFetch("/api/admin/orders");
  allOrders = Array.isArray(payload?.orders) ? payload.orders : [];
  if (Array.isArray(payload?.statuses) && payload.statuses.length > 0) {
    allowedStatuses = payload.statuses;
  }
  renderStats(allOrders);
  renderChart(allOrders);
  renderCityList(allOrders);
  applySearch();
}

async function loadProducts() {
  const payload = await apiFetch("/api/admin/products");
  allProducts = Array.isArray(payload?.products) ? payload.products : [];
  applyProductsSearch();
}

function applyProductsSearch() {
  const query = String(productsSearch?.value || "")
    .trim()
    .toLowerCase();
  if (!query) {
    renderProductsTable(allProducts);
    return;
  }
  const filtered = allProducts.filter((product) => {
    const haystack = [product?.id, product?.title, product?.category, getCategoryLabel(product?.category)]
      .map((value) => String(value || "").toLowerCase())
      .join(" ");
    return haystack.includes(query);
  });
  renderProductsTable(filtered);
}

async function loadData() {
  await Promise.all([loadOrders(), loadProducts()]);
}

async function updateOrderStatus(orderId, status) {
  await apiFetch(`/api/admin/orders/${encodeURIComponent(orderId)}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
  await loadOrders();
}

async function saveProduct() {
  const payload = getProductFormPayload();
  if (!payload.id) {
    throw new Error("Укажите название товара, чтобы сформировать ID");
  }
  const editingId = String(productEditId.value || "").trim();
  if (editingId) {
    await apiFetch(`/api/admin/products/${encodeURIComponent(editingId)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  } else {
    await apiFetch("/api/admin/products", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }
  resetProductForm();
  await loadProducts();
  showProductFormMessage("success", editingId ? "Товар успешно обновлен" : "Товар успешно добавлен");
}

async function uploadProductImage(file) {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch("/api/admin/upload-image", {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || `HTTP ${response.status}`);
  }
  const imageUrl = String(payload?.imageUrl || "").trim();
  if (!imageUrl) throw new Error("Сервер не вернул ссылку на изображение");
  return imageUrl;
}

async function deleteProduct(productId) {
  await apiFetch(`/api/admin/products/${encodeURIComponent(productId)}`, {
    method: "DELETE",
  });
  await loadProducts();
  showProductFormMessage("success", `Товар "${productId}" удален`);
}

async function checkSession() {
  try {
    await apiFetch("/api/admin/session");
    hideAuthScreen();
    await loadData();
  } catch {
    showAuthScreen();
    loginUsername.focus();
  }
}

sectionButtons.forEach((button) => {
  button.addEventListener("click", () => switchSection(button.dataset.sectionTarget));
});

refreshBtn.addEventListener("click", () => {
  loadData().catch((error) => {
    alert(error.message);
  });
});

mobileRefreshBtn?.addEventListener("click", () => {
  loadData().catch((error) => {
    alert(error.message);
  });
});

logoutBtn.addEventListener("click", async () => {
  try {
    await apiFetch("/api/admin/logout", { method: "POST" });
  } catch {
    // no-op
  }
  showAuthScreen();
});

ordersSearch.addEventListener("input", applySearch);
productsSearch?.addEventListener("input", applyProductsSearch);

ordersTableBody.addEventListener("click", (event) => {
  const button = event.target.closest('[data-action="save-order-status"]');
  if (!button) return;
  const orderId = button.getAttribute("data-order-id");
  const select = ordersTableBody.querySelector(`.row-status-select[data-order-id="${orderId}"]`);
  const status = String(select?.value || "").trim();
  if (!orderId || !status) return;

  updateOrderStatus(orderId, status).catch((error) => {
    alert(error.message);
  });
});

productsTableBody.addEventListener("click", (event) => {
  const editButton = event.target.closest('[data-action="edit-product"]');
  if (editButton) {
    const productId = editButton.getAttribute("data-product-id");
    const product = allProducts.find((item) => item.id === productId);
    if (product) {
      fillProductForm(product);
      openProductBuilder("edit");
      productTitleInput?.focus();
    }
    return;
  }

  const deleteButton = event.target.closest('[data-action="delete-product"]');
  if (deleteButton) {
    const productId = deleteButton.getAttribute("data-product-id");
    if (!productId) return;
    const confirmed = window.confirm(`Удалить товар "${productId}"?`);
    if (!confirmed) return;
    deleteProduct(productId).catch((error) => {
      alert(error.message);
    });
  }
});

productForm.addEventListener("submit", (event) => {
  event.preventDefault();
  clearProductFormMessage();
  saveProduct().catch((error) => {
    showProductFormMessage("error", error.message || "Не удалось сохранить товар");
  });
});

productImageFileInput?.addEventListener("change", async () => {
  const file = productImageFileInput.files?.[0];
  if (!file) return;
  if (!String(file.type || "").toLowerCase().startsWith("image/")) {
    showProductFormMessage("error", "Выберите файл изображения");
    return;
  }
  const previousImage = selectedProductImage;
  const previousPreviewImage = previewProductImage;
  if (productImageFileName) {
    productImageFileName.textContent = file.name || "Файл выбран";
  }
  clearLocalImagePreviewUrl();
  if (canRenderImagePreviewInBrowser(file)) {
    localProductImagePreviewUrl = URL.createObjectURL(file);
    showProductImageThumb(localProductImagePreviewUrl);
    previewProductImage = localProductImagePreviewUrl;
    if (previewImage) {
      previewImage.src = localProductImagePreviewUrl;
    }
  } else {
    showProductImageThumb(previousPreviewImage || previousImage || DEFAULT_PRODUCT_IMAGE);
    previewProductImage = previousPreviewImage || previousImage || DEFAULT_PRODUCT_IMAGE;
  }
  clearProductFormMessage();
  renderProductPreview();
  if (canRenderImagePreviewInBrowser(file)) {
    showProductFormMessage("success", "Загружаю фото...");
  } else {
    showProductFormMessage("success", "Конвертирую HEIC/HEIF и загружаю фото...");
  }
  try {
    const imageUrl = await uploadProductImage(file);
    selectedProductImage = imageUrl;
    if (!localProductImagePreviewUrl) {
      previewProductImage = withCacheBust(imageUrl);
    } else {
      previewProductImage = withCacheBust(imageUrl);
    }
    showProductImageThumb(previewProductImage || localProductImagePreviewUrl || selectedProductImage);
    if (previewImage) {
      previewImage.src = previewProductImage;
    }
    renderProductPreview();
    showProductFormMessage("success", "Фото загружено");
  } catch (error) {
    selectedProductImage = previousImage || DEFAULT_PRODUCT_IMAGE;
    previewProductImage = localProductImagePreviewUrl || previousPreviewImage || selectedProductImage;
    showProductImageThumb(previewProductImage);
    renderProductPreview();
    showProductFormMessage("error", error.message || "Не удалось загрузить фото");
  }
});

resetProductFormBtn.addEventListener("click", () => {
  resetProductForm();
  openProductBuilder("create");
  productTitleInput?.focus();
});
closeProductBuilderBtn?.addEventListener("click", closeProductBuilder);
mobileNewProductBtn?.addEventListener("click", () => {
  switchSection("catalog");
  resetProductForm();
  openProductBuilder("create");
  productTitleInput?.focus();
});

productTitleInput?.addEventListener("input", () => {
  renderProductPreview();
});
[productCategoryInput, productPriceInput, productOldPriceInput, productBadgeInput, productLeadDescriptionInput, productSpecsInput]
  .filter(Boolean)
  .forEach((input) => {
    input.addEventListener("input", renderProductPreview);
    input.addEventListener("change", renderProductPreview);
  });

productSizesPicker?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-size-option]");
  if (!button) return;
  button.classList.toggle("is-selected");
  const isSelected = button.classList.contains("is-selected");
  button.setAttribute("aria-pressed", isSelected ? "true" : "false");
  updateSelectedSizesLabel();
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  clearLoginError();
  try {
    await apiFetch("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({
        username: String(loginUsername.value || "").trim(),
        password: String(loginPassword.value || ""),
      }),
    });
    loginPassword.value = "";
    hideAuthScreen();
    await loadData();
  } catch (error) {
    showLoginError(error.message || "Не удалось войти");
  }
});

switchSection("dashboard");
resetProductForm();
checkSession();
