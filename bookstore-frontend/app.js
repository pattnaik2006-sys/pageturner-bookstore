// ============================================================================
// Pageturner Books - Frontend SPA (vanilla JS)
// Talks to the Spring Boot backend REST API.
// ============================================================================

const API_BASE = "http://localhost:8080/api";

// ---------------------------------------------------------------------------
// Simple state
// ---------------------------------------------------------------------------
const state = {
  view: "browse",
  categories: [],
  currentPage: 0,
  pageSize: 12,
  totalPages: 0,
  keyword: "",
  categoryId: "",
  cart: { items: [], total: 0 },
};

function getToken() { return localStorage.getItem("token"); }
function getUser() {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}
function isLoggedIn() { return !!getToken(); }
function isAdmin() {
  const u = getUser();
  return u && u.role === "ADMIN";
}
function saveSession(authResponse) {
  localStorage.setItem("token", authResponse.token);
  localStorage.setItem("user", JSON.stringify({
    id: authResponse.id, name: authResponse.name, email: authResponse.email, role: authResponse.role
  }));
}
function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

// ---------------------------------------------------------------------------
// API helper
// ---------------------------------------------------------------------------
async function api(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = "Bearer " + token;
  }

  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  let data;
  try { data = await res.json(); } catch { data = null; }

  if (!res.ok) {
    const message = (data && (data.message || (data.errors && Object.values(data.errors).join(", ")))) || "Request failed";
    throw new Error(message);
  }
  return data;
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------
let toastTimer;
function toast(message, type = "info") {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.className = "toast " + type;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add("hidden"), 3000);
}

// ---------------------------------------------------------------------------
// Nav / header state
// ---------------------------------------------------------------------------
function refreshNav() {
  const loggedIn = isLoggedIn();
  document.querySelectorAll(".auth-only").forEach(el => el.classList.toggle("hidden", !loggedIn));
  document.getElementById("loginNav").classList.toggle("hidden", loggedIn);
  document.querySelectorAll(".admin-only").forEach(el => el.classList.toggle("hidden", !isAdmin()));
  const u = getUser();
  document.getElementById("userName").textContent = u ? u.name : "";
  document.getElementById("cartCount").textContent = state.cart.items.reduce((a, i) => a + i.quantity, 0);
}

