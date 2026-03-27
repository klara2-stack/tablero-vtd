import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// === 1. CONFIGURACIÓN DE FIREBASE === 
// (Deberás rellenar esto una vez crees tu proyecto gratis en console.firebase.google.com)
const firebaseConfig = {
    apiKey: "AIzaSyBvaUmun5n5_ZpT3VkwsCeRWQ9Eas6UAFc",
    authDomain: "tablero-comunicaciones-vtd.firebaseapp.com",
    projectId: "tablero-comunicaciones-vtd",
    storageBucket: "tablero-comunicaciones-vtd.firebasestorage.app",
    messagingSenderId: "783962170954",
    appId: "1:783962170954:web:421623cb0f02f0bfb368b3"
    measurementId: "G-HD0VGPF494"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- DATA SCHEMA & OPTIONS ---
const OPTIONS = {
    frenteTrabajo: ['Tu+', 'VTD', 'GC'],
    iniciativas: [
        'i1 Puesta en marcha de maestrías no presenciales',
        'i2 Ecosistema de analítica institucional',
        'i3 Gestión del cambio',
        'i4 Exploraciones digitales',
        'i5e Experiencia e inteligencia de cliente EDCO',
        'i5p Estrategia de atracción de aspirantes',
        'i6e Modelos flexibles para oferta EDCO',
        'i6p Diseño y producción de la oferta no presencial de posgrado',
        'i7 Tecnologías inmersivas',
        'i8a Estrategia Web',
        'i8b Campus inteligente',
        'i9 Consejería académica y plan de éxito estudiantil',
        'i11 Gestión curricular',
        'i12 Escritorios virtuales Nukak',
        'i13 Aprendizaje adaptativo',
        'i14 Analítica de aprendizaje e IA instruccional',
        'i15 Sistema de biblioteca digital',
        'i16 Ecosistema para la gestión académica',
        'i16 Algoritmo Uniandes',
        'i16 SIMON',
        'i16 AHA',
        'i17 Credenciales digitales',
        'i18 Experiencia de pagos',
        'i19 Modelo de atención institucional',
        'i20 Expedientes digitales'
    ],
    responsables: ['Katheryn Lara Bobadilla', 'Camilo Fresneda', 'Diego Quiroga'],
    estado: ['En proceso', 'En aprobación', 'Entregado'],
    formatos: ['Pieza gráfica', 'Video', 'Infografía', 'PPT', 'Otro'],
    canal: ['Viva VTD', 'Mail', 'Instagram DECA', 'Teams', 'Otro']
};

let tableData = [];
let allProfiles = {};
let currentUserRole = null; // 'admin', 'editor', 'viewer'
let currentUserEmail = '';
let unsubDatos = null;
let unsubPerfiles = null;

// --- AUTH LOGIC ---
document.getElementById('loginBtn').addEventListener('click', () => {
    const emailInput = document.getElementById('email').value.trim();
    if (emailInput.endsWith('@uniandes.edu.co')) {
        document.getElementById('authError').style.display = 'none';

        currentUserEmail = emailInput;
        // Asignación de Roles Exactos
        if (emailInput === 'comunicacionesvtd@uniandes.edu.co') {
            currentUserRole = 'admin';
        } else if (['c.fresneda@uniandes.edu.co', 'd.quirogac@uniandes.edu.co', 'k.lara2@uniandes.edu.co'].includes(emailInput)) {
            currentUserRole = 'editor';
        } else if (['verosu@uniandes.edu.co', 'jp.bernal@uniandes.edu.co'].includes(emailInput)) {
            currentUserRole = 'viewer';
        } else {
            // Usuario bloqueado si no tiene rol
            document.getElementById('authError').innerText = 'Tu usuario no está autorizado para este tablero.';
            document.getElementById('authError').style.display = 'block';
            return;
        }

        document.getElementById('authOverlay').style.display = 'none';

        // Listen Real-time Firestore Updates
        unsubDatos = onSnapshot(doc(db, "tablero", "datos"), (docSnap) => {
            if (docSnap.exists()) {
                tableData = docSnap.data().rows || [];
            } else {
                tableData = [];
            }
            initTable();
        });

        unsubPerfiles = onSnapshot(doc(db, "tablero", "perfiles"), (docSnap) => {
            if (docSnap.exists()) {
                allProfiles = docSnap.data().users || {};
            } else {
                allProfiles = {};
            }
            updateProfileUI();
        });

        checkAutomations();
    } else {
        document.getElementById('authError').style.display = 'block';
    }
});

// --- RENDER TABLE ---
function initTable() {
    renderRows();
    if (document.getElementById('metricsView') && document.getElementById('metricsView').style.display === 'block') {
        updateMetrics();
    }
}

async function saveData() {
    if (currentUserRole !== 'viewer') {
        try {
            await setDoc(doc(db, "tablero", "datos"), { rows: tableData });
        } catch (e) {
            console.error("Error guardando datos:", e);
        }
    }
}

function getOptionsHTML(optionsArray, selectedValue) {
    let html = `<option value="">Seleccione...</option>`;
    optionsArray.forEach(opt => {
        const isSelected = selectedValue === opt ? 'selected' : '';
        html += `<option value="${opt}" ${isSelected}>${opt}</option>`;
    });
    // Add custom value if 'Otro' was used to enter custom text
    if (selectedValue && !optionsArray.includes(selectedValue) && selectedValue !== '') {
        html += `<option value="${selectedValue}" selected>${selectedValue}</option>`;
    }
    return html;
}

function renderRows() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    tableData.forEach((row, index) => {
        const tr = document.createElement('tr');

        // Disable inputs if viewer
        const disabled = currentUserRole === 'viewer' ? 'disabled' : '';

        // 0. ID (Number of request)
        let idTD = `<td style="text-align:center; font-weight: 500; color: var(--text-muted);">${row.id}</td>`;
        // 1. Frente
        let frenteTD = `<td><select class="cell-select" onchange="updateCell(${index}, 'frente', this.value)" ${disabled}>${getOptionsHTML(OPTIONS.frenteTrabajo, row.frente)}</select></td>`;
        // 2. Iniciativas
        let initTD = `<td><select class="cell-select" onchange="updateCell(${index}, 'iniciativa', this.value)" ${disabled}>${getOptionsHTML(OPTIONS.iniciativas, row.iniciativa)}</select></td>`;

        // 3. Responsable (Standard Select)
        let respTD = `<td><select class="cell-select" onchange="updateCell(${index}, 'responsable', this.value)" ${disabled}>${getOptionsHTML(OPTIONS.responsables, row.responsable)}</select></td>`;

        // 4. Estado
        let bgColorClass = 'status-placeholder';
        if (row.estado === 'En proceso') bgColorClass = 'status-En-proceso';
        else if (row.estado === 'En aprobación') bgColorClass = 'status-En-aprobacion';
        else if (row.estado === 'Entregado') bgColorClass = 'status-Entregado';

        let estadoTD = `<td style="position:relative">
            <select class="cell-select" style="position:relative; z-index:2; opacity:0; appearance:auto; height:100%; width:100%" onchange="updateCell(${index}, 'estado', this.value)" ${disabled}>
                ${getOptionsHTML(OPTIONS.estado, row.estado)}
            </select>
            <div class="status-label ${bgColorClass}">
                ${row.estado || ''}
            </div>
        </td>`;

        // 5. Formatos (Handles 'Otro')
        let formatTD = `<td><select class="cell-select" onchange="handleOtro(${index}, 'formato', this)" ${disabled}>${getOptionsHTML(OPTIONS.formatos, row.formato)}</select></td>`;

        // 6. Descripción
        let textTD = `<td class="textarea-cell"><textarea class="cell-textarea" onchange="updateCell(${index}, 'descripcion', this.value)" ${disabled}>${row.descripcion || ''}</textarea></td>`;

        // 7. Fecha de entrega (Format Colombia native date picker)
        let fechaEntregaTD = `<td><input type="date" class="cell-input" value="${row.fechaEntrega || ''}" onchange="updateCell(${index}, 'fechaEntrega', this.value)" ${disabled}></td>`;

        // 8. Horas
        let horasTD = `<td><input type="number" class="cell-input" min="0" value="${row.horas || ''}" onchange="updateCell(${index}, 'horas', this.value)" ${disabled}></td>`;

        // 9. Fecha de publicacion
        let fechaPubTD = `<td><input type="date" class="cell-input" value="${row.fechaPub || ''}" onchange="updateCell(${index}, 'fechaPub', this.value)" ${disabled}></td>`;

        // 10. Canal
        let canalTD = `<td><select class="cell-select" onchange="handleOtro(${index}, 'canal', this)" ${disabled}>${getOptionsHTML(OPTIONS.canal, row.canal)}</select></td>`;

        // 11. Impresiones
        let impTD = `<td class="textarea-cell"><textarea class="cell-textarea" onchange="updateCell(${index}, 'impresiones', this.value)" ${disabled}>${row.impresiones || ''}</textarea></td>`;

        // 12. Observaciones
        let obsTD = `<td class="textarea-cell"><textarea class="cell-textarea" onchange="updateCell(${index}, 'observaciones', this.value)" ${disabled}>${row.observaciones || ''}</textarea></td>`;

        // Delete toggle
        let delTD = currentUserRole !== 'viewer' ? `<td style="text-align:center"><button onclick="deleteRow(${index})" style="background:transparent; border:none; color:var(--text-muted); cursor:pointer">✖</button></td>` : `<td></td>`;

        tr.innerHTML = idTD + frenteTD + initTD + respTD + estadoTD + formatTD + textTD + fechaEntregaTD + horasTD + fechaPubTD + canalTD + impTD + obsTD + delTD;
        tbody.appendChild(tr);
    });
}

