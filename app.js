const STORAGE_KEY = "purchase-tracking-data-v1";
const CLOUD_CONFIG_KEY = "purchase-cloud-config-v1";
const CLOUD_TABLE = "purchase_app_data";
const CLOUD_ROW_ID = "company-main";
const DEFAULT_SUPABASE_URL = "";
const DEFAULT_SUPABASE_ANON_KEY = "";

const today = new Date();
const addDays = (days) => {
  const next = new Date(today);
  next.setDate(today.getDate() + days);
  return next.toISOString().slice(0, 10);
};

const initialData = {
  units: ["cái", "cuộn", "thùng", "cây", "hộp", "kg", "mét", "bộ"],
  suppliers: [
    { id: "sup-1", name: "Công ty An Phát", category: "Vật tư sản xuất", contact: "Nguyễn Minh", phone: "0901 222 333", email: "minh@anphat.vn" },
    { id: "sup-2", name: "Tin học Sao Bắc", category: "Thiết bị IT", contact: "Trần Linh", phone: "0914 555 888", email: "sales@saobac.vn" },
    { id: "sup-3", name: "Văn phòng Xanh", category: "Văn phòng phẩm", contact: "Lê Hà", phone: "0988 120 120", email: "contact@vpxanh.vn" }
  ],
  requests: [
    {
      id: "req-1",
      code: "YC-2606-001",
      requestDate: addDays(-8),
      department: "Sản xuất",
      items: [
        { item: "Giắc cắm công nghiệp", specification: "Loại 3 pha, 32A", quantity: 120, unit: "cái", unitPrice: 150000, estimatedPrice: 18000000 },
        { item: "Dây điện chịu nhiệt", specification: "2.5mm, lõi đồng", quantity: 40, unit: "cuộn", unitPrice: 300000, estimatedPrice: 12000000 }
      ],
      reason: "Bổ sung cho dây chuyền mới",
      status: "Chờ duyệt"
    },
    {
      id: "req-2",
      code: "YC-2606-002",
      requestDate: addDays(-7),
      department: "IT",
      items: [
        { item: "Laptop kế toán", specification: "Core i5, RAM 16GB, SSD 512GB", quantity: 3, unit: "cái", unitPrice: 24000000, estimatedPrice: 72000000 }
      ],
      reason: "Thay máy cũ chậm",
      status: "Đã duyệt"
    },
    {
      id: "req-3",
      code: "YC-2606-003",
      requestDate: addDays(-6),
      department: "Hành chính",
      items: [
        { item: "Giấy A4", specification: "Định lượng 70gsm", quantity: 80, unit: "thùng", unitPrice: 300000, estimatedPrice: 24000000 },
        { item: "Bút bi", specification: "Mực xanh, đầu 0.5mm", quantity: 200, unit: "cây", unitPrice: 15000, estimatedPrice: 3000000 }
      ],
      reason: "Dự trù quý 3",
      status: "Đã duyệt"
    }
  ],
  orders: [
    { id: "po-1", code: "PO-2606-001", requestId: "req-2", supplierId: "sup-2", orderDate: addDays(-6), expectedDate: addDays(3), totalAmount: 70500000, status: "Đang giao" },
    { id: "po-2", code: "PO-2606-002", requestId: "req-3", supplierId: "sup-3", orderDate: addDays(-10), expectedDate: addDays(-2), totalAmount: 23200000, status: "Đã nhận" }
  ],
  tenders: [
    {
      id: "td-1",
      requestId: "req-2",
      selectedSupplierId: "sup-2",
      selectionReason: "Giá phù hợp, có sẵn hàng và hỗ trợ bảo hành nhanh.",
      status: "Đã chọn",
      quotes: [
        { supplierId: "sup-2", price: 70500000, deliveryDays: 5, paymentTerm: "Thanh toán sau 30 ngày", note: "Bảo hành 12 tháng" },
        { supplierId: "sup-1", price: 74200000, deliveryDays: 8, paymentTerm: "Đặt cọc 30%", note: "Cần đặt cọc 30%" }
      ]
    }
  ],
  receipts: [
    { id: "gr-1", orderId: "po-2", receivedDate: addDays(-2), receivedQty: 80, condition: "Đạt", note: "Nhận đủ hàng, chứng từ hợp lệ." }
  ],
  payments: [
    { id: "pay-1", orderId: "po-2", invoiceNo: "HD-000918", dueDate: addDays(12), amount: 23200000, paidAmount: 0, status: "Chưa thanh toán" }
  ]
};

const viewTitles = {
  dashboard: "Tổng quan",
  requests: "Giấy xin mua hàng",
  tenders: "Kết quả đấu thầu",
  orders: "Hợp đồng mua hàng",
  suppliers: "Nhà cung cấp",
  receipts: "Nghiệm thu hàng",
  payments: "Thanh toán"
};

const statusAliases = {
  "Cho duyet": "Chờ duyệt",
  "Da duyet": "Đã duyệt",
  "Tu choi": "Từ chối",
  "Dang giao": "Đang giao",
  "Da nhan": "Đã nhận",
  "Da gui NCC": "Đã gửi NCC",
  "Chua thanh toan": "Chưa thanh toán",
  "Thanh toan mot phan": "Thanh toán một phần",
  "Da thanh toan": "Đã thanh toán",
  "Qua han": "Quá hạn",
  "Dat": "Đạt",
  "Thieu hang": "Thiếu hàng",
  "Hu hong": "Hư hỏng",
  "Can kiem tra": "Cần kiểm tra"
};

const statusClass = {
  "Chờ duyệt": "pending",
  "Đã duyệt": "approved",
  "Từ chối": "rejected",
  "Đang giao": "progress",
  "Đã nhận": "done",
  "Đã gửi NCC": "progress",
  "Chưa thanh toán": "pending",
  "Thanh toán một phần": "partial",
  "Đã thanh toán": "paid",
  "Quá hạn": "late",
  "Đạt": "done",
  "Thiếu hàng": "pending",
  "Hư hỏng": "rejected",
  "Cần kiểm tra": "progress",
  "Đã chọn": "approved",
  "Đang đánh giá": "pending"
};

let state = loadData();
let editingRequestId = null;
let editingOrderId = null;
let editingReceiptId = null;
let editingSupplierId = null;
let supplierModalContext = null;
let cloudConfig = loadCloudConfig();
let cloudSaveTimer = null;
let cloudStatusText = "";

function loadData() {
  const stored = localStorage.getItem(STORAGE_KEY);
  const data = stored ? JSON.parse(stored) : structuredClone(initialData);
  const units = [...new Set([...(data.units || initialData.units), ...collectUnitsFromData(data)])];
  return normalizeLoadedData({
    ...structuredClone(initialData),
    ...data,
    suppliers: data.suppliers || [],
    requests: data.requests || [],
    orders: data.orders || [],
    tenders: data.tenders || [],
    receipts: data.receipts || [],
    payments: data.payments || [],
    units
  });
}

function saveData(options = {}) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (!options.localOnly) queueCloudSave();
}

function loadCloudConfig() {
  const stored = localStorage.getItem(CLOUD_CONFIG_KEY);
  const data = stored ? JSON.parse(stored) : {};
  return {
    supabaseUrl: data.supabaseUrl || DEFAULT_SUPABASE_URL,
    supabaseAnonKey: data.supabaseAnonKey || DEFAULT_SUPABASE_ANON_KEY
  };
}

function saveCloudConfig(config) {
  cloudConfig = {
    supabaseUrl: String(config.supabaseUrl || "").trim().replace(/\/$/, ""),
    supabaseAnonKey: String(config.supabaseAnonKey || "").trim()
  };
  localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify(cloudConfig));
}

function isCloudConfigured() {
  return Boolean(cloudConfig.supabaseUrl && cloudConfig.supabaseAnonKey);
}

function setCloudStatus(text) {
  cloudStatusText = text;
  const status = document.getElementById("cloudStatus");
  if (status) status.textContent = text;
}

function renderCloudStatus() {
  setCloudStatus(cloudStatusText || (isCloudConfigured() ? "Đã bật đồng bộ" : "Dữ liệu máy này"));
}

function getSupabaseHeaders(extra = {}) {
  return {
    apikey: cloudConfig.supabaseAnonKey,
    Authorization: `Bearer ${cloudConfig.supabaseAnonKey}`,
    "Content-Type": "application/json",
    ...extra
  };
}

