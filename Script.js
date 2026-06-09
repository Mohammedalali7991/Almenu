// =========================================================================
// 1. إعدادات المتغيرات العامة لربط الطاولات والسلة
// =========================================================================
const urlParams = new URLSearchParams(window.location.search);
const hasTableParam = urlParams.has('table');
const tableNumber = urlParams.get('table') || "1";
const tableKey = `table_${tableNumber}`;

// قفل المنيو إذا لم يتم مسح باركود الطاولة الصالح
if (!hasTableParam) {
    document.getElementById('lockScreen').style.display = 'flex';
} else {
    document.getElementById('tableBadge').innerText = `طاولة رقم: ${tableNumber}`;
}

// مصفوفة السلة وقائمة الوجبات والداتا الديناميكية
let cart = [];
let localProductsData = {}; // تخزين الأطباق القادمة من الفايربيس حياً
let currentSmartFilter = 'all';
let currentActiveCategory = 'all';

// =========================================================================
// 2. مكتبة الصور الملكية المدمجة (Image Asset Hub)
// =========================================================================
// لتوفير تكاليف المصورين، هذه روابط مباشرة لصور أطعمة عالية الجودة HD
const imageAssetHub = {
    "مشاوي": "https://images.unsplash.com/photo-1544025162-d76694265947?w=500",
    "برجر": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500",
    "بيتزا": "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500",
    "دجاج صحي": "https://images.unsplash.com/photo-1327170138356-8a4bf579ba65?w=500",
    "سمك مشوي": "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=500",
    "شاورما": "https://images.unsplash.com/photo-1644781165213-9097e3be9774?w=500",
    "سلطة دايت": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500",
    "حلويات فاخرة": "https://images.unsplash.com/photo-1551024601-bec78aea704b?w=500",
    "عصائر فريش": "https://images.unsplash.com/photo-1536935338788-846bb9981813?w=500"
};

// =========================================================================
// 3. بدء التشغيل وجلب البيانات ديناميكياً من الفايربيس (Firestore)
// =========================================================================
window.addEventListener('DOMContentLoaded', () => {
    loadCategoriesAndProductsLive();
    listenToSystemMetricsAndData();
    generateTablesMap();
    injectAdminMenuManagerUI(); // حقن واجهة إضافة وتعديل الأطباق تلقائياً للكاشير
    
    // استعادة السلة التلقائية لحماية طلبات الزبائن من انقطاع الشبكة
    const savedCart = localStorage.getItem(`bk_cart_${tableKey}`);
    if(savedCart) {
        cart = JSON.parse(savedCart);
        if(cart.length > 0) {
            document.getElementById('backupNotice').style.display = 'block';
            syncUI();
        }
    }
});

// سحب الفئات والوجبات حياً من Firestore لبناء المنيو بدون أكواد ثابتة
function loadCategoriesAndProductsLive() {
    // 1. استمع للفئات
    db.collection("categories").onSnapshot((snapshot) => {
        const catNav = document.getElementById('categoriesNavContainer');
        catNav.innerHTML = `<button class="cat-btn active" id="cat-all" onclick="filterCategory('all')">الكل</button>`;
        
        snapshot.forEach((doc) => {
            const cat = doc.data();
            catNav.innerHTML += `<button class="cat-btn" id="cat-${doc.id}" onclick="filterCategory('${doc.id}')">${cat.name}</button>`;
        });
    });

    // 2. استمع للوجبات والأطباق مع السعرات والماكروز
    db.collection("products").onSnapshot((snapshot) => {
        const menuContainer = document.getElementById('menuContainer');
        menuContainer.innerHTML = '';
        localProductsData = {};

        if (snapshot.empty) {
            menuContainer.innerHTML = '<p style="text-align:center; color:#666; padding:20px;">لا توجد أطباق في المنيو حالياً. يمكنك إضافتها من لوحة الكاشير!</p>';
            return;
        }

        // تجميع المنتجات بناءً على فئاتها
        let sections = {};

        snapshot.forEach((doc) => {
            const p = doc.data();
            localProductsData[doc.id] = { id: doc.id, ...p };

            if (!sections[p.category]) sections[p.category] = [];
            sections[p.category].push({ id: doc.id, ...p });
        });

        for (let catId in sections) {
            let catName = catId === 'western' ? 'مأكولات غربية' : (catId === 'eastern' ? 'مأكولات شرقية' : catId);
            
            let sectionHtml = `<div class="menu-section" id="sec-${catId}" data-sec-cat="${catId}">
                <div class="section-title">${catName}</div>`;

            sections[catId].forEach(product => {
                const isDiet = product.isDiet === true || product.isDiet === "true";
                const dietBadgeHtml = isDiet ? `<div class="diet-badge">🔥 ${product.calories || 0} سعرة | P: ${product.protein || 0}g | C: ${product.carbs || 0}g</div>` : '';
                
                sectionHtml += `
                    <div class="product-card" data-id="${product.id}" data-diet="${isDiet}" style="display: flex;">
                        <img src="${product.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300'}" class="product-img">
                        <div class="product-details">
                            <h3>${product.name}</h3>
                            ${dietBadgeHtml}
                            <div class="price">${parseInt(product.price).toLocaleString()} د.ع</div>
                        </div>
                        <div class="qty-controls">
                            <button class="btn-qty" onclick="changeQty('${product.id}', -1)">-</button>
                            <div class="qty-val" id="qty_${product.id}">0</div>
                            <button class="btn-qty" onclick="changeQty('${product.id}', 1)">+</button>
                        </div>
                    </div>`;
            });

            sectionHtml += `</div>`;
            menuContainer.innerHTML += sectionHtml;
        }
        syncUI();
        applyFilters();
    });
}