// Handle Custom "Otro" value
window.handleOtro = function (index, field, selectElement) {
    let value = selectElement.value;
    if (value === 'Otro') {
        let customValue = prompt('Escriba el nuevo valor:');
        if (customValue && customValue.trim() !== '') {
            value = customValue.trim();
        } else {
            value = ''; // Reset if cancelled
        }
    }
    updateCell(index, field, value);
    renderRows();
}

window.updateCell = function (index, key, value) {
    if (currentUserRole === 'viewer') return;
    tableData[index][key] = value;
    saveData();
    // Re-render specifically for Estado to update color, but for performance usually we just update DOM.
    if (key === 'estado' || key === 'formato' || key === 'canal') {
        renderRows();
    }
    if (document.getElementById('metricsView').style.display === 'block') {
        updateMetrics();
    }
}

window.deleteRow = function (index) {
    if (currentUserRole !== 'viewer') {
        if (confirm('¿Seguro que deseas eliminar esta fila?')) {
            tableData.splice(index, 1);
            saveData();
            renderRows();
            if (document.getElementById('metricsView').style.display === 'block') updateMetrics();
        }
    }
}

window.addRow = function () {
    if (currentUserRole !== 'viewer') {
        let nextId = 1;
        if (tableData.length > 0) {
            const ids = tableData.map(r => r.id || 0);
            nextId = Math.max(...ids) + 1;
        }
        tableData.push({
            id: nextId,
            frente: '', iniciativa: '', responsable: '', estado: '', formato: '',
            descripcion: '', fechaEntrega: '', horas: '', fechaPub: '', canal: '',
            impresiones: '', observaciones: ''
        });
        saveData();
        renderRows();
        if (document.getElementById('metricsView').style.display === 'block') updateMetrics();
    }
}