async function refreshCartBadge() {
  if (!isLoggedIn()) { state.cart = { items: [], total: 0 }; refreshNav(); return; }
  try {
    state.cart = await api("/cart", { auth: true });
  } catch (e) { /* ignore */ }
  refreshNav();
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
function navigate(view, params = {}) {
  state.view = view;
  state.params = params;
  render();
}

document.addEventListener("click", (e) => {
  const navEl = e.target.closest("[data-nav]");
  if (navEl) {
    e.preventDefault();
    const view = navEl.getAttribute("data-nav");
    if (view === "logout") { doLogout(); return; }
    navigate(view);
  }
});
document.getElementById("logoutNav").addEventListener("click", (e) => { e.preventDefault(); doLogout(); });
document.getElementById("searchBtn").addEventListener("click", doSearch);
document.getElementById("searchInput").addEventListener("keydown", (e) => { if (e.key === "Enter") doSearch(); });
document.getElementById("categoryFilter").addEventListener("change", doSearch);

function doLogout() {
  clearSession();
  refreshCartBadge();
  navigate("browse");
  toast("Logged out");
}

function doSearch() {
  state.keyword = document.getElementById("searchInput").value.trim();
  state.categoryId = document.getElementById("categoryFilter").value;
  state.currentPage = 0;
  navigate("browse");
}

// ---------------------------------------------------------------------------
// Category dropdown (populated once)
// ---------------------------------------------------------------------------
async function loadCategories() {
  try {
    state.categories = await api("/categories");
    const sel = document.getElementById("categoryFilter");
    sel.innerHTML = '<option value="">All categories</option>' +
      state.categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
  } catch (e) { console.error(e); }
}

// ---------------------------------------------------------------------------
// Render dispatcher
// ---------------------------------------------------------------------------
const app = document.getElementById("app");

function render() {
  refreshNav();
  switch (state.view) {
    case "browse": return renderBrowse();
    case "detail": return renderDetail(state.params.id);
    case "login": return renderLogin();
    case "register": return renderRegister();
    case "cart": return renderCart();
    case "orders": return renderOrders();
    case "admin": return renderAdmin();
    default: return renderBrowse();
  }
}

function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
function money(n) { return "$" + Number(n).toFixed(2); }

// ---------------------------------------------------------------------------
// Browse / Search view
// ---------------------------------------------------------------------------
async function renderBrowse() {
  app.innerHTML = `<div class="spinner-wrap">Loading books…</div>`;
  try {
    let data;
    if (state.keyword || state.categoryId) {
      const qs = new URLSearchParams({
        page: state.currentPage, size: state.pageSize,
        ...(state.keyword ? { keyword: state.keyword } : {}),
        ...(state.categoryId ? { categoryId: state.categoryId } : {}),
      });
      data = await api(`/books/search?${qs.toString()}`);
    } else {
      data = await api(`/books?page=${state.currentPage}&size=${state.pageSize}`);
    }
    state.totalPages = data.totalPages;

    const heading = state.keyword || state.categoryId
      ? `Results ${state.keyword ? `for "${escapeHtml(state.keyword)}"` : ""}`
      : "Browse Books";

    if (!data.content.length) {
      app.innerHTML = `<h1>${heading}</h1><div class="empty-state">No books found. Try a different search.</div>`;
      return;
    }

    app.innerHTML = `
      <h1>${heading}</h1>
      <div class="subtitle">${data.totalElements} book${data.totalElements === 1 ? "" : "s"} found</div>
      <div class="book-grid">${data.content.map(bookCardHtml).join("")}</div>
      ${paginationHtml(data)}
    `;

    app.querySelectorAll(".book-card [data-book-id]").forEach(el => {
      el.addEventListener("click", () => navigate("detail", { id: el.getAttribute("data-book-id") }));
    });
    app.querySelectorAll("[data-add-cart]").forEach(el => {
      el.addEventListener("click", (e) => { e.stopPropagation(); addToCart(el.getAttribute("data-add-cart"), 1); });
    });
    app.querySelectorAll("[data-page]").forEach(el => {
      el.addEventListener("click", () => { state.currentPage = Number(el.getAttribute("data-page")); navigate("browse"); window.scrollTo(0,0); });
    });
  } catch (e) {
    app.innerHTML = `<div class="empty-state">Failed to load books: ${escapeHtml(e.message)}</div>`;
  }
}

function bookCardHtml(b) {
  const lowStock = b.stockQuantity <= 5;
  return `
    <div class="book-card">
      <img data-book-id="${b.id}" src="${escapeHtml(b.imageUrl || 'https://placehold.co/300x420?text=No+Cover')}" alt="${escapeHtml(b.title)}" />
      <div class="book-card-body">
        <div class="book-category">${escapeHtml(b.categoryName || "")}</div>
        <div class="book-title" data-book-id="${b.id}">${escapeHtml(b.title)}</div>
        <div class="book-author">by ${escapeHtml(b.author)}</div>
        <div class="book-price">${money(b.price)}</div>
        <div class="book-stock ${lowStock ? "low" : ""}">${b.stockQuantity > 0 ? b.stockQuantity + " in stock" : "Out of stock"}</div>
        <button class="btn btn-primary btn-block" data-add-cart="${b.id}" ${b.stockQuantity === 0 ? "disabled" : ""}>Add to Cart</button>
      </div>
    </div>
  `;
}

function paginationHtml(data) {
  if (data.totalPages <= 1) return "";
  let btns = "";
  for (let i = 0; i < data.totalPages; i++) {
    btns += `<button class="${i === data.number ? "active" : ""}" data-page="${i}">${i + 1}</button>`;
  }
  return `<div class="pagination">${btns}</div>`;
}

// ---------------------------------------------------------------------------
// Book detail view
// ---------------------------------------------------------------------------
async function renderDetail(id) {
  app.innerHTML = `<div class="spinner-wrap">Loading…</div>`;
  try {
    const b = await api(`/books/${id}`);
    app.innerHTML = `
      <div class="detail-wrap">
        <img src="${escapeHtml(b.imageUrl || 'https://placehold.co/300x420?text=No+Cover')}" alt="${escapeHtml(b.title)}" />
        <div class="detail-info">
          <div class="book-category">${escapeHtml(b.categoryName || "")}</div>
          <h1>${escapeHtml(b.title)}</h1>
          <div class="book-author">by ${escapeHtml(b.author)}</div>
          <p>${escapeHtml(b.description || "No description available.")}</p>
          <div class="book-price" style="font-size:1.4rem">${money(b.price)}</div>
          <div class="book-stock ${b.stockQuantity <= 5 ? "low" : ""}">${b.stockQuantity > 0 ? b.stockQuantity + " in stock" : "Out of stock"}</div>
          <div class="qty-row">
            <label>Qty:</label>
            <input type="number" id="detailQty" value="1" min="1" max="${b.stockQuantity}" style="width:70px;padding:6px;" />
            <button class="btn btn-primary" id="detailAddCart" ${b.stockQuantity === 0 ? "disabled" : ""}>Add to Cart</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById("detailAddCart").addEventListener("click", () => {
      const qty = Number(document.getElementById("detailQty").value) || 1;
      addToCart(b.id, qty);
    });
  } catch (e) {
    app.innerHTML = `<div class="empty-state">${escapeHtml(e.message)}</div>`;
  }
}

async function addToCart(bookId, quantity) {
  if (!isLoggedIn()) { toast("Please log in to add items to your cart", "error"); navigate("login"); return; }
  try {
    state.cart = await api("/cart", { method: "POST", auth: true, body: { bookId: Number(bookId), quantity } });
    refreshNav();
    toast("Added to cart", "success");
  } catch (e) {
    toast(e.message, "error");
  }
}

// ---------------------------------------------------------------------------
// Auth views
// ---------------------------------------------------------------------------
function renderLogin() {
  app.innerHTML = `
    <div class="form-card">
      <h2>Log in</h2>
      <div class="form-error hidden" id="authError"></div>
      <label>Email</label>
      <input type="email" id="loginEmail" placeholder="you@example.com" />
      <label>Password</label>
      <input type="password" id="loginPassword" placeholder="••••••••" />
      <button class="btn btn-primary btn-block" id="loginBtn">Log in</button>
      <div class="form-switch">No account? <a data-nav="register">Register here</a></div>
      <div class="form-switch" style="margin-top:10px;font-size:0.78rem;">Demo admin: admin@bookstore.com / admin123</div>
    </div>
  `;
  document.getElementById("loginBtn").addEventListener("click", async () => {
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const errEl = document.getElementById("authError");
    errEl.classList.add("hidden");
    try {
      const res = await api("/auth/login", { method: "POST", body: { email, password } });
      saveSession(res);
      await refreshCartBadge();
      toast(`Welcome back, ${res.name}!`, "success");
      navigate("browse");
    } catch (e) {
      errEl.textContent = e.message;
      errEl.classList.remove("hidden");
    }
  });
}

function renderRegister() {
  app.innerHTML = `
    <div class="form-card">
      <h2>Create an account</h2>
      <div class="form-error hidden" id="authError"></div>
      <label>Name</label>
      <input type="text" id="regName" placeholder="Jane Doe" />
      <label>Email</label>
      <input type="email" id="regEmail" placeholder="you@example.com" />
      <label>Password</label>
      <input type="password" id="regPassword" placeholder="At least 6 characters" />
      <button class="btn btn-primary btn-block" id="regBtn">Register</button>
      <div class="form-switch">Already have an account? <a data-nav="login">Log in</a></div>
    </div>
  `;
  document.getElementById("regBtn").addEventListener("click", async () => {
    const name = document.getElementById("regName").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const password = document.getElementById("regPassword").value;
    const errEl = document.getElementById("authError");
    errEl.classList.add("hidden");
    try {
      const res = await api("/auth/register", { method: "POST", body: { name, email, password } });
      saveSession(res);
      await refreshCartBadge();
      toast(`Welcome, ${res.name}!`, "success");
      navigate("browse");
    } catch (e) {
      errEl.textContent = e.message;
      errEl.classList.remove("hidden");
    }
  });
}

// ---------------------------------------------------------------------------
// Cart view
// ---------------------------------------------------------------------------
async function renderCart() {
  if (!isLoggedIn()) { navigate("login"); return; }
  app.innerHTML = `<div class="spinner-wrap">Loading cart…</div>`;
  try {
    const cart = await api("/cart", { auth: true });
    state.cart = cart;
    refreshNav();

    if (!cart.items.length) {
      app.innerHTML = `<h1>Your Cart</h1><div class="empty-state">Your cart is empty. <a data-nav="browse" style="text-decoration:underline">Browse books</a></div>`;
      return;
    }

    app.innerHTML = `
      <h1>Your Cart</h1>
      <div id="cartRows">${cart.items.map(cartRowHtml).join("")}</div>
      <div class="cart-summary">
        <div class="total-row"><span>Total</span><span>${money(cart.total)}</span></div>
        <label>Shipping address</label>
        <textarea id="shippingAddress" rows="3" placeholder="123 Main St, Springfield"></textarea>
        <div class="form-error hidden" id="checkoutError"></div>
        <button class="btn btn-primary btn-block" id="checkoutBtn">Place Order</button>
      </div>
    `;

    app.querySelectorAll("[data-remove]").forEach(el => {
      el.addEventListener("click", () => removeFromCart(el.getAttribute("data-remove")));
    });
    app.querySelectorAll("[data-qty-change]").forEach(el => {
      el.addEventListener("click", () => {
        const [bookId, delta] = el.getAttribute("data-qty-change").split(":");
        changeQty(bookId, Number(delta));
      });
    });
    document.getElementById("checkoutBtn").addEventListener("click", placeOrder);
  } catch (e) {
    app.innerHTML = `<div class="empty-state">${escapeHtml(e.message)}</div>`;
  }
}

function cartRowHtml(item) {
  return `
    <div class="cart-row">
      <img src="${escapeHtml(item.bookImageUrl || 'https://placehold.co/100x140?text=No+Cover')}" alt="${escapeHtml(item.bookTitle)}" />
      <div class="cart-row-info">
        <div class="cart-row-title">${escapeHtml(item.bookTitle)}</div>
        <div class="book-author">${money(item.price)} each</div>
        <div class="qty-control">
          <button data-qty-change="${item.bookId}:-1">−</button>
          <span>${item.quantity}</span>
          <button data-qty-change="${item.bookId}:1">+</button>
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-weight:700;margin-bottom:8px;">${money(item.subtotal)}</div>
        <button class="btn btn-outline" data-remove="${item.bookId}">Remove</button>
      </div>
    </div>
  `;
}

async function changeQty(bookId, delta) {
  const item = state.cart.items.find(i => String(i.bookId) === String(bookId));
  if (!item) return;
  const newQty = item.quantity + delta;
  if (newQty < 1) { removeFromCart(bookId); return; }
  try {
    state.cart = await api(`/cart/${bookId}`, { method: "PUT", auth: true, body: { quantity: newQty } });
    renderCart();
  } catch (e) { toast(e.message, "error"); }
}

async function removeFromCart(bookId) {
  try {
    state.cart = await api(`/cart/${bookId}`, { method: "DELETE", auth: true });
    toast("Removed from cart");
    renderCart();
  } catch (e) { toast(e.message, "error"); }
}

async function placeOrder() {
  const address = document.getElementById("shippingAddress").value.trim();
  const errEl = document.getElementById("checkoutError");
  errEl.classList.add("hidden");
  if (!address) {
    errEl.textContent = "Please enter a shipping address";
    errEl.classList.remove("hidden");
    return;
  }
  try {
    await api("/orders", { method: "POST", auth: true, body: { shippingAddress: address } });
    state.cart = { items: [], total: 0 };
    refreshNav();
    toast("Order placed! 🎉", "success");
    navigate("orders");
  } catch (e) {
    errEl.textContent = e.message;
    errEl.classList.remove("hidden");
  }
}

// ---------------------------------------------------------------------------
// Order history view
// ---------------------------------------------------------------------------
async function renderOrders() {
  if (!isLoggedIn()) { navigate("login"); return; }
  app.innerHTML = `<div class="spinner-wrap">Loading orders…</div>`;
  try {
    const orders = await api("/orders", { auth: true });
    if (!orders.length) {
      app.innerHTML = `<h1>Order History</h1><div class="empty-state">You haven't placed any orders yet.</div>`;
      return;
    }
    app.innerHTML = `<h1>Order History</h1>` + orders.map(orderCardHtml).join("");
  } catch (e) {
    app.innerHTML = `<div class="empty-state">${escapeHtml(e.message)}</div>`;
  }
}

