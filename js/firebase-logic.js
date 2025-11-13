// Importar funciones necesarias de Firebase SDK (versión modular v9+)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, addDoc, query, orderBy, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// --- CONFIGURACIÓN ---
const firebaseConfig = {
    apiKey: "AIzaSyD2nCryUttIjg3HaY9-r44rIZsDP1mLB5w",
    authDomain: "euforia-inv.firebaseapp.com",
    projectId: "euforia-inv",
    storageBucket: "euforia-inv.firebasestorage.app",
    messagingSenderId: "687723551803",
    appId: "1:687723551803:web:a2a7b50fd78083883e501e",
    measurementId: "G-CSMDCL57X6"
};

const appId = 'euforia';

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Referencia a la colección de productos. 
const productsCollectionPath = `/artefactos/${appId}/público/datos/productos`;


// --- ESTADO GLOBAL ---
// Estas variables se exponen al objeto global (window) para que script.js pueda acceder a ellas.
window.productsData = [];
window.filters = { areas: [], maxPrice: 300000 };
window.isOfflineMode = false;

// --- DATA QUEMADA (BACKUP) ---
const BACKUP_PRODUCTS = [
    { id: 'bk1', name: "Sérum Iluminador Vitamina C", price: 119900, area: "Skincare", color: "Transparente", stock: 15, description: "Potente fórmula con 15% Vitamina C pura. Combate radicales libres e ilumina visiblemente la piel desde el primer uso.", imageUrl: "" },
    { id: 'bk2', name: "Hydro-Boost Ácido Hialurónico", price: 159000, area: "Skincare", color: "Blanco Nube", stock: 18, description: "Hidratación profunda 72 horas.", imageUrl: "" },
    { id: 'bk3', name: "Base 'Second Skin' Matte", price: 89900, area: "Rostro", color: "Beige Neutro", stock: 22, description: "Cobertura construible de media a alta con acabado mate aterciopelado.", imageUrl: "" },
    { id: 'bk4', name: "Paleta Sombras 'Euforia Night'", price: 105000, area: "Ojos", color: "Multitono", stock: 8, description: "12 tonos ultra-pigmentados para looks infinitos.", imageUrl: "" },
    { id: 'bk5', name: "Labial Líquido 'Velvet Kiss'", price: 59900, area: "Labios", color: "Rosa Cereza", stock: 30, description: "Textura mousse que seca en un mate cómodo.", imageUrl: "" }
];

// --- REFERENCIAS DOM (Exponemos al global para acceso más fácil en script.js) ---
window.els = {
    grid: document.getElementById('product-grid'),
    skeleton: document.getElementById('loading-skeleton'),
    cartSidebar: document.getElementById('cart-sidebar'),
    cartOverlay: document.getElementById('cart-overlay'),
    cartItems: document.getElementById('cart-items-container'),
    cartTotal: document.getElementById('cart-total'),
    cartCount: document.getElementById('cart-count'),
    modal: document.getElementById('product-modal'),
    modalContent: document.getElementById('modal-content'),
    filterSidebar: document.getElementById('filter-sidebar'),
    filterCategories: document.getElementById('filter-categories'),
    noResults: document.getElementById('no-results'),
    priceRange: document.getElementById('price-range'),
    priceValue: document.getElementById('price-value'),
    offlineBadge: document.getElementById('offline-mode-badge')
};

// --- UTILIDADES FORMATO (Exponemos al global) ---
window.formatCOP = (val) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

window.getIcon = (area) => {
    const icons = { 'Skincare': '💧', 'Rostro': '✨', 'Ojos': '👁️', 'Labios': '💋' };
    return icons[area] || '🛍️';
};

window.convertDriveLink = (url) => {
    if (!url) return null;
    if (url.match(/\.(jpeg|jpg|gif|png)$/) != null) return url;
    let id = null;
    const parts = url.split('/');
    const dIndex = parts.indexOf('d');
    if (dIndex !== -1 && parts.length > dIndex + 1) {
        id = parts[dIndex + 1];
    } else if (url.includes('id=')) {
        const match = url.match(/id=([a-zA-Z0-9_-]+)/);
        if (match && match[1]) id = match[1];
    }
    if (id) return `https://lh3.googleusercontent.com/d/$$${id}=s800`;
    return url;
}

// --- FUNCIONES DE FIREBASE ---

function subscribeToProducts() {
    const q = query(collection(db, productsCollectionPath), orderBy('name'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        if (window.isOfflineMode) {
            window.isOfflineMode = false;
            window.els.offlineBadge.classList.add('hidden');
        }

        window.productsData = [];
        snapshot.forEach((doc) => {
            window.productsData.push({ id: doc.id, ...doc.data() });
        });

        if (window.productsData.length === 0 && !window.demoDataAttempted) {
            window.demoDataAttempted = true; 
            checkAndLoadDemoData();
        } else {
            updateUI();
        }
    }, (error) => {
        console.error("Error de conexión a Firebase:", error);
        enableOfflineMode();
    });
}