// =========================================================================
// 4. منطق عمل السلة والحسابات التلقائية
// =========================================================================
function changeQty(id, change) {
    const product = localProductsData[id];
    if (!product) return;

    const item = cart.find(i => i.id === id);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) cart = cart.filter(i => i.id !== id);
    } else if (change > 0) {
        cart.push({ id: id, name: product.name, price: parseInt(product.price), quantity: 1 });
    }
    
    localStorage.setItem(`bk_cart_${tableKey}`, JSON.stringify(cart));
    syncUI();
}

function syncUI() {
    let totalPrice = 0;
    // تصفير جميع العدادات في المنيو أولاً
    document.querySelectorAll('.qty-val').forEach(el => el.innerText = '0');
    
    // تحديث قيم الوجبات المختارة
    cart.forEach(item => {
        totalPrice += (item.price * item.quantity);
        const el = document.getElementById(`qty_${item.id}`);
        if(el) el.innerText = item.quantity;
    });
    
    document.getElementById('cartTotalLabel').innerText = `إجمالي الحساب: ${totalPrice.toLocaleString()} د.ع`;
}

// فلاتر المنيو التفاعلية للزبائن
function filterCategory(cat) {
    currentActiveCategory = cat;
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById(`cat-${cat}`);
    if (activeBtn) activeBtn.classList.add('active');

    document.querySelectorAll('.menu-section').forEach(section => {
        const secCat = section.getAttribute('data-sec-cat');
        if(cat === 'all' || secCat === cat) section.style.display = 'block'; else section.style.display = 'none';
    });
    applyFilters();
}

function setSmartFilter(filterType) {
    currentSmartFilter = filterType;
    document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    document.getElementById(`filter-${filterType}`).classList.add('active');
    applyFilters();
}

function applyFilters() {
    document.querySelectorAll('.product-card').forEach(card => {
        const isDiet = card.getAttribute('data-diet') === 'true';
        const parentSection = card.closest('.menu-section');
        let matches = true;

        if (currentSmartFilter === 'diet' && !isDiet) matches = false;
        
        if (matches && parentSection && parentSection.style.display !== 'none') {
            card.style.style = 'flex';
            card.style.setProperty('display', 'flex', 'important');
        } else {
            card.style.style = 'none';
            card.style.setProperty('display', 'none', 'important');
        }
    });
}

function toggleModal(show) {
    const modal = document.getElementById('cartModal');
    if(show) {
        const list = document.getElementById('modalItemsList');
        list.innerHTML = '';
        if(cart.length === 0) {
            list.innerHTML = '<p style="color:#666; text-align:center; padding:15px;">السلة خالية، أضف بعض الأطباق اللذيذة أولاً!</p>';
        }
        cart.forEach(item => {
            list.innerHTML += `<div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #222;">
                <span>${item.name} (x${item.quantity})</span> 
                <span style="color:#d4af37; font-weight:bold;">${(item.price * item.quantity).toLocaleString()} د.ع</span>
            </div>`;
        });
        modal.style.display = 'flex';
    } else { modal.style.display = 'none'; }
}

