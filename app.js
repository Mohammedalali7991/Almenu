// --- ملف هندسة البيانات والمزامنة الفورية للمدير (app.js) ---
let items = [];
let categories = [];
const database = firebase.database();

function render() {
    database.ref('menu_data').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            items = data.items || [];
            categories = data.categories || [];
        } else {
            items = [];
            categories = [];
        }
        updateAdminUI();
    });
}

function updateAdminUI() {
    const select = document.getElementById('itemCat');
    if (select) {
        select.innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join('');
        if (categories.length === 0) select.innerHTML = `<option value="">لا توجد تصنيفات</option>`;
    }

    const tableBody = document.getElementById('admin-table-items');
    if (tableBody) {
        if (items.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" class="text-muted py-3">لا توجد أصناف مضافة حالياً.</td></tr>`;
            return;
        }
        tableBody.innerHTML = items.map((item, index) => `
            <tr>
                <td class="fw-bold">${item.name}</td>
                <td><span class="badge bg-secondary px-2 py-1">${item.cat}</span></td>
                <td class="text-primary fw-bold">${Number(item.price).toLocaleString()} د.ع</td>
                <td>
                    <button class="btn btn-sm btn-danger px-3" onclick="deleteItem(${index})">🗑️ حذف</button>
                </td>
            </tr>
        `).join('');
    }
}

function addCategory() {
    const input = document.getElementById('newCat');
    if (!input) return;
    const val = input.value.trim();

    if (val && !categories.includes(val)) {
        categories.push(val);
        database.ref('menu_data/categories').set(categories).then(() => { input.value = ''; });
    }
}

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
        database.ref('menu_data/items').set(items).then(() => {
            nameInput.value = ''; priceInput.value = '';
        });
    }
}

function deleteItem(index) {
    if (confirm("هل أنت متأكد من رغبتك في حذف هذا الصنف نهائياً؟")) {
        items.splice(index, 1);
        database.ref('menu_data/items').set(items);
    }
}

document.addEventListener('DOMContentLoaded', render);
