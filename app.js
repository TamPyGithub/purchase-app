const STORAGE_KEY = "purchase-tracking-data-v1";

const today = new Date();
const addDays = (days) => {
  const next = new Date(today);
  next.setDate(today.getDate() + days);
  return next.toISOString().slice(0, 10);
};

const initialData = {
  suppliers: [
    { id: "sup-1", name: "Cong ty An Phat", category: "Vat tu san xuat", contact: "Nguyen Minh", phone: "0901 222 333", email: "minh@anphat.vn" },
    { id: "sup-2", name: "Tin hoc Sao Bac", category: "Thiet bi IT", contact: "Tran Linh", phone: "0914 555 888", email: "sales@saobac.vn" },
    { id: "sup-3", name: "Van phong Xanh", category: "Van phong pham", contact: "Le Ha", phone: "0988 120 120", email: "contact@vpxanh.vn" }
  ],
  requests: [
    {
      id: "req-1",
      code: "YC-2606-001",
      requestDate: addDays(-8),
      department: "San xuat",
      items: [
        { item: "Giac cam cong nghiep", quantity: 120, unit: "cai", unitPrice: 150000, estimatedPrice: 18000000 },
        { item: "Day dien chiu nhiet", quantity: 40, unit: "cuon", unitPrice: 300000, estimatedPrice: 12000000 }
      ],
      reason: "Bo sung cho day chuyen moi",
      status: "Cho duyet"
    },
    {
      id: "req-2",
      code: "YC-2606-002",
      requestDate: addDays(-7),
      department: "IT",
      items: [
        { item: "Laptop ke toan", quantity: 3, unit: "cai", unitPrice: 24000000, estimatedPrice: 72000000 }
      ],
      reason: "Thay may cu cham",
      status: "Da duyet"
    },
    {
      id: "req-3",
      code: "YC-2606-003",
      requestDate: addDays(-6),
      department: "Hanh chinh",
      items: [
        { item: "Giay A4", quantity: 80, unit: "thung", unitPrice: 300000, estimatedPrice: 24000000 },
        { item: "But bi", quantity: 200, unit: "cay", unitPrice: 15000, estimatedPrice: 3000000 }
      ],
      reason: "Du tru quy 3",
      status: "Da duyet"
    }
  ],
  orders: [
    { id: "po-1", code: "PO-2606-001", requestId: "req-2", supplierId: "sup-2", orderDate: addDays(-6), expectedDate: addDays(3), totalAmount: 70500000, status: "Dang giao" },
    { id: "po-2", code: "PO-2606-002", requestId: "req-3", supplierId: "sup-3", orderDate: addDays(-10), expectedDate: addDays(-2), totalAmount: 23200000, status: "Da nhan" }
  ],
  receipts: [
    { id: "gr-1", orderId: "po-2", receivedDate: addDays(-2), receivedQty: 80, condition: "Dat", note: "Nhan du hang, chung tu hop le." }
  ],
  payments: [
    { id: "pay-1", orderId: "po-2", invoiceNo: "HD-000918", dueDate: addDays(12), amount: 23200000, paidAmount: 0, status: "Chua thanh toan" }
  ]
};

let state = loadData();
let editingRequestId = null;

const viewTitles = {
  dashboard: "Tong quan",
  requests: "Yeu cau mua hang",
  orders: "Don mua hang",
  suppliers: "Nha cung cap",
  receipts: "Nhan hang",
  payments: "Thanh toan"
};

const statusClass = {
  "Cho duyet": "pending",
  "Da duyet": "approved",
  "Tu choi": "rejected",
  "Dang giao": "progress",
  "Da nhan": "done",
  "Da gui NCC": "progress",
  "Chua thanh toan": "pending",
  "Thanh toan mot phan": "partial",
  "Da thanh toan": "paid",
  "Qua han": "late",
  "Dat": "done",
  "Thieu hang": "pending",
  "Hu hong": "rejected",
  "Can kiem tra": "progress"
};

