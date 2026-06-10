// --- تهيئة البيانات الأولية (مؤقتاً عبر LocalStorage لحين تفعيل خدمات Firebase) ---
let items = JSON.parse(localStorage.getItem('items')) || [];
let categories = JSON.parse(localStorage.getItem('categories')) || ['الكل'];
let currentCategory = 'الكل';

// --- الوظيفة الرئيسية لعرض المنيو والتصنيفات ---
function render() {
    // 1. تحديث أزرار الفلترة الأفقية (الخاصة بالموبايل)
    const filterContainer = document.getElementById('filter-buttons');
    if (filterContainer) {
        filterContainer.innerHTML = categories.map(c => {
            const isActive = (c === currentCategory) ? 'active' : '';
            return `<button class="btn-category ${isActive}" onclick="filterMenu('${c}')">${c}</button>`;
        }).join('');
    }
    
    // 2. تحديث القائمة المنسدلة في لوحة الإدارة (مع استبعاد خيار "الكل" هندسياً)
    const select = document.getElementById('itemCat');
    if (select) {
        const formCategories = categories.filter(c => c !== 'الكل');
        select.innerHTML = formCategories.map(c => `<option value="${c}">${c}</option>`).join('');
        if (formCategories.length === 0) {
            select.innerHTML = `<option value="">لا توجد تصنيفات مضافة</option>`;
        }
    }

    // 3. عرض المنتجات بناءً على القسم النشط حالياً
    filterMenu(currentCategory);
}

// --- عرض الأصناف في الصفحة بتصميم متجاوب واحترافي ---
function renderItems(list) {
    const container = document.getElementById('menu-items');
    if (!container) return;

    if (list.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center mx-auto py-5 text-muted">
                <p class="fs-5">لا توجد أصناف متوفرة في هذا القسم حالياً.</p>
            </div>`;
        return;
    }

    container.innerHTML = list.map((item, index) => `
        <div class="col-6 col-md-4 col-lg-3">
            <div class="card product-card h-100">
                <div class="product-img-placeholder">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" class="bi bi-egg-fried" viewBox="0 0 16 16">
                      <path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
                      <path d="M13.997 5.17a5 5 0 0 0-8.101-4.09A5 5 0 0 0 1.28 9.342a5 5 0 0 0 8.336 5.109 3.5 3.5 0 0 0 5.201-4.065 3.001 3.001 0 0 0-.822-5.216zm-1-.034a1 1 0 0 0 .668.977 2.001 2.001 0 0 1 .547 3.478 1 1 0 0 0-.341 1.113 2.5 2.5 0 0 1-3.715 2.905 1 1 0 0 0-1.262.152 4 4 0 0 1-6.67-4.087 1 1 0 0 0-.2-1 4 4 0 0 1 3.693-6.61 1 1 0 0 0 .8-.2 4 4 0 0 1 6.48 3.273z"/>
                    </svg>
                </div>
                <div class="card-body p-3 d-flex flex-column justify-content-between">
                    <h5 class="product-title">${item.name}</h5>
                    <div class="d-flex justify-content-between align-items-center mt-2">
                        <span class="product-price">${Number(item.price).toLocaleString()} د.ع</span>
                    </div>
                    <button class="btn btn-sm btn-outline-danger mt-2 w-100 dynamic-delete-btn" 
                            style="display: ${document.getElementById('admin-panel')?.style.display === 'block' ? 'block' : 'none'};" 
                            onclick="deleteItem(${index})">
                        🗑️ حذف
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// --- وظيفة الفلترة الذكية ---
function filterMenu(cat) {
    currentCategory = cat;
    
    // تحديث نمط الزر النشط بصرياً دون إعادة بناء العناصر لتجنب مشاكل التمرير (Scroll) في الهواتف
    const buttons = document.querySelectorAll('.btn-category');
    buttons.forEach(btn => {
        if (btn.innerText === cat) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    if (cat === 'الكل') {
        renderItems(items);
    } else {
        renderItems(items.filter(i => i.cat === cat));
    }
}

// --- إضافة تصنيف جديد ---
function addCategory() {
    const input = document.getElementById('newCat');
    if (!input) return;

    const val = input.value.trim();
    if (val && !categories.includes(val)) {
        categories.push(val);
        localStorage.setItem('categories', JSON.stringify(categories));
        input.value = '';
        render();
    }
}

// --- إضافة صنف جديد ---
function addItem() {
    const nameInput = document.getElementById('itemName');
    const priceInput = document.getElementById('itemPrice');
    const catSelect = document.getElementById('itemCat');

    if (!nameInput || !priceInput || !catSelect) return;

    const name = nameInput.value.trim();
    const price = priceInput.value.trim();
    const cat = catSelect.value;
    
    if (name && price && cat) {
        items.push({ name, price, cat });
        localStorage.setItem('items', JSON.stringify(items));
        
        // تصفير الحقول بعد نجاح العملية
        nameInput.value = '';
        priceInput.value = '';
        
        render();
    }
}

// --- حذف صنف ---
function deleteItem(index) {
    if (confirm("هل أنت متأكد من رغبتك في حذف هذا الصنف؟")) {
        items.splice(index, 1);
        localStorage.setItem('items', JSON.stringify(items));
        render();
    }
}

// --- نظام حماية لوحة الإدارة ---
function checkAdmin() {
    const pass = prompt("أدخل كلمة مرور الإدارة:");
    if (pass === "123") {
        const panel = document.getElementById('admin-panel');
        if (panel) {
            panel.style.display = 'block';
            
            // إظهار أزرار الحذف المباشرة تحت المنتجات عند فتح لوحة الإدارة
            const deleteButtons = document.querySelectorAll('.dynamic-delete-btn');
            deleteButtons.forEach(btn => btn.style.display = 'block');
            
            window.scrollTo({ top: panel.offsetTop, behavior: 'smooth' });
        }
    } else {
        alert("كلمة المرور غير صحيحة!");
    }
}

// تشغيل النظام عند تحميل الصفحة بالكامل
document.addEventListener('DOMContentLoaded', render);
