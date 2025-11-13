let currentModalProductId = null;
window.cart = []; // Exponemos el carrito al global si es necesario

// Se asume que window.els, window.productsData, window.formatCOP, etc.,
// han sido definidos por firebase-logic.js

function openModal(id) {
    // Usamos window.productsData que fue expuesto por firebase-logic.js
    const p = window.productsData.find(prod => prod.id === id); 
    if (!p) return;

    currentModalProductId = p.id;

    const imgUrl = window.convertDriveLink(p.imageUrl);
    const modalImg = document.getElementById('modal-image');
    const modalIconPlaceholder = document.getElementById('modal-icon-placeholder');

    if (imgUrl) {
        modalImg.src = imgUrl;
        modalImg.classList.remove('hidden');
        modalIconPlaceholder.classList.add('hidden');
        modalImg.onerror = () => {
            modalImg.classList.add('hidden');
            modalIconPlaceholder.classList.remove('hidden');
        };
    } else {
        modalImg.classList.add('hidden');
        modalIconPlaceholder.classList.remove('hidden');
    }

    document.getElementById('modal-icon').textContent = window.getIcon(p.area);
    document.getElementById('modal-icon-bg').textContent = window.getIcon(p.area);
    document.getElementById('modal-category').textContent = p.area;
    document.getElementById('modal-name').textContent = p.name;
    document.getElementById('modal-price').textContent = window.formatCOP(p.price);
    document.getElementById('modal-description').textContent = p.description || "Sin descripción disponible.";
    document.getElementById('modal-color-text').textContent = p.color || "N/A";
    document.getElementById('modal-stock-count').textContent = `${p.stock !== undefined ? p.stock : '?'} unidades`;

    const badge = document.getElementById('modal-stock-badge');
    const addBtn = document.getElementById('add-to-cart-btn');

    // Si no hay info de stock (ej. en modo offline básico), asumimos que hay
    const stock = p.stock !== undefined ? p.stock : 10;

    if (stock > 0) {
        badge.className = "flex items-center text-xs font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full";
        badge.innerHTML = '<i class="fas fa-check-circle mr-1.5"></i> En Stock';
        addBtn.disabled = false;
        addBtn.innerHTML = '<i class="fas fa-cart-plus mr-3"></i> <span>Añadir al Pedido</span>';
        addBtn.classList.remove('bg-gray-300', 'cursor-not-allowed', 'text-gray-500');
        addBtn.classList.add('bg-text-dark', 'text-white', 'hover:bg-primary');
    } else {
        badge.className = "flex items-center text-xs font-bold text-red-700 bg-red-100 px-3 py-1 rounded-full";
        badge.innerHTML = '<i class="fas fa-times-circle mr-1.5"></i> Agotado';
        addBtn.disabled = true;
        addBtn.innerHTML = '<span>Agotado Temporalmente</span>';
        addBtn.classList.remove('bg-text-dark', 'text-white', 'hover:bg-primary');
        addBtn.classList.add('bg-gray-300', 'cursor-not-allowed', 'text-gray-500');
    }

    document.getElementById('modal-quantity').value = 1;

    window.els.modal.classList.remove('hidden');
    window.els.modal.classList.add('flex');
    setTimeout(() => {
        window.els.modalContent.classList.remove('scale-95', 'opacity-0');
        window.els.modalContent.classList.add('scale-100', 'opacity-100');
    }, 10);
    document.body.classList.add('overflow-hidden');
}

function closeModal() {
    window.els.modalContent.classList.remove('scale-100', 'opacity-100');
    window.els.modalContent.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        window.els.modal.classList.add('hidden');
        window.els.modal.classList.remove('flex');
        // Quitar overflow solo si no hay otro modal/sidebar abierto
        if (window.els.cartSidebar.classList.contains('open') === false) document.body.classList.remove('overflow-hidden');
        document.getElementById('modal-image').src = '';
    }, 200);
}

function adjustModalQuantity(change) {
    const input = document.getElementById('modal-quantity');
    let val = parseInt(input.value) + change;
    if (val < 1) val = 1;
    // Usamos window.productsData que fue expuesto por firebase-logic.js
    const p = window.productsData.find(prod => prod.id === currentModalProductId); 
    const stock = (p && p.stock !== undefined) ? p.stock : 99;
    if (val > stock) val = stock;
    input.value = val;
}

function addToCartFromModal() {
    if (!currentModalProductId) return;
    const qty = parseInt(document.getElementById('modal-quantity').value);
    // Usamos window.productsData que fue expuesto por firebase-logic.js
    const p = window.productsData.find(prod => prod.id === currentModalProductId); 

    if (!p) return;

    const stock = (p.stock !== undefined) ? p.stock : 99;
    const existing = window.cart.find(item => item.id === p.id);

    if (existing) {
        if (existing.quantity + qty <= stock) {
            existing.quantity += qty;
        } else {
            alert(`¡Solo quedan ${stock} unidades disponibles!`);
            return;
        }
    } else {
        window.cart.push({ ...p, quantity: qty });
    }

    updateCartUI();
    closeModal();
    openCart();
    if (navigator.vibrate) navigator.vibrate(50);
}

