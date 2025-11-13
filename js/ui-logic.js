// --- ESTADO GLOBAL UI ---
let cart = [];
let currentModalProductId = null;

// Referencias DOM
const els = {
    cartSidebar: document.getElementById('cart-sidebar'),
    cartOverlay: document.getElementById('cart-overlay'),
    cartItems: document.getElementById('cart-items-container'),
    cartTotal: document.getElementById('cart-total'),
    cartCount: document.getElementById('cart-count'),
    modal: document.getElementById('product-modal'),
    modalContent: document.getElementById('modal-content'),
    addBtn: document.getElementById('add-to-cart-btn')
};

// --- RENDERIZADO DE PRODUCTOS (Depende de las variables globales de firebase-logic.js) ---

window.renderProducts = () => {
    // La data a renderizar ya incluye el filtrado
    const dataToRender = window.productsData || [];

    const filtered = dataToRender.filter(p => {
        const areaOk = window.filters.areas.length === 0 || window.filters.areas.includes(p.area);
        const priceOk = p.price <= window.filters.maxPrice;
        return areaOk && priceOk;
    });

    if (filtered.length === 0) {
        window.els.grid.classList.add('hidden');
        window.els.noResults.classList.remove('hidden');
        return;
    }

    window.els.grid.classList.remove('hidden');
    window.els.noResults.classList.add('hidden');

    window.els.grid.innerHTML = filtered.map(p => {
        // Usa la función CORREGIDA de la lógica de Firebase
        const imgUrl = window.convertDriveLink(p.imageUrl);
        const imageHTML = imgUrl
            ? `<img src="${imgUrl}" alt="${p.name}" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" onerror="this.onerror=null; this.parentElement.innerHTML='<span class=\\'text-6xl sm:text-7xl transition-transform duration-500 group-hover:scale-110\\'>${window.getIcon(p.area)}</span>'">`
            : `<span class="text-6xl sm:text-7xl transition-transform duration-500 group-hover:scale-110">${window.getIcon(p.area)}</span>`;

        return `
            <div class="product-card bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl border border-gray-100 cursor-pointer group" onclick="openModal('${p.id}')">
                <div class="h-48 sm:h-56 bg-secondary/50 flex items-center justify-center relative overflow-hidden">
                    ${imageHTML}
                    ${(p.stock && p.stock < 10) ? `<span class="absolute top-3 right-3 bg-accent text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider shadow-sm">¡Últimas uds!</span>` : ''}
                </div>
                <div class="p-4 sm:p-5">
                    <p class="text-xs font-bold text-primary/70 uppercase tracking-wider mb-1 flex items-center">
                        ${window.getIcon(p.area)} <span class="ml-1">${p.area}</span>
                    </p>
                    <h3 class="font-bold text-text-dark text-base sm:text-lg leading-tight line-clamp-2 h-11 sm:h-14">${p.name}</h3>
                    <div class="flex items-center justify-between mt-3 sm:mt-4">
                        <span class="text-xl sm:text-2xl font-extrabold text-primary">${window.formatCOP(p.price)}</span>
                        <button class="w-10 h-10 bg-secondary text-primary rounded-full flex items-center justify-center hover:bg-primary hover:text-white transition-colors shadow-sm active:scale-95">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
            </div>
        `}).join('');
};

// --- LÓGICA DE MODALES Y CARRITO (Expuesta globalmente) ---

window.openModal = (id) => {
    const p = window.productsData.find(prod => prod.id === id);
    if (!p) return;

    currentModalProductId = p.id;

    const modalImg = document.getElementById('modal-image');
    const modalIconPlaceholder = document.getElementById('modal-icon-placeholder');
    const imgUrl = window.convertDriveLink(p.imageUrl); // Usa la función corregida

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
    const stock = p.stock !== undefined ? p.stock : 10;

    if (stock > 0) {
        badge.className = "flex items-center text-xs font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full";
        badge.innerHTML = '<i class="fas fa-check-circle mr-1.5"></i> En Stock';
        els.addBtn.disabled = false;
        els.addBtn.innerHTML = '<i class="fas fa-cart-plus mr-3"></i> <span>Añadir al Pedido</span>';
        els.addBtn.classList.remove('bg-gray-300', 'cursor-not-allowed', 'text-gray-500');
        els.addBtn.classList.add('bg-text-dark', 'text-white', 'hover:bg-primary');
    } else {
        badge.className = "flex items-center text-xs font-bold text-red-700 bg-red-100 px-3 py-1 rounded-full";
        badge.innerHTML = '<i class="fas fa-times-circle mr-1.5"></i> Agotado';
        els.addBtn.disabled = true;
        els.addBtn.innerHTML = '<span>Agotado Temporalmente</span>';
        els.addBtn.classList.remove('bg-text-dark', 'text-white', 'hover:bg-primary');
        els.addBtn.classList.add('bg-gray-300', 'cursor-not-allowed', 'text-gray-500');
    }

    document.getElementById('modal-quantity').value = 1;

    els.modal.classList.remove('hidden');
    els.modal.classList.add('flex');
    setTimeout(() => {
        els.modalContent.classList.remove('scale-95', 'opacity-0');
        els.modalContent.classList.add('scale-100', 'opacity-100');
    }, 10);
    document.body.classList.add('overflow-hidden');
}