function toggleOrderTypeFields() {
    const type = document.getElementById('orderTypeSelect').value;
    document.getElementById('deliveryFields').style.display = (type === 'توصيل') ? 'block' : 'none';
}

// =========================================================================
// 5. إرسال الطلبات السحابية الحية ونداءات النادل الفورية للمطبخ والكاشير
// =========================================================================
function sendFinalOrderToServer() {
    if(cart.length === 0) return;
    const type = document.getElementById('orderTypeSelect').value;
    const total = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    const notes = document.getElementById('orderNotesInput').value || "لا توجد ملاحظات";
    
    let finalTable = tableNumber;
    let deliveryMeta = {};
    const orderId = `order_${Date.now()}`; // استخدام معرف فريد فريد لكل طلب لمنع الكتابة فوق البيانات القديمة

    if(type === 'توصيل') {
        finalTable = "توصيل خارجي 🛵";
        deliveryMeta = {
            customer: document.getElementById('customerName').value || "زبون غير مسجل",
            phone: document.getElementById('customerPhone').value || "بدون عنوان"
        };
    }

    database.ref(`orders_system/${orderId}`).set({
        orderId: orderId,
        table: finalTable,
        tableNum: tableNumber,
        items: cart,
        acc_total: total,
        status: "طلب_جديد",
        type: type,
        deliveryMeta: deliveryMeta,
        notes: notes,
        waiter_requested: false,
        bill_requested: false,
        timestamp: Date.now()
    }).then(() => {
        alert("🎉 ممتاز! تم إرسال طلبك حياً ومباشرة إلى شاشة المطبخ والكاشير المركزية.");
        cart = []; 
        localStorage.removeItem(`bk_cart_${tableKey}`);
        document.getElementById('backupNotice').style.display = 'none';
        document.getElementById('orderNotesInput').value = '';
        syncUI(); 
        toggleModal(false);
    });
}

function callWaiterLive() {
    const orderId = `call_waiter_${tableNumber}`;
    database.ref(`orders_system/${orderId}`).set({
        orderId: orderId,
        table: tableNumber,
        tableNum: tableNumber,
        waiter_requested: true,
        bill_requested: false,
        type: "صالة",
        acc_total: 0,
        status: "طلب_نادل_بالصالة",
        notes: "🚨 الزبون يستدعي النادل فوراً إلى الطاولة!",
        timestamp: Date.now()
    }).then(() => { 
        alert("🛎️ تم إرسال إشعار وامض إلى شاشة الكاشير! النادل في طريقه إليك الآن."); 
    });
}

function callBillLive() {
    const orderId = `call_bill_${tableNumber}`;
    database.ref(`orders_system/${orderId}`).set({
        orderId: orderId,
        table: tableNumber,
        tableNum: tableNumber,
        waiter_requested: false,
        bill_requested: true,
        type: "صالة",
        acc_total: 0,
        status: "زبون_يطلب_الحساب",
        notes: "🧾 الزبون يطلب إحضار الفاتورة النهائية للمنضدة!",
        timestamp: Date.now()
    }).then(() => { 
        alert("🧾 تم تنبيه المحاسب المركزي لتجهيز وصياغة فاتورتك المطبوعة الآن."); 
    });
}

