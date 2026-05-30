let cart = {};
let totalCartPrice = 0;

let currentItemType = ''; 
let currentItemName = '';
let currentBasePrice = 0;

function switchCategory(categoryId) {
    document.querySelectorAll('.menu-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(categoryId).classList.add('active');
    event.currentTarget.classList.add('active');
}

// التحكم المباشر من أزرار + و - في الواجهة الرئيسية
function updateQtyDirect(name, price, change) {
    if (!cart[name]) {
        cart[name] = { qty: 0, price: price, baseName: name };
    }
    cart[name].qty += change;
    if (cart[name].qty <= 0) {
        delete cart[name];
        if(document.getElementById(`qty-${name}`)) document.getElementById(`qty-${name}`).innerText = 0;
    } else {
        if(document.getElementById(`qty-${name}`)) document.getElementById(`qty-${name}`).innerText = cart[name].qty;
    }
    recalculateTotal();
}

// فتح نافذة التخصيص التلقائي عند الضغط على كرت الصنف
function openCustomization(type, name, price) {
    currentItemType = type;
    currentItemName = name;
    currentBasePrice = price;

    document.getElementById('customItemTitle').innerText = `تخصيص سريع: ${name}`;
    const container = document.getElementById('dynamicOptionsContainer');
    container.innerHTML = '';

    if (type === 'food') {
        container.innerHTML = `
            <div class="option-group">
                <div class="option-group-title">تعديلات المكونات السريعة</div>
                <div class="option-item"><label><input type="checkbox" id="optNoOnion"> بدون بصل 🧅</label></div>
                <div class="option-item"><label><input type="checkbox" id="optNoTomato"> بدون طماطم 🍅</label></div>
            </div>
            <div class="option-group">
                <div class="option-group-title">إضافات مدفوعة</div>
                <div class="option-item">
                    <label><input type="checkbox" id="optExtraCheese" data-price="1500"> زيادة جبنة 🧀</label>
                    <span style="color:var(--primary-color)">+ 1,500 د.ع</span>
                </div>
            </div>
        `;
    } else if (type === 'drink') {
        container.innerHTML = `
            <div class="option-group">
                <div class="option-group-title">مستوى السكر الأساسي</div>
                <div class="option-item"><label><input type="radio" name="sugarLevel" value="بدون سكر" checked> بدون سكر ❌</label></div>
                <div class="option-item"><label><input type="radio" name="sugarLevel" value="سكر وسط"> سكر وسط 🍬</label></div>
            </div>
        `;
    }
    document.getElementById('customPopup').style.display = 'flex';
}

function saveCustomization() {
    let modifications = [];
    let calculatedPrice = currentBasePrice;

    if (currentItemType === 'food') {
        if (document.getElementById('optNoOnion').checked) modifications.push("بدون بصل");
        if (document.getElementById('optNoTomato').checked) modifications.push("بدون طماطم");
        let extraCheese = document.getElementById('optExtraCheese');
        if (extraCheese.checked) {
            modifications.push("زيادة جبنة");
            calculatedPrice += parseInt(extraCheese.getAttribute('data-price'));
        }
    } else if (currentItemType === 'drink') {
        let sugar = document.querySelector('input[name="sugarLevel"]:checked').value;
        modifications.push(sugar);
    }

    let uniqueCartKey = currentItemName + (modifications.length ? ` [${modifications.join(' - ')}]` : '');

    if (!cart[uniqueCartKey]) {
        cart[uniqueCartKey] = { qty: 0, price: calculatedPrice, baseName: currentItemName };
    }
    cart[uniqueCartKey].qty += 1;

    // تحديث رقم العداد على الواجهة للاسم الأساسي
    if(document.getElementById(`qty-${currentItemName}`)) {
        let currentQty = parseInt(document.getElementById(`qty-${currentItemName}`).innerText);
        document.getElementById(`qty-${currentItemName}`).innerText = currentQty + 1;
    }

    closePopup('customPopup');
    recalculateTotal();
}

function recalculateTotal() {
    totalCartPrice = 0;
    for (let item in cart) {
        totalCartPrice += cart[item].qty * cart[item].price;
    }
    document.getElementById('footerTotal').innerText = totalCartPrice.toLocaleString() + " د.ع";
}

function openCartPopup() {
    const listContainer = document.getElementById('cartItemsList');
    const notesWrapper = document.getElementById('notesWrapper');
    listContainer.innerHTML = '';
    
    if (Object.keys(cart).length === 0) {
        listContainer.innerHTML = '<p style="text-align:center; padding:20px; color:var(--text-muted);">السلة فارغة حالياً.</p>';
        document.getElementById('finalConfirmBtn').style.display = 'none';
        notesWrapper.style.display = 'none';
    } else {
        document.getElementById('finalConfirmBtn').style.display = 'block';
        notesWrapper.style.display = 'block'; // إظهار الملاحظات تحت الطلب والأسعار مباشرة
        
        for (let item in cart) {
            let itemTotal = cart[item].qty * cart[item].price;
            listContainer.innerHTML += `
                <div class="cart-item">
                    <div>
                        <h4>${item}</h4>
                        <p>${cart[item].qty} × ${cart[item].price.toLocaleString()} د.ع</p>
                    </div>
                    <div style="display:flex; align-items:center; gap:15px;">
                        <span style="font-weight:700;">${itemTotal.toLocaleString()} د.ع</span>
                        <button class="delete-btn" onclick="deleteCartItem('${item}')">حذف 🗑️</button>
                    </div>
                </div>
            `;
        }
    }
    document.getElementById('cartPopup').style.display = 'flex';
}

function deleteCartItem(itemKey) {
    let baseName = cart[itemKey].baseName;
    delete cart[itemKey];
    if(document.getElementById(`qty-${baseName}`)) {
        document.getElementById(`qty-${baseName}`).innerText = 0;
    }
    recalculateTotal();
    openCartPopup();
}

function submitFinalOrder() {
    const notes = document.getElementById('generalNotes').value;
    closePopup('cartPopup');
    const trackingBar = document.getElementById('trackingBar');
    trackingBar.style.display = 'block';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    alert(`تم تأكيد الطلب الفعلي بنجاح!\nالملاحظات المرسلة: "${notes || 'لا يوجد'}"`);
    
    setTimeout(() => {
        document.getElementById('step2').classList.add('active');
        document.getElementById('trackingStatus').innerText = "قيد التحضير في المطبخ";
    }, 3000);
}

function closePopup(popupId) { document.getElementById(popupId).style.display = 'none'; }