window.closeModal = () => {
    els.modalContent.classList.remove('scale-100', 'opacity-100');
    els.modalContent.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
        els.modal.classList.add('hidden');
        els.modal.classList.remove('flex');
        if (els.cartSidebar.classList.contains('open') === false) document.body.classList.remove('overflow-hidden');
        document.getElementById('modal-image').src = '';
    }, 200);
}

window.adjustModalQuantity = (change) => {
    const input = document.getElementById('modal-quantity');
    let val = parseInt(input.value) + change;
    if (val < 1) val = 1;
    const p = window.productsData.find(prod => prod.id === currentModalProductId);
    const stock = (p && p.stock !== undefined) ? p.stock : 99;
    if (val > stock) val = stock;
    input.value = val;
}

function addToCartFromModal() {
    if (!currentModalProductId) return;
    const qty = parseInt(document.getElementById('modal-quantity').value);
    const p = window.productsData.find(prod => prod.id === currentModalProductId);

    if (!p) return;

    const stock = (p.stock !== undefined) ? p.stock : 99;
    const existing = cart.find(item => item.id === p.id);

    if (existing) {
        if (existing.quantity + qty <= stock) {
            existing.quantity += qty;
        } else {
            alert(`¡Solo quedan ${stock} unidades disponibles!`);
            return;
        }
    } else {
        cart.push({ ...p, quantity: qty });
    }

    updateCartUI();
    window.closeModal();
    window.openCart();
    if (navigator.vibrate) navigator.vibrate(50);
}

function updateCartUI() {
    const totalQty = cart.reduce((sum, i) => sum + i.quantity, 0);
    els.cartCount.textContent = totalQty;
    els.cartCount.classList.toggle('hidden', totalQty === 0);
    if (totalQty > 0) {
        els.cartCount.classList.add('animate-bounce');
        setTimeout(() => els.cartCount.classList.remove('animate-bounce'), 1000);
    }

    const totalValue = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    els.cartTotal.textContent = window.formatCOP(totalValue);

    const whatsappBtn = document.getElementById('whatsapp-order-btn');

    if (cart.length === 0) {
        els.cartItems.innerHTML = `
            <div class="flex flex-col items-center justify-center h-64 text-gray-400 opacity-70">
                <i class="fas fa-shopping-basket text-6xl mb-4"></i>
                <p>Tu bolsa está vacía</p>
            </div>
        `;
        whatsappBtn.disabled = true;
    } else {
        els.cartItems.innerHTML = cart.map(item => `
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
        whatsappBtn.disabled = false;
    }
}

window.updateCartQty = (id, change) => {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    const productOriginal = window.productsData.find(p => p.id === id);
    const maxStock = (productOriginal && productOriginal.stock !== undefined) ? productOriginal.stock : 99;

    const newQty = item.quantity + change;
    if (newQty > maxStock) {
        alert("Máximo stock disponible alcanzado.");
        return;
    }
    if (newQty <= 0) {
        window.removeFromCart(id);
    } else {
        item.quantity = newQty;
        updateCartUI();
    }
}

window.removeFromCart = (id) => {
    cart = cart.filter(i => i.id !== id);
    updateCartUI();
}

window.openCart = () => {
    els.cartSidebar.classList.add('open');
    els.cartOverlay.classList.add('open');
    document.body.classList.add('overflow-hidden');
    updateCartUI(); // Asegura que el contenido esté actualizado al abrir
}

window.closeCart = () => {
    els.cartSidebar.classList.remove('open');
    els.cartOverlay.classList.remove('open');
    if (els.modal.classList.contains('hidden')) document.body.classList.remove('overflow-hidden');
}

window.closeAllOverlays = () => {
    window.closeCart();
    window.closeModal();
    if (window.toggleFilters) window.toggleFilters(false);
}

window.generateWhatsAppLink = () => {
    if (cart.length === 0) return;
    const phone = "573188401247";
    let msg = "Hola Euforia Boutique! ✨ Quiero realizar el siguiente pedido:\n\n";
    cart.forEach(item => {
        msg += `*${item.quantity}x* ${item.name} — ${window.formatCOP(item.price * item.quantity)}\n`;
    });
    const total = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    msg += `\n*TOTAL A PAGAR: ${window.formatCOP(total)}*\n`;
    msg += "\nQuedo pendiente para coordinar el pago y envío. ¡Gracias!";
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
}

document.addEventListener('DOMContentLoaded', () => {
    els.addBtn.addEventListener('click', addToCartFromModal);
    document.getElementById('toggle-filters-btn').addEventListener('click', () => window.toggleFilters());
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') window.closeAllOverlays(); });
});