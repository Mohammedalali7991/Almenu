// مفاتيح الاتصال الموحدة والآمنة الخاصة بالنظام السحابي للمطعم
const firebaseConfig = {
    apiKey: "AIzaSyCEk80-ag9mv5JP9LRBZTq1_qiVKcwUQKQ",
    authDomain: "almenu-system.firebaseapp.com",
    databaseURL: "https://almenu-system-default-rtdb.firebaseio.com",
    projectId: "almenu-system",
    storageBucket: "almenu-system.firebasestorage.app",
    messagingSenderId: "259548428040",
    appId: "1:259548428040:web:8d156f73ed55cec3cadebd",
    measurementId: "G-EL9GDKQ0KV"
};

// تهيئة قاعدة البيانات الفورية للمشروع
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// مصفوفة الاحتفاظ بعناصر السلة ومحدد رقم الطاولة التلقائي
let cart = [];
let tableNumber = "خارجية";

// 1. وظيفة التقاط رقم الطاولة تلقائياً من روابط الـ QR الذكية فور تحميل الصفحة
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tableParam = urlParams.get('table');
    
    if (tableParam) {
        tableNumber = tableParam;
        document.getElementById('table-display').innerText = "طاولة رقم: " + tableNumber;
    } else {
        document.getElementById('table-display').innerText = "تم الدخول كطلب سفري / خارجي";
    }
});

// دالة تخطي شاشة البداية والدخول للمنيو الرئيسي
function enterMenu() {
    document.getElementById('welcome-screen').style.setProperty('display', 'none', 'important');
}

// 2. إدارة وظائف سلة التسوق الذكية بالكامل (إضافة وتعديل الأعداد)
function addToCart(name, price) {
    const existingItem = cart.find(item => item.name === name);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ name: name, price: price, quantity: 1 });
    }
    updateCartUI();
}

function changeQuantity(name, amount) {
    const item = cart.find(item => item.name === name);
    if (item) {
        item.quantity += amount;
        if (item.quantity <= 0) {
            cart = cart.filter(i => i.name !== name);
        }
    }
    updateCartUI();
}

// 3. تحديث واجهة المستخدم وحساب المجاميع الرياضية تلقائياً للسلة والشريط السفلي
function updateCartUI() {
    let totalItems = 0;
    let totalPrice = 0;
    const container = document.getElementById('cartItemsContainer');
    container.innerHTML = '';

    cart.forEach(item => {
        totalItems += item.quantity;
        totalPrice += (item.price * item.quantity);

        const row = document.createElement('div');
        row.className = 'cart-item-row';
        row.innerHTML = `
            <div>
                <div style="font-weight:bold; color:#fff;">${item.name}</div>
                <div style="color:#d4af37; font-size:14px; margin-top:4px;">${(item.price * item.quantity).toLocaleString()} د.ع</div>
            </div>
            <div class="qty-controls">
                <button class="btn-qty" onclick="changeQuantity('${item.name}', -1)">-</button>
                <span class="qty-num">${item.quantity}</span>
                <button class="btn-qty" onclick="changeQuantity('${item.name}', 1)">+</button>
            </div>
        `;
        container.appendChild(row);
    });

    // تحديث الأرقام المعروضة في شريط المنيو والنافذة المنبثقة
    document.getElementById('cart-bar-count').innerText = "عدد العناصر: " + totalItems;
    document.getElementById('cart-bar-total').innerText = totalPrice.toLocaleString() + " د.ع";
    document.getElementById('modal-total-price').innerText = totalPrice.toLocaleString() + " د.ع";
}

function toggleCartModal(show) {
    document.getElementById('cartModal').style.display = show ? 'flex' : 'none';
}

// 4. دالة الحفظ السحابي وإرسال الطلب المباشر للمطبخ مع التنبيه الفوري الصوتي واللحظي
function submitOrderToFirebase() {
    if (cart.length === 0) {
        alert("سلتك فارغة حالياً! قم بإضافة الأطباق أولاً قبل الإرسال.");
        return;
    }

    // حساب إجمالي السعر بصيغة نصية مرتبة
    let finalPrice = 0;
    cart.forEach(item => finalPrice += (item.price * item.quantity));

    // صياغة الوقت الحالي بنظام محلي دقيق للمطعم
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' });

    // هيكلة بيانات كارت الطلب لإرساله للـ Realtime Database
    const orderData = {
        table: tableNumber,
        items: cart,
        total: finalPrice.toLocaleString(),
        time: timeStr,
        status: "جديد"
    };

    // دفع الداتا السحابية الفورية للسيرفر الرئيسي لرفع التنبيه فوراً لشاشة المطبخ
    database.ref('orders').push(orderData)
        .then(() => {
            alert("تم إرسال طلبك الفعلي بنجاح! 👨‍🍳 المطبخ يقوم بتجهيزه الآن وبسرعة.");
            cart = []; // إفراغ السلة تلقائياً لفتح مجال لطلبات جديدة
            updateCartUI();
            toggleCartModal(false);
        })
        .catch(error => {
            alert("حدث خطأ برمي في إيصال الطلب السحابي: " + error.message);
        });
}