function orderCardHtml(o) {
  const date = new Date(o.createdAt).toLocaleString();
  return `
    <div class="order-card">
      <div class="order-header">
        <div>
          <strong>Order #${o.id}</strong>
          <div class="book-author">${date}</div>
        </div>
        <span class="status-pill status-${o.status}">${o.status}</span>
      </div>
      <div style="margin-top:10px">
        ${o.items.map(it => `
          <div class="order-item-row">
            <span>${escapeHtml(it.bookTitle)} × ${it.quantity}</span>
            <span>${money(it.subtotal)}</span>
          </div>`).join("")}
      </div>
      <div class="order-item-row" style="font-weight:700;border-top:1px solid var(--border);margin-top:6px;">
        <span>Total</span><span>${money(o.totalAmount)}</span>
      </div>
      <div class="book-author" style="margin-top:8px;">Ship to: ${escapeHtml(o.shippingAddress)}</div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Admin view
// ---------------------------------------------------------------------------
let adminTab = "books";

async function renderAdmin() {
  if (!isAdmin()) { app.innerHTML = `<div class="empty-state">Admins only.</div>`; return; }
  app.innerHTML = `
    <h1>Admin Dashboard</h1>
    <div class="admin-tabs">
      <div class="admin-tab ${adminTab === "books" ? "active" : ""}" data-tab="books">Books</div>
      <div class="admin-tab ${adminTab === "categories" ? "active" : ""}" data-tab="categories">Categories</div>
      <div class="admin-tab ${adminTab === "orders" ? "active" : ""}" data-tab="orders">Orders</div>
    </div>
    <div id="adminContent"><div class="spinner-wrap">Loading…</div></div>
  `;
  app.querySelectorAll("[data-tab]").forEach(el => {
    el.addEventListener("click", () => { adminTab = el.getAttribute("data-tab"); renderAdmin(); });
  });

  if (adminTab === "books") await renderAdminBooks();
  else if (adminTab === "categories") await renderAdminCategories();
  else await renderAdminOrders();
}

async function renderAdminBooks() {
  const content = document.getElementById("adminContent");
  try {
    const [booksPage, categories] = await Promise.all([
      api("/books?page=0&size=100"),
      api("/categories"),
    ]);
    state.categories = categories;
    const books = booksPage.content;

    content.innerHTML = `
      <button class="btn btn-primary" id="newBookBtn" style="margin-bottom:14px;">+ Add Book</button>
      <table>
        <thead><tr><th>Title</th><th>Author</th><th>Category</th><th>Price</th><th>Stock</th><th></th></tr></thead>
        <tbody>
          ${books.map(b => `
            <tr>
              <td>${escapeHtml(b.title)}</td>
              <td>${escapeHtml(b.author)}</td>
              <td>${escapeHtml(b.categoryName || "—")}</td>
              <td>${money(b.price)}</td>
              <td>${b.stockQuantity}</td>
              <td class="table-actions">
                <button class="btn btn-outline" data-edit-book="${b.id}">Edit</button>
                <button class="btn btn-danger" data-delete-book="${b.id}">Delete</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;

    document.getElementById("newBookBtn").addEventListener("click", () => openBookModal(null, books));
    content.querySelectorAll("[data-edit-book]").forEach(el => {
      el.addEventListener("click", () => {
        const book = books.find(b => String(b.id) === el.getAttribute("data-edit-book"));
        openBookModal(book);
      });
    });
    content.querySelectorAll("[data-delete-book]").forEach(el => {
      el.addEventListener("click", async () => {
        if (!confirm("Delete this book?")) return;
        try {
          await api(`/admin/books/${el.getAttribute("data-delete-book")}`, { method: "DELETE", auth: true });
          toast("Book deleted", "success");
          renderAdminBooks();
        } catch (e) { toast(e.message, "error"); }
      });
    });
  } catch (e) {
    content.innerHTML = `<div class="empty-state">${escapeHtml(e.message)}</div>`;
  }
}

function openBookModal(book) {
  const isEdit = !!book;
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal">
      <h2>${isEdit ? "Edit Book" : "Add Book"}</h2>
      <div class="form-error hidden" id="bookModalError"></div>
      <label>Title</label>
      <input id="bTitle" value="${escapeHtml(book?.title || "")}" />
      <label>Author</label>
      <input id="bAuthor" value="${escapeHtml(book?.author || "")}" />
      <label>Description</label>
      <textarea id="bDesc" rows="3">${escapeHtml(book?.description || "")}</textarea>
      <label>Price</label>
      <input id="bPrice" type="number" step="0.01" min="0" value="${book?.price ?? ""}" />
      <label>Stock Quantity</label>
      <input id="bStock" type="number" min="0" value="${book?.stockQuantity ?? ""}" />
      <label>Image URL</label>
      <input id="bImage" value="${escapeHtml(book?.imageUrl || "")}" />
      <label>Category</label>
      <select id="bCategory">
        ${state.categories.map(c => `<option value="${c.id}" ${book?.categoryId === c.id ? "selected" : ""}>${escapeHtml(c.name)}</option>`).join("")}
      </select>
      <div style="display:flex;gap:10px;margin-top:10px;">
        <button class="btn btn-outline btn-block" id="modalCancel">Cancel</button>
        <button class="btn btn-primary btn-block" id="modalSave">Save</button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);
  backdrop.querySelector("#modalCancel").addEventListener("click", () => backdrop.remove());
  backdrop.querySelector("#modalSave").addEventListener("click", async () => {
    const errEl = backdrop.querySelector("#bookModalError");
    const payload = {
      title: backdrop.querySelector("#bTitle").value.trim(),
      author: backdrop.querySelector("#bAuthor").value.trim(),
      description: backdrop.querySelector("#bDesc").value.trim(),
      price: Number(backdrop.querySelector("#bPrice").value),
      stockQuantity: Number(backdrop.querySelector("#bStock").value),
      imageUrl: backdrop.querySelector("#bImage").value.trim(),
      categoryId: Number(backdrop.querySelector("#bCategory").value),
    };
    try {
      if (isEdit) {
        await api(`/admin/books/${book.id}`, { method: "PUT", auth: true, body: payload });
      } else {
        await api(`/admin/books`, { method: "POST", auth: true, body: payload });
      }
      toast("Book saved", "success");
      backdrop.remove();
      renderAdminBooks();
    } catch (e) {
      errEl.textContent = e.message;
      errEl.classList.remove("hidden");
    }
  });
}

async function renderAdminCategories() {
  const content = document.getElementById("adminContent");
  try {
    const categories = await api("/categories");
    content.innerHTML = `
      <button class="btn btn-primary" id="newCatBtn" style="margin-bottom:14px;">+ Add Category</button>
      <table>
        <thead><tr><th>Name</th><th>Description</th><th></th></tr></thead>
        <tbody>
          ${categories.map(c => `
            <tr>
              <td>${escapeHtml(c.name)}</td>
              <td>${escapeHtml(c.description || "")}</td>
              <td class="table-actions">
                <button class="btn btn-outline" data-edit-cat="${c.id}">Edit</button>
                <button class="btn btn-danger" data-delete-cat="${c.id}">Delete</button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
    document.getElementById("newCatBtn").addEventListener("click", () => openCategoryModal(null));
    content.querySelectorAll("[data-edit-cat]").forEach(el => {
      el.addEventListener("click", () => {
        const cat = categories.find(c => String(c.id) === el.getAttribute("data-edit-cat"));
        openCategoryModal(cat);
      });
    });
    content.querySelectorAll("[data-delete-cat]").forEach(el => {
      el.addEventListener("click", async () => {
        if (!confirm("Delete this category? Books in it will need reassigning.")) return;
        try {
          await api(`/admin/categories/${el.getAttribute("data-delete-cat")}`, { method: "DELETE", auth: true });
          toast("Category deleted", "success");
          renderAdminCategories();
        } catch (e) { toast(e.message, "error"); }
      });
    });
  } catch (e) {
    content.innerHTML = `<div class="empty-state">${escapeHtml(e.message)}</div>`;
  }
}

function openCategoryModal(cat) {
  const isEdit = !!cat;
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <div class="modal">
      <h2>${isEdit ? "Edit Category" : "Add Category"}</h2>
      <div class="form-error hidden" id="catModalError"></div>
      <label>Name</label>
      <input id="cName" value="${escapeHtml(cat?.name || "")}" />
      <label>Description</label>
      <textarea id="cDesc" rows="3">${escapeHtml(cat?.description || "")}</textarea>
      <div style="display:flex;gap:10px;margin-top:10px;">
        <button class="btn btn-outline btn-block" id="catCancel">Cancel</button>
        <button class="btn btn-primary btn-block" id="catSave">Save</button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);
  backdrop.querySelector("#catCancel").addEventListener("click", () => backdrop.remove());
  backdrop.querySelector("#catSave").addEventListener("click", async () => {
    const errEl = backdrop.querySelector("#catModalError");
    const payload = {
      name: backdrop.querySelector("#cName").value.trim(),
      description: backdrop.querySelector("#cDesc").value.trim(),
    };
    try {
      if (isEdit) {
        await api(`/admin/categories/${cat.id}`, { method: "PUT", auth: true, body: payload });
      } else {
        await api(`/admin/categories`, { method: "POST", auth: true, body: payload });
      }
      toast("Category saved", "success");
      backdrop.remove();
      renderAdminCategories();
      loadCategories();
    } catch (e) {
      errEl.textContent = e.message;
      errEl.classList.remove("hidden");
    }
  });
}

async function renderAdminOrders() {
  const content = document.getElementById("adminContent");
  try {
    const orders = await api("/admin/orders", { auth: true });
    const statuses = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"];
    content.innerHTML = `
      <table>
        <thead><tr><th>Order</th><th>Total</th><th>Status</th><th>Placed</th><th></th></tr></thead>
        <tbody>
          ${orders.map(o => `
            <tr>
              <td>#${o.id}</td>
              <td>${money(o.totalAmount)}</td>
              <td><span class="status-pill status-${o.status}">${o.status}</span></td>
              <td>${new Date(o.createdAt).toLocaleDateString()}</td>
              <td>
                <select data-status-select="${o.id}">
                  ${statuses.map(s => `<option value="${s}" ${s === o.status ? "selected" : ""}>${s}</option>`).join("")}
                </select>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
    content.querySelectorAll("[data-status-select]").forEach(el => {
      el.addEventListener("change", async () => {
        try {
          await api(`/admin/orders/${el.getAttribute("data-status-select")}/status`, {
            method: "PATCH", auth: true, body: { status: el.value }
          });
          toast("Order status updated", "success");
        } catch (e) { toast(e.message, "error"); }
      });
    });
  } catch (e) {
    content.innerHTML = `<div class="empty-state">${escapeHtml(e.message)}</div>`;
  }
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------
(async function init() {
  await loadCategories();
  await refreshCartBadge();
  render();
})();
