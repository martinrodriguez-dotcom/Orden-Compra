// Importar funciones de Firebase, incluyendo deleteField
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, onSnapshot, updateDoc, arrayUnion, deleteField } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBNnUbg_LL6w4dZxqSA3vwCb7e1AHmM1vY",
    authDomain: "orden-compra-d803f.firebaseapp.com",
    projectId: "orden-compra-d803f",
    storageBucket: "orden-compra-d803f.appspot.com",
    messagingSenderId: "441828854057",
    appId: "1:441828854057:web:3037aabc9d02e6e27fcf38"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const statusColors = { 'Pendiente de Aprobación': 'bg-yellow-500', 'Presupuestos Pendientes': 'bg-cyan-500', 'Pendiente Aprobar Proveedor': 'bg-purple-500', 'Pendiente de Pago': 'bg-orange-500', 'Rechazada': 'bg-red-500', 'Finalizada': 'bg-gray-800' };

// Mapeo de estados a los roles requeridos
const statusToRoleMap = {
    'Pendiente de Aprobación': 2,
    'Presupuestos Pendientes': 3,
    'Pendiente Aprobar Proveedor': 4,
    'Pendiente de Pago': 5
};

// --- FUNCIÓN PRINCIPAL ---
document.addEventListener('DOMContentLoaded', async () => {
    await signInAnonymously(auth);
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
    const params = new URLSearchParams(window.location.search);
    const orderId = params.get('id');
    const loadingMessage = document.getElementById('loading-message');
    const orderDetailsContainer = document.getElementById('order-details-container');

    if (!currentUser) {
        loadingMessage.innerHTML = '<h2>Acceso Denegado</h2><p>Por favor, seleccione un usuario en la página principal.</p><a href="index.html" class="text-blue-600">Volver</a>';
        orderDetailsContainer.classList.add('hidden');
        return;
    }
    
    if (!orderId) { 
        loadingMessage.textContent = 'Error: No se especificó un ID de orden.'; 
        return; 
    }

    const orderRef = doc(db, "purchaseOrders", orderId);
    onSnapshot(orderRef, (docSnap) => {
        if (docSnap.exists()) {
            const order = { id: docSnap.id, ...docSnap.data() };
            orderDetailsContainer.classList.remove('hidden');
            loadingMessage.classList.add('hidden');
            renderOrderDetails(order);
            renderHistory(order);
            renderActionPanel(order, currentUser);
        } else {
            loadingMessage.textContent = 'Error: Orden no encontrada.';
            orderDetailsContainer.classList.add('hidden');
        }
    });
});

// --- FUNCIONES DE RENDERIZADO ---
function renderOrderDetails(order) {
    document.getElementById('order-id').textContent = order.orderNumber || order.id.substring(0, 8);
    document.getElementById('order-name').textContent = order.name;
    const statusBadge = document.getElementById('order-status');
    statusBadge.textContent = order.status;
    statusBadge.className = `text-lg font-bold px-4 py-2 rounded-full text-white ${statusColors[order.status] || 'bg-blue-500'}`;
    document.getElementById('order-justification').textContent = order.justification;
    const itemsTableBody = document.getElementById('items-table-body');
    itemsTableBody.innerHTML = '';
    order.items.forEach(item => { itemsTableBody.innerHTML += `<tr class="border-b last:border-b-0"><td class="p-3">${item.description}</td><td class="p-3 text-center">${item.quantity}</td></tr>`; });

    const winnerSection = document.getElementById('winner-details-section');
    if (order.proveedorGanador) {
        document.getElementById('winner-provider-name').textContent = order.proveedorGanador.proveedor;
        document.getElementById('winner-provider-cost').textContent = formatCurrency(order.proveedorGanador.costoFinalCalculado);
        document.getElementById('winner-provider-term').textContent = `${order.proveedorGanador.plazoPago} días`;
        document.getElementById('winner-provider-method').textContent = order.proveedorGanador.metodoPago;
        winnerSection.classList.remove('hidden');
    } else {
        winnerSection.classList.add('hidden');
    }

    const paymentSection = document.getElementById('payment-details-section');
    if (order.paymentDetails) {
        document.getElementById('payment-amount').textContent = formatCurrency(order.paymentDetails.amount);
        document.getElementById('payment-date').textContent = new Date(order.paymentDetails.date).toLocaleDateString('es-ES', { timeZone: 'UTC' });
        document.getElementById('payment-transaction-id').textContent = order.paymentDetails.transactionId;
        document.getElementById('payment-notes').textContent = order.paymentDetails.notes || '---';
        paymentSection.classList.remove('hidden');
    } else {
        paymentSection.classList.add('hidden');
    }
}