function loadData() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : structuredClone(initialData);
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatMoney(value) {
  return Number(value).toLocaleString("vi-VN") + " VND";
}

function makeId(prefix) {
  return prefix + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function makeCode(prefix, collection) {
  return `${prefix}-2606-${String(collection.length + 1).padStart(3, "0")}`;
}

function currentDateValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getRequestItems(request) {
  if (Array.isArray(request.items) && request.items.length) {
    return request.items.map((item) => {
      const quantity = Number(item.quantity) || 0;
      const oldAmount = Number(item.estimatedPrice) || 0;
      const unitPrice = item.unitPrice !== undefined ? Number(item.unitPrice) : (quantity ? oldAmount / quantity : 0);
      return {
        ...item,
        quantity,
        unitPrice,
        estimatedPrice: quantity * unitPrice || oldAmount
      };
    });
  }
  if (!request.item) return [];
  const quantity = Number(request.quantity) || 0;
  const oldAmount = Number(request.estimatedPrice) || 0;
  return [{
    item: request.item,
    quantity,
    unit: request.unit || "",
    unitPrice: quantity ? oldAmount / quantity : 0,
    estimatedPrice: oldAmount
  }];
}

function getRequestTotal(request) {
  return getRequestItems(request).reduce((sum, item) => sum + Number(item.estimatedPrice || 0), 0);
}

function getRequestItemSummary(request) {
  const items = getRequestItems(request);
  if (!items.length) return "Chua co mat hang";

  const first = items[0];
  const suffix = items.length > 1 ? `<br><small>+${items.length - 1} mat hang khac</small>` : "";
  return `${first.item}<br><small>${first.quantity} ${first.unit}</small>${suffix}`;
}

function getRequestSelectText(request) {
  const items = getRequestItems(request);
  const firstName = items[0]?.item || "Chua co mat hang";
  return items.length > 1 ? `${firstName} +${items.length - 1}` : firstName;
}

function findSupplier(id) {
  return state.suppliers.find((supplier) => supplier.id === id);
}

function findRequest(id) {
  return state.requests.find((request) => request.id === id);
}

function findOrder(id) {
  return state.orders.find((order) => order.id === id);
}

function statusBadge(status) {
  return `<span class="status ${statusClass[status] || "progress"}">${status}</span>`;
}

function render() {
  renderDashboard();
  renderRequests();
  renderOrders();
  renderSuppliers();
  renderReceipts();
  renderPayments();
  fillSelects();
}

function renderDashboard() {
  const pendingRequests = state.requests.filter((request) => request.status === "Cho duyet").length;
  const activeOrders = state.orders.filter((order) => order.status !== "Da nhan").length;
  const totalSpend = state.orders.reduce((sum, order) => sum + Number(order.totalAmount), 0);
  const unpaid = state.payments.reduce((sum, payment) => sum + Number(payment.amount) - Number(payment.paidAmount), 0);

  document.getElementById("metricsGrid").innerHTML = [
    ["Yeu cau cho duyet", pendingRequests, "Can quan ly xu ly"],
    ["Don dang theo doi", activeOrders, "PO chua hoan tat"],
    ["Tong gia tri PO", formatMoney(totalSpend), "Da ghi nhan"],
    ["Cong no con lai", formatMoney(unpaid), "Theo hoa don"]
  ].map(([label, value, hint]) => `
    <article class="metric-card">
      <span>${label}</span>
      <strong>${value}</strong>
      <small>${hint}</small>
    </article>
  `).join("");

  const activities = [
    ...state.requests.filter((request) => request.status === "Cho duyet").map((request) => ({
      title: `${request.code} dang cho duyet`,
      detail: `${request.department} can mua ${getRequestSelectText(request)}`,
      value: formatMoney(getRequestTotal(request))
    })),
    ...state.orders.filter((order) => order.status === "Dang giao").map((order) => ({
      title: `${order.code} dang giao`,
      detail: findSupplier(order.supplierId)?.name || "Nha cung cap",
      value: order.expectedDate
    })),
    ...state.payments.filter((payment) => payment.status !== "Da thanh toan").map((payment) => ({
      title: `${payment.invoiceNo} can thanh toan`,
      detail: findOrder(payment.orderId)?.code || "PO",
      value: formatMoney(payment.amount - payment.paidAmount)
    }))
  ];

  document.getElementById("pendingCount").textContent = `${activities.length} viec`;
  document.getElementById("activityList").innerHTML = activities.length ? activities.map((item) => `
    <div class="timeline-item">
      <span class="timeline-dot"></span>
      <div>
        <p>${item.title}</p>
        <span>${item.detail}</span>
      </div>
      <strong>${item.value}</strong>
    </div>
  `).join("") : `<p>Khong co viec can xu ly.</p>`;

  const spendBySupplier = state.suppliers.map((supplier) => {
    const total = state.orders
      .filter((order) => order.supplierId === supplier.id)
      .reduce((sum, order) => sum + Number(order.totalAmount), 0);
    return { supplier, total };
  }).filter((row) => row.total > 0);
  const maxSpend = Math.max(...spendBySupplier.map((row) => row.total), 1);

  document.getElementById("supplierSpend").innerHTML = spendBySupplier.length ? spendBySupplier.map(({ supplier, total }) => `
    <div class="bar-row">
      <div class="bar-meta">
        <strong>${supplier.name}</strong>
        <span>${formatMoney(total)}</span>
      </div>
      <div class="bar-track"><div class="bar-fill" style="width: ${(total / maxSpend) * 100}%"></div></div>
    </div>
  `).join("") : `<p>Chua co du lieu chi phi.</p>`;
}

function renderRequests() {
  document.getElementById("requestsTable").innerHTML = state.requests.map((request) => `
    <tr>
      <td><strong>${request.code}</strong></td>
      <td>${request.requestDate || ""}</td>
      <td>${request.department}</td>
      <td>${getRequestItemSummary(request)}</td>
      <td>${formatMoney(getRequestTotal(request))}</td>
      <td>${statusBadge(request.status)}</td>
      <td>
        <div class="row-actions">
          <button class="mini-button" data-action="edit-request" data-id="${request.id}" type="button">Sua</button>
          <button class="mini-button" data-action="approve-request" data-id="${request.id}" type="button">Duyet</button>
          <button class="mini-button" data-action="reject-request" data-id="${request.id}" type="button">Tu choi</button>
          <button class="mini-button danger-button" data-action="delete-request" data-id="${request.id}" type="button">Xoa</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function renderOrders() {
  document.getElementById("ordersTable").innerHTML = state.orders.map((order) => {
    const supplier = findSupplier(order.supplierId);
    const request = findRequest(order.requestId);
    return `
      <tr>
        <td><strong>${order.code}</strong></td>
        <td>${supplier?.name || "Khong ro"}</td>
        <td>${request?.code || "Khong ro"}</td>
        <td>${order.expectedDate}</td>
        <td>${formatMoney(order.totalAmount)}</td>
        <td>${statusBadge(order.status)}</td>
        <td>
          <div class="row-actions">
            <button class="mini-button" data-action="send-order" data-id="${order.id}" type="button">Gui NCC</button>
            <button class="mini-button" data-action="receive-order" data-id="${order.id}" type="button">Da nhan</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function renderSuppliers() {
  document.getElementById("supplierCards").innerHTML = state.suppliers.map((supplier) => `
    <article class="supplier-card">
      <h4>${supplier.name}</h4>
      <span>${supplier.category}</span>
      <p>${supplier.contact}<br>${supplier.phone}<br>${supplier.email}</p>
    </article>
  `).join("");
}

function renderReceipts() {
  document.getElementById("receiptsTable").innerHTML = state.receipts.map((receipt) => {
    const order = findOrder(receipt.orderId);
    return `
      <tr>
        <td><strong>${order?.code || "Khong ro"}</strong></td>
        <td>${receipt.receivedDate}</td>
        <td>${receipt.receivedQty}</td>
        <td>${statusBadge(receipt.condition)}</td>
        <td>${receipt.note || ""}</td>
      </tr>
    `;
  }).join("");
}

function renderPayments() {
  document.getElementById("paymentsTable").innerHTML = state.payments.map((payment) => {
    const order = findOrder(payment.orderId);
    return `
      <tr>
        <td><strong>${payment.invoiceNo}</strong></td>
        <td>${order?.code || "Khong ro"}</td>
        <td>${payment.dueDate}</td>
        <td>${formatMoney(payment.amount)}</td>
        <td>${formatMoney(payment.paidAmount)}</td>
        <td>${statusBadge(payment.status)}</td>
        <td>
          <div class="row-actions">
            <button class="mini-button" data-action="pay-full" data-id="${payment.id}" type="button">Da tra du</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function fillSelects() {
  const approvedRequests = state.requests.filter((request) => request.status === "Da duyet");
  document.getElementById("orderRequestSelect").innerHTML = approvedRequests.map((request) => (
    `<option value="${request.id}">${request.code} - ${getRequestSelectText(request)}</option>`
  )).join("");
  document.getElementById("orderSupplierSelect").innerHTML = state.suppliers.map((supplier) => (
    `<option value="${supplier.id}">${supplier.name}</option>`
  )).join("");

  const orderOptions = state.orders.map((order) => `<option value="${order.id}">${order.code}</option>`).join("");
  document.getElementById("receiptOrderSelect").innerHTML = orderOptions;
  document.getElementById("paymentOrderSelect").innerHTML = orderOptions;
}

function switchView(view) {
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.view === view));
  document.querySelectorAll(".view").forEach((section) => section.classList.remove("active"));
  document.getElementById(`${view}View`).classList.add("active");
  document.getElementById("pageTitle").textContent = viewTitles[view];
}

function openModal(id) {
  document.getElementById("modalBackdrop").hidden = false;
  document.querySelectorAll(".modal").forEach((modal) => modal.classList.remove("active"));
  document.getElementById(id).classList.add("active");

  if (id === "requestModal") {
    editingRequestId = null;
    document.getElementById("requestModalTitle").textContent = "Tao yeu cau mua hang";
    document.getElementById("requestSubmitBtn").textContent = "Luu yeu cau";
    document.getElementById("requestCodeInput").value = makeCode("YC", state.requests);
    document.getElementById("requestDateInput").value = currentDateValue();
    resetRequestItems();
  }
}

function closeModal() {
  document.getElementById("modalBackdrop").hidden = true;
  editingRequestId = null;
  document.querySelectorAll(".modal").forEach((modal) => {
    modal.classList.remove("active");
    modal.reset();
  });
}

function updatePaymentStatus(payment) {
  if (Number(payment.paidAmount) >= Number(payment.amount)) return "Da thanh toan";
  if (Number(payment.paidAmount) > 0) return "Thanh toan mot phan";
  return new Date(payment.dueDate) < today ? "Qua han" : "Chua thanh toan";
}

function requestItemTemplate() {
  return `
    <tr class="request-item-row">
      <td><input name="item" required placeholder="Ten mat hang can mua" /></td>
      <td><input name="quantity" required min="1" type="number" /></td>
      <td><input name="unit" required placeholder="cai, hop, kg..." /></td>
      <td><input name="unitPrice" required min="0" type="number" /></td>
      <td><input name="lineAmount" readonly tabindex="-1" /></td>
      <td><button class="icon-button remove-request-item" type="button" title="Xoa dong">x</button></td>
    </tr>
  `;
}

function addRequestItemRow(item = {}) {
  document.getElementById("requestItems").insertAdjacentHTML("beforeend", requestItemTemplate());
  const row = document.querySelector("#requestItems tr:last-child");
  row.querySelector('[name="item"]').value = item.item || "";
  row.querySelector('[name="quantity"]').value = item.quantity ?? "";
  row.querySelector('[name="unit"]').value = item.unit || "";
  row.querySelector('[name="unitPrice"]').value = item.unitPrice ?? "";
  updateRequestItemRowTotal(row);
  updateRequestEstimatedTotal();
}

function resetRequestItems() {
  document.getElementById("requestItems").innerHTML = "";
  addRequestItemRow();
}

function fillRequestItems(items) {
  document.getElementById("requestItems").innerHTML = "";
  items.forEach((item) => addRequestItemRow(item));
  if (!items.length) addRequestItemRow();
  updateRequestEstimatedTotal();
}

function openEditRequest(requestId) {
  const request = findRequest(requestId);
  if (!request) return;

  document.getElementById("modalBackdrop").hidden = false;
  document.querySelectorAll(".modal").forEach((modal) => modal.classList.remove("active"));
  document.getElementById("requestModal").classList.add("active");

  editingRequestId = requestId;
  document.getElementById("requestModalTitle").textContent = "Sua yeu cau mua hang";
  document.getElementById("requestSubmitBtn").textContent = "Cap nhat yeu cau";
  document.getElementById("requestCodeInput").value = request.code || "";
  document.getElementById("requestDateInput").value = request.requestDate || currentDateValue();
  document.querySelector('#requestModal [name="department"]').value = request.department || "";
  document.querySelector('#requestModal [name="reason"]').value = request.reason || "";
  fillRequestItems(getRequestItems(request));
}

function collectRequestItems() {
  return [...document.querySelectorAll("#requestItems tr")].map((row) => {
    const quantity = Number(row.querySelector('[name="quantity"]').value);
    const unitPrice = Number(row.querySelector('[name="unitPrice"]').value);
    return {
      item: row.querySelector('[name="item"]').value.trim(),
      quantity,
      unit: row.querySelector('[name="unit"]').value.trim(),
      unitPrice,
      estimatedPrice: quantity * unitPrice
    };
  }).filter((item) => item.item);
}

function updateRequestItemRowTotal(row) {
  const quantity = Number(row.querySelector('[name="quantity"]').value || 0);
  const unitPrice = Number(row.querySelector('[name="unitPrice"]').value || 0);
  row.querySelector('[name="lineAmount"]').value = formatMoney(quantity * unitPrice);
}

function updateRequestEstimatedTotal() {
  const total = [...document.querySelectorAll("#requestItems tr")]
    .reduce((sum, row) => {
      const quantity = Number(row.querySelector('[name="quantity"]').value || 0);
      const unitPrice = Number(row.querySelector('[name="unitPrice"]').value || 0);
      return sum + quantity * unitPrice;
    }, 0);
  document.getElementById("requestEstimatedTotal").textContent = formatMoney(total);
}

document.getElementById("navList").addEventListener("click", (event) => {
  const button = event.target.closest("[data-view]");
  if (button) switchView(button.dataset.view);
});

document.getElementById("quickRequestBtn").addEventListener("click", () => openModal("requestModal"));
document.getElementById("resetDataBtn").addEventListener("click", () => {
  state = structuredClone(initialData);
  saveData();
  render();
});

document.querySelectorAll("[data-open-modal]").forEach((button) => {
  button.addEventListener("click", () => openModal(button.dataset.openModal));
});

document.querySelectorAll(".close-modal").forEach((button) => button.addEventListener("click", closeModal));
document.getElementById("modalBackdrop").addEventListener("click", (event) => {
  if (event.target.id === "modalBackdrop") closeModal();
});

document.getElementById("addRequestItemBtn").addEventListener("click", addRequestItemRow);
document.getElementById("requestItems").addEventListener("input", (event) => {
  if (event.target.matches('[name="quantity"], [name="unitPrice"]')) {
    updateRequestItemRowTotal(event.target.closest("tr"));
    updateRequestEstimatedTotal();
  }
});
document.getElementById("requestItems").addEventListener("click", (event) => {
  const button = event.target.closest(".remove-request-item");
  if (!button) return;

  const rows = document.querySelectorAll("#requestItems tr");
  if (rows.length > 1) button.closest("tr").remove();
  updateRequestEstimatedTotal();
});

document.querySelectorAll(".modal").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());

    if (form.dataset.kind === "requests") {
      const items = collectRequestItems();
      const requestData = {
        code: data.code,
        requestDate: data.requestDate,
        department: data.department,
        items,
        reason: data.reason
      };

      if (editingRequestId) {
        const request = findRequest(editingRequestId);
        Object.assign(request, requestData);
      } else {
        state.requests.unshift({
          id: makeId("req"),
          ...requestData,
          status: "Cho duyet"
        });
      }
      switchView("requests");
    }

    if (form.dataset.kind === "orders") {
      state.orders.unshift({
        id: makeId("po"),
        code: makeCode("PO", state.orders),
        requestId: data.requestId,
        supplierId: data.supplierId,
        orderDate: data.orderDate,
        expectedDate: data.expectedDate,
        totalAmount: Number(data.totalAmount),
        status: "Da gui NCC"
      });
      switchView("orders");
    }

    if (form.dataset.kind === "suppliers") {
      state.suppliers.unshift({
        id: makeId("sup"),
        name: data.name,
        category: data.category,
        contact: data.contact,
        phone: data.phone,
        email: data.email
      });
      switchView("suppliers");
    }

    if (form.dataset.kind === "receipts") {
      state.receipts.unshift({
        id: makeId("gr"),
        orderId: data.orderId,
        receivedDate: data.receivedDate,
        receivedQty: Number(data.receivedQty),
        condition: data.condition,
        note: data.note
      });
      const order = findOrder(data.orderId);
      if (order && data.condition === "Dat") order.status = "Da nhan";
      switchView("receipts");
    }

    if (form.dataset.kind === "payments") {
      const payment = {
        id: makeId("pay"),
        orderId: data.orderId,
        invoiceNo: data.invoiceNo,
        dueDate: data.dueDate,
        amount: Number(data.amount),
        paidAmount: Number(data.paidAmount),
        status: "Chua thanh toan"
      };
      payment.status = updatePaymentStatus(payment);
      state.payments.unshift(payment);
      switchView("payments");
    }

    saveData();
    render();
    closeModal();
  });
});

document.body.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const { action, id } = button.dataset;

  if (action === "edit-request") {
    openEditRequest(id);
    return;
  }

  if (action === "delete-request") {
    const request = findRequest(id);
    if (!request) return;
    const isConfirmed = window.confirm(`Ban co chac muon xoa yeu cau ${request.code}?`);
    if (!isConfirmed) return;
    const linkedOrderIds = state.orders.filter((order) => order.requestId === id).map((order) => order.id);
    state.requests = state.requests.filter((item) => item.id !== id);
    state.orders = state.orders.filter((order) => order.requestId !== id);
    state.receipts = state.receipts.filter((receipt) => !linkedOrderIds.includes(receipt.orderId));
    state.payments = state.payments.filter((payment) => !linkedOrderIds.includes(payment.orderId));
  }

  if (action === "approve-request" || action === "reject-request") {
    const request = findRequest(id);
    request.status = action === "approve-request" ? "Da duyet" : "Tu choi";
  }

  if (action === "send-order" || action === "receive-order") {
    const order = findOrder(id);
    order.status = action === "send-order" ? "Da gui NCC" : "Da nhan";
  }

  if (action === "pay-full") {
    const payment = state.payments.find((item) => item.id === id);
    payment.paidAmount = payment.amount;
    payment.status = updatePaymentStatus(payment);
  }

  saveData();
  render();
});

render();