function updateCartUI() {
    const totalQty = window.cart.reduce((sum, i) => sum + i.quantity, 0);
    window.els.cartCount.textContent = totalQty;
    window.els.cartCount.classList.toggle('hidden', totalQty === 0);
    if (totalQty > 0) {
        window.els.cartCount.classList.add('animate-bounce');
        setTimeout(() => window.els.cartCount.classList.remove('animate-bounce'), 1000);
    }

    const totalValue = window.cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    // Usamos window.formatCOP que fue expuesto por firebase-logic.js
    window.els.cartTotal.textContent = window.formatCOP(totalValue); 

    if (window.cart.length === 0) {
        window.els.cartItems.innerHTML = `
            <div class="flex flex-col items-center justify-center h-64 text-gray-400 opacity-70">
                <i class="fas fa-shopping-basket text-6xl mb-4"></i>
                <p>Tu bolsa está vacía</p>
            </div>
        `;
        document.getElementById('whatsapp-order-btn').disabled = true;
    } else {
        window.els.cartItems.innerHTML = window.cart.map(item => `
            <div class="flex items-center bg-white p-3 rounded-xl shadow-sm border-l-4 border-primary animate-[fadeIn_0.3s_ease-out]">
                <div class="w-12 h-12 bg-secondary text-xl flex items-center justify-center rounded-lg mr-3 shrink-0 overflow-hidden">
                    ${item.imageUrl ? `<img src="${window.convertDriveLink(item.imageUrl)}" class="w-full h-full object-cover" onerror="this.style.display='none'; this.nextElementSibling.style.display='inline'">` : ''}
                    <span class="${item.imageUrl ? 'hidden' : ''}">${window.getIcon(item.area)}</span>
                </div>
                <div class="flex-grow min-w-0">
                    <h4 class="font-bold text-text-dark truncate text-sm">${item.name}</h4>
                    <p class="text-xs text-primary font-medium">${window.formatCOP(item.price)} x ${item.quantity}</p>
                </div>
                <div class="flex items-center bg-gray-50 rounded-lg border border-gray-100 ml-2">
                    <button onclick="updateCartQty('${item.id}', -1)" class="px-2 py-1 text-gray-400 hover:text-primary">-</button>
                    <span class="w-5 text-center font-bold text-xs">${item.quantity}</span>
                    <button onclick="updateCartQty('${item.id}', 1)" class="px-2 py-1 text-gray-400 hover:text-primary">+</button>
                </div>
                 <button onclick="removeFromCart('${item.id}')" class="ml-3 text-gray-300 hover:text-red-500 transition p-1">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `).join('');
        document.getElementById('whatsapp-order-btn').disabled = false;
    }
}

function updateCartQty(id, change) {
    const item = window.cart.find(i => i.id === id);
    if (!item) return;
    // Usamos window.productsData que fue expuesto por firebase-logic.js
    const productOriginal = window.productsData.find(p => p.id === id); 
    const maxStock = (productOriginal && productOriginal.stock !== undefined) ? productOriginal.stock : 99;

    const newQty = item.quantity + change;
    if (newQty > maxStock) {
        alert("Máximo stock disponible alcanzado.");
        return;
    }
    if (newQty <= 0) {
        removeFromCart(id);
    } else {
        item.quantity = newQty;
        updateCartUI();
    }
}

function removeFromCart(id) {
    window.cart = window.cart.filter(i => i.id !== id);
    updateCartUI();
}

function openCart() {
    window.els.cartSidebar.classList.add('open');
    window.els.cartOverlay.classList.add('open');
    document.body.classList.add('overflow-hidden');
}
function closeCart() {
    window.els.cartSidebar.classList.remove('open');
    window.els.cartOverlay.classList.remove('open');
    // Quitar overflow solo si no hay otro modal/sidebar abierto
    if (window.els.modal.classList.contains('hidden')) document.body.classList.remove('overflow-hidden');
}
function closeAllOverlays() {
    closeCart();
    closeModal();
    // Usamos window.toggleFilters que fue expuesto por firebase-logic.js
    if (window.toggleFilters) window.toggleFilters(false); 
}

function generateWhatsAppLink() {
    if (window.cart.length === 0) return;
    const phone = "573188401247";
    let msg = "Hola Euforia Boutique! ✨ Quiero realizar el siguiente pedido:\n\n";
    window.cart.forEach(item => {
        msg += `*${item.quantity}x* ${item.name} — ${window.formatCOP(item.price * item.quantity)}\n`;
    });
    const total = window.cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    msg += `\n*TOTAL A PAGAR: ${window.formatCOP(total)}*\n`;
    msg += "\nQuedo pendiente para coordinar el pago y envío. ¡Gracias!";
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
}

// Exponer funciones necesarias al ámbito global para ser llamadas desde HTML (onclick)
window.openModal = openModal;
window.closeModal = closeModal;
window.adjustModalQuantity = adjustModalQuantity;
window.addToCartFromModal = addToCartFromModal;

window.openCart = openCart;
window.closeCart = closeCart;
window.closeAllOverlays = closeAllOverlays;
window.updateCartQty = updateCartQty;
window.removeFromCart = removeFromCart;
window.generateWhatsAppLink = generateWhatsAppLink;


document.addEventListener('DOMContentLoaded', () => {
    // Si la estructura del HTML ya existe (DOM ready), inicializar la UI del carrito
    updateCartUI(); 

    // Asignar eventos que no están en el HTML inline
    // Esperamos a que window.els se haya cargado desde firebase-logic.js (por DOMContentLoaded)
    if (window.els && window.els.priceRange) {
        document.getElementById('add-to-cart-btn').addEventListener('click', addToCartFromModal);
        document.getElementById('toggle-filters-btn').addEventListener('click', () => window.toggleFilters());
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAllOverlays(); });
    }
});