import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, onSnapshot, query, orderBy, doc, getDoc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = { apiKey: "AIzaSyBNnUbg_LL6w4dZxqSA3vwCb7e1AHmM1vY", authDomain: "orden-compra-d803f.firebaseapp.com", projectId: "orden-compra-d803f", storageBucket: "orden-compra-d803f.appspot.com", messagingSenderId: "441828854057", appId: "1:441828854057:web:3037aabc9d02e6e27fcf38" };
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUserData = null;
let allUsers = [];
let allOrders = [];
let ordersUnsubscribe = null;

const authContainer = document.getElementById('auth-container');
const loadingMessage = document.getElementById('loading-message');
const ordersGrid = document.getElementById('orders-grid');
const addOrderBtn = document.getElementById('add-order-btn');

const statusToRoleMap = { 'Pendiente de Aprobación': 2, 'Presupuestos Pendientes': 3, 'Pendiente Aprobar Proveedor': 4, 'Pendiente de Pago': 5 };

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
            currentUserData = userDocSnap.data();
            renderLoggedInUI(currentUserData);
            loadAppData();
        } else {
            alert("Error: No se encontró el perfil de usuario. Se cerrará la sesión.");
            signOut(auth);
        }
    } else {
        currentUserData = null;
        renderLoggedOutUI();
        if (ordersUnsubscribe) ordersUnsubscribe();
        loadingMessage.textContent = 'Por favor, inicie sesión para ver las órdenes.';
        ordersGrid.innerHTML = '';
    }
});

function renderLoggedInUI(userData) {
    authContainer.innerHTML = `<div class="mb-2"><span class="font-bold">Usuario:</span> <span>${userData.name}</span></div><div class="flex flex-col sm:flex-row gap-2"><a href="perfil.html" class="bg-gray-200 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-300 text-center">Mi Perfil</a><a href="usuarios.html" class="bg-gray-200 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-300 text-center ${userData.isAdmin ? '' : 'hidden'}">Gestionar Usuarios</a><button id="logout-btn" class="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600">Salir</button></div>`;
    document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));
    addOrderBtn.disabled = !(userData.roles.includes(1) || userData.isAdmin);
}

function renderLoggedOutUI() {
    authContainer.innerHTML = `<p class="text-center mb-2">No ha iniciado sesión.</p><div class="flex gap-2"><a href="login.html" class="w-full bg-indigo-600 text-white px-3 py-1 rounded-md hover:bg-indigo-700 text-center">Iniciar Sesión</a><a href="registro.html" class="w-full bg-gray-200 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-300 text-center">Registrarse</a></div>`;
    addOrderBtn.disabled = true;
}

function loadAppData() {
    const usersCollection = collection(db, "users");
    onSnapshot(usersCollection, (snapshot) => {
        allUsers = snapshot.docs.map(doc => doc.data());
    });

    const ordersCollection = collection(db, "purchaseOrders");
    const q = query(ordersCollection, orderBy("createdAt", "desc"));
    ordersUnsubscribe = onSnapshot(q, (snapshot) => {
        allOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderOrders(allOrders);
    });
}

const statusColors = { 'Pendiente de Aprobación': 'bg-yellow-500', 'Presupuestos Pendientes': 'bg-cyan-500', 'Pendiente Aprobar Proveedor': 'bg-purple-500', 'Rechazada': 'bg-red-500', 'Finalizada': 'bg-gray-800', 'Pendiente de Pago': 'bg-orange-500' };

function renderOrders(orders) { 
    ordersGrid.innerHTML = ''; 
    if (orders.length === 0) { 
        ordersGrid.innerHTML = '<p id="loading-message" class="col-span-full text-center text-gray-500">No hay órdenes de compra. ¡Crea la primera!</p>'; 
        return; 
    } 
    orders.forEach(order => { 
        const orderCard = document.createElement('div'); 
        orderCard.className = 'bg-white rounded-lg shadow-md p-5 flex flex-col cursor-pointer transition-transform transform hover:-translate-y-1'; 
        orderCard.dataset.orderId = order.id; 
        orderCard.innerHTML = `<div class="flex justify-between items-start mb-2"><h2 class="text-lg font-bold text-gray-900">${order.orderNumber || order.id.substring(0, 8)}</h2><span class="text-xs font-bold px-2 py-1 rounded-full text-white ${statusColors[order.status] || 'bg-blue-500'}">${order.status}</span></div><p class="text-sm text-gray-600 mb-4 font-semibold">${order.name}</p><div class="mt-auto border-t pt-3"><p class="text-sm text-gray-500">Artículos: <strong>${order.items.length}</strong></p></div>`; 
        orderCard.addEventListener('click', () => openViewModal(order)); 
        ordersGrid.appendChild(orderCard); 
    }); 
};