// =========================================================================
// 6. لوحة تحكم ومراقبة المطبخ والكاشير (Real-time Core Engine)
// =========================================================================
function listenToSystemMetricsAndData() {
    database.ref('orders_system').on('value', (snapshot) => {
        const allOrders = snapshot.val();
        let totalSales = 0; 
        let totalOrders = 0;
        const container = document.getElementById('adminOrdersContainer');
        const deliveryContainer = document.getElementById('deliveryOrdersContainer');
        
        container.innerHTML = '';
        deliveryContainer.innerHTML = '';

        // إعادة تهيئة خريطة الطاولات الافتراضية للوضع الجاهز الأخضر
        for(let i=1; i<=12; i++) {
            const box = document.getElementById(`map_table_${i}`);
            if(box) {
                box.className = "table-box";
                document.getElementById(`map_status_${i}`).innerText = "فارغة جاهزة";
            }
        }

        if(allOrders) {
            for(let key in allOrders) {
                const order = allOrders[key];
                totalOrders++;
                if(order.acc_total) totalSales += parseInt(order.acc_total);

                // إدارة ألوان الخريطة الحية بناءً على نداءات الطاولة
                if(order.type !== 'توصيل' && order.tableNum) {
                    const box = document.getElementById(`map_table_${order.tableNum}`);
                    if(box) {
                        if(order.waiter_requested || order.bill_requested) {
                            box.className = "table-box waiter-call";
                            document.getElementById(`map_status_${order.tableNum}`).innerText = order.bill_requested ? "🛎️ يطلب الحساب!" : "🙋 يطلب النادل!";
                        } else {
                            box.className = "table-box occupied";
                            document.getElementById(`map_status_${order.tableNum}`).innerText = `مشغولة وتأكل (${order.acc_total ? parseInt(order.acc_total).toLocaleString() : 0} د.ع)`;
                        }
                    }
                }

                // بناء بطاقات التحكم للمطبخ والكاشير
                let itemsStr = order.items ? order.items.map(i => `<span style="background:#222; padding:2px 6px; border-radius:4px; margin-left:4px; display:inline-block;">${i.name} (x${i.quantity})</span>`).join(' ') : 'نداء خدمة فقط';
                let alertBadge = order.waiter_requested ? `<span class="badge-alert" style="background:#e67e22; color:#fff;">🛎️ نداء نادل</span>` : '';
                if(order.bill_requested) alertBadge += `<span class="badge-alert" style="background:#9b59b6; color:#fff;">🧾 طلب الحساب</span>`;

                const cardHtml = `
                    <div class="admin-order-card" style="border-right-color: ${order.waiter_requested || order.bill_requested ? '#e67e22' : '#d4af37'}">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <strong style="color:#d4af37; font-size:16px;"><i class="fas fa-map-pin"></i> الموقع: الطاولة ${order.table} ${alertBadge}</strong>
                            <span style="color:#aaa; font-size:12px; background:#1c1c1c; padding:3px 8px; border-radius:15px;">${order.status}</span>
                        </div>
                        <p style="margin:12px 0; color:#eee; line-height:1.5;"><b>📦 الأصناف المطلوبة:</b><br>${itemsStr}</p>
                        <p style="margin:4px 0; color:#ffcc00; font-size:13px; background:rgba(255,204,0,0.05); padding:6px; border-radius:6px;"><b>💡 الملاحظات:</b> ${order.notes || 'لا يوجد'}</p>
                        
                        ${order.type === 'توصيل' ? `<p style="margin:8px 0; font-size:12px; color:#2ecc71;"><i class="fas fa-user-motorcycle"></i> العميل: ${order.deliveryMeta?.customer} | هاتف وعنوان: ${order.deliveryMeta?.phone}</p>` : ''}
                        
                        <div style="margin-top:14px; display:flex; gap:6px; justify-content:flex-end; border-top:1px dashed #222; padding-top:10px;">
                            <button style="background:#2980b9; color:#fff; border:none; padding:8px 14px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:12px;" onclick="updateAdminOrderStatus('${key}', 'جاري الطبخ بالمطبخ 👨‍🍳')"><i class="fas fa-fire"></i> للمطبخ</button>
                            <button style="background:#27ae60; color:#fff; border:none; padding:8px 14px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:12px;" onclick="updateAdminOrderStatus('${key}', 'تم تسليم الأكل للزبون ✅')"><i class="fas fa-check"></i> تم التسليم</button>
                            <button style="background:#e74c3c; color:#fff; border:none; padding:8px 14px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:12px;" onclick="deleteOrderAdmin('${key}')"><i class="fas fa-cash-register"></i> دفع وتصفير الفاتورة</button>
                            <button style="background:#f1c40f; color:#000; border:none; padding:8px 14px; border-radius:6px; cursor:pointer; font-weight:bold; font-size:12px;" onclick="printThermalInvoice('${key}')"><i class="fas fa-print"></i> طبع 🖨️</button>
                        </div>
                    </div>`;

                if(order.type === 'توصيل') {
                    deliveryContainer.innerHTML += cardHtml;
                } else {
                    container.innerHTML += cardHtml;
                }
            }
        } else {
            container.innerHTML = '<p style="text-align:center; color:#444; padding:20px;">لا توجد فواتير نشطة حالياً بالصالة.</p>';
            deliveryContainer.innerHTML = '<p style="text-align:center; color:#444; padding:20px;">لا توجد طلبات دليفرى خارجية نشطة.</p>';
        }
        
        document.getElementById('kpiOrdersCount').innerText = totalOrders;
        document.getElementById('kpiSales').innerText = `${totalSales.toLocaleString()} د.ع`;
        calculateMetrics(totalSales, null);
    });

    // استمرار مزامنة شاشة المصاريف والنثريات حياً
    database.ref('expenses_system').on('value', (snapshot) => {
        const allExpenses = snapshot.val();
        let totalExp = 0;
        const tbody = document.getElementById('expensesTableBody');
        tbody.innerHTML = '';

        if(allExpenses) {
            for(let key in allExpenses) {
                const exp = allExpenses[key];
                totalExp += parseInt(exp.amount) || 0;
                tbody.innerHTML += `<tr>
                    <td>${exp.reason}</td>
                    <td style="color:#c0392b; font-weight:bold;">${parseInt(exp.amount).toLocaleString()} د.ع</td>
                    <td>${new Date(exp.timestamp).toLocaleTimeString('ar-IQ')}</td>
                </tr>`;
            }
        } else {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#666;">لا توجد مصاريف مسجلة لهذا اليوم بعد.</td></tr>';
        }
        document.getElementById('kpiExpenses').innerText = `${totalExp.toLocaleString()} د.ع`;
        calculateMetrics(null, totalExp);
    });
}

