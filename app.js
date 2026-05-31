// 📆 ضبط تاريخ حماية وانتهاء الفترة التجريبية للمنيو بدقة (السنة-الشهر-اليوم)
const EXPIRATION_DATE = "2026-06-07"; 

// 🔥 معلومات ومفاتيح الربط الفورية المستخرجة من منصة Firebase الخاصة بك لربط نظام المنيو بالكامل
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

// تهيئة المشروع وربطه بالسيرفر الفوري لقاعدة البيانات
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// 🛡️ دالة الحماية الرقمية والتحقق الفوري من صلاحية العقد والاشتراك التجريبي للموقع
function checkValidity() {
    const today = new Date();
    const expDate = new Date(EXPIRATION_DATE);
    
    if (today > expDate) {
        document.body.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; background:#111; color:#fff; font-family:sans-serif; text-align:center; padding:20px; direction:rtl;">
                <div style="font-size:70px; color:#d4af37; margin-bottom:20px;">🔒</div>
                <h2 style="color:#d4af37; margin-bottom:10px;">انتهت الفترة التجريبية للمنيو</h2>
                <p style="color:#aaa; max-width:400px; line-height:1.6; font-size:15px;">عذراً، انتهت المدة المحددة لتجربة النظام البرمجي. يرجى التواصل مع مطور ومصمم النظام لتفعيل الاشتراك السنوي وإعادة تشغيل المنيو فوراً.</p>
                <a href="https://wa.me/964XXXXXXXXXX" style="margin-top:25px; background:#d4af37; color:#111; padding:12px 30px; border-radius:25px; text-decoration:none; font-weight:bold; box-shadow:0 4px 15px rgba(212,175,55,0.3);">تفعيل النظام الآن</a>
            </div>
        `;
        return false;
    }
    return true;
}

// التقاط معطى رقم الطاولة تلقائياً وبشكل مرن من شريط الرابط URL (مثال: ?table=7)
const urlParams = new URLSearchParams(window.location.search);
const tableNumber = urlParams.get('table') || "5"; // الرقم الافتراضي "5" في حال لم يكتب في الرابط

// مصفوفة الحفظ المؤقت لعناصر السلة داخل جهاز العميل
let cart = [];

// دالة إضافة طبق محدد إلى السلة
function addToCart(name, price) {
    if (!checkValidity()) return;

    const existingItem = cart.find(item => item.name === name);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ name: name, price: price, quantity: 1 });
    }
    updateCartUI();
}

// دالة تعديل الكميات بـ (+) أو (-) من داخل مودال المراجعة
function updateQuantity(name, amount) {
    const item = cart.find(item => item.name === name);
    if (item) {
        item.quantity += amount;
        if (item.quantity <= 0) {
            cart = cart.filter(i => i.name !== name);
        }
    }
    updateCartUI();
}

// تحديث واجهات السلة الحسابية والأشرطة العائمة
function updateCartUI() {
    const cartBar = document.getElementById('cartBar');
    const cartCount = document.getElementById('cartCount');
    const cartTotal = document.getElementById('cartTotal');
    const container = document.getElementById('modalItemsContainer');
    const modalTotal = document.getElementById('modalTotal');

    let totalItems = 0;
    let totalPrice = 0;
    container.innerHTML = '';

    cart.forEach(item => {
        totalItems += item.quantity;
        totalPrice += (item.price * item.quantity);

        container.innerHTML += `
            <div class="cart-item-row">
                <div>
                    <div style="font-weight:600; color:#fff;">${item.name}</div>
                    <div style="color:#888; font-size:13px;">${item.price.toLocaleString()} د.ع</div>
                </div>
                <div class="qty-controls">
                    <button class="qty-btn" onclick="updateQuantity('${item.name}', -1)">-</button>
                    <span style="font-weight:bold; min-width:20px; text-align:center;">${item.quantity}</span>
                    <button class="qty-btn" onclick="updateQuantity('${item.name}', 1)">+</button>
                </div>
            </div>
        `;
    });

    cartCount.innerText = totalItems;
    cartTotal.innerText = totalPrice.toLocaleString() + " د.ع";
    modalTotal.innerText = totalPrice.toLocaleString() + " د.ع";

    if (totalItems > 0) {
        cartBar.style.display = 'flex';
    } else {
        cartBar.style.display = 'none';
        toggleModal(false);
    }
}

// دالة إظهار أو إخفاء مودال السلة
function toggleModal(show) {
    document.getElementById('cartModal').style.display = show ? 'flex' : 'none';
}

// 🚀 الدالة الكبرى: شحن وإرسال الطلب الفعلي لقاعدة بيانات المطبخ الفورية بضغطة زر واحدة
function submitFinalOrder() {
    if (!checkValidity()) return;
    if (cart.length === 0) return;

    // حساب المجموع النهائي للأكلات المراد طلبها
    let totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // إنشاء معرّف فرعي ومميز غير قابل للتكرار للطلب على السيرفر
    const orderId = database.ref().child('orders').push().key;

    // تجميع مصفوفة البيانات لإرسالها دفعة واحدة للمطعم
    const orderData = {
        orderId: orderId,
        table: tableNumber,
        items: cart,
        total: totalPrice.toLocaleString(),
        time: new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' }),
        status: "جديد"
    };

    // رفع الداتا فورياً إلى عقدة Firebase
    database.ref('orders/' + orderId).set(orderData)
        .then(() => {
            alert("🏆 تم إرسال طلبك بنجاح وجاري تحضيره في المطبخ الآن! رقم الطاولة: " + tableNumber);
            cart = []; // تصفير السلة فوراً منعاً للتكرار
            updateCartUI();
        })
        .catch((error) => {
            alert("عذراً، فشل الاتصال بالسيرفر. يرجى المحاولة مرة أخرى.");
        });
}

// فحص أمني استباقي ومباشر بمجرد إقلاع وتشغيل السكريبت في المتصفح
checkValidity();
