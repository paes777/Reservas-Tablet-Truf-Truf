// --- CONSTANTES ---
const BLOCKS_MON_THU = [
    "08:30 a 10:00",
    "10:15 a 11:45",
    "12:00 a 13:30",
    "14:30 a 15:45"
];
const BLOCKS_FRI = [
    "08:30 a 10:00",
    "10:15 a 11:45",
    "12:00 a 13:30"
];

// --- ESTADO INICIAL ---
// Cargar reservas de localStorage o inicializar arr vacío
let reservas = JSON.parse(localStorage.getItem('metrenco_reservas')) || [];
let isAdminLogged = false;

// --- REFERENCIAS AL DOM ---
const viewDocente = document.getElementById('docenteView');
const viewAdminLogin = document.getElementById('adminLoginView');
const viewAdminDashboard = document.getElementById('adminDashboardView');

const navAdminBtn = document.getElementById('navAdminBtn');
const navDocenteBtn = document.getElementById('navDocenteBtn');

// Formularios Docente
const reservaForm = document.getElementById('reservaForm');
const fieldFecha = document.getElementById('fecha');
const fieldBloque = document.getElementById('bloque');

// Auth Admin
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const btnLogout = document.getElementById('btnLogout');

// Dashboard Admin
const reservasTbody = document.getElementById('reservasTbody');
const noReservasMsg = document.getElementById('noReservasMsg');

// --- INICIALIZACIÓN ---
function init() {
    setupEventListeners();
    setMinDate();
}

function setupEventListeners() {
    // Navegación
    navAdminBtn.addEventListener('click', showAdminLogin);
    navDocenteBtn.addEventListener('click', showDocenteView);
    btnLogout.addEventListener('click', handleLogout);

    // Eventos Formulario Docente
    fieldFecha.addEventListener('change', handleFechaChange);
    reservaForm.addEventListener('submit', handleReservaSubmit);

    // Eventos Admin Login
    loginForm.addEventListener('submit', handleLogin);
}