function updateAdminOrderStatus(key, status) {
    database.ref(`orders_system/${key}`).update({ status: status, waiter_requested: false, bill_requested: false });
}

function deleteOrderAdmin(key) {
    if(confirm("هل أنت متأكد من دفع وتصفير هذه الفاتورة وإغلاق حساب الطاولة بالكامل؟")) {
        database.ref(`orders_system/${key}`).remove().then(() => {
            alert("🧹 تم تصفير حساب الطاولة بنجاح وتجهيزها لاستقبال زبائن جدد.");
        });
    }
}

let cacheSales = 0; let cacheExp = 0;
function calculateMetrics(sales, exp) {
    if(sales !== null) cacheSales = sales;
    if(exp !== null) cacheExp = exp;
    document.getElementById('kpiProfits').innerText = `${(cacheSales - cacheExp).toLocaleString()} د.ع`;
}

function submitExpenseLive() {
    const reason = document.getElementById('expReason').value;
    const amount = parseInt(document.getElementById('expAmount').value) || 0;
    if(!reason || amount <= 0) return;

    database.ref(`expenses_system/${Date.now()}`).set({
        reason: reason,
        amount: amount,
        timestamp: Date.now()
    }).then(() => {
        document.getElementById('expReason').value = '';
        document.getElementById('expAmount').value = '';
    });
}

function generateTablesMap() {
    const container = document.getElementById('tablesMapContainer');
    container.innerHTML = '';
    for(let i=1; i<=12; i++) {
        container.innerHTML += `<div class="table-box" id="map_table_${i}" onclick="manageTableFromMap(${i})">طاولة ${i} <p id="map_status_${i}">فارغة جاهزة</p></div>`;
    }
}

function manageTableFromMap(num) {
    if(confirm(`هل تريد تصفير وإخلاء الطاولة رقم ${num} مباشرة من الخريطة؟`)) {
        // مسح أي فواتير أو نداءات مرتبطة بهذه الطاولة
        database.ref('orders_system').once('value', (snapshot) => {
            const orders = snapshot.val();
            if(orders) {
                for(let key in orders) {
                    if(orders[key].tableNum == num) {
                        database.ref(`orders_system/${key}`).remove();
                    }
                }
            }
        });
        alert(`🧹 الطاولة ${num} الآن جاهزة وفارغة تماماً.`);
    }
}

// ميزة طباعة الفواتير الحرارية Thermal Printer Simulator
function printThermalInvoice(key) {
    database.ref(`orders_system/${key}`).once('value', (snapshot) => {
        const order = snapshot.val();
        if(!order) return;
        
        let itemsText = order.items ? order.items.map(i => `${i.name} x ${i.quantity} = ${(i.price * i.quantity).toLocaleString()} د.ع`).join('\n') : '';
        
        let invoiceWindow = window.open('', '_blank', 'width=400,height=600');
        invoiceWindow.document.write(`<pre style="font-family:monospace; padding:20px; direction:rtl; text-align:right;">
========================================
         👑 مطعم الناجح الفاخر 👑
========================================
الموقع/الطاولة: ${order.table}
التاريخ: ${new Date(order.timestamp).toLocaleString('ar-IQ')}
----------------------------------------
الأصناف المطلوبة:
${itemsText}
----------------------------------------
💡 الملاحظات: ${order.notes || 'لا يوجد'}
========================================
إجمالي الفاتورة الصافي: ${parseInt(order.acc_total).toLocaleString()} د.ع
========================================
        شكراً لزيارتكم وطاب يومكم!
        </pre>`);
        invoiceWindow.document.close();
        invoiceWindow.print();
    });
}