document.getElementById('addBtn').addEventListener('click', addRow);
document.getElementById('addRowInlineBtn').addEventListener('click', addRow);

// --- AUTOMATION SIMULATION ---
function checkAutomations() {
    // Check for fecha de entrega 2 days away
    const today = new Date();
    // Set to start of day for accurate calculation
    today.setHours(0, 0, 0, 0);

    let notifications = [];
    tableData.forEach((row, index) => {
        if (row.fechaEntrega && row.estado !== 'Entregado') {
            const deliveryDate = new Date(row.fechaEntrega);
            // Time diff in days
            const diffTime = deliveryDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 2) {
                notifications.push(`- Iniciativa "${row.iniciativa}" (Fila ${index + 1}) vence en exactamente 2 días. Se notificará a: ${row.responsables.join(', ')}`);
            }
        }
    });

    if (notifications.length > 0) {
        // Mock email sending
        setTimeout(() => {
            alert("AUTOMATIZACIÓN (Simulación de correo electrónico):\n\n" + notifications.join("\n"));
        }, 1500);
    }
}

// --- SIDEBAR TOGGLE ---
document.getElementById('sidebarToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('collapsed');
});

// --- PROFILE & LOGOUT LOGIC ---
function getProfileData(email) {
    return allProfiles[email] || { name: email, position: '', avatarUrl: '' };
}

async function saveProfileData(email, data) {
    allProfiles[email] = data;
    try {
        await setDoc(doc(db, "tablero", "perfiles"), { users: allProfiles }, { merge: true });
    } catch (e) {
        console.error("Error guardando perfil:", e);
    }
}

function updateProfileUI() {
    if (!currentUserEmail) return;
    const profile = getProfileData(currentUserEmail);
    const displayRole = profile.position ? profile.position : currentUserRole;
    let displayName = profile.name === currentUserEmail ? profile.name.split('@')[0] : profile.name;
    document.getElementById('currentUserDisplay').innerText = displayName + ` (${displayRole})`;

    const avatarEl = document.getElementById('avatarDisplay');
    if (profile.avatarUrl) {
        avatarEl.style.backgroundImage = `url(${profile.avatarUrl})`;
        avatarEl.innerText = '';
    } else {
        avatarEl.style.backgroundImage = 'none';
        avatarEl.innerText = displayName.charAt(0).toUpperCase();
    }
}

