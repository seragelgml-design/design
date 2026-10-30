// ====== اسم المحل (غيّره من هنا) ======
const STORE_NAME = "ELGML";
const STORE_SUB = "للتجارة والتوزيع";

const $ = id => document.getElementById(id);
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt = n => Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });

let products = load('products', []);
const storeName = STORE_NAME;
let lines = [];
let editingId = null;

// ---------- اسم المحل ----------
function showStore() {
  $('storeName').textContent = STORE_NAME;
  $('storeSub').textContent = STORE_SUB;
  document.title = STORE_NAME;
}

// ---------- التبويبات ----------
function tab(name) {
  $('viewPage').classList.toggle('hidden', name !== 'view');
  $('sellPage').classList.toggle('hidden', name !== 'sell');
  $('customersPage').classList.toggle('hidden', name !== 'customers');
  $('tabView').classList.toggle('active', name === 'view');
  $('tabSell').classList.toggle('active', name === 'sell');
  $('tabCustomers').classList.toggle('active', name === 'customers');
}
$('tabView').onclick = () => tab('view');
$('tabSell').onclick = () => tab('sell');
$('tabCustomers').onclick = () => tab('customers');

// ---------- المنتجات ----------
function renderProducts() {
  const q = $('search').value.trim().toLowerCase();
  const list = products.filter(p => p.name.toLowerCase().includes(q));
  $('productsBody').innerHTML = list.length ? list.map(p => `
    <tr>
      <td>${esc(p.name)}</td>
      <td>${fmt(p.price)}</td>
      <td class="act">
        <button class="btn" onclick="editProduct(${p.id})">تعديل</button>
        <button class="btn red" onclick="deleteProduct(${p.id})">حذف</button>
      </td>
    </tr>`).join('') : `<tr><td colspan="3" class="empty">لا توجد منتجات</td></tr>`;
  $('productsList').innerHTML = products.map(p => `<option value="${esc(p.name)}">`).join('');
}

function resetForm() {
  editingId = null; $('pName').value = ''; $('pPrice').value = '';
  $('saveProduct').textContent = 'إضافة'; $('cancelEdit').classList.add('hidden');
}

$('saveProduct').onclick = () => {
  const name = $('pName').value.trim();
  const price = parseFloat($('pPrice').value);
  if (!name || isNaN(price) || price < 0) return alert('اكتب اسم المنتج والسعر صح');
  if (editingId) {
    const p = products.find(x => x.id === editingId);
    p.name = name; p.price = price;
  } else {
    products.push({ id: Date.now(), name, price });
  }
  save('products', products); resetForm(); renderProducts();
};
$('cancelEdit').onclick = resetForm;