// --- LOGICA CORE DE RESERVAS ---
function saveReservas() {
    localStorage.setItem('metrenco_reservas', JSON.stringify(reservas));
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// --- CONTROLADOR DE VISTAS (Navegación tipo SPA) ---
function showDocenteView() {
    viewDocente.classList.add('active');
    viewDocente.classList.remove('d-none');
    viewAdminLogin.classList.remove('active');
    viewAdminLogin.classList.add('d-none');
    viewAdminDashboard.classList.remove('active');
    viewAdminDashboard.classList.add('d-none');
    
    navAdminBtn.classList.remove('d-none');
    navDocenteBtn.classList.add('d-none');
    
    // Si hay una fecha seleccionada, actualizar la vista de bloques disponibles
    if (fieldFecha.value) {
        handleFechaChange();
    }
}

function showAdminLogin() {
    if (isAdminLogged) {
        showAdminDashboard();
        return;
    }
    viewDocente.classList.remove('active');
    viewDocente.classList.add('d-none');
    viewAdminLogin.classList.add('active');
    viewAdminLogin.classList.remove('d-none');
    viewAdminDashboard.classList.remove('active');
    viewAdminDashboard.classList.add('d-none');
    
    navAdminBtn.classList.add('d-none');
    navDocenteBtn.classList.remove('d-none');
    loginError.classList.add('d-none');
}

function showAdminDashboard() {
    viewDocente.classList.remove('active');
    viewDocente.classList.add('d-none');
    viewAdminLogin.classList.remove('active');
    viewAdminLogin.classList.add('d-none');
    viewAdminDashboard.classList.add('active');
    viewAdminDashboard.classList.remove('d-none');
    
    navAdminBtn.classList.add('d-none');
    navDocenteBtn.classList.remove('d-none');
    
    renderDashboard();
}

// --- LOGICA FORMULARIO DOCENTE ---
function setMinDate() {
    const today = new Date();
    // Previene seleccionar fechas en el pasado
    const isoDate = today.toISOString().split('T')[0];
    fieldFecha.setAttribute('min', isoDate);
}

function isWeekend(dateString) {
    const date = new Date(`${dateString}T00:00:00`); // Forzar evaluación local de la fecha
    const day = date.getDay();
    return (day === 6 || day === 0);
}

function getDayOfWeek(dateString) {
    const date = new Date(`${dateString}T00:00:00`);
    return date.getDay(); // 0: Dom, 1: Lun, ..., 5: Vie, 6: Sab
}

function getAvailableBlocks(dateString) {
    const day = getDayOfWeek(dateString);
    const isFriday = day === 5;
    const baseBlocks = isFriday ? [...BLOCKS_FRI] : [...BLOCKS_MON_THU];
    
    // Obtener bloques ya reservados para esa fecha específica
    const reservedOnDate = reservas
        .filter(r => r.fecha === dateString)
        .map(r => r.bloque);

    return {
        base: baseBlocks,
        reserved: reservedOnDate
    };
}

function handleFechaChange() {
    const fecha = fieldFecha.value;
    
    // Resetear opciones del bloque horario
    fieldBloque.innerHTML = '<option value="">Seleccione un bloque...</option>';
    fieldBloque.disabled = true;

    if (!fecha) return;

    // Validación Lunes-Viernes
    if (isWeekend(fecha)) {
        alert("Atención: Solo se puede reservar la sala de lunes a viernes.");
        fieldFecha.value = "";
        return;
    }

    const blocksData = getAvailableBlocks(fecha);
    
    // Llenar el <select> de bloques horarios iterando el array base
    blocksData.base.forEach(b => {
        const option = document.createElement('option');
        option.value = b;
        option.textContent = b;
        
        // Deshabilitar bloque si ya está en uso
        if (blocksData.reserved.includes(b)) {
            option.disabled = true;
            option.textContent += " (Ocupado)";
        }
        
        fieldBloque.appendChild(option);
    });

    fieldBloque.disabled = false;

    // Bloqueo total si todos los bloques están llenos
    if (blocksData.reserved.length >= blocksData.base.length) {
        alert("Lo sentimos. Ese día ya tiene todos los bloques horarios reservados.");
        fieldFecha.value = "";
        fieldBloque.innerHTML = '<option value="">Día completamente ocupado...</option>';
        fieldBloque.disabled = true;
    }
}

function handleReservaSubmit(e) {
    e.preventDefault();

    const profesor = document.getElementById('profesor').value.trim();
    const fecha = fieldFecha.value;
    const bloque = fieldBloque.value;
    const curso = document.getElementById('curso').value;
    const asignatura = document.getElementById('asignatura').value;
    const objetivo = document.getElementById('objetivo').value.trim();

    // Doble validación por seguridad (por si alguien envió mientras se leía)
    const blocksData = getAvailableBlocks(fecha);
    if (blocksData.reserved.includes(bloque)) {
        alert("Error crítico: El bloque seleccionado acaba de ser reservado. Por favor elija otro.");
        handleFechaChange();
        return;
    }

    const nuevaReserva = {
        id: Date.now().toString(),
        profesor,
        fecha,
        bloque,
        curso,
        asignatura,
        objetivo,
        estado: 'Pendiente', 
        createdAt: new Date().toISOString()
    };

    reservas.push(nuevaReserva);
    saveReservas();
    
    showToast("¡Solicitud registrada con éxito!");
    
    // Limpiar campos form
    reservaForm.reset();
    fieldBloque.innerHTML = '<option value="">Seleccione una fecha primero...</option>';
    fieldBloque.disabled = true;
}

// --- LÓGICA DE ADMINISTRADOR ---
function handleLogin(e) {
    e.preventDefault();
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;

    // Hardcode validation
    if (user === 'admin' && pass === 'admin123') {
        isAdminLogged = true;
        loginForm.reset();
        showAdminDashboard();
    } else {
        loginError.classList.remove('d-none');
    }
}

function handleLogout() {
    isAdminLogged = false;
    showDocenteView();
}

function getStatusClass(statusStr) {
    if (statusStr === 'Pendiente') return 'status-Pendiente';
    if (statusStr === 'Asistió') return 'status-Asistio';
    if (statusStr === 'No asistió') return 'status-NoAsistio';
    return '';
}

function renderDashboard() {
    reservasTbody.innerHTML = '';
    
    if (reservas.length === 0) {
        noReservasMsg.classList.remove('d-none');
        document.querySelector('.table-responsive').classList.add('d-none');
        return;
    }

    noReservasMsg.classList.add('d-none');
    document.querySelector('.table-responsive').classList.remove('d-none');

    // Ordenamiento: Por fecha (descendente de la más reciente a la más antigua)
    const sortedReservas = [...reservas].sort((a, b) => {
        const dateA = new Date(a.fecha);
        const dateB = new Date(b.fecha);
        // Fecha más reciente primero
        if (dateB.getTime() !== dateA.getTime()){
            return dateB - dateA; 
        }
        // Y en el mismo día ordeno por bloque ascendente
        return a.bloque.localeCompare(b.bloque);
    });

    // Renderizar registros en la tabla
    sortedReservas.forEach(res => {
        const tr = document.createElement('tr');
        
        // Formatear Fecha DD/MM/YYYY
        const [year, month, day] = res.fecha.split('-');
        const niceDate = `${day}/${month}/${year}`;
        const sClass = getStatusClass(res.estado);

        tr.innerHTML = `
            <td>${niceDate}</td>
            <td>${res.bloque}</td>
            <td><strong>${escapeHtml(res.profesor)}</strong></td>
            <td>${res.curso}</td>
            <td>${res.asignatura}</td>
            <td><small>${escapeHtml(res.objetivo)}</small></td>
            <td>
                <select class="status-select ${sClass}" data-id="${res.id}">
                    <option value="Pendiente" ${res.estado === 'Pendiente' ? 'selected' : ''}>Pendiente</option>
                    <option value="Asistió" ${res.estado === 'Asistió' ? 'selected' : ''}>Asistió</option>
                    <option value="No asistió" ${res.estado === 'No asistió' ? 'selected' : ''}>No asistió</option>
                </select>
            </td>
            <td>
                <button class="btn-danger-icon" data-id="${res.id}" title="Eliminar Reserva">
                    &#128465; Borrar
                </button>
            </td>
        `;

        reservasTbody.appendChild(tr);
    });

    // Delegar eventos de estado
    document.querySelectorAll('.status-select').forEach(sel => {
        sel.addEventListener('change', function() {
            updateReservaStatus(this.dataset.id, this.value);
            this.className = `status-select ${getStatusClass(this.value)}`; // actualiza clases visuales
        });
    });

    // Delegar eventos de borrado
    document.querySelectorAll('.btn-danger-icon').forEach(btn => {
        btn.addEventListener('click', function() {
            if (confirm("¿Estás seguro que deseas eliminar esta reserva? Este bloque será librado inmediatamente para los docentes.")) {
                deleteReserva(this.dataset.id);
            }
        });
    });
}

function updateReservaStatus(id, newStatus) {
    const idx = reservas.findIndex(r => r.id === id);
    if (idx !== -1) {
        reservas[idx].estado = newStatus;
        saveReservas();
    }
}

function deleteReserva(id) {
    reservas = reservas.filter(r => r.id !== id);
    saveReservas();
    renderDashboard(); // Re-render table
}

// Previne brechas XSS
function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

// Iniciar app
init();
