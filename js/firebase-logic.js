// --- CONFIGURACIÓN Y UTILIDADES BASE ---

// Importar funciones necesarias de Firebase SDK (versión modular v9+)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, onSnapshot, query, orderBy, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Configuración de Firebase
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


// --- ESTADO GLOBAL (Exportado a window para el script de UI) ---
let productsData = [];
window.productsData = productsData;
let filters = { areas: [], maxPrice: 300000 };
window.filters = filters;
let isOfflineMode = false;

// --- DATA QUEMADA (BACKUP) ---
const BACKUP_PRODUCTS = [
    { id: 'bk1', name: "Sérum Iluminador Vitamina C", price: 119900, area: "Skincare", color: "Transparente", stock: 15, description: "Potente fórmula con 15% Vitamina C pura. Combate radicales libres e ilumina visiblemente la piel desde el primer uso.", imageUrl: "" },
    { id: 'bk2', name: "Hydro-Boost Ácido Hialurónico", price: 159000, area: "Skincare", color: "Blanco Nube", stock: 18, description: "Hidratación profunda 72 horas.", imageUrl: "" },
    { id: 'bk3', name: "Base 'Second Skin' Matte", price: 89900, area: "Rostro", color: "Beige Neutro", stock: 22, description: "Cobertura construible de media a alta con acabado mate aterciopelado.", imageUrl: "" },
    { id: 'bk4', name: "Paleta Sombras 'Euforia Night'", price: 105000, area: "Ojos", color: "Multitono", stock: 8, description: "12 tonos ultra-pigmentados para looks infinitos.", imageUrl: "" },
    { id: 'bk5', name: "Labial Líquido 'Velvet Kiss'", price: 59900, area: "Labios", color: "Rosa Cereza", stock: 30, description: "Textura mousse que seca en un mate cómodo.", imageUrl: "" }
];

// --- REFERENCIAS DOM (Expuesto globalmente) ---
window.els = {
    grid: document.getElementById('product-grid'),
    skeleton: document.getElementById('loading-skeleton'),
    filterSidebar: document.getElementById('filter-sidebar'),
    filterCategories: document.getElementById('filter-categories'),
    noResults: document.getElementById('no-results'),
    priceRange: document.getElementById('price-range'),
    priceValue: document.getElementById('price-value'),
    offlineBadge: document.getElementById('offline-mode-badge')
};

// --- UTILIDADES DE FORMATO ---
window.formatCOP = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);

window.getIcon = (area) => {
    const icons = { 'Skincare': '💧', 'Rostro': '✨', 'Ojos': '👁️', 'Labios': '💋' };
    return icons[area] || '🛍️';
};

// =================================================================================================
// FUNCIÓN CORREGIDA: window.convertDriveLink (SOLUCIÓN AL PROBLEMA DE IMÁGENES)
// =================================================================================================
window.convertDriveLink = (url) => {
    if (!url) return null;
    
    // 1. Si ya es una URL de imagen estándar (Storage o directa), úsala directamente.
    if (url.includes('firebasestorage.googleapis.com') || url.match(/\.(jpeg|jpg|gif|png|webp)(\?|$)/i)) {
        return url;
    }

    let id = null;

    // 2. Intenta extraer el ID del formato de visualización (drive.google.com/file/d/ID/view)
    const matchId = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    
    // 3. Intenta extraer el ID del formato de enlace compartido (drive.google.com/...id=ID...)
    const matchIdQuery = url.match(/id=([a-zA-Z0-9_-]+)/);

    if (matchId && matchId[1]) {
        id = matchId[1];
    } else if (matchIdQuery && matchIdQuery[1]) {
        id = matchIdQuery[1];
    }
    
    // 4. Si se encuentra un ID, devuelve la URL de incrustación pública (el endpoint MÁS FIABLE).
    if (id) {
        return `https://drive.google.com/uc?export=view&id=${id}`;
    }
    
    // 5. Si no se puede parsear o no es de Drive, devuelve la URL original.
    return url;
}
// =================================================================================================


// --- LÓGICA DE DATOS ---

function subscribeToProducts() {
    const q = query(collection(db, productsCollectionPath), orderBy('name'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        if (isOfflineMode) {
            isOfflineMode = false;
            window.els.offlineBadge.classList.add('hidden');
        }

        productsData.length = 0; // Limpiar array
        snapshot.forEach((doc) => {
            productsData.push({ id: doc.id, ...doc.data() });
        });

        window.productsData = productsData.slice(); // Sincroniza la variable global

        if (productsData.length === 0 && !window.demoDataAttempted) {
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
    if (isOfflineMode) return;
    console.warn("⚠️ Activando modo offline con data de respaldo.");
    isOfflineMode = true;
    window.productsData = [...BACKUP_PRODUCTS];
    window.els.offlineBadge.classList.remove('hidden');
    updateUI();
}

// Expuesta globalmente para que el script de UI pueda llamarla
window.updateUI = () => {
    window.initFilters();
    window.renderProducts(); // Asumimos que esta función es definida en el script de UI
    window.els.skeleton.classList.add('hidden');
    window.els.grid.classList.remove('hidden');
}


async function checkAndLoadDemoData() {
    try {
        const q = query(collection(db, productsCollectionPath));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            console.log("⚠️ Colección vacía. Iniciando carga de datos demo...");
            const promises = BACKUP_PRODUCTS.map(p => {
                const { id, ...productData } = p;
                return addDoc(collection(db, productsCollectionPath), productData);
            });
            await Promise.all(promises);
            console.log("✅ Datos demo cargados exitosamente.");
        }
    } catch (e) {
        console.error("Error verificando/cargando demo data:", e);
        enableOfflineMode();
    }
}


// --- LÓGICA DE FILTROS (Exportada globalmente) ---

window.initFilters = () => {
    const dataToUse = isOfflineMode ? BACKUP_PRODUCTS : window.productsData;
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
    if (window.innerWidth < 768 && window.toggleFilters) window.toggleFilters(false);
    window.scrollTo({ top: document.getElementById('main-header').offsetHeight, behavior: 'smooth' });
}

window.resetFilters = () => {
    window.filters.areas = [];
    window.filters.maxPrice = 300000;
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

// Event Listeners
window.els.priceRange.addEventListener('input', (e) => {
    window.filters.maxPrice = parseInt(e.target.value);
    window.els.priceValue.textContent = window.formatCOP(window.filters.maxPrice);
});

// --- AUTENTICACIÓN E INICIO ---

// Manejar la autenticación
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