function enableOfflineMode() {
    if (window.isOfflineMode) return; 
    console.warn("⚠️ Activando modo offline con data de respaldo.");
    window.isOfflineMode = true;
    window.productsData = [...BACKUP_PRODUCTS]; 
    window.els.offlineBadge.classList.remove('hidden');
    updateUI();
}

function updateUI() {
    window.initFilters();
    window.renderProducts();
    window.els.skeleton.classList.add('hidden');
    window.els.grid.classList.remove('hidden');
}

async function checkAndLoadDemoData() {
    try {
        const q = query(collection(db, productsCollectionPath));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            console.log("⚠️ Colección vacía detectada. Iniciando carga de datos demo...");
            const promises = BACKUP_PRODUCTS.map(p => {
                const { id, ...productData } = p;
                return addDoc(collection(db, productsCollectionPath), productData);
            });
            await Promise.all(promises);
            console.log("✅ Datos demo cargados exitosamente en Firebase.");
        }
    } catch (e) {
        console.error("Error verificando/cargando demo data:", e);
        enableOfflineMode();
    }
}

// --- AUTENTICACIÓN ROBUSTA ---
if (typeof __initial_auth_token !== 'undefined') {
    signInWithCustomToken(auth, __initial_auth_token).catch(enableOfflineMode);
} else {
    signInAnonymously(auth).catch(enableOfflineMode);
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("✅ Auth confirmada. Iniciando suscripción a datos...");
        subscribeToProducts();
    }
});


// --- LÓGICA DE FILTROS Y RENDERIZADO (Exponemos al global) ---
// La lógica de renderizado debe ser una función global para que los botones HTML la puedan llamar
window.renderProducts = () => {
    const dataToRender = window.isOfflineMode ? BACKUP_PRODUCTS : window.productsData;

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

window.initFilters = () => {
    const dataToUse = window.isOfflineMode ? BACKUP_PRODUCTS : window.productsData;
    const areas = [...new Set(dataToUse.map(p => p.area))].filter(Boolean).sort();

    if (areas.length === 0) {
        window.els.filterCategories.innerHTML = '<p class="text-sm text-gray-400 italic">Cargando categorías...</p>';
        return;
    }
    window.els.filterCategories.innerHTML = areas.map(area => `
        <label class="flex items-center p-3 bg-secondary/30 rounded-xl cursor-pointer hover:bg-secondary/70 transition">
            <input type="checkbox" value="${area}" class="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary accent-primary" onchange="updateFiltersState()">
            <span class="ml-3 text-text-dark font-medium flex items-center">
                <span class="mr-2">${window.getIcon(area)}</span> ${area}
            </span>
        </label>
    `).join('');
};

window.updateFiltersState = () => {
    window.filters.areas = Array.from(document.querySelectorAll('#filter-categories input:checked')).map(i => i.value);
}

window.applyFilters = () => {
    window.renderProducts();
    if (window.innerWidth < 768) window.toggleFilters(false);
    window.scrollTo({ top: document.getElementById('main-header').offsetHeight, behavior: 'smooth' });
}

window.resetFilters = () => {
    window.filters = { areas: [], maxPrice: 300000 };
    document.querySelectorAll('#filter-categories input').forEach(i => i.checked = false);
    window.els.priceRange.value = 300000;
    window.els.priceValue.textContent = window.formatCOP(300000);
    window.renderProducts();
}

window.toggleFilters = (show) => {
    const sidebar = window.els.filterSidebar;
    const isHidden = sidebar.classList.contains('sidebar-mobile-hidden');
    if (show === undefined) { show = isHidden; }

    if (show) {
        sidebar.classList.remove('sidebar-mobile-hidden');
        sidebar.classList.add('fixed', 'inset-0', 'z-50', 'm-4', 'h-auto', 'max-h-[90vh]', 'overflow-y-auto', 'border-2', 'border-primary/20', 'shadow-2xl');
    } else {
        sidebar.classList.add('sidebar-mobile-hidden');
        sidebar.classList.remove('fixed', 'inset-0', 'z-50', 'm-4', 'h-auto', 'max-h-[90vh]', 'overflow-y-auto', 'border-2', 'border-primary/20', 'shadow-2xl');
    }
}

// Evento de filtro de precio
document.addEventListener('DOMContentLoaded', () => {
    if (window.els.priceRange) {
        window.els.priceRange.addEventListener('input', (e) => {
            window.filters.maxPrice = parseInt(e.target.value);
            window.els.priceValue.textContent = window.formatCOP(window.filters.maxPrice);
        });
    }
});