async function requestSupabase(path, options = {}) {
  if (!isCloudConfigured()) throw new Error("Chưa cấu hình đồng bộ online");
  const response = await fetch(`${cloudConfig.supabaseUrl}${path}`, {
    ...options,
    headers: getSupabaseHeaders(options.headers || {})
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Supabase lỗi ${response.status}`);
  }
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function loadDataFromCloud() {
  const rows = await requestSupabase(`/rest/v1/${CLOUD_TABLE}?id=eq.${encodeURIComponent(CLOUD_ROW_ID)}&select=data,updated_at&limit=1`);
  const remoteData = rows?.[0]?.data;
  if (!remoteData) return false;
  state = normalizeLoadedData({
    ...structuredClone(initialData),
    ...remoteData,
    suppliers: remoteData.suppliers || [],
    requests: remoteData.requests || [],
    orders: remoteData.orders || [],
    tenders: remoteData.tenders || [],
    receipts: remoteData.receipts || [],
    payments: remoteData.payments || [],
    units: remoteData.units || initialData.units
  });
  saveData({ localOnly: true });
  return true;
}

async function saveDataToCloudNow() {
  if (!isCloudConfigured()) {
    renderCloudStatus();
    return;
  }
  try {
    setCloudStatus("Đang lưu online...");
    await requestSupabase(`/rest/v1/${CLOUD_TABLE}?on_conflict=id`, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({
        id: CLOUD_ROW_ID,
        data: state,
        updated_at: new Date().toISOString()
      })
    });
    setCloudStatus("Đã đồng bộ online");
  } catch (error) {
    console.error(error);
    setCloudStatus("Lỗi đồng bộ");
  }
}

function queueCloudSave() {
  if (!isCloudConfigured()) {
    renderCloudStatus();
    return;
  }
  window.clearTimeout(cloudSaveTimer);
  cloudSaveTimer = window.setTimeout(saveDataToCloudNow, 700);
}

async function syncFromCloud() {
  if (!isCloudConfigured()) {
    setCloudStatus("Chưa cấu hình online");
    return;
  }
  try {
    setCloudStatus("Đang tải dữ liệu...");
    const hasRemoteData = await loadDataFromCloud();
    if (!hasRemoteData) {
      await saveDataToCloudNow();
      setCloudStatus("Đã tạo dữ liệu online");
    } else {
      setCloudStatus("Đã tải dữ liệu online");
    }
    render();
  } catch (error) {
    console.error(error);
    setCloudStatus("Lỗi đồng bộ");
  }
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString("vi-VN") + " VND";
}

function parseNumber(value) {
  return Number(String(value || "").replace(/[^\d]/g, "")) || 0;
}

function formatNumber(value) {
  const number = parseNumber(value);
  return number ? number.toLocaleString("vi-VN") : "";
}

function formatNumberInput(input) {
  input.value = /^0+$/.test(input.value) ? '0' : formatNumber(input.value);
}

function formatDateDisplay(value) {
  if (!value) return "";
  const text = String(value);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) return text;
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : text;
}

function toStorageDate(value) {
  if (!value) return "";
  const text = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : text;
}

function dateTimestamp(value) {
  const timestamp = Date.parse(`${toStorageDate(value)}T00:00:00`);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function sortByNewestRequestDate(requests) {
  return [...requests].sort((a, b) => dateTimestamp(b.requestDate) - dateTimestamp(a.requestDate));
}

function normalizeStatus(status) {
  return statusAliases[status] || status || "";
}

function normalizeLoadedData(data) {
  data.requests = (data.requests || []).map((request) => ({
    ...request,
    status: normalizeStatus(request.status),
    items: getNormalizedItems(request.items)
  }));
  data.orders = (data.orders || []).map((order) => ({
    ...order,
    status: normalizeStatus(order.status),
    items: getNormalizedItems(order.items)
  }));
  data.receipts = (data.receipts || []).map((receipt) => ({
    ...receipt,
    condition: normalizeStatus(receipt.condition)
  }));
  data.payments = (data.payments || []).map((payment) => ({
    ...payment,
    status: normalizeStatus(payment.status)
  }));
  return data;
}

function getNormalizedItems(items = []) {
  return Array.isArray(items) ? items.map((item) => ({
    ...item,
    specification: item.specification || item.spec || ""
  })) : [];
}

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function formatItemsForExport(items) {
  return items.map((item) => (
    `${item.item || ""}${item.specification ? " - " + item.specification : ""} - ${item.quantity || 0} ${item.unit || ""} - ${formatMoney(item.estimatedPrice || 0)}`
  )).join("\n");
}

function formatQuotesForExport(tender) {
  return (tender.quotes || []).map((quote) => {
    const supplier = findSupplier(quote.supplierId);
    return [
      supplier?.name || "Không rõ",
      formatMoney(quote.price || 0),
      `${quote.deliveryDays || 0} ngày giao`,
      quote.paymentTerm ? `Thanh toán: ${quote.paymentTerm}` : "",
      quote.note || ""
    ].filter(Boolean).join(" - ");
  }).join("\n");
}

function downloadExcelFile(fileName, sheetName, headers, rows) {
  const safeSheetName = sheetName.replace(/[\\/?*[\]:]/g, " ").slice(0, 31);
  const headerXml = headers.map((header) => (
    `<Cell><Data ss:Type="String">${escapeXml(header)}</Data></Cell>`
  )).join("");
  const rowXml = rows.map((row) => (
    `<Row>${row.map((cell) => {
      const isNumber = typeof cell === "number" && Number.isFinite(cell);
      return `<Cell><Data ss:Type="${isNumber ? "Number" : "String"}">${escapeXml(cell)}</Data></Cell>`;
    }).join("")}</Row>`
  )).join("");
  const workbook = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="${escapeXml(safeSheetName)}">
    <Table>
      <Row>${headerXml}</Row>
      ${rowXml}
    </Table>
  </Worksheet>
</Workbook>`;
  const blob = new Blob([workbook], { type: "application/vnd.ms-excel;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

function exportRequestsToExcel() {
  downloadExcelFile("danh-muc-giay-xin-mua.xls", "Giấy xin mua", [
    "Số giấy xin mua",
    "Ngày giấy",
    "Phòng ban",
    "Danh sách mặt hàng",
    "Tổng tiền",
    "Lý do",
    "Trạng thái"
  ], state.requests.map((request) => [
    request.code,
    formatDateDisplay(request.requestDate),
    request.department,
    formatItemsForExport(getRequestItems(request)),
    getRequestTotal(request),
    request.reason || "",
    request.status || ""
  ]));
}

function exportTendersToExcel() {
  downloadExcelFile("danh-muc-ket-qua-dau-thau.xls", "Kết quả đấu thầu", [
    "Số giấy xin mua",
    "Phòng ban",
    "Danh sách mặt hàng",
    "Tổng tiền giấy xin mua",
    "NCC được chọn",
    "Giá chọn",
    "Thời gian giao",
    "Thời gian thanh toán",
    "Tất cả báo giá",
    "Lý do chọn",
    "Trạng thái"
  ], state.tenders.map((tender) => {
    const request = findRequest(tender.requestId);
    const selectedQuote = getSelectedTenderQuote(tender);
    const supplier = findSupplier(tender.selectedSupplierId);
    return [
      request?.code || "",
      request?.department || "",
      request ? formatItemsForExport(getRequestItems(request)) : "",
      request ? getRequestTotal(request) : 0,
      supplier?.name || "",
      selectedQuote?.price || 0,
      selectedQuote?.deliveryDays ? `${selectedQuote.deliveryDays} ngày` : "",
      selectedQuote?.paymentTerm || "",
      formatQuotesForExport(tender),
      tender.selectionReason || "",
      tender.status || ""
    ];
  }));
}

function exportOrdersToExcel() {
  downloadExcelFile("danh-muc-hop-dong-mua-hang.xls", "Hợp đồng mua hàng", [
    "Số hợp đồng",
    "Ngày đặt",
    "Ngày giao dự kiến",
    "Nhà cung cấp",
    "Số giấy xin mua",
    "Danh sách mặt hàng",
    "Tổng tiền hàng chưa thuế",
    "Tiền chiết khấu",
    "Tiền thuế VAT",
    "Tổng tiền hàng",
    "Trạng thái"
  ], state.orders.map((order) => {
    const supplier = findSupplier(order.supplierId);
    const request = findRequest(order.requestId);
    return [
      order.contractNo || order.code,
      formatDateDisplay(order.orderDate),
      formatDateDisplay(order.expectedDate),
      supplier?.name || "",
      request?.code || "",
      formatItemsForExport(getOrderItems(order)),
      calculateAmounts(getOrderItems(order)).subtotalAmount,
      -Math.abs(Number(order.discountAmount) || 0),
      Number(order.vatAmount) || 0,
      getOrderTotal(order),
      order.status || ""
    ];
  }));
}

function exportSuppliersToExcel() {
  downloadExcelFile("danh-sach-nha-cung-cap.xls", "Nhà cung cấp", [
    "Tên công ty",
    "Nhóm hàng",
    "Người liên hệ",
    "Số điện thoại",
    "Email"
  ], state.suppliers.map((supplier) => [
    supplier.name || "",
    supplier.category || "",
    supplier.contact || "",
    supplier.phone || "",
    supplier.email || ""
  ]));
}

function exportData(kind) {
  const handlers = {
    requests: exportRequestsToExcel,
    tenders: exportTendersToExcel,
    orders: exportOrdersToExcel,
    suppliers: exportSuppliersToExcel
  };
  handlers[kind]?.();
}

function collectUnitsFromData(data) {
  const units = [];
  const collections = [
    ...(data.requests || []),
    ...(data.orders || [])
  ];
  collections.forEach((record) => {
    (record.items || []).forEach((item) => {
      if (item.unit) units.push(item.unit);
    });
  });
  return units;
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

function rememberUnit(unit) {
  const nextUnit = String(unit || "").trim();
  if (!nextUnit) return;
  if (!state.units.some((item) => item.toLowerCase() === nextUnit.toLowerCase())) {
    state.units.push(nextUnit);
  }
}

function renderUnitOptions() {
  document.getElementById("unitOptions").innerHTML = [...state.units]
    .sort((a, b) => a.localeCompare(b, "vi"))
    .map((unit) => `<option value="${unit}"></option>`)
    .join("");
}

function getRequestItems(request) {
  if (Array.isArray(request.items) && request.items.length) {
    return request.items.map((item) => {
      const quantity = Number(item.quantity) || 0;
      const oldAmount = Number(item.estimatedPrice) || 0;
      const unitPrice = item.unitPrice !== undefined ? Number(item.unitPrice) : (quantity ? oldAmount / quantity : 0);
      return {
        ...item,
        specification: item.specification || "",
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
    specification: request.specification || "",
    quantity,
    unit: request.unit || "",
    unitPrice: quantity ? oldAmount / quantity : 0,
    estimatedPrice: oldAmount
  }];
}

function getOrderItems(order) {
  if (Array.isArray(order.items) && order.items.length) return order.items;
  const request = findRequest(order.requestId);
  return request ? getRequestItems(request) : [];
}

function calculateAmounts(items, discount = 0, vat = 0) {
  const subtotalAmount = items.reduce((sum, item) => sum + Number(item.estimatedPrice || 0), 0);
  const discountAmount = -Math.abs(Number(discount) || 0);
  const vatAmount = Math.max(0, Number(vat) || 0);
  return { subtotalAmount, discountAmount, vatAmount, totalAmount: subtotalAmount + discountAmount + vatAmount };
}

function getOrderTotal(order) {
  const items = getOrderItems(order);
  if (!items.length) return Number(order.totalAmount || 0);
  return calculateAmounts(items, order.discountAmount, order.vatAmount).totalAmount;
}

function updateDocumentTotals(prefix) {
  const form = document.getElementById(prefix + 'Modal');
  const amounts = calculateAmounts(collectEditableItems(prefix + 'Items'), parseNumber(form.elements.discountAmount.value), parseNumber(form.elements.vatAmount.value));
  document.getElementById(prefix + 'Subtotal').textContent = formatMoney(amounts.subtotalAmount);
  document.getElementById(prefix + 'TotalAmount').textContent = formatMoney(amounts.totalAmount);
  return amounts;
}

function fillDocumentAmounts(prefix, record = {}) {
  record = record || {};
  const form = document.getElementById(prefix + 'Modal');
  form.elements.discountAmount.value = record.discountAmount ? '-' + formatNumber(record.discountAmount) : '';
  form.elements.vatAmount.value = formatNumber(record.vatAmount);
  updateDocumentTotals(prefix);
}

function fillReceiptFromOrder() {
  const order = findOrder(document.getElementById('receiptOrderSelect').value);
  fillEditableItems('receiptItems', order ? getOrderItems(order) : []);
  fillDocumentAmounts('receipt', order);
}

function openEditReceipt(id) {
  const receipt = state.receipts.find(item => item.id === id);
  if (!receipt) return;
  showOnlyModal('receiptModal');
  editingReceiptId = id;
  fillReceiptOrderOptions(receipt.orderId);
  const form = document.getElementById('receiptModal');
  form.elements.orderId.value = receipt.orderId;
  form.elements.receivedDate.value = formatDateDisplay(receipt.receivedDate);
  for (const field of ['acceptanceChair', 'condition', 'conclusion']) form.elements[field].value = receipt[field] || '';
  fillEditableItems('receiptItems', receipt.items || []);
  fillDocumentAmounts('receipt', receipt);
}

function getRequestTotal(request) {
  return getRequestItems(request).reduce((sum, item) => sum + Number(item.estimatedPrice || 0), 0);
}

function getRequestItemSummary(request) {
  const items = getRequestItems(request);
  if (!items.length) return "Chưa có mặt hàng";

  const first = items[0];
  const specification = first.specification ? `<br><small>${first.specification}</small>` : "";
  const suffix = items.length > 1 ? `<br><small>+${items.length - 1} mặt hàng khác</small>` : "";
  return `${first.item}${specification}<br><small>${first.quantity} ${first.unit}</small>${suffix}`;
}

function getRequestSelectText(request) {
  const items = getRequestItems(request);
  const firstName = items[0]?.item || "Chưa có mặt hàng";
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

function findTender(id) {
  return state.tenders.find((tender) => tender.id === id);
}

function findTenderByRequest(requestId) {
  return state.tenders.find((tender) => tender.requestId === requestId && tender.selectedSupplierId);
}

function getSelectedTenderQuote(tender) {
  return tender?.quotes?.find((quote) => quote.supplierId === tender.selectedSupplierId);
}

function statusBadge(status) {
  return `<span class="status ${statusClass[status] || "progress"}">${status}</span>`;
}

function render() {
  renderCloudStatus();
  renderUnitOptions();
  renderDashboard();
  renderRequests();
  renderTenders();
  renderOrders();
  renderSuppliers();
  renderReceipts();
  renderPayments();
  fillSelects();
}

function renderDashboard() {
  const pendingRequests = state.requests.filter((request) => request.status === "Chờ duyệt").length;
  const activeOrders = state.orders.filter((order) => order.status !== "Đã nhận").length;
  const totalSpend = state.orders.reduce((sum, order) => sum + Number(getOrderTotal(order)), 0);
  const unpaid = state.payments.reduce((sum, payment) => sum + Number(payment.amount) - Number(payment.paidAmount), 0);

  document.getElementById("metricsGrid").innerHTML = [
    ["Giấy xin mua chờ duyệt", pendingRequests, "Cần quản lý xử lý"],
    ["Hợp đồng đang theo dõi", activeOrders, "Hợp đồng chưa hoàn tất"],
    ["Tổng giá trị hợp đồng", formatMoney(totalSpend), "Đã ghi nhận"],
    ["Công nợ còn lại", formatMoney(unpaid), "Theo hóa đơn"]
  ].map(([label, value, hint]) => `
    <article class="metric-card">
      <span>${label}</span>
      <strong>${value}</strong>
      <small>${hint}</small>
    </article>
  `).join("");

  const activities = [
    ...state.requests.filter((request) => request.status === "Chờ duyệt").map((request) => ({
      title: `${request.code} đang chờ duyệt`,
      detail: `${request.department} cần mua ${getRequestSelectText(request)}`,
      value: formatMoney(getRequestTotal(request))
    })),
    ...state.orders.filter((order) => order.status === "Đang giao").map((order) => ({
      title: `${escapeXml(order.contractNo || order.code)} đang giao`,
      detail: findSupplier(order.supplierId)?.name || "Nhà cung cấp",
      value: formatDateDisplay(order.expectedDate)
    })),
    ...state.payments.filter((payment) => payment.status !== "Đã thanh toán").map((payment) => ({
      title: `${payment.invoiceNo} cần thanh toán`,
      detail: findOrder(payment.orderId)?.contractNo || findOrder(payment.orderId)?.code || "Hợp đồng",
      value: formatMoney(payment.amount - payment.paidAmount)
    }))
  ];

  document.getElementById("pendingCount").textContent = `${activities.length} việc`;
  document.getElementById("activityList").innerHTML = activities.length ? activities.map((item) => `
    <div class="timeline-item">
      <span class="timeline-dot"></span>
      <div>
        <p>${item.title}</p>
        <span>${item.detail}</span>
      </div>
      <strong>${item.value}</strong>
    </div>
  `).join("") : `<p>Không có việc cần xử lý.</p>`;

  const spendBySupplier = state.suppliers.map((supplier) => {
    const total = state.orders
      .filter((order) => order.supplierId === supplier.id)
      .reduce((sum, order) => sum + Number(getOrderTotal(order)), 0);
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
  `).join("") : `<p>Chưa có dữ liệu chi phí.</p>`;
}

function renderRequests() {
  document.getElementById("requestsTable").innerHTML = sortByNewestRequestDate(state.requests).map((request) => `
    <tr>
      <td><strong>${request.code}</strong></td>
      <td>${formatDateDisplay(request.requestDate)}</td>
      <td>${request.department}</td>
      <td>${getRequestItemSummary(request)}</td>
      <td>${formatMoney(getRequestTotal(request))}</td>
      <td>${statusBadge(request.status)}</td>
      <td>
        <div class="row-actions">
          <button class="mini-button" data-action="edit-request" data-id="${request.id}" type="button">Sửa</button>
          <button class="mini-button" data-action="approve-request" data-id="${request.id}" type="button">Duyệt</button>
          <button class="mini-button" data-action="reject-request" data-id="${request.id}" type="button">Từ chối</button>
          <button class="mini-button danger-button" data-action="delete-request" data-id="${request.id}" type="button">Xóa</button>
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
        <td><strong>${escapeXml(order.contractNo || order.code)}</strong></td>
        <td>${supplier?.name || "Không rõ"}</td>
        <td>${request?.code || "Không rõ"}</td>
        <td>${formatDateDisplay(order.expectedDate)}</td>
        <td>${formatMoney(getOrderTotal(order))}</td>
        <td>${statusBadge(order.status)}</td>
        <td>
          <div class="row-actions">
            <button class="mini-button" data-action="edit-order" data-id="${order.id}" type="button">Sửa</button>
            <button class="mini-button" data-action="send-order" data-id="${order.id}" type="button">Gửi NCC</button>
            <button class="mini-button" data-action="receive-order" data-id="${order.id}" type="button">Đã nhận</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function renderTenders() {
  document.getElementById("tendersTable").innerHTML = state.tenders.map((tender) => {
    const request = findRequest(tender.requestId);
    const supplier = findSupplier(tender.selectedSupplierId);
    const selectedQuote = getSelectedTenderQuote(tender);
    return `
      <tr>
        <td><strong>${request?.code || "Không rõ"}</strong><br><small>${request?.department || ""}</small></td>
        <td>${tender.quotes?.length || 0}</td>
        <td>${supplier?.name || "Chưa chọn"}</td>
        <td>${selectedQuote ? formatMoney(selectedQuote.price) : ""}</td>
        <td>${tender.selectionReason || ""}</td>
        <td>${statusBadge(tender.status || "Đang đánh giá")}</td>
        <td>
          <div class="row-actions">
            <button class="mini-button" data-action="edit-tender" data-id="${tender.id}" type="button">Sửa</button>
            <button class="mini-button danger-button" data-action="delete-tender" data-id="${tender.id}" type="button">Xóa</button>
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
      <p>${supplier.contact}<br>${supplier.phone}${supplier.email ? `<br>${supplier.email}` : ""}</p>
      <div class="supplier-actions">
        <button class="mini-button" data-action="edit-supplier" data-id="${supplier.id}" type="button">Sửa</button>
        <button class="mini-button danger-button" data-action="delete-supplier" data-id="${supplier.id}" type="button">Xóa</button>
      </div>
    </article>
  `).join("");
}

function renderReceipts() {
  document.getElementById("receiptsTable").innerHTML = state.receipts.map((receipt) => {
    const order = findOrder(receipt.orderId);
    return `
      <tr>
        <td><strong>${escapeXml(order?.contractNo || order?.code || "Không rõ")}</strong></td>
        <td>${formatDateDisplay(receipt.receivedDate)}</td>
        <td>${escapeXml(receipt.acceptanceChair || '')}</td>
        <td>${receipt.items ? receipt.items.map(item => escapeXml(item.item) + ': ' + item.quantity + ' ' + escapeXml(item.unit)).join('<br>') : escapeXml(receipt.receivedQty + ' (dữ liệu cũ)')}</td>
        <td>${receipt.totalAmount != null ? formatMoney(receipt.totalAmount) : '—'}</td>
        <td>${statusBadge(receipt.condition)}</td>
        <td>${escapeXml(receipt.conclusion || '')}${receipt.note ? '<br>' + escapeXml(receipt.note) : ''}</td>
        <td><button class="mini-button" data-action="edit-receipt" data-id="${receipt.id}" type="button">Xem / Sửa</button></td>
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
        <td>${escapeXml(order?.contractNo || order?.code || "Không rõ")}</td>
        <td>${formatDateDisplay(payment.dueDate)}</td>
        <td>${formatMoney(payment.amount)}</td>
        <td>${formatMoney(payment.paidAmount)}</td>
        <td>${statusBadge(payment.status)}</td>
        <td>
          <div class="row-actions">
            <button class="mini-button" data-action="pay-full" data-id="${payment.id}" type="button">Đã trả đủ</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function fillSelects() {
  fillTenderRequestOptions();
  fillOrderTenderOptions();
  document.getElementById("orderSupplierSelect").innerHTML = state.suppliers.map((supplier) => (
    `<option value="${supplier.id}">${supplier.name}</option>`
  )).join("");

  const orderOptions = state.orders.map((order) => `<option value="${order.id}">${escapeXml(order.contractNo || order.code)}</option>`).join("");
  fillReceiptOrderOptions();
  document.getElementById("paymentOrderSelect").innerHTML = orderOptions;
}

function fillReceiptOrderOptions(includeOrderId = "") {
  const recordedOrderIds = new Set(state.receipts.map((receipt) => receipt.orderId));
  const availableOrders = state.orders.filter((order) => (
    order.id === includeOrderId || !recordedOrderIds.has(order.id)
  ));
  document.getElementById("receiptOrderSelect").innerHTML = availableOrders.map((order) => (
    `<option value="${escapeXml(order.id)}">${escapeXml(order.contractNo || order.code)}</option>`
  )).join("") || '<option value="">Không còn hợp đồng chưa ghi nhận biên bản nghiệm thu</option>';
  document.querySelector('#receiptModal [type="submit"]').disabled = !availableOrders.length;
}

function fillTenderRequestOptions(includeRequestId = "") {
  const requestsWithTender = new Set(state.tenders.map((tender) => tender.requestId));
  const approvedRequests = sortByNewestRequestDate(state.requests).filter((request) => (
    request.status === "Đã duyệt" && (!requestsWithTender.has(request.id) || request.id === includeRequestId)
  ));
  const options = approvedRequests.map((request) => (
    `<option value="${request.id}">${request.code} - ${getRequestSelectText(request)}</option>`
  )).join("");
  document.getElementById("tenderRequestSelect").innerHTML = options || '<option value="">Không còn giấy xin mua đã duyệt chưa ghi kết quả</option>';
}

function fillOrderTenderOptions(includeTenderId = "") {
  const usedTenderIds = new Set(state.orders.map((order) => order.tenderId).filter(Boolean));
  const usedRequestIds = new Set(state.orders.map((order) => order.requestId).filter(Boolean));
  const availableTenders = state.tenders.filter((tender) => (
    tender.selectedSupplierId && (
      tender.id === includeTenderId || (!usedTenderIds.has(tender.id) && !usedRequestIds.has(tender.requestId))
    )
  ));
  document.getElementById("orderTenderSelect").innerHTML = availableTenders.map((tender) => {
    const request = findRequest(tender.requestId);
    const supplier = findSupplier(tender.selectedSupplierId);
    return `<option value="${tender.id}">${request?.code || "Không rõ"} - ${supplier?.name || "NCC"}</option>`;
  }).join("") || '<option value="">Không còn kết quả đấu thầu chưa tạo hợp đồng mua hàng</option>';
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
    document.getElementById("requestModalTitle").textContent = "Tạo giấy xin mua hàng";
    document.getElementById("requestSubmitBtn").textContent = "Lưu giấy xin mua";
    document.getElementById("requestCodeInput").value = "";
    document.getElementById("requestDateInput").value = formatDateDisplay(currentDateValue());
    resetRequestItems();
  }

  if (id === "supplierModal") {
    editingSupplierId = null;
    supplierModalContext = null;
    document.getElementById("supplierModalTitle").textContent = "Thêm nhà cung cấp";
    document.getElementById("supplierSubmitBtn").textContent = "Lưu NCC";
  }

  if (id === "cloudModal") {
    document.querySelector('#cloudModal [name="supabaseUrl"]').value = cloudConfig.supabaseUrl || "";
    document.querySelector('#cloudModal [name="supabaseAnonKey"]').value = cloudConfig.supabaseAnonKey || "";
  }

  if (id === "tenderModal") {
    fillTenderRequestOptions();
    resetTenderQuotes();
    fillTenderRequestDetails();
  }

  if (id === "receiptModal") {
    editingReceiptId = null;
    document.getElementById('receiptModal').reset();
    fillReceiptOrderOptions();
    document.querySelector('#receiptModal [name="receivedDate"]').value = formatDateDisplay(currentDateValue());
    fillReceiptFromOrder();
  }

  if (id === "orderModal") {
    document.getElementById('orderModal').reset();
    document.getElementById('orderTenderSelect').required = true;
    editingOrderId = null;
    fillOrderTenderOptions();
    document.querySelector("#orderModal .modal-header h3").textContent = "Tạo hợp đồng mua hàng";
    document.getElementById("orderSubmitBtn").textContent = "Lưu hợp đồng";
    document.querySelector('#orderModal [name="orderDate"]').value = formatDateDisplay(currentDateValue());
    document.querySelector('#orderModal [name="expectedDate"]').value = "";
    applyTenderSuggestionToOrder();
  }
}

function closeModal() {
  editingReceiptId = null;
  document.getElementById("modalBackdrop").hidden = true;
  editingRequestId = null;
  editingOrderId = null;
  editingSupplierId = null;
  supplierModalContext = null;
  document.querySelectorAll(".modal").forEach((modal) => {
    modal.classList.remove("active");
    modal.reset();
  });
}

function showOnlyModal(id) {
  document.getElementById("modalBackdrop").hidden = false;
  document.querySelectorAll(".modal").forEach((modal) => modal.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function editableItemTemplate() {
  return `
    <tr>
      <td><input name="item" required placeholder="Tên mặt hàng" /></td>
      <td><input name="specification" placeholder="Quy cách, model..." /></td>
      <td><input name="quantity" required min="1" type="number" /></td>
      <td><input name="unit" required list="unitOptions" placeholder="cái, hộp, kg..." /></td>
      <td><input name="unitPrice" required inputmode="numeric" placeholder="0" /></td>
      <td><input name="lineAmount" readonly tabindex="-1" /></td>
      <td><button class="icon-button remove-editable-item" type="button" title="Xóa dòng">x</button></td>
    </tr>
  `;
}

function addEditableItemRow(tbodyId, item = {}) {
  const tbody = document.getElementById(tbodyId);
  tbody.insertAdjacentHTML("beforeend", editableItemTemplate());
  const row = tbody.querySelector("tr:last-child");
  if (tbodyId === 'receiptItems') {
    row.querySelector('[name="quantity"]').min = '0';
    row.querySelector('[name="quantity"]').step = 'any';
  }
  row.querySelector('[name="item"]').value = item.item || "";
  row.querySelector('[name="specification"]').value = item.specification || "";
  row.querySelector('[name="quantity"]').value = item.quantity ?? "";
  row.querySelector('[name="unit"]').value = item.unit || "";
  row.querySelector('[name="unitPrice"]').value = item.unitPrice === 0 ? '0' : formatNumber(item.unitPrice);
  updateEditableItemRowTotal(row);
}

function fillEditableItems(tbodyId, items) {
  const tbody = document.getElementById(tbodyId);
  tbody.innerHTML = "";
  items.forEach((item) => addEditableItemRow(tbodyId, item));
  if (!items.length) addEditableItemRow(tbodyId);
}

function collectEditableItems(tbodyId) {
  return [...document.querySelectorAll(`#${tbodyId} tr`)].map((row) => {
    const quantity = Number(row.querySelector('[name="quantity"]').value);
    const unit = row.querySelector('[name="unit"]').value.trim();
    const unitPrice = parseNumber(row.querySelector('[name="unitPrice"]').value);
    rememberUnit(unit);
    return {
      item: row.querySelector('[name="item"]').value.trim(),
      specification: row.querySelector('[name="specification"]').value.trim(),
      quantity,
      unit,
      unitPrice,
      estimatedPrice: quantity * unitPrice
    };
  }).filter((item) => item.item);
}

function updateEditableItemRowTotal(row) {
  const quantity = Number(row.querySelector('[name="quantity"]').value || 0);
  const unitPrice = parseNumber(row.querySelector('[name="unitPrice"]').value);
  row.querySelector('[name="lineAmount"]').value = formatMoney(quantity * unitPrice);
}

function updateEditableItemsTotal(tbodyId, totalId) {
  const total = collectEditableItems(tbodyId).reduce((sum, item) => sum + Number(item.estimatedPrice || 0), 0);
  document.getElementById(totalId).textContent = formatMoney(total);
}

function updatePaymentStatus(payment) {
  if (Number(payment.paidAmount) >= Number(payment.amount)) return "Đã thanh toán";
  if (Number(payment.paidAmount) > 0) return "Thanh toán một phần";
  return new Date(payment.dueDate) < today ? "Quá hạn" : "Chưa thanh toán";
}

function requestItemTemplate() {
  return `
    <tr class="request-item-row">
      <td><input name="item" required placeholder="Tên mặt hàng cần mua" /></td>
      <td><input name="specification" placeholder="Quy cách, model..." /></td>
      <td><input name="quantity" required min="1" type="number" /></td>
      <td><input name="unit" required list="unitOptions" placeholder="cái, hộp, kg..." /></td>
      <td><input name="unitPrice" required inputmode="numeric" placeholder="0" /></td>
      <td><input name="lineAmount" readonly tabindex="-1" /></td>
      <td><button class="icon-button remove-request-item" type="button" title="Xóa dòng">x</button></td>
    </tr>
  `;
}

function addRequestItemRow(item = {}) {
  document.getElementById("requestItems").insertAdjacentHTML("beforeend", requestItemTemplate());
  const row = document.querySelector("#requestItems tr:last-child");
  row.querySelector('[name="item"]').value = item.item || "";
  row.querySelector('[name="specification"]').value = item.specification || "";
  row.querySelector('[name="quantity"]').value = item.quantity ?? "";
  row.querySelector('[name="unit"]').value = item.unit || "";
  row.querySelector('[name="unitPrice"]').value = formatNumber(item.unitPrice);
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
  document.getElementById("requestModalTitle").textContent = "Sửa giấy xin mua hàng";
  document.getElementById("requestSubmitBtn").textContent = "Cập nhật giấy xin mua";
  document.getElementById("requestCodeInput").value = request.code || "";
  document.getElementById("requestDateInput").value = formatDateDisplay(request.requestDate || currentDateValue());
  document.querySelector('#requestModal [name="department"]').value = request.department || "";
  document.querySelector('#requestModal [name="reason"]').value = request.reason || "";
  fillRequestItems(getRequestItems(request));
}

function openSupplierFromOrder() {
  editingSupplierId = null;
  supplierModalContext = "order";
  document.getElementById("supplierModal").reset();
  document.getElementById("supplierModalTitle").textContent = "Thêm nhà cung cấp cho hợp đồng mua hàng";
  document.getElementById("supplierSubmitBtn").textContent = "Lưu và chọn NCC";
  showOnlyModal("supplierModal");
}

function openSupplierFromTender() {
  editingSupplierId = null;
  supplierModalContext = "tender";
  document.getElementById("supplierModal").reset();
  document.getElementById("supplierModalTitle").textContent = "Thêm nhà cung cấp cho kết quả đấu thầu";
  document.getElementById("supplierSubmitBtn").textContent = "Lưu và thêm báo giá";
  showOnlyModal("supplierModal");
}

function openEditSupplier(supplierId) {
  const supplier = findSupplier(supplierId);
  if (!supplier) return;

  editingSupplierId = supplierId;
  supplierModalContext = null;
  showOnlyModal("supplierModal");
  document.getElementById("supplierModalTitle").textContent = "Sửa nhà cung cấp";
  document.getElementById("supplierSubmitBtn").textContent = "Cập nhật NCC";
  document.querySelector('#supplierModal [name="name"]').value = supplier.name || "";
  document.querySelector('#supplierModal [name="category"]').value = supplier.category || "";
  document.querySelector('#supplierModal [name="contact"]').value = supplier.contact || "";
  document.querySelector('#supplierModal [name="phone"]').value = supplier.phone || "";
  document.querySelector('#supplierModal [name="email"]').value = supplier.email || "";
}

function deleteSupplier(supplierId) {
  const supplier = findSupplier(supplierId);
  if (!supplier) return;

  const isConfirmed = window.confirm(`Bạn có chắc muốn xóa nhà cung cấp ${supplier.name}?`);
  if (!isConfirmed) return;

  state.suppliers = state.suppliers.filter((item) => item.id !== supplierId);
  state.tenders.forEach((tender) => {
    tender.quotes = (tender.quotes || []).filter((quote) => quote.supplierId !== supplierId);
    if (tender.selectedSupplierId === supplierId) {
      tender.selectedSupplierId = tender.quotes[0]?.supplierId || "";
      tender.status = tender.selectedSupplierId ? "Đã chọn" : "Đang đánh giá";
    }
  });
}

function getSupplierOptions(selectedId = "") {
  return state.suppliers.map((supplier) => (
    `<option value="${supplier.id}" ${supplier.id === selectedId ? "selected" : ""}>${supplier.name}</option>`
  )).join("");
}

function tenderQuoteTemplate(quote = {}, selectedSupplierId = "") {
  const quoteSupplierId = quote.supplierId || "";
  const isSelected = quoteSupplierId && quoteSupplierId === selectedSupplierId;
  return `
    <tr class="tender-quote-row">
      <td><input name="selectedQuote" type="radio" ${isSelected ? "checked" : ""} /></td>
      <td><select name="supplierId" required>${getSupplierOptions(quoteSupplierId)}</select></td>
      <td><input name="price" required inputmode="numeric" placeholder="0" value="${formatNumber(quote.price)}" /></td>
      <td><input name="deliveryDays" required min="0" type="number" value="${quote.deliveryDays ?? ""}" /></td>
      <td><input name="paymentTerm" placeholder="VD: 30 ngày" value="${quote.paymentTerm || ""}" /></td>
      <td><input name="note" placeholder="Điều kiện, bảo hành..." value="${quote.note || ""}" /></td>
      <td><button class="icon-button remove-tender-quote" type="button" title="Xóa dòng">x</button></td>
    </tr>
  `;
}

function reindexTenderQuoteRadios() {
  document.querySelectorAll("#tenderQuotes tr").forEach((row, index) => {
    row.querySelector('[name="selectedQuote"]').value = String(index);
  });
}

function addTenderQuoteRow(quote = {}, selectedSupplierId = "") {
  document.getElementById("tenderQuotes").insertAdjacentHTML("beforeend", tenderQuoteTemplate(quote, selectedSupplierId));
  reindexTenderQuoteRadios();
}

function resetTenderQuotes() {
  const firstSupplier = state.suppliers[0]?.id || "";
  document.querySelector('#tenderModal [name="selectionReason"]').value = "";
  document.getElementById("tenderQuotes").innerHTML = "";
  addTenderQuoteRow({ supplierId: firstSupplier }, firstSupplier);
  addTenderQuoteRow();
}

function fillTenderQuotes(tender) {
  document.getElementById("tenderQuotes").innerHTML = "";
  tender.quotes.forEach((quote) => addTenderQuoteRow(quote, tender.selectedSupplierId));
  if (!tender.quotes.length) resetTenderQuotes();
  reindexTenderQuoteRadios();
}

function collectTenderQuotes() {
  return [...document.querySelectorAll("#tenderQuotes tr")].map((row) => ({
    supplierId: row.querySelector('[name="supplierId"]').value,
    price: parseNumber(row.querySelector('[name="price"]').value),
    deliveryDays: Number(row.querySelector('[name="deliveryDays"]').value),
    paymentTerm: row.querySelector('[name="paymentTerm"]').value.trim(),
    note: row.querySelector('[name="note"]').value.trim()
  })).filter((quote) => quote.supplierId);
}

function collectTenderDraft() {
  return {
    requestId: document.getElementById("tenderRequestSelect").value,
    requestCode: document.getElementById("tenderRequestCode").value,
    department: document.getElementById("tenderRequestDepartment").value,
    items: collectEditableItems("tenderRequestItems"),
    quotes: collectTenderQuotes(),
    selectedIndex: Number(document.querySelector('#tenderQuotes [name="selectedQuote"]:checked')?.value || 0),
    selectionReason: document.querySelector('#tenderModal [name="selectionReason"]').value
  };
}

function restoreTenderDraft(draft, newSupplierId = "") {
  showOnlyModal("tenderModal");
  document.getElementById("tenderRequestSelect").value = draft.requestId || "";
  document.getElementById("tenderRequestCode").value = draft.requestCode || "";
  document.getElementById("tenderRequestDepartment").value = draft.department || "";
  fillEditableItems("tenderRequestItems", draft.items || []);
  updateEditableItemsTotal("tenderRequestItems", "tenderRequestTotal");

  const quotes = [...(draft.quotes || [])];
  if (newSupplierId) quotes.push({ supplierId: newSupplierId, price: 0, deliveryDays: 0, paymentTerm: "", note: "" });
  const selectedSupplierId = newSupplierId || quotes[draft.selectedIndex]?.supplierId || quotes[0]?.supplierId || "";
  document.getElementById("tenderQuotes").innerHTML = "";
  quotes.forEach((quote) => addTenderQuoteRow(quote, selectedSupplierId));
  if (!quotes.length) addTenderQuoteRow();
  document.querySelector('#tenderModal [name="selectionReason"]').value = draft.selectionReason || "";
}

function openEditTender(tenderId) {
  const tender = findTender(tenderId);
  if (!tender) return;

  showOnlyModal("tenderModal");
  fillTenderRequestOptions(tender.requestId);
  document.getElementById("tenderRequestSelect").value = tender.requestId;
  fillTenderRequestDetails();
  document.querySelector('#tenderModal [name="selectionReason"]').value = tender.selectionReason || "";
  fillTenderQuotes(tender);
}

function fillTenderRequestDetails() {
  const request = findRequest(document.getElementById("tenderRequestSelect").value);
  document.getElementById("tenderRequestCode").value = request?.code || "";
  document.getElementById("tenderRequestDepartment").value = request?.department || "";
  fillEditableItems("tenderRequestItems", request ? getRequestItems(request) : []);
  updateEditableItemsTotal("tenderRequestItems", "tenderRequestTotal");
}

function applyTenderSuggestionToOrder() {
  const tender = findTender(document.getElementById("orderTenderSelect").value);
  const hint = document.getElementById("orderTenderHint");

  if (!tender) {
    hint.textContent = "Chưa có kết quả đấu thầu được chọn.";
    fillEditableItems("orderItems", []);
    updateDocumentTotals("order");
    return;
  }

  const request = findRequest(tender.requestId);
  const supplier = findSupplier(tender.selectedSupplierId);
  const selectedQuote = getSelectedTenderQuote(tender);
  document.getElementById("orderSupplierSelect").value = tender.selectedSupplierId;
  fillEditableItems("orderItems", request ? getRequestItems(request) : []);
  updateDocumentTotals("order");
  hint.textContent = `Đã chọn theo kết quả đấu thầu: ${supplier?.name || "NCC"}${selectedQuote ? " - " + formatMoney(selectedQuote.price) : ""}.`;
}

function openEditOrder(orderId) {
  const order = findOrder(orderId);
  if (!order) return;

  showOnlyModal("orderModal");
  editingOrderId = orderId;
  document.getElementById("contractNoInput").value = order.contractNo || order.code || "";
  const tenderId = order.tenderId || findTenderByRequest(order.requestId)?.id || "";
  fillOrderTenderOptions(tenderId);
  const tenderSelect = document.getElementById("orderTenderSelect");
  tenderSelect.required = Boolean(tenderId);
  if (!tenderId) tenderSelect.innerHTML = '<option value="">Hợp đồng cũ chưa có kết quả đấu thầu</option>';
  document.querySelector("#orderModal .modal-header h3").textContent = "Sửa hợp đồng mua hàng";
  document.getElementById("orderSubmitBtn").textContent = "Cập nhật hợp đồng";
  document.getElementById("orderTenderSelect").value = tenderId;
  document.getElementById("orderSupplierSelect").value = order.supplierId || "";
  document.querySelector('#orderModal [name="orderDate"]').value = formatDateDisplay(order.orderDate);
  document.querySelector('#orderModal [name="expectedDate"]').value = formatDateDisplay(order.expectedDate);
  fillEditableItems("orderItems", getOrderItems(order));
  fillDocumentAmounts("order", order);
  document.getElementById("orderTenderHint").textContent = "Đang sửa hợp đồng mua hàng hiện có.";
}

function collectRequestItems() {
  return [...document.querySelectorAll("#requestItems tr")].map((row) => {
    const quantity = Number(row.querySelector('[name="quantity"]').value);
    const unit = row.querySelector('[name="unit"]').value.trim();
    const unitPrice = parseNumber(row.querySelector('[name="unitPrice"]').value);
    rememberUnit(unit);
    return {
      item: row.querySelector('[name="item"]').value.trim(),
      specification: row.querySelector('[name="specification"]').value.trim(),
      quantity,
      unit,
      unitPrice,
      estimatedPrice: quantity * unitPrice
    };
  }).filter((item) => item.item);
}

function updateRequestItemRowTotal(row) {
  const quantity = Number(row.querySelector('[name="quantity"]').value || 0);
  const unitPrice = parseNumber(row.querySelector('[name="unitPrice"]').value);
  row.querySelector('[name="lineAmount"]').value = formatMoney(quantity * unitPrice);
}

function updateRequestEstimatedTotal() {
  const total = [...document.querySelectorAll("#requestItems tr")]
    .reduce((sum, row) => {
      const quantity = Number(row.querySelector('[name="quantity"]').value || 0);
      const unitPrice = parseNumber(row.querySelector('[name="unitPrice"]').value);
      return sum + quantity * unitPrice;
    }, 0);
  document.getElementById("requestEstimatedTotal").textContent = formatMoney(total);
}

function handleFormattedPriceInput(event, afterFormat) {
  if (!event.target.matches('[name="unitPrice"], [name="price"]')) return false;
  formatNumberInput(event.target);
  if (afterFormat) afterFormat(event.target);
  return true;
}

document.getElementById("navList").addEventListener("click", (event) => {
  const button = event.target.closest("[data-view]");
  if (button) switchView(button.dataset.view);
});

document.getElementById("dashboardView").addEventListener("click", (event) => {
  const button = event.target.closest("[data-export]");
  if (button) exportData(button.dataset.export);
});

document.getElementById("quickRequestBtn").addEventListener("click", () => openModal("requestModal"));
document.getElementById("syncNowBtn").addEventListener("click", syncFromCloud);
document.getElementById("resetDataBtn").addEventListener("click", () => {
  state = structuredClone(initialData);
  saveData();
  render();
});

document.querySelectorAll("[data-open-modal]").forEach((button) => {
  button.addEventListener("click", () => openModal(button.dataset.openModal));
});
document.getElementById("addSupplierFromOrderBtn").addEventListener("click", openSupplierFromOrder);
document.getElementById("addSupplierFromTenderBtn").addEventListener("click", openSupplierFromTender);
document.getElementById("orderTenderSelect").addEventListener("change", applyTenderSuggestionToOrder);
document.getElementById("tenderRequestSelect").addEventListener("change", fillTenderRequestDetails);

document.querySelectorAll(".close-modal").forEach((button) => button.addEventListener("click", closeModal));
document.getElementById("modalBackdrop").addEventListener("click", (event) => {
  if (event.target.id === "modalBackdrop") closeModal();
});

document.getElementById("addRequestItemBtn").addEventListener("click", addRequestItemRow);
document.getElementById("requestItems").addEventListener("input", (event) => {
  handleFormattedPriceInput(event);
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
document.getElementById("addTenderRequestItemBtn").addEventListener("click", () => {
  addEditableItemRow("tenderRequestItems");
  updateEditableItemsTotal("tenderRequestItems", "tenderRequestTotal");
});
document.getElementById("tenderRequestItems").addEventListener("input", (event) => {
  handleFormattedPriceInput(event);
  if (event.target.matches('[name="quantity"], [name="unitPrice"]')) {
    updateEditableItemRowTotal(event.target.closest("tr"));
    updateEditableItemsTotal("tenderRequestItems", "tenderRequestTotal");
  }
});
document.getElementById("tenderRequestItems").addEventListener("click", (event) => {
  const button = event.target.closest(".remove-editable-item");
  if (!button) return;
  const rows = document.querySelectorAll("#tenderRequestItems tr");
  if (rows.length > 1) button.closest("tr").remove();
  updateEditableItemsTotal("tenderRequestItems", "tenderRequestTotal");
});
document.getElementById("addOrderItemBtn").addEventListener("click", () => {
  addEditableItemRow("orderItems");
  updateDocumentTotals("order");
});
document.getElementById("orderItems").addEventListener("input", (event) => {
  handleFormattedPriceInput(event);
  if (event.target.matches('[name="quantity"], [name="unitPrice"]')) {
    updateEditableItemRowTotal(event.target.closest("tr"));
    updateDocumentTotals("order");
  }
});
document.getElementById("orderItems").addEventListener("click", (event) => {
  const button = event.target.closest(".remove-editable-item");
  if (!button) return;
  const rows = document.querySelectorAll("#orderItems tr");
  if (rows.length > 1) button.closest("tr").remove();
  updateDocumentTotals("order");
});
document.getElementById("addTenderQuoteBtn").addEventListener("click", () => addTenderQuoteRow());
document.getElementById("tenderQuotes").addEventListener("input", (event) => {
  handleFormattedPriceInput(event);
});
document.getElementById("tenderQuotes").addEventListener("click", (event) => {
  const button = event.target.closest(".remove-tender-quote");
  if (!button) return;

  const rows = document.querySelectorAll("#tenderQuotes tr");
  if (rows.length > 1) button.closest("tr").remove();
  reindexTenderQuoteRadios();
});

document.querySelectorAll(".modal").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    let nextModalId = null;
    let selectedSupplierId = null;
    let orderDraft = null;
    let tenderDraft = null;

    if (form.dataset.kind === "cloud") {
      saveCloudConfig({
        supabaseUrl: data.supabaseUrl,
        supabaseAnonKey: data.supabaseAnonKey
      });
      closeModal();
      syncFromCloud();
      return;
    }

    if (form.dataset.kind === "requests") {
      const items = collectRequestItems();
      const requestData = {
        code: data.code,
        requestDate: toStorageDate(data.requestDate),
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
          status: "Chờ duyệt"
        });
      }
      switchView("requests");
    }

    if (form.dataset.kind === "orders") {
      const tender = findTender(data.tenderId);
      const items = collectEditableItems("orderItems");
      const orderData = {
        contractNo: data.contractNo.trim().slice(0, 20),
        tenderId: data.tenderId,
        requestId: tender?.requestId || findOrder(editingOrderId)?.requestId || "",
        supplierId: data.supplierId,
        orderDate: toStorageDate(data.orderDate),
        expectedDate: toStorageDate(data.expectedDate),
        ...calculateAmounts(items, parseNumber(data.discountAmount), parseNumber(data.vatAmount)),
        items
      };

      if (editingOrderId) {
        const order = findOrder(editingOrderId);
        Object.assign(order, orderData);
      } else {
        state.orders.unshift({
          id: makeId("po"),
          code: makeCode("PO", state.orders),
          ...orderData,
          status: "Đã gửi NCC"
        });
      }
      switchView("orders");
    }

    if (form.dataset.kind === "tenders") {
      const request = findRequest(data.requestId);
      if (request) {
        request.code = data.requestCode;
        request.department = data.department;
        request.items = collectEditableItems("tenderRequestItems");
      }
      const quotes = collectTenderQuotes();
      const selectedIndex = Number(document.querySelector('#tenderQuotes [name="selectedQuote"]:checked')?.value || 0);
      const selectedSupplierId = quotes[selectedIndex]?.supplierId || quotes[0]?.supplierId || "";
      const tenderData = {
        requestId: data.requestId,
        selectedSupplierId,
        selectionReason: data.selectionReason,
        status: selectedSupplierId ? "Đã chọn" : "Đang đánh giá",
        quotes
      };
      const existingTender = state.tenders.find((tender) => tender.requestId === data.requestId);

      if (existingTender) {
        Object.assign(existingTender, tenderData);
      } else {
        state.tenders.unshift({
          id: makeId("td"),
          ...tenderData
        });
      }
      switchView("tenders");
    }

    if (form.dataset.kind === "suppliers") {
      const supplierData = {
        name: data.name,
        category: data.category,
        contact: data.contact,
        phone: data.phone,
        email: data.email
      };

      if (editingSupplierId) {
        const supplier = findSupplier(editingSupplierId);
        Object.assign(supplier, supplierData);
        switchView("suppliers");
      } else if (supplierModalContext === "order") {
        const supplier = {
          id: makeId("sup"),
          ...supplierData
        };
        state.suppliers.unshift(supplier);
        orderDraft = Object.fromEntries(new FormData(document.getElementById("orderModal")).entries());
        orderDraft.items = collectEditableItems("orderItems");
        nextModalId = "orderModal";
        selectedSupplierId = supplier.id;
        supplierModalContext = null;
      } else if (supplierModalContext === "tender") {
        const supplier = {
          id: makeId("sup"),
          ...supplierData
        };
        state.suppliers.unshift(supplier);
        tenderDraft = collectTenderDraft();
        nextModalId = "tenderModal";
        selectedSupplierId = supplier.id;
        supplierModalContext = null;
      } else {
        state.suppliers.unshift({
          id: makeId("sup"),
          ...supplierData
        });
        switchView("suppliers");
      }
    }

    if (form.dataset.kind === "receipts") {
      const currentReceipt = state.receipts.find((receipt) => receipt.id === editingReceiptId);
      const keepingCurrentOrder = currentReceipt?.orderId === data.orderId;
      if (!findOrder(data.orderId) || (!keepingCurrentOrder && state.receipts.some((receipt) => receipt.orderId === data.orderId))) {
        alert("Vui lòng chọn hợp đồng chưa ghi nhận biên bản nghiệm thu.");
        return;
      }
      const items = collectEditableItems('receiptItems');
      const receiptData = {
        orderId: data.orderId,
        contractNo: findOrder(data.orderId)?.contractNo || findOrder(data.orderId)?.code || '',
        receivedDate: toStorageDate(data.receivedDate),
        acceptanceChair: data.acceptanceChair.trim(),
        items,
        receivedQty: items.reduce((sum, item) => sum + item.quantity, 0),
        ...calculateAmounts(items, parseNumber(data.discountAmount), parseNumber(data.vatAmount)),
        condition: data.condition,
        conclusion: data.conclusion.trim()
      };
      if (editingReceiptId) Object.assign(state.receipts.find(item => item.id === editingReceiptId), receiptData);
      else state.receipts.unshift({ id: makeId('gr'), ...receiptData });
      const order = findOrder(data.orderId);
      if (order && data.condition === "Đạt") order.status = "Đã nhận";
      switchView("receipts");
    }

    if (form.dataset.kind === "payments") {
      const payment = {
        id: makeId("pay"),
        orderId: data.orderId,
        invoiceNo: data.invoiceNo,
        dueDate: toStorageDate(data.dueDate),
        amount: Number(data.amount),
        paidAmount: Number(data.paidAmount),
        status: "Chưa thanh toán"
      };
      payment.status = updatePaymentStatus(payment);
      state.payments.unshift(payment);
      switchView("payments");
    }

    saveData();
    render();

    if (nextModalId) {
      if (tenderDraft) {
        restoreTenderDraft(tenderDraft, selectedSupplierId);
      } else {
        showOnlyModal(nextModalId);
      }
      if (orderDraft) {
        fillOrderTenderOptions(orderDraft.tenderId);
        document.getElementById("orderTenderSelect").value = orderDraft.tenderId || "";
        document.querySelector('#orderModal [name="orderDate"]').value = formatDateDisplay(orderDraft.orderDate);
        document.querySelector('#orderModal [name="expectedDate"]').value = formatDateDisplay(orderDraft.expectedDate);
        fillEditableItems("orderItems", orderDraft.items || []);
        updateDocumentTotals("order");
      }
      if (nextModalId === "orderModal") {
        document.getElementById("orderSupplierSelect").value = selectedSupplierId;
      }
      document.getElementById("supplierModal").reset();
    } else {
      closeModal();
    }
  });
});

document.body.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;

  const { action, id } = button.dataset;

  if (action === "edit-receipt") { openEditReceipt(id); return; }

  if (action === "edit-request") {
    openEditRequest(id);
    return;
  }

  if (action === "delete-request") {
    const request = findRequest(id);
    if (!request) return;
    const isConfirmed = window.confirm(`Bạn có chắc muốn xóa giấy xin mua ${request.code}?`);
    if (!isConfirmed) return;
    const linkedOrderIds = state.orders.filter((order) => order.requestId === id).map((order) => order.id);
    state.requests = state.requests.filter((item) => item.id !== id);
    state.orders = state.orders.filter((order) => order.requestId !== id);
    state.tenders = state.tenders.filter((tender) => tender.requestId !== id);
    state.receipts = state.receipts.filter((receipt) => !linkedOrderIds.includes(receipt.orderId));
    state.payments = state.payments.filter((payment) => !linkedOrderIds.includes(payment.orderId));
  }

  if (action === "edit-order") {
    openEditOrder(id);
    return;
  }

  if (action === "edit-supplier") {
    openEditSupplier(id);
    return;
  }

  if (action === "delete-supplier") {
    deleteSupplier(id);
  }

  if (action === "edit-tender") {
    openEditTender(id);
    return;
  }

  if (action === "delete-tender") {
    const tender = findTender(id);
    if (!tender) return;
    const request = findRequest(tender.requestId);
    const isConfirmed = window.confirm(`Bạn có chắc muốn xóa kết quả đấu thầu của ${request?.code || "giấy xin mua này"}?`);
    if (!isConfirmed) return;
    state.tenders = state.tenders.filter((item) => item.id !== id);
  }

  if (action === "approve-request" || action === "reject-request") {
    const request = findRequest(id);
    request.status = action === "approve-request" ? "Đã duyệt" : "Từ chối";
  }

  if (action === "send-order" || action === "receive-order") {
    const order = findOrder(id);
    order.status = action === "send-order" ? "Đã gửi NCC" : "Đã nhận";
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
if (isCloudConfigured()) syncFromCloud();

document.getElementById('receiptOrderSelect').addEventListener('change', fillReceiptFromOrder);
document.getElementById('addReceiptItemBtn').addEventListener('click', () => { addEditableItemRow('receiptItems'); updateDocumentTotals('receipt'); });
document.getElementById('receiptItems').addEventListener('input', event => {
  handleFormattedPriceInput(event);
  updateEditableItemRowTotal(event.target.closest('tr'));
  updateDocumentTotals('receipt');
});
document.getElementById('receiptItems').addEventListener('click', event => {
  const button = event.target.closest('.remove-editable-item');
  if (button && document.querySelectorAll('#receiptItems tr').length > 1) { button.closest('tr').remove(); updateDocumentTotals('receipt'); }
});
for (const prefix of ['order', 'receipt']) {
  const form = document.getElementById(prefix + 'Modal');
  for (const field of ['discountAmount', 'vatAmount']) {
    form.elements[field].addEventListener('input', event => {
      const value = parseNumber(event.target.value);
      event.target.value = value ? (field === 'discountAmount' ? '-' : '') + formatNumber(value) : '';
      updateDocumentTotals(prefix);
    });
  }
}