function renderHistory(order) {
    const historyList = document.getElementById('history-list');
    historyList.innerHTML = '';
    const toDateSafe = (timestamp) => timestamp && timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (order.historial) {
        order.historial.slice().sort((a, b) => toDateSafe(a.date) - toDateSafe(b.date)).forEach(entry => {
            const date = toDateSafe(entry.date).toLocaleString('es-ES');
            historyList.innerHTML += `<div class="relative pl-6"><div class="absolute -left-1.5 top-1 h-3 w-3 rounded-full bg-blue-500"></div><h4 class="font-semibold">${entry.status}</h4><p class="text-xs text-gray-500">${date} por ${entry.user || 'Sistema'}</p></div>`;
        });
    }
}

function renderActionPanel(order, currentUser) {
    const actionPanel = document.getElementById('action-panel');
    const requiredRole = statusToRoleMap[order.status];
    
    // El usuario tiene permiso si tiene el rol específico O si es administrador.
    const userHasPermission = (currentUser.roles && currentUser.roles.includes(requiredRole)) || currentUser.isAdmin;

    actionPanel.innerHTML = '';

    if (requiredRole && !userHasPermission) {
        actionPanel.innerHTML = `
            <div class="text-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-yellow-500 mx-auto" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clip-rule="evenodd" /></svg>
                <p class="text-sm font-semibold mt-2">Acción Bloqueada</p>
                <p class="text-xs text-gray-600">No tiene los permisos necesarios (Rol Etapa ${requiredRole}) para esta acción.</p>
            </div>`;
        return;
    }

    switch (order.status) {
        case 'Pendiente de Aprobación':
            actionPanel.innerHTML = `<p class="text-sm mb-4">La orden requiere aprobación.</p><div class="flex flex-col gap-2"><button id="approve-btn" class="w-full bg-green-500 text-white font-bold py-2 px-4 rounded-md hover:bg-green-600">Aprobar</button><button id="reject-btn" class="w-full bg-red-500 text-white font-bold py-2 px-4 rounded-md hover:bg-red-600">Rechazar</button></div>`;
            document.getElementById('approve-btn').addEventListener('click', () => updateUserAction('Presupuestos Pendientes'));
            document.getElementById('reject-btn').addEventListener('click', () => updateUserAction('Rechazada'));
            break;
        case 'Presupuestos Pendientes':
            actionPanel.innerHTML = `<p class="text-sm mb-3">Cargue los presupuestos recibidos.</p><button id="add-budget-btn" class="w-full bg-blue-500 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-600 mb-4">Cargar Nuevo Presupuesto</button><h4 class="font-semibold mb-2 text-sm">Presupuestos Cargados</h4><div id="budget-list" class="space-y-2 mb-4"></div><button id="select-winner-btn" class="w-full bg-green-600 text-white font-bold py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed" disabled>Calcular y Seleccionar Proveedor</button>`;
            renderBudgetList(order);
            document.getElementById('add-budget-btn').addEventListener('click', () => openModal(document.getElementById('budget-modal')));
            document.getElementById('select-winner-btn').addEventListener('click', () => handleSelectWinner(order));
            break;
        case 'Pendiente Aprobar Proveedor':
            if (!order.proveedorGanador) { actionPanel.innerHTML = `<p class="text-sm text-red-600">Error: No se ha asignado un proveedor ganador.</p>`; return; }
            actionPanel.innerHTML = `<p class="text-sm mb-4">Se ha recomendado a <strong>${order.proveedorGanador.proveedor}</strong>. Revise los detalles y apruebe para continuar al pago.</p><div class="flex flex-col gap-2"><button id="approve-provider-btn" class="w-full bg-green-500 text-white font-bold py-2 px-4 rounded-md hover:bg-green-600">Aprobar Proveedor</button><button id="reject-provider-btn" class="w-full bg-yellow-500 text-black font-bold py-2 px-4 rounded-md hover:bg-yellow-600">Rechazar y Volver a Presupuestar</button></div>`;
            document.getElementById('approve-provider-btn').addEventListener('click', () => updateUserAction('Pendiente de Pago'));
            document.getElementById('reject-provider-btn').addEventListener('click', () => revertToBudgeting());
            break;
        case 'Pendiente de Pago':
            if (!order.proveedorGanador) { actionPanel.innerHTML = `<p class="text-sm text-red-600">Error: No se puede pagar sin un proveedor asignado.</p>`; return; }
            actionPanel.innerHTML = `<p class="text-sm mb-4">La orden está aprobada y lista para ser pagada al proveedor <strong>${order.proveedorGanador.proveedor}</strong>.</p><button id="register-payment-btn" class="w-full bg-green-600 text-white font-bold py-2 px-4 rounded-md hover:bg-green-700">Registrar Pago</button>`;
            document.getElementById('register-payment-btn').addEventListener('click', () => {
                const paymentModal = document.getElementById('payment-modal');
                document.getElementById('payment-date-input').valueAsDate = new Date();
                document.getElementById('payment-amount-input').value = order.proveedorGanador.costoFinalCalculado;
                openModal(paymentModal);
            });
            break;
        case 'Finalizada':
        case 'Rechazada':
             actionPanel.innerHTML = `<div class="text-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 ${order.status === 'Finalizada' ? 'text-green-500' : 'text-red-500'} mx-auto" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" /></svg><p class="text-sm font-semibold mt-2">Esta orden de compra ha sido ${order.status.toLowerCase()}.</p></div>`;
            break;
        default:
            actionPanel.innerHTML = `<p class="text-sm">No hay acciones para el estado: <strong>${order.status}</strong>.</p>`;
    }
}

