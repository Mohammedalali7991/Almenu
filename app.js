// نظام إدارة مطعمنا الفاخر - الإصدار المطور المستقر 2026
let items = [];
let categories = [];
let expenses = [];
let orders = {};
const database = firebase.database();

// مصفوفة الصور الافتراضية الرسمية للأطباق
const foodGallery = [
    { title: "سلطة ومقبلات", url: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop" },
    { title: "مشاوي وكباب", url: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&auto=format&fit=crop" },
    { title: "بيتزا إيطالية", url: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&auto=format&fit=crop" },
    { title: "برغر", url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop" },
    { title: "شاورما وگص", url: "https://images.unsplash.com/photo-1633424233228-56dfc1e195cf?w=400&auto=format&fit=crop" },
    { title: "حلويات شرقية", url: "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=400&auto=format&fit=crop" },
    { title: "مشروبات وعصائر", url: "https://images.unsplash.com/photo-1536935338788-846bb9981813?w=400&auto=format&fit=crop" }
];

function initSystem() {
    // 1. مزامنة بيانات المنيو والأقسام
    database.ref('menu_data').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            items = data.items || [];
            categories = data.categories || [];
        }
        updateAdminUI();
    });

    // 2. مزامنة المصاريف التشغيلية
    database.ref('expenses_data').on('value', (snapshot) => {
        expenses = snapshot.val() || [];
        updateFinancialsUI();
    });

    // 3. مزامنة فواتير الطلبات وحساب الخزينة
    database.ref('orders_system').on('value', (snapshot) => {
        orders = snapshot.val() || {};
        updateFinancialsUI();
        if (typeof renderTablesMap === "function") renderTablesMap();
        if (typeof renderLiveDashboard === "function") renderLiveDashboard();
    });
}

// تحديث واجهة لوحة الإدارة والجرد
function updateAdminUI() {
    const select = document.getElementById('itemCat');
    if (select) select.innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join('');

    const galleryContainer = document.getElementById('preset-images-container');
    if (galleryContainer && galleryContainer.children.length === 0) {
        galleryContainer.innerHTML = foodGallery.map((img, i) => `
            <img src="${img.url}" class="img-preset-option ${i===0?'selected':''}" title="${img.title}" onclick="selectPresetImg(this, '${img.url}')">
        `).join('');
    }

    const tableBody = document.getElementById('admin-table-items');
    if (tableBody) {
        if (items.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" class="text-muted py-4">لا توجد أصناف في القائمة حالياً.</td></tr>`;
            return;
        }
        tableBody.innerHTML = items.map((item, index) => `
            <tr class="${!item.available || item.stock <= 0 ? 'table-danger-custom' : ''}">
                <td><img src="${item.img || foodGallery[0].url}" class="table-item-img"></td>
                <td class="fw-bold text-dark">${item.name}</td>
                <td><span class="badge bg-soft-primary">${item.cat}</span></td>
                <td class="text-success fw-bold">${Number(item.price).toLocaleString()} د.ع</td>
                <td>
                    <input type="number" class="form-control form-control-sm text-center m-auto input-stock-custom" style="width:90px;" value="${item.stock || 0}" onchange="updateStockDirect(${index}, this.value)">
                </td>
                <td>
                    <div class="btn-group gap-1">
                        <button class="btn btn-sm ${item.available !== false && (item.stock || 0) > 0 ? 'btn-outline-warning' : 'btn-outline-success'}" onclick="toggleAvailability(${index})">
                            ${item.available !== false && (item.stock || 0) > 0 ? "⏸️ إيقاف وإعلان النفاذ" : "▶️ تفعيل وإتاحة الصنف"}
                        </button>
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteItem(${index})"><i class="bi bi-trash"></i></button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
}

function selectPresetImg(el, url) {
    document.querySelectorAll(".img-preset-option").forEach(i => i.classList.remove("selected"));
    el.classList.add("selected");
    const hiddenInput = document.getElementById("itemImgSelected");
    if(hiddenInput) hiddenInput.value = url;
}

function addCategory() {
    const input = document.getElementById('newCat'); if (!input) return;
    const val = input.value.trim();
    if (val && !categories.includes(val)) {
        categories.push(val);
        database.ref('menu_data/categories').set(categories).then(() => { input.value = ''; });
    }
}

function addItem() {
    const nameInput = document.getElementById('itemName'); const priceInput = document.getElementById('itemPrice');
    const catSelect = document.getElementById('itemCat'); const stockInput = document.getElementById('itemStock');
    const imgUrl = document.getElementById('itemImgSelected')?.value || foodGallery[0].url;

    if (!nameInput || !priceInput || !catSelect || !stockInput) return;
    const name = nameInput.value.trim(); const price = Number(priceInput.value); const cat = catSelect.value; const stock = Number(stockInput.value) || 0;

    if (name && price && cat) {
        items.push({ name, price, cat, img: imgUrl, stock: stock, available: stock > 0 });
        database.ref('menu_data/items').set(items).then(() => {
            nameInput.value = ''; priceInput.value = ''; stockInput.value = '50';
            showCustomAlert("تم إضافة الصنف بنجاح وتحديث نظام القائمة المشترك.");
        });
    }
}

function updateStockDirect(index, value) {
    const nStock = Number(value) || 0;
    items[index].stock = nStock;
    items[index].available = nStock > 0;
    database.ref('menu_data/items').set(items);
}

// زر التحكم بنفاذ وإتاحة الصنف من قبل الأدمن أو الكاشير
function toggleAvailability(index) {
    items[index].available = !(items[index].available !== false);
    if(!items[index].available) {
        items[index].stock = 0;
    } else {
        items[index].stock = 50; // تعيين كمية افتراضية عند إعادة التفعيل
    }
    database.ref('menu_data/items').set(items);
}

function deleteItem(index) {
    if (confirm("هل أنت متأكد من حذف هذا الصنف نهائياً من القائمة؟")) {
        items.splice(index, 1); database.ref('menu_data/items').set(items);
    }
}

// تسجيل المصاريف
function addExpense() {
    const title = document.getElementById('expTitle').value.trim();
    const amount = Number(document.getElementById('expAmount').value) || 0;
    if(!title || amount <= 0) { showCustomAlert("يرجى ملء بيانات المصروف بشكل صحيح!"); return; }

    const newExpense = { title, amount, date: new Date().toLocaleString('ar-IQ') };
    expenses.push(newExpense);
    database.ref('expenses_data').set(expenses).then(() => {
        document.getElementById('expTitle').value = '';
        document.getElementById('expAmount').value = '';
    });
}

function updateFinancialsUI() {
    const expTable = document.getElementById('table-expenses-body');
    let totalExpenses = 0;
    if (expTable) {
        expTable.innerHTML = expenses.map(e => {
            totalExpenses += e.amount;
            return `<tr><td class="fw-bold text-dark">${e.title}</td><td class="text-danger fw-bold">${e.amount.toLocaleString()} د.ع</td><td class="small text-muted">${e.date}</td></tr>`;
        }).join('');
        if(expenses.length === 0) expTable.innerHTML = `<tr><td colspan="3" class="text-muted py-3">لا توجد مصاريف مسجلة لليوم.</td></tr>`;
    }

    let totalSales = 0;
    Object.values(orders).forEach(o => {
        if (o.total_price && o.status === "completed") {
            totalSales += o.total_price;
        }
    });

    const netProfit = totalSales - totalExpenses;

    if(document.getElementById('stat-sales')) document.getElementById('stat-sales').innerText = totalSales.toLocaleString() + " د.ع";
    if(document.getElementById('stat-expenses')) document.getElementById('stat-expenses').innerText = totalExpenses.toLocaleString() + " د.ع";
    if(document.getElementById('stat-net')) document.getElementById('stat-net').innerText = netProfit.toLocaleString() + " د.ع";
}

// التنبيه المخصص النظيف لعدم إظهار اسم أو رابط الموقع
function showCustomAlert(msg) {
    const alertModalEl = document.getElementById('customAlertModal');
    if (alertModalEl) {
        document.getElementById('customAlertMsg').innerText = msg;
        const myModal = new bootstrap.Modal(alertModalEl);
        myModal.show();
    } else {
        alert(msg);
    }
}

document.addEventListener('DOMContentLoaded', initSystem);