function openViewModal(order) { 
    if (!order) return; 
    const viewOrderModal = document.getElementById('view-order-modal'); 
    document.getElementById('modal-view-id').textContent = order.orderNumber || order.id.substring(0,8); 
    document.getElementById('modal-view-name').textContent = order.name; 
    document.getElementById('modal-view-justification').textContent = order.justification; 
    const statusBadge = document.getElementById('modal-view-status'); 
    statusBadge.textContent = order.status; 
    statusBadge.className = `text-lg font-bold px-3 py-1 rounded-full text-white ${statusColors[order.status] || 'bg-blue-500'}`; 
    
    const requiredRole = statusToRoleMap[order.status];
    let responsibleNames = 'N/A';
    if (requiredRole) {
        const responsibleUsers = allUsers.filter(user => (user.roles && user.roles.includes(requiredRole)) || user.isAdmin);
        if (responsibleUsers.length > 0) {
            responsibleNames = responsibleUsers.map(user => user.name).join(', ');
        }
    } else if (order.status === 'Finalizada' || order.status === 'Rechazada') {
        responsibleNames = 'Proceso concluido.';
    }
    document.getElementById('modal-view-responsibles').textContent = responsibleNames;

    document.getElementById('manage-order-link').href = `orden.html?id=${encodeURIComponent(order.id)}`; 
    openModal(viewOrderModal); 
};

const createOrderForm = document.getElementById('create-order-form');
createOrderForm.addEventListener('submit', async (e) => { 
    e.preventDefault(); 
    if (!currentUserData) { alert("Debe iniciar sesión para crear una orden."); return; }
    const ordersCollectionRef = collection(db, "purchaseOrders");
    const formData = new FormData(createOrderForm); 
    const itemsContainer = document.getElementById('items-container'); 
    let items = []; 
    itemsContainer.querySelectorAll('.item-row').forEach(row => { items.push({ description: row.querySelector('.item-desc').value, quantity: parseInt(row.querySelector('.item-qty').value, 10) }); }); 
    const newOrder = { 
        name: formData.get('orderName'), 
        justification: formData.get('justification'), 
        status: 'Pendiente de Aprobación', 
        items: items, 
        historial: [{ status: 'Cargada', date: new Date(), user: currentUserData.name }], 
        createdAt: serverTimestamp(), 
        orderNumber: `OC-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`
    }; 
    try { 
        await addDoc(ordersCollectionRef, newOrder); 
        closeModal(document.getElementById('create-order-modal')); 
        createOrderForm.reset();
    } catch (error) { 
        console.error("Error adding document: ", error); 
        alert("No se pudo crear la orden."); 
    } 
});

const createOrderModal = document.getElementById('create-order-modal'); 
const itemsContainer = document.getElementById('items-container'); 
const addItemBtn = document.getElementById('add-item-btn'); 
const openModal = (modal) => { const c = modal.querySelector('.transform'); modal.classList.remove('hidden'); setTimeout(() => { modal.classList.remove('opacity-0'); c.classList.remove('scale-95', 'opacity-0'); }, 10); }; 
const closeModal = (modal) => { const c = modal.querySelector('.transform'); modal.classList.add('opacity-0'); c.classList.add('scale-95', 'opacity-0'); setTimeout(() => { modal.classList.add('hidden'); }, 300); }; 
const createItemRow = () => { const d = document.createElement('div'); d.className = 'item-row grid grid-cols-12 gap-2 items-center'; d.innerHTML = `<input type="text" placeholder="Descripción" class="item-desc col-span-8 border p-2 rounded-md" required><input type="number" placeholder="Cant." min="1" class="item-qty col-span-2 border p-2 rounded-md" required><button type="button" class="remove-item-btn col-span-2 bg-red-500 text-white p-2 rounded-md hover:bg-red-600">X</button>`; d.querySelector('.remove-item-btn').addEventListener('click', () => { d.remove(); updateRemoveButtons(); }); return d; }; 
const updateRemoveButtons = () => { const rows = itemsContainer.querySelectorAll('.item-row'); rows.forEach(r => { r.querySelector('.remove-item-btn').disabled = rows.length === 1; }); }; 
addItemBtn.addEventListener('click', () => { itemsContainer.appendChild(createItemRow()); updateRemoveButtons(); }); 
addOrderBtn.addEventListener('click', () => { createOrderForm.reset(); itemsContainer.innerHTML = ''; itemsContainer.appendChild(createItemRow()); updateRemoveButtons(); openModal(createOrderModal); }); 
document.querySelectorAll('.close-modal-btn').forEach(b => b.addEventListener('click', (e) => { const modal = e.target.closest('.modal-backdrop'); if (modal) closeModal(modal); }));

window.addEventListener('load', () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('Service Worker registrado con éxito:', registration.scope);
      })
      .catch(error => {
        console.log('Error en el registro del Service Worker:', error);
      });
  }
});