function renderBudgetList(order) {
    const budgetList = document.getElementById('budget-list');
    const winnerBtn = document.getElementById('select-winner-btn');
    budgetList.innerHTML = '<p class="text-xs text-gray-500">Aún no hay presupuestos.</p>';
    if (order.presupuestos && order.presupuestos.length > 0) {
        budgetList.innerHTML = '';
        order.presupuestos.forEach(b => {
            const finalPrice = b.incluyeIVA ? b.precioBase : b.precioBase * 1.21;
            const totalCost = finalPrice + (b.costoFlete || 0);
            budgetList.innerHTML += `<div class="bg-white p-3 border rounded-md"><p class="font-bold">${b.proveedor}</p><p class="text-sm font-semibold text-green-700">Costo Final: ${formatCurrency(totalCost)}</p><p class="text-xs text-gray-500">Plazo: ${b.plazoPago} días</p></div>`;
        });
        if (winnerBtn) winnerBtn.disabled = false;
    } else {
        if (winnerBtn) winnerBtn.disabled = true;
    }
}

function handleSelectWinner(order) {
    if (!order.presupuestos || order.presupuestos.length === 0) return;
    const TASA_ANUAL = 0.50;
    const tasaDiaria = Math.pow(1 + TASA_ANUAL, 1 / 365) - 1;
    let ganador = null;
    let valorPresenteMinimo = Infinity;
    order.presupuestos.forEach(b => {
        const precioConIVA = b.incluyeIVA ? b.precioBase : b.precioBase * 1.21;
        const costoFinal = precioConIVA + (b.costoFlete || 0);
        const valorPresente = costoFinal / Math.pow(1 + tasaDiaria, b.plazoPago);
        if (valorPresente < valorPresenteMinimo) {
            valorPresenteMinimo = valorPresente;
            ganador = { ...b, costoFinalCalculado: costoFinal, valorPresenteCalculado: valorPresente };
        }
    });
    if (ganador) {
        showWinnerConfirmationModal(ganador, order.presupuestos);
    }
}

function showWinnerConfirmationModal(winner, allBudgets) {
    const modal = document.getElementById('winner-confirmation-modal');
    document.getElementById('winner-name').textContent = winner.proveedor;
    document.getElementById('winner-final-cost').textContent = formatCurrency(winner.costoFinalCalculado);
    document.getElementById('winner-present-value').textContent = formatCurrency(winner.valorPresenteCalculado);
    document.getElementById('winner-justification-list').innerHTML = generateJustification(winner, allBudgets);
    const confirmBtn = document.getElementById('confirm-winner-btn');
    confirmBtn.onclick = () => {
        updateUserAction('Pendiente Aprobar Proveedor', { proveedorGanador: winner });
        closeModal(modal);
    };
    openModal(modal);
}

function generateJustification(winner, allBudgets) {
    let reasons = [];
    reasons.push(`Es la opción con el <strong>menor Valor Presente</strong> (costo real ajustado por plazo).`);
    const minCostoFinal = Math.min(...allBudgets.map(b => (b.incluyeIVA ? b.precioBase : b.precioBase * 1.21) + (b.costoFlete || 0)));
    if (winner.costoFinalCalculado === minCostoFinal) { reasons.push(`Coincide con el <strong>menor costo final</strong> sin ajuste financiero.`); }
    if (winner.costoFlete === 0) { reasons.push(`No presenta costos de flete adicionales.`); }
    if (winner.incluyeIVA) { reasons.push(`El precio presupuestado ya incluye IVA.`); }
    if (winner.plazoPago === 0) { reasons.push(`Ofrece pago de contado.`); } else { reasons.push(`Presenta un plazo de pago de ${winner.plazoPago} días.`); }
    return reasons.map(reason => `<li>${reason}</li>`).join('');
}