document.getElementById('userProfileToggle').addEventListener('click', (e) => {
    if (currentUserEmail) {
        document.getElementById('profileDropdown').classList.toggle('show');
    }
});

document.addEventListener('click', (e) => {
    const toggle = document.getElementById('userProfileToggle');
    if (toggle && !toggle.contains(e.target)) {
        const dropdown = document.getElementById('profileDropdown');
        if (dropdown) dropdown.classList.remove('show');
    }
});

document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    if (unsubDatos) unsubDatos();
    if (unsubPerfiles) unsubPerfiles();
    currentUserEmail = '';
    currentUserRole = null;
    document.getElementById('authOverlay').style.display = 'flex';
    document.getElementById('profileDropdown').classList.remove('show');
    document.getElementById('tableBody').innerHTML = ''; // clear table
    document.getElementById('email').value = ''; // clear login input
});

document.getElementById('openProfileBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('profileDropdown').classList.remove('show');

    const profile = getProfileData(currentUserEmail);
    const nameInput = document.getElementById('profileName');
    const roleInput = document.getElementById('profileRole');

    nameInput.value = profile.name === currentUserEmail ? currentUserEmail.split('@')[0] : profile.name;
    roleInput.value = profile.position || '';

    document.getElementById('profileOverlay').style.display = 'flex';
});

document.getElementById('closeProfileBtn').addEventListener('click', () => {
    document.getElementById('profileOverlay').style.display = 'none';
});

document.getElementById('saveProfileBtn').addEventListener('click', () => {
    const name = document.getElementById('profileName').value.trim();
    const position = document.getElementById('profileRole').value.trim();

    const profile = getProfileData(currentUserEmail);
    saveProfileData(currentUserEmail, { name: name || currentUserEmail, position, avatarUrl: profile.avatarUrl });
    updateProfileUI();
    document.getElementById('profileOverlay').style.display = 'none';
});

// --- METRICS & NAVIGATION LOGIC ---
let chartFrente, chartEstado;

function updateMetrics() {
    const total = tableData.length;
    const enProceso = tableData.filter(r => r.estado === 'En proceso').length;
    const entregado = tableData.filter(r => r.estado === 'Entregado').length;

    document.getElementById('metricTotal').innerText = total;
    document.getElementById('metricProceso').innerText = enProceso;
    document.getElementById('metricEntregado').innerText = entregado;

    // Frente Chart Data
    const frenteCounts = {};
    OPTIONS.frenteTrabajo.forEach(f => frenteCounts[f] = 0);
    tableData.forEach(r => {
        if (r.frente && frenteCounts[r.frente] !== undefined) frenteCounts[r.frente]++;
    });

    if (chartFrente) chartFrente.destroy();
    const ctxFrente = document.getElementById('frenteChart');
    if (ctxFrente) {
        chartFrente = new Chart(ctxFrente.getContext('2d'), {
            type: 'bar',
            data: {
                labels: Object.keys(frenteCounts),
                datasets: [{
                    label: 'Solicitudes',
                    data: Object.values(frenteCounts),
                    backgroundColor: '#4e5deb',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { stepSize: 1, color: '#9ba0bc' } },
                    x: { ticks: { color: '#9ba0bc' } }
                }
            }
        });
    }

    // Estado Chart Data
    const estadoCounts = {
        'En proceso': enProceso,
        'En aprobación': tableData.filter(r => r.estado === 'En aprobación').length,
        'Entregado': entregado
    };

    if (chartEstado) chartEstado.destroy();
    const ctxEstado = document.getElementById('estadoChart');
    if (ctxEstado) {
        chartEstado = new Chart(ctxEstado.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: Object.keys(estadoCounts),
                datasets: [{
                    data: Object.values(estadoCounts),
                    backgroundColor: ['#fdab3d', '#579bfc', '#00c875'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#9ba0bc' } }
                }
            }
        });
    }
}

document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', (e) => {
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const text = e.currentTarget.innerText.trim();
        if (text === 'Tablero Principal') {
            document.getElementById('boardView').style.display = 'block';
            document.getElementById('metricsView').style.display = 'none';
        } else if (text === 'Métricas') {
            document.getElementById('boardView').style.display = 'none';
            document.getElementById('metricsView').style.display = 'block';
            updateMetrics();
        }
    });
});