// =========================================================================
// 7. نظام التحكم الديناميكي بإضافة وتعديل أطباق المنيو ومكتبة الصور المدمجة
// =========================================================================
function injectAdminMenuManagerUI() {
    const expensesScreen = document.getElementById('expenses-screen');
    
    const managerHtml = `
    <hr style="border: 1px solid #222; margin: 40px 0;">
    <h2 style="color:#d4af37; border-bottom:1px solid #222; padding-bottom:10px;"><i class="fas fa-folder-plus"></i> نظام لوحة التحكم بالمنيو الذكي (إضافة وتعديل فوري)</h2>
    <p style="color:#aaa; font-size:13px;">أضف طبقاً جديداً مع سعراته الحرارية، واختر صورته الملكية بضغطة زر واحدة بدون تعب.</p>
    
    <div class="expense-form" style="flex-direction: column; gap:15px; background:#111;">
        <div style="display:flex; gap:10px; width:100%; flex-wrap:wrap;">
            <input type="text" id="admProdName" class="form-field" placeholder="اسم طبق الطعام الفاخر الجديد...">
            <input type="number" id="admProdPrice" class="form-field" placeholder="سعر الطبق د.ع">
            <select id="admProdCat" class="form-field">
                <option value="western">مأكولات غربية</option>
                <option value="eastern">مأكولات شرقية</option>
            </select>
        </div>
        
        <div style="display:flex; gap:10px; width:100%; flex-wrap:wrap; align-items:center;">
            <label style="color:#aaa; font-size:13px;"><input type="checkbox" id="admProdIsDiet" onchange="document.getElementById('admDietFields').style.display = this.checked ? 'flex' : 'none'"> هل هو طبق دايت ورشاقة؟</label>
            <div id="admDietFields" style="display:none; gap:10px; flex:1;">
                <input type="number" id="admProdCal" class="form-field" placeholder="السعرات (Calories)">
                <input type="number" id="admProdProt" class="form-field" placeholder="البروتين g">
                <input type="number" id="admProdCarb" class="form-field" placeholder="الكارب g">
            </div>
        </div>

        <div style="width:100%;">
            <label style="color:#d4af37; font-size:13px; display:block; margin-bottom:8px;">📸 اختر صورة الطبق الفاخرة من مكتبة المطعم المدمجة مباشرة:</label>
            <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap:10px;" id="adminImagePickerHub"></div>
            <input type="hidden" id="admProdSelectedImg" value="">
        </div>

        <button class="btn-service" style="background:#27ae60; color:white; border:none; padding:14px; width:100%; font-size:15px;" onclick="saveNewProductToFirestore()"><i class="fas fa-cloud-upload-alt"></i> حفظ وحقن الطبق في المنيو فوراً السحابي</button>
    </div>
    
    <h3 style="color:#d4af37; margin-top:20px;"><i class="fas fa-trash-can"></i> حذف وتعطيل أطباق الطعام النشطة حالياً</h3>
    <div id="adminCurrentProductsManagerList" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:10px; margin-top:15px;"></div>`;
    
    expensesScreen.insertAdjacentHTML('beforeend', managerHtml);

    // ملء منبثقة منتقي الصور الملكية
    const imgHubContainer = document.getElementById('adminImagePickerHub');
    for (let key in imageAssetHub) {
        imgHubContainer.innerHTML += `
        <div class="img-pick-card" onclick="selectAdminProductImage(this, '${imageAssetHub[key]}')" style="border:2px solid #222; border-radius:8px; overflow:hidden; cursor:pointer; text-align:center; background:#1c1c1c; padding:4px; transition:0.2s;">
            <img src="${imageAssetHub[key]}" style="width:100%; height:65px; object-fit:cover; border-radius:6px;">
            <span style="font-size:11px; color:#aaa; display:block; margin-top:4px;">${key}</span>
        </div>`;
    }

    // ربط قائمة الحذف الحية بالأطباق الموجودة
    db.collection("products").onSnapshot((snapshot) => {
        const delList = document.getElementById('adminCurrentProductsManagerList');
        delList.innerHTML = '';
        snapshot.forEach((doc) => {
            const p = doc.data();
            delList.innerHTML += `
            <div style="background:#141414; border:1px solid #222; padding:10px; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:13px; color:#fff;">${p.name}</span>
                <button style="background:#c0392b; color:#fff; border:none; padding:5px 10px; border-radius:5px; cursor:pointer; font-size:11px;" onclick="deleteProductFromFirestore('${doc.id}')"><i class="fas fa-trash"></i> مسح</button>
            </div>`;
        });
    });
}

