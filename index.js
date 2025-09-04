import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, onSnapshot, query, orderBy, doc, getDoc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = { apiKey: "AIzaSyBNnUbg_LL6w4dZxqSA3vwCb7e1AHmM1vY", authDomain: "orden-compra-d803f.firebaseapp.com", projectId: "orden-compra-d803f", storageBucket: "orden-compra-d803f.appspot.com", messagingSenderId: "441828854057", appId: "1:441828854057:web:3037aabc9d02e6e27fcf38" };
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUserData = null; // Guardará los datos del perfil del usuario (nombre, roles, etc.)

// --- Lógica de Autenticación ---
const authContainer = document.getElementById('auth-container');
const loadingMessage = document.getElementById('loading-message');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        // Usuario está logueado
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
            currentUserData = userDocSnap.data();
            renderLoggedInUI(currentUserData);
            loadOrders();
        } else {
            // Documento de usuario no encontrado, algo salió mal
            signOut(auth);
        }
    } else {
        // Usuario no está logueado
        renderLoggedOutUI();
        loadingMessage.textContent = 'Por favor, inicie sesión para ver las órdenes.';
        document.getElementById('orders-grid').innerHTML = '';
    }
});

function renderLoggedInUI(userData) {
    authContainer.innerHTML = `
        <div class="mb-2">
            <span class="font-bold">Usuario:</span> <span id="current-user-name">${userData.name}</span>
        </div>
        <div class="flex flex-col sm:flex-row gap-2">
            <a href="perfil.html" class="bg-gray-200 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-300 text-center">Mi Perfil</a>
            <a href="usuarios.html" id="manage-users-btn" class="bg-gray-200 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-300 text-center ${userData.isAdmin ? '' : 'hidden'}">Gestionar Usuarios</a>
            <button id="logout-btn" class="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600">Salir</button>
        </div>
    `;
    document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));
    
    // Habilitar botón de crear orden si tiene permiso
    const addOrderBtn = document.getElementById('add-order-btn');
    addOrderBtn.disabled = !(userData.roles.includes(1) || userData.isAdmin);
}

function renderLoggedOutUI() {
    authContainer.innerHTML = `
        <p class="text-center mb-2">No ha iniciado sesión.</p>
        <div class="flex gap-2">
            <a href="login.html" class="w-full bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 text-center">Iniciar Sesión</a>
            <a href="registro.html" class="w-full bg-gray-200 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-300 text-center">Registrarse</a>
        </div>
    `;
     document.getElementById('add-order-btn').disabled = true;
}

// --- Lógica de Órdenes (similar a antes, pero ahora dentro del scope de sesión) ---
function loadOrders() {
    const ordersCollection = collection(db, "purchaseOrders");
    const q = query(ordersCollection, orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        const allOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderOrders(allOrders);
    });
}
// (El resto de funciones como renderOrders, openViewModal, etc., permanecen iguales y no necesitan ser incluidas aquí de nuevo)