window.editProduct = id => {
  const p = products.find(x => x.id === id);
  editingId = id; $('pName').value = p.name; $('pPrice').value = p.price;
  $('saveProduct').textContent = 'حفظ التعديل'; $('cancelEdit').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
window.deleteProduct = id => {
  if (!confirm('متأكد من الحذف؟')) return;
  products = products.filter(p => p.id !== id);
  save('products', products); renderProducts();
};
$('search').oninput = renderProducts;

// ---------- البيع ----------
// لما تختار منتج محفوظ، السعر يظهر لوحده (وتقدر تغيره)
$('sName').oninput = () => {
  const p = products.find(x => x.name === $('sName').value.trim());
  if (p) $('sPrice').value = p.price;
};

function renderLines() {
  $('linesBody').innerHTML = lines.length ? lines.map((l, i) => `
    <tr>
      <td>${esc(l.name)}</td><td>${fmt(l.price)}</td><td>${fmt(l.qty)}</td><td>${fmt(l.price * l.qty)}</td>
      <td class="act"><button class="btn red" onclick="removeLine(${i})">✕</button></td>
    </tr>`).join('') : `<tr><td colspan="5" class="empty">لم تضف منتجات بعد</td></tr>`;
  $('grand').textContent = fmt(lines.reduce((s, l) => s + l.price * l.qty, 0));
}
window.removeLine = i => { lines.splice(i, 1); renderLines(); };

$('addLine').onclick = () => {
  const name = $('sName').value.trim();
  const price = parseFloat($('sPrice').value);
  const qty = parseFloat($('sQty').value);
  if (!name || isNaN(price) || isNaN(qty) || qty <= 0) return alert('اكتب اسم المنتج والسعر والكمية');
  lines.push({ name, price, qty });
  $('sName').value = ''; $('sPrice').value = ''; $('sQty').value = 1;
  renderLines(); $('sName').focus();
};
$('clearLines').onclick = () => { lines = []; renderLines(); };

$('makeInvoice').onclick = () => {
  if (!lines.length) return alert('أضف منتجات للفاتورة أولاً');
  const no = load('invoiceNo', 0) + 1; save('invoiceNo', no);
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
  $('invStore').textContent = STORE_NAME;
  $('invSub').textContent = STORE_SUB;
  $('invNo').textContent = no;
  $('invDate').textContent = new Date().toLocaleString('ar-EG');
  $('invCustomer').textContent = $('customer').value.trim() || 'بدون عميل';
  $('invBody').innerHTML = lines.map(l =>
    `<tr><td>${esc(l.name)}</td><td>${fmt(l.price)}</td><td>${fmt(l.qty)}</td><td>${fmt(l.price * l.qty)}</td></tr>`).join('');
  $('invTotal').textContent = fmt(total);
  $('modal').classList.remove('hidden');
};
$('closeInv').onclick = () => {
  $('modal').classList.add('hidden');
  lines = []; $('customer').value = ''; renderLines();
};

// ---------- العملاء ----------
let customers = load('customers', []);

function renderCustomers() {
  const q = $('cSearch').value.trim().toLowerCase();
  const list = customers.filter(c => (c.name + ' ' + c.item).toLowerCase().includes(q));
  $('customersBody').innerHTML = list.length ? list.map(c => `
    <tr>
      <td>${esc(c.name)}</td>
      <td>${esc(c.item)}</td>
      <td>${fmt(c.price)}</td>
      <td>
        <label class="chk"><input type="checkbox" ${c.paid ? 'checked' : ''} onchange="setPaid(${c.id}, true)"> تم السداد</label>
        <label class="chk"><input type="checkbox" ${!c.paid ? 'checked' : ''} onchange="setPaid(${c.id}, false)"> لم يتم السداد</label>
      </td>
      <td class="act"><button class="btn red" onclick="deleteCustomer(${c.id})">حذف</button></td>
    </tr>`).join('') : `<tr><td colspan="5" class="empty">لا توجد بيانات</td></tr>`;
}

window.setPaid = (id, paid) => {
  const c = customers.find(x => x.id === id);
  if (c) { c.paid = paid; save('customers', customers); }
  renderCustomers();
};
window.deleteCustomer = id => {
  if (!confirm('متأكد من الحذف؟')) return;
  customers = customers.filter(c => c.id !== id);
  save('customers', customers); renderCustomers();
};

// المربعين في الإضافة: واحد بس يتعلم
$('cPaid').onchange = () => { $('cUnpaid').checked = !$('cPaid').checked; };
$('cUnpaid').onchange = () => { $('cPaid').checked = !$('cUnpaid').checked; };

$('addCustomer').onclick = () => {
  const name = $('cName').value.trim();
  const item = $('cItem').value.trim();
  const price = parseFloat($('cPrice').value);
  if (!name || !item || isNaN(price) || price < 0) return alert('اكتب اسم العميل والصنف والسعر');
  customers.push({ id: Date.now(), name, item, price, paid: $('cPaid').checked });
  save('customers', customers);
  $('cName').value = ''; $('cItem').value = ''; $('cPrice').value = '';
  $('cPaid').checked = false; $('cUnpaid').checked = true;
  renderCustomers(); $('cName').focus();
};
$('cSearch').oninput = renderCustomers;

// ---------- النسخ الاحتياطي ----------
$('backupBtn').onclick = () => {
  const data = { products, customers, invoiceNo: load('invoiceNo', 0) };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'backup-' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
};

$('restoreBtn').onclick = () => $('restoreFile').click();

$('restoreFile').onchange = e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!Array.isArray(data.products)) throw new Error();
      if (!confirm('هيتم استبدال المنتجات الحالية بالنسخة دي. متأكد؟')) return;
      products = data.products.filter(p => p && p.name && !isNaN(p.price))
        .map((p, i) => ({ id: p.id || Date.now() + i, name: String(p.name), price: Number(p.price) }));
      if (data.invoiceNo) save('invoiceNo', Number(data.invoiceNo) || 0);
      save('products', products);
      if (Array.isArray(data.customers)) { customers = data.customers; save('customers', customers); }
      renderProducts(); renderCustomers();
      alert('تم الاسترجاع بنجاح ✅');
    } catch {
      alert('الملف ده مش نسخة احتياطية صحيحة');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
};

// ---------- تشغيل ----------
showStore(); renderProducts(); renderLines(); renderCustomers();