async function handleBudgetSubmit(event) {
    event.preventDefault();
    const orderId = new URLSearchParams(window.location.search).get('id');
    const fileInput = document.getElementById('budget-file');
    const newBudget = { id: `BUD-${Date.now()}`, proveedor: document.getElementById('provider-name').value, precioBase: parseFloat(document.getElementById('budget-base-price').value), incluyeIVA: document.getElementById('has-iva').checked, costoFlete: parseFloat(document.getElementById('shipping-cost').value) || 0, plazoPago: parseInt(document.getElementById('payment-term').value) || 0, metodoPago: document.getElementById('payment-method').value, archivoNombre: fileInput.files.length > 0 ? fileInput.files[0].name : null, };
    try {
        const orderRef = doc(db, "purchaseOrders", orderId);
        await updateDoc(orderRef, { presupuestos: arrayUnion(newBudget) });
        closeModal(document.getElementById('budget-modal'));
        document.getElementById('budget-form').reset();
    } catch (error) { console.error("Error al agregar presupuesto:", error); alert("No se pudo agregar el presupuesto."); }
}

async function revertToBudgeting() {
    const orderId = new URLSearchParams(window.location.search).get('id');
    if (!confirm('¿Está seguro de que desea rechazar esta selección y volver a la etapa de presupuestos?')) return;
    try {
        const orderRef = doc(db, "purchaseOrders", orderId);
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        await updateDoc(orderRef, {
            status: 'Presupuestos Pendientes',
            proveedorGanador: deleteField(),
            historial: arrayUnion({ status: 'Selección Rechazada', user: currentUser.name, date: new Date() })
        });
    } catch (error) {
        console.error("Error al revertir el estado:", error);
        alert("No se pudo revertir el estado.");
    }
}

async function handlePaymentSubmit(event) {
    event.preventDefault();
    const orderId = new URLSearchParams(window.location.search).get('id');
    const paymentDetails = {
        date: document.getElementById('payment-date-input').value,
        amount: parseFloat(document.getElementById('payment-amount-input').value),
        transactionId: document.getElementById('payment-id-input').value,
        notes: document.getElementById('payment-notes-input').value,
    };
    if (!paymentDetails.date || !paymentDetails.amount || !paymentDetails.transactionId) {
        alert("Por favor, complete todos los campos de pago requeridos.");
        return;
    }
    await updateUserAction('Finalizada', { paymentDetails: paymentDetails });
    closeModal(document.getElementById('payment-modal'));
}

async function updateUserAction(newStatus, details = {}) {
    const orderId = new URLSearchParams(window.location.search).get('id');
    try {
        const orderRef = doc(db, "purchaseOrders", orderId);
        const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
        let historyMessage = newStatus.replace('Pendientes', '').replace('Pendiente ', '');
        
        let updateData = {
            status: newStatus,
            historial: arrayUnion({ status: historyMessage, user: currentUser.name, date: new Date() })
        };
        
        if (details.proveedorGanador) {
            updateData.proveedorGanador = details.proveedorGanador;
        }
        if (details.paymentDetails) {
            updateData.paymentDetails = details.paymentDetails;
        }

        await updateDoc(orderRef, updateData);
    } catch (error) {
        console.error("Error al actualizar estado:", error);
        alert("No se pudo actualizar el estado.");
    }
}

function formatCurrency(value) { return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value); }

const budgetModal = document.getElementById('budget-modal');
const winnerModal = document.getElementById('winner-confirmation-modal');
const paymentModal = document.getElementById('payment-modal');

document.getElementById('budget-form').addEventListener('submit', handleBudgetSubmit);
document.getElementById('payment-form').addEventListener('submit', handlePaymentSubmit);

document.getElementById('close-budget-modal-btn').addEventListener('click', () => closeModal(budgetModal));
document.getElementById('cancel-winner-btn').addEventListener('click', () => closeModal(winnerModal));
document.getElementById('close-payment-modal-btn').addEventListener('click', () => closeModal(paymentModal));

budgetModal.addEventListener('click', (e) => { if (e.target === budgetModal) closeModal(budgetModal); });
winnerModal.addEventListener('click', (e) => { if (e.target === winnerModal) closeModal(winnerModal); });
paymentModal.addEventListener('click', (e) => { if (e.target === paymentModal) closeModal(paymentModal); });

function openModal(modal) { const c = modal.querySelector('.transform'); modal.classList.remove('hidden'); setTimeout(() => { modal.classList.remove('opacity-0'); c.classList.remove('scale-95', 'opacity-0'); }, 10); }
function closeModal(modal) { const c = modal.querySelector('.transform'); modal.classList.add('opacity-0'); c.classList.add('scale-95', 'opacity-0'); setTimeout(() => { modal.classList.add('hidden'); }, 300); }