function selectAdminProductImage(element, url) {
    document.querySelectorAll('.img-pick-card').forEach(el => el.style.borderColor = '#222');
    element.style.borderColor = '#d4af37';
    document.getElementById('admProdSelectedImg').value = url;
}

function saveNewProductToFirestore() {
    const name = document.getElementById('admProdName').value;
    const price = parseInt(document.getElementById('admProdPrice').value) || 0;
    const category = document.getElementById('admProdCat').value;
    const isDiet = document.getElementById('admProdIsDiet').checked;
    const image = document.getElementById('admProdSelectedImg').value || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300";

    if(!name || price <= 0) {
        alert("⚠️ يرجى ملء اسم الوجبة وتحديد سعر صالح قبل الحفظ.");
        return;
    }

    const prodData = {
        name: name,
        price: price,
        category: category,
        isDiet: isDiet,
        image: image,
        calories: isDiet ? (document.getElementById('admProdCal').value || 0) : 0,
        protein: isDiet ? (document.getElementById('admProdProt').value || 0) : 0,
        carbs: isDiet ? (document.getElementById('admProdCarb').value || 0) : 0
    };

    db.collection("products").add(prodData).then(() => {
        alert("🚀 تم بنجاح حقن الطبق الجديد في قاعدة البيانات السحابية وظهر فوراً لجميع الزبائن!");
        document.getElementById('admProdName').value = '';
        document.getElementById('admProdPrice').value = '';
        document.getElementById('admProdIsDiet').checked = false;
        document.getElementById('admDietFields').style.display = 'none';
        document.getElementById('admProdSelectedImg').value = '';
        document.querySelectorAll('.img-pick-card').forEach(el => el.style.borderColor = '#222');
    });
}

function deleteProductFromFirestore(docId) {
    if(confirm("هل تريد إزالة هذا الطبق نهائياً وبشكل قطعي من قائمة الطعام؟")) {
        db.collection("products").doc(docId).delete().then(() => {
            alert("🧹 تم حذف الوجبة من السيرفر السحابي.");
        });
    }
}

// =========================================================================
// 8. الصلاحيات وتسجيل الدخول السري للكاشير والإدارة
// =========================================================================
let loginClicks = 0;
function triggerAdminLogin() {
    loginClicks++;
    if(loginClicks >= 5) {
        loginClicks = 0;
        let pass = prompt("قفل الحماية: الرجاء إدخال رمز التحقق الخاص بالكاشير والإدارة المركزية:");
        if(pass === "1234") {
            document.getElementById('adminSidebar').style.display = 'flex';
            document.getElementById('mainContentArea').classList.add('admin-mode');
            switchScreen('dashboard-screen');
            alert("🔓 تم تفعيل وضع الكاشير والتحكم المالي، وتم تحميل بنك الصور والمطبخ بنجاح!");
        } else if(pass !== null) { alert("❌ رمز الدخول المدخل غير صحيح."); }
    }
}

function logoutAdminMode() {
    document.getElementById('adminSidebar').style.display = 'none';
    document.getElementById('mainContentArea').classList.remove('admin-mode');
    switchScreen('menu-screen');
}

function switchScreen(screenId) {
    document.querySelectorAll('.app-screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.sidebar-btn').forEach(b => b.classList.remove('active'));
    
    document.getElementById(screenId).classList.add('active');
    
    // البحث عن الزر النشط داخل السايدبار لإعطائه التوهج الذهبي
    document.querySelectorAll('.sidebar-btn').forEach(btn => {
        if(btn.getAttribute('onclick').includes(screenId)) {
            btn.classList.add('active');
        }
    });
}
