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
    appId: "1:783962170954:web:421623cb0f02f0bfb368b3",
    measurementId: "G-HD0VGPF494"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- DATA SCHEMA & OPTIONS ---
const OPTIONS = {
    frenteTrabajo: ['Tu+', 'VTD', 'GC'],
    prioridad: ['Alta', 'Media', 'Baja'],
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
let groupsData = [];
let openGroups = {};
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
                groupsData = docSnap.data().groups || [];
            } else {
                tableData = [];
                groupsData = [];
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
            await setDoc(doc(db, "tablero", "datos"), { rows: tableData, groups: groupsData });
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

function openTaskCard(tareaId) {
    const panel = document.getElementById('task-panel');
    const content = document.getElementById('panel-content');

    // Buscamos la tarea en nuestro arreglo local de datos
    const tarea = todasLasTareas.find(t => t.id === tareaId);

    if (tarea) {
        content.innerHTML = `
            <div class="card-field">
                <label>Responsable</label>
                <p>${tarea.responsable}</p>
            </div>
            <div class="card-field">
                <label>Descripción detallada</label>
                <textarea class="edit-area">${tarea.descripcion || 'Sin descripción...'}</textarea>
            </div>
            <div class="card-field">
                <label>Última actualización</label>
                <small>${tarea.fechaEdicion || 'N/A'}</small>
            </div>
        `;
        panel.classList.add('open');
    }
}

function getRandomColor() {
    const colors = ['#fdab3d', '#00c875', '#579bfc', '#a25ddc', '#e2445c', '#0086c0', '#cab641', '#ff7575'];
    return colors[Math.floor(Math.random() * colors.length)];
}

window.addGroup = function () {
    if (currentUserRole === 'viewer') return;
    const newId = 'g_' + Date.now();
    groupsData.push({ id: newId, name: 'Nuevo grupo', color: getRandomColor() });
    saveData();
    renderRows();
}

window.updateGroupName = function (groupId, newName) {
    if (currentUserRole === 'viewer') return;
    const group = groupsData.find(g => g.id === groupId);
    if (group) {
        group.name = newName;
        saveData();
    }
}

window.deleteGroup = function (groupId) {
    if (currentUserRole === 'viewer') return;
    if (confirm('¿Seguro que deseas eliminar este grupo? Las tareas se moverán al grupo de arriba.')) {
        if (groupsData.length <= 1) return alert('No puedes eliminar el último grupo.');
        const groupIndex = groupsData.findIndex(g => g.id === groupId);
        const fallbackGroupId = groupIndex > 0 ? groupsData[groupIndex - 1].id : groupsData[groupIndex + 1].id;

        tableData.forEach(r => {
            if (r.groupId === groupId) r.groupId = fallbackGroupId;
        });

        groupsData.splice(groupIndex, 1);
        saveData();
        renderRows();
    }
}

function getAvatarHTML(nameOrArray) {
    let names = Array.isArray(nameOrArray) ? nameOrArray : (nameOrArray ? [nameOrArray] : []);
    if (names.length === 0) return `<div class="empty-avatar"><span class="material-symbols-outlined" style="position:relative; top:2px;">person_add</span></div>`;
    
    let html = '<div class="avatar-stack">';
    names.slice(0, 3).forEach((n, i) => {
        const initial = n.charAt(0).toUpperCase();
        html += `<div class="user-avatar" title="${n}" style="z-index:${3-i}; margin-left:${i>0 ? '-8px' : '0'}; border:2px solid var(--bg-card);">${initial}</div>`;
    });
    if(names.length > 3) {
        html += `<div class="user-avatar" style="z-index:0; margin-left:-8px; border:2px solid var(--bg-card); background:var(--bg-hover); color:var(--text-muted); font-size:11px;">+${names.length-3}</div>`;
    }
    html += '</div>';
    return html;
}

let currentAssignRowIndex = null;
window.openAssignModal = function(event, index) {
    if (currentUserRole === 'viewer') return;
    currentAssignRowIndex = index;
    const row = tableData[index];
    const reps = Array.isArray(row.responsable) ? row.responsable : (row.responsable ? [row.responsable] : []);
    
    const container = document.getElementById('assignCheckboxes');
    container.innerHTML = '';
    OPTIONS.responsables.forEach(resp => {
        const checked = reps.includes(resp) ? 'checked' : '';
        const initial = resp.charAt(0).toUpperCase();
        container.innerHTML += `
        <label style="display:flex; align-items:center; gap:10px; cursor:pointer; font-size:13px; color:var(--text-main);">
            <input type="checkbox" value="${resp}" ${checked} style="accent-color: var(--primary);"> 
            <div class="user-avatar" style="width:24px; height:24px; font-size:11px; margin-left:0;">${initial}</div>
            ${resp}
        </label>`;
    });

    const modal = document.getElementById('assignModal');
    modal.style.display = 'block';

    if (event) {
        const rect = event.currentTarget.getBoundingClientRect();
        let top = rect.bottom + window.scrollY + 5;
        let left = rect.left + window.scrollX - 100;
        
        if (left + 280 > window.innerWidth) left = window.innerWidth - 300;
        if (left < 10) left = 10;
        if (top + 280 > window.innerHeight + window.scrollY) top = rect.top + window.scrollY - 270; 

        modal.style.top = top + 'px';
        modal.style.left = left + 'px';
    }
}
window.closeAssignModal = function() {
    document.getElementById('assignModal').style.display = 'none';
}
window.saveAssignModal = function() {
    if(currentAssignRowIndex === null) return;
    const checkboxes = document.querySelectorAll('#assignCheckboxes input:checked');
    const selected = Array.from(checkboxes).map(cb => cb.value);
    tableData[currentAssignRowIndex].responsable = selected;
    saveData();
    renderRows();
    closeAssignModal();
}

function renderRows() {
    const table = document.getElementById('mainTable');

    // Cleanup old tbodys and keep original header
    const oldBodies = table.querySelectorAll('tbody');
    oldBodies.forEach(b => b.remove());

    if (!groupsData || groupsData.length === 0) {
        groupsData = [{ id: 'g_default', name: 'Este mes', color: '#579bfc' }];
    }

    if (Object.keys(openGroups).length === 0 && groupsData.length > 0) {
        openGroups[groupsData[0].id] = true;
    }

    groupsData.forEach((group) => {
        const isGroupOpen = !!openGroups[group.id];
        const headerBody = document.createElement('tbody');
        headerBody.dataset.groupId = group.id;

        const headerTr = document.createElement('tr');
        headerTr.className = 'group-header-row';
        headerTr.innerHTML = `
            <td colspan="16" style="border: none; padding: 24px 0 8px 0; background: var(--bg-card); z-index: 5;">
                <div style="display: flex; align-items: center; gap: 8px; margin-left: 8px;">
                    <div class="group-color-indicator" style="color: ${group.color}; cursor:pointer; display:flex; align-items:center;" onclick="toggleGroup('${group.id}')">
                        <span class="material-symbols-outlined" id="icon_${group.id}">${isGroupOpen ? 'expand_more' : 'chevron_right'}</span>
                    </div>
                    <input type="text" class="group-title-input" value="${group.name}" style="color: ${group.color};" onblur="updateGroupName('${group.id}', this.value)" ${currentUserRole === 'viewer' ? 'disabled' : ''}>
                    <span style="color: var(--text-muted); font-size: 13px;">${tableData.filter(r => r.groupId === group.id).length} tareas</span>
                    ${currentUserRole !== 'viewer' ? `<button class="group-delete-btn" onclick="deleteGroup('${group.id}')" title="Eliminar grupo"><span class="material-symbols-outlined" style="font-size:20px;">delete_outline</span></button>` : ''}
                </div>
            </td>
        `;
        headerBody.appendChild(headerTr);
        table.appendChild(headerBody);

        const groupRows = tableData.filter(r => r.groupId === group.id || (!r.groupId && group.id === groupsData[0].id));

        const rowsContainer = document.createElement('tbody');
        rowsContainer.id = `group_rows_${group.id}`;
        rowsContainer.dataset.groupId = group.id;
        rowsContainer.className = 'sortable-list';
        rowsContainer.style.display = isGroupOpen ? '' : 'none';

        if (isGroupOpen) {
            const colsTr = document.createElement('tr');
            colsTr.className = 'group-columns-row';
            colsTr.innerHTML = `
                <th style="width: 40px;"></th>
                <th style="min-width: 100px;">Solicitud</th>
                <th style="width: 50px;"></th>
                <th style="min-width: 160px;">Fecha de solicitud</th>
                <th style="min-width: 150px;">Frente de trabajo</th>
                <th style="min-width: 280px;">Iniciativas</th>
                <th style="min-width: 200px;">Responsable</th>
                <th style="min-width: 160px;">Estado</th>
                <th style="min-width: 150px;">Formatos</th>
                <th style="min-width: 160px;">Fecha de entrega</th>
                <th style="min-width: 160px;">Prioridad</th>
                <th style="min-width: 180px;">Fecha publicación</th>
                <th style="min-width: 150px;">Canal</th>
                <th style="width: 40px;"></th>
            `;
            rowsContainer.appendChild(colsTr);
        }

        groupRows.forEach((row) => {
            const index = tableData.findIndex(r => r.id === row.id);
            const tr = document.createElement('tr');
            tr.dataset.index = index;
            const disabled = currentUserRole === 'viewer' ? 'disabled' : '';

            let dragTD = `<td style="border-left: 6px solid ${group.color}; text-align:center; cursor:grab; color:var(--text-muted); width: 40px; border-bottom: 2px solid var(--bg-card);" class="drag-handle"><span class="material-symbols-outlined" style="font-size:18px; position:relative; top:2px;">drag_indicator</span></td>`;
            let idTD = `<td style="text-align:center; font-weight: 500; font-size: 13px; color: var(--text-muted);">${row.id}</td>`;
            let bubbleCount = row.comentarios && row.comentarios.length > 0 ? `<span class="update-badge">${row.comentarios.length}</span>` : '';
            let btnPanelTD = `<td style="text-align:center;"><button onclick="openPanel(${index})" class="update-bubble-btn" title="Abrir detalles/comentarios"><span class="material-symbols-outlined">add_comment</span>${bubbleCount}</button></td>`;
            let fechaSolTD = `<td><input type="date" class="cell-input" value="${row.fechaSolicitud || ''}" onchange="updateCell(${index}, 'fechaSolicitud', this.value)" ${disabled}></td>`;
            let frenteTD = `<td><select class="cell-select" onchange="updateCell(${index}, 'frente', this.value)" ${disabled}>${getOptionsHTML(OPTIONS.frenteTrabajo, row.frente)}</select></td>`;
            let initTD = `<td><select class="cell-select" onchange="updateCell(${index}, 'iniciativa', this.value)" ${disabled}>${getOptionsHTML(OPTIONS.iniciativas, row.iniciativa)}</select></td>`;
            let respTD = `<td style="text-align:center; cursor:${disabled ? 'default' : 'pointer'};" onclick="${disabled ? '' : `openAssignModal(event, ${index})`}">
                <div style="display:flex; justify-content:center; align-items:center; width:100%; height:100%;">
                    ${getAvatarHTML(row.responsable)}
                </div>
            </td>`;

            let bgColorClass = 'status-placeholder';
            if (row.estado === 'En proceso') bgColorClass = 'status-En-proceso';
            else if (row.estado === 'En aprobación') bgColorClass = 'status-En-aprobacion';
            else if (row.estado === 'Entregado') bgColorClass = 'status-Entregado';

            let estadoTD = `<td style="position:relative">
                <select class="cell-select" style="position:relative; z-index:2; opacity:0; appearance:auto; height:100%; width:100%" onchange="updateCell(${index}, 'estado', this.value)" ${disabled}>
                    ${getOptionsHTML(OPTIONS.estado, row.estado)}
                </select>
                <div class="status-label ${bgColorClass}">${row.estado || ''}</div>
            </td>`;

            let formatTD = `<td><select class="cell-select" onchange="handleOtro(${index}, 'formato', this)" ${disabled}>${getOptionsHTML(OPTIONS.formatos, row.formato)}</select></td>`;
            let fechaEntregaTD = `<td><input type="date" class="cell-input" value="${row.fechaEntrega || ''}" onchange="updateCell(${index}, 'fechaEntrega', this.value)" ${disabled}></td>`;
            
            let bgPrioClass = 'status-placeholder';
            if (row.prioridad === 'Alta') bgPrioClass = 'status-Alta';
            else if (row.prioridad === 'Media') bgPrioClass = 'status-Media';
            else if (row.prioridad === 'Baja') bgPrioClass = 'status-Baja';
            
            let prioridadTD = `<td style="position:relative">
                <select class="cell-select" style="position:relative; z-index:2; opacity:0; appearance:auto; height:100%; width:100%" onchange="updateCell(${index}, 'prioridad', this.value)" ${disabled}>
                    ${getOptionsHTML(OPTIONS.prioridad, row.prioridad)}
                </select>
                <div class="status-label ${bgPrioClass}">${row.prioridad || ''}</div>
            </td>`;

            let fechaPubTD = `<td><input type="date" class="cell-input" value="${row.fechaPub || ''}" onchange="updateCell(${index}, 'fechaPub', this.value)" ${disabled}></td>`;
            let canalTD = `<td><select class="cell-select" onchange="handleOtro(${index}, 'canal', this)" ${disabled}>${getOptionsHTML(OPTIONS.canal, row.canal)}</select></td>`;
            let delTD = currentUserRole !== 'viewer' ? `<td style="text-align:center"><button onclick="deleteRow(${index})" style="background:transparent; border:none; color:var(--text-muted); cursor:pointer; display:flex; justify-content:center; width:100%;"><span class="material-symbols-outlined" style="font-size:20px;">close</span></button></td>` : `<td></td>`;

            tr.innerHTML = dragTD + idTD + btnPanelTD + fechaSolTD + frenteTD + initTD + respTD + estadoTD + formatTD + fechaEntregaTD + prioridadTD + fechaPubTD + canalTD + delTD;
            rowsContainer.appendChild(tr);
        });

        if (currentUserRole !== 'viewer') {
            const addRowTr = document.createElement('tr');
            addRowTr.innerHTML = `
                <td colspan="16" style="border:none; border-left: 6px solid ${group.color};">
                    <div class="add-row-btn" style="padding-left: 10px;" onclick="addRow('${group.id}')">
                        + Agregar a este grupo
                    </div>
                </td>
            `;
            rowsContainer.appendChild(addRowTr);
        }

        table.appendChild(rowsContainer);
    });

    if (currentUserRole !== 'viewer' && typeof Sortable !== 'undefined') {
        document.querySelectorAll('.sortable-list').forEach(el => {
            Sortable.create(el, {
                group: 'shared',
                animation: 150,
                handle: '.drag-handle',
                filter: '.add-row-btn',
                onEnd: function (evt) {
                    const itemEl = evt.item;
                    const oldIndexStr = itemEl.dataset.index;
                    if (!oldIndexStr) return;

                    const movedItem = tableData[oldIndexStr];
                    const newGroupId = evt.to.dataset.groupId;

                    if (movedItem.groupId !== newGroupId) {
                        movedItem.groupId = newGroupId;
                        saveData();
                        renderRows();
                    }
                },
            });
        });
    }
}

window.toggleGroup = function (groupId) {
    if (openGroups[groupId]) {
        delete openGroups[groupId];
    } else {
        openGroups[groupId] = true;
    }
    renderRows();
}

let allExpanded = false;
window.toggleAllGroups = function() {
    allExpanded = !allExpanded;
    if (allExpanded) {
        groupsData.forEach(g => openGroups[g.id] = true);
    } else {
        openGroups = {};
    }
    renderRows();
}
if(document.getElementById('toggleAllBtn')) {
    document.getElementById('toggleAllBtn').addEventListener('click', toggleAllGroups);
}

window.panelCurrentTab = 'updates';
window.currentPanelIndex = null;

window.switchPanelTab = function(tab) {
    document.querySelectorAll('.panel-tab').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');
    window.panelCurrentTab = tab;
    if (window.currentPanelIndex !== null) {
        renderPanelContent(window.currentPanelIndex);
    }
}

window.openPanel = function(index) {
    if (currentUserRole === 'viewer') return;
    window.currentPanelIndex = index;
    const row = tableData[index];
    document.getElementById('panel-title').innerText = row.iniciativa || row.frente || `Solicitud #${row.id}`;
    document.getElementById('task-panel').classList.add('open');
    renderPanelContent(index);
}

window.closePanel = function() {
    document.getElementById('task-panel').classList.remove('open');
}

window.renderPanelContent = function(index) {
    const row = tableData[index];
    const content = document.getElementById('panel-content');
    
    if(!row.comentarios) row.comentarios = [];

    if (window.panelCurrentTab === 'updates') {
        let commentsHtml = '';
        row.comentarios.forEach((c, cIndex) => {
            const avatarInitial = c.author ? c.author.charAt(0).toUpperCase() : '?';
            const likesCount = c.likes ? c.likes : 0;
            commentsHtml += `
            <div class="monday-comment-item">
                <div class="monday-comment-header">
                    <div class="monday-comment-author">
                        <div class="monday-comment-avatar">${avatarInitial}</div>
                        ${c.author}
                    </div>
                    <div class="monday-comment-time">
                        <span class="material-symbols-outlined" style="font-size:14px;">schedule</span> ${c.date}
                    </div>
                </div>
                <div class="monday-comment-body">${c.text}</div>
                <div class="monday-comment-footer">
                    <span onclick="likeComment(${index}, ${cIndex})" style="color: ${c.likedByMe ? 'var(--primary)' : 'inherit'}"><span class="material-symbols-outlined" style="font-size:16px;">thumb_up</span> Like ${likesCount > 0 ? `(${likesCount})` : ''}</span>
                    <span onclick="document.getElementById('newCommentText').focus()"><span class="material-symbols-outlined" style="font-size:16px;">reply</span> Reply</span>
                    <span onclick="deleteComment(${index}, ${cIndex})" style="color: #e2445c; margin-left: auto;"><span class="material-symbols-outlined" style="font-size:16px;">delete</span> Eliminar</span>
                </div>
            </div>`;
        });

        content.innerHTML = `
            <div class="update-editor-wrapper">
                <div class="editor-toolbar">
                    <span class="material-symbols-outlined" onmousedown="event.preventDefault(); document.execCommand('bold', false, null)">format_bold</span>
                    <span class="material-symbols-outlined" onmousedown="event.preventDefault(); document.execCommand('italic', false, null)">format_italic</span>
                    <span class="material-symbols-outlined" onmousedown="event.preventDefault(); document.execCommand('underline', false, null)">format_underlined</span>
                    <span class="material-symbols-outlined" onmousedown="event.preventDefault(); document.execCommand('strikeThrough', false, null)">strikethrough_s</span>
                    <span style="border-left:1px solid #e6e9ef; height:20px; margin:0 5px;"></span>
                    <span class="material-symbols-outlined" onmousedown="event.preventDefault(); document.execCommand('insertUnorderedList', false, null)">format_list_bulleted</span>
                    <span class="material-symbols-outlined" onmousedown="event.preventDefault(); document.execCommand('insertOrderedList', false, null)">format_list_numbered</span>
                    <span class="material-symbols-outlined" onmousedown="event.preventDefault(); window.promptLink();">link</span>
                </div>
                <div id="newCommentText" class="editor-textarea" contenteditable="true" style="min-height: 100px; padding: 15px; outline: none; white-space: pre-wrap;" data-placeholder="Escribe una actualización..."></div>
                <div class="editor-footer">
                    <div class="footer-tools">
                        <span onclick="document.getElementById('fileInput_${index}').click()">
                            <span class="material-symbols-outlined">attach_file</span> Add files
                        </span>
                        <span>GIF</span>
                        <span><span class="material-symbols-outlined">mood</span> Emoji</span>
                        <span><span class="material-symbols-outlined">alternate_email</span> Mention</span>
                        <input type="file" id="fileInput_${index}" style="display:none;" multiple onchange="handleFileUpload(event, ${index})">
                    </div>
                    <button class="btn btn-primary" onclick="addComment(${index})">Update</button>
                </div>
            </div>
            <div id="commentsList" style="margin-top: 10px;">
                ${commentsHtml}
            </div>
        `;
    } else if (window.panelCurrentTab === 'files') {
        let filesHtml = (row.archivos || []).map((f, fIndex) => {
            const isImage = f.type && f.type.startsWith('image/');
            const uploadDate = f.date || 'Recientemente';
            const thumbnail = isImage 
                ? `<div style="width:56px; height:56px; border-radius:6px; overflow:hidden; border:1px solid #e6e9ef; display:flex; align-items:center; justify-content:center; flex-shrink:0;"><img src="${f.url}" style="width:100%; height:100%; object-fit:cover;"></div>` 
                : `<div style="width:56px; height:56px; border-radius:6px; overflow:hidden; border:1px solid #e6e9ef; background:#f5f6f8; color:#676879; display:flex; align-items:center; justify-content:center; flex-shrink:0;"><span class="material-symbols-outlined" style="font-size:28px;">description</span></div>`;
            return `
            <div style="background:white; border:1px solid #e6e9ef; border-radius:8px; padding:16px; margin-bottom:12px; display:flex; align-items:flex-start; gap:16px; box-shadow: 0 1px 4px rgba(0,0,0,0.02); transition: box-shadow 0.2s;" onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.05)'" onmouseout="this.style.boxShadow='0 1px 4px rgba(0,0,0,0.02)'">
                ${thumbnail}
                <div style="flex:1; overflow:hidden; min-width:0; padding-top:2px;">
                    <div style="color:#323338; font-weight:600; font-size:14px; white-space:nowrap; text-overflow:ellipsis; overflow:hidden; margin-bottom:6px;">${f.name}</div>
                    <div style="color:#676879; font-size:12px; display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                        <span class="material-symbols-outlined" style="font-size:14px;">navigate_next</span> 
                        <span class="material-symbols-outlined" style="font-size:14px;">grid_on</span> 
                        Columna de formatos
                    </div>
                    <div style="color:#676879; font-size:12px;">${uploadDate}</div>
                </div>
                <div style="display:flex; gap:12px; padding-top:4px;">
                    <span style="color:#676879; cursor:pointer;" onclick="deleteFile(${index}, ${fIndex})" title="Eliminar"><span class="material-symbols-outlined" style="font-size:20px;">delete</span></span>
                    <a href="${f.url}" download="${f.name}" style="color:#676879; cursor:pointer; text-decoration:none;" title="Descargar"><span class="material-symbols-outlined" style="font-size:20px;">download</span></a>
                    ${isImage ? `<span onclick="openImageViewer('${f.url}')" style="color:#676879; cursor:pointer;" title="Previsualizar"><span class="material-symbols-outlined" style="font-size:20px;">visibility</span></span>` : ''}
                </div>
            </div>
            `;
        }).join('');
        
        if (!filesHtml) filesHtml = `<div style="text-align:center; color:#676879; margin-top:40px;">No hay archivos aún.</div>`;

        content.innerHTML = `
            <div style="margin-bottom:20px; text-align:right;">
                <button class="btn" style="border:1px solid #c3c6d4; background:white; color:#323338; font-weight:500;" onclick="document.getElementById('tabFileInput_${index}').click()">
                    <span class="material-symbols-outlined" style="vertical-align:middle; font-size:18px;">add</span> Add file
                </button>
                <input type="file" id="tabFileInput_${index}" style="display:none;" multiple onchange="handleFileUpload(event, ${index})">
            </div>
            ${filesHtml}
        `;
    } else if (window.panelCurrentTab === 'info') {
        content.innerHTML = `
            <div style="background:white; border:1px solid #e6e9ef; border-radius:8px; padding:20px;">
                <div class="info-box-field">
                    <label class="info-box-label">Horas dedicación</label>
                    <input type="number" class="info-box-input" value="${row.horas || ''}" onchange="updateCell(${index}, 'horas', this.value)">
                </div>
                
                <div class="info-box-field">
                    <label class="info-box-label">Impresiones</label>
                    <textarea class="info-box-input" style="height:60px; resize:none;" onchange="updateCell(${index}, 'impresiones', this.value)">${row.impresiones || ''}</textarea>
                </div>
            </div>
        `;
    }
}

window.handleFileUpload = function(event, index) {
    const files = event.target.files;
    if(!files || files.length === 0) return;
    
    if(!tableData[index].archivos) tableData[index].archivos = [];
    
    for(let i=0; i<files.length; i++) {
        const reader = new FileReader();
        reader.onload = function(e) {
            tableData[index].archivos.unshift({
                name: files[i].name,
                url: e.target.result,
                type: files[i].type,
                date: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            });
            saveData();
            renderPanelContent(index);
        };
        reader.readAsDataURL(files[i]);
    }
}

window.deleteFile = function(rowIndex, fileIndex) {
    if(confirm('¿Seguro de eliminar este archivo?')) {
        tableData[rowIndex].archivos.splice(fileIndex, 1);
        saveData();
        renderPanelContent(rowIndex);
    }
}

window.likeComment = function(rowIndex, commentIndex) {
    const row = tableData[rowIndex];
    if(!row.comentarios[commentIndex].likes) row.comentarios[commentIndex].likes = 0;
    
    if(row.comentarios[commentIndex].likedByMe) {
        row.comentarios[commentIndex].likes--;
        row.comentarios[commentIndex].likedByMe = false;
    } else {
        row.comentarios[commentIndex].likes++;
        row.comentarios[commentIndex].likedByMe = true;
    }
    saveData();
    renderPanelContent(rowIndex);
}

window.deleteComment = function(rowIndex, commentIndex) {
    if(confirm('¿Seguro de eliminar este comentario?')) {
        tableData[rowIndex].comentarios.splice(commentIndex, 1);
        saveData();
        renderPanelContent(rowIndex);
    }
}

window.addComment = function(index) {
    const editor = document.getElementById('newCommentText');
    const text = editor.innerHTML.trim();
    if(editor.innerText.trim() === '') return;
    
    if(!tableData[index].comentarios) tableData[index].comentarios = [];
    
    const profileDisplay = (allProfiles && currentUserEmail && allProfiles[currentUserEmail] && allProfiles[currentUserEmail].name) 
                            ? allProfiles[currentUserEmail].name 
                            : (currentUserEmail ? currentUserEmail.split('@')[0] : 'Admin');
                            
    tableData[index].comentarios.unshift({
        author: profileDisplay,
        date: new Date().toLocaleString(),
        text: text
    });
    saveData();
    renderPanelContent(index);
    renderRows(); 
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
    if (key === 'estado' || key === 'formato' || key === 'canal' || key === 'prioridad') {
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

window.addRow = function (groupId) {
    if (currentUserRole !== 'viewer') {
        let nextId = 1;
        if (tableData.length > 0) {
            const ids = tableData.map(r => r.id || 0);
            nextId = Math.max(...ids) + 1;
        }
        if (!groupId && groupsData.length > 0) groupId = groupsData[0].id;
        openGroups[groupId] = true; // Abre el grupo donde ubicamos la tarea

        tableData.push({
            id: nextId,
            groupId: groupId,
            fechaSolicitud: '',
            frente: '', iniciativa: '', responsable: '', estado: '', formato: '',
            descripcion: '', fechaEntrega: '', horas: '', fechaPub: '', canal: '',
            impresiones: '', observaciones: ''
        });
        saveData();
        renderRows();
        if (document.getElementById('metricsView').style.display === 'block') updateMetrics();
    }
}

document.getElementById('addBtn').addEventListener('click', () => addRow(null));
const btnGrp = document.getElementById('addGroupBtn');
if (btnGrp) btnGrp.addEventListener('click', () => addGroup());

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

let chartFrente, chartEstado, chartGrupo, chartResponsable, chartIniciativa;

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
                datasets: [{ data: Object.values(frenteCounts), backgroundColor: '#4e5deb', borderRadius: 4 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
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
                datasets: [{ data: Object.values(estadoCounts), backgroundColor: ['#fdab3d', '#579bfc', '#00c875'], borderWidth: 0 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#9ba0bc' } } } }
        });
    }

    // Grupo Chart Data
    const grupoCounts = {};
    groupsData.forEach(g => grupoCounts[g.name] = 0);
    tableData.forEach(r => {
        const gp = groupsData.find(g => g.id === r.groupId);
        if(gp) grupoCounts[gp.name]++;
    });

    if (chartGrupo) chartGrupo.destroy();
    const ctxGrupo = document.getElementById('grupoChart');
    if (ctxGrupo) {
        chartGrupo = new Chart(ctxGrupo.getContext('2d'), {
            type: 'bar',
            data: {
                labels: Object.keys(grupoCounts),
                datasets: [{ data: Object.values(grupoCounts), backgroundColor: '#a25ddc', borderRadius: 4 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    // Responsable Chart Data
    const respCounts = {};
    OPTIONS.responsables.forEach(r => respCounts[r] = 0);
    tableData.forEach(r => {
        const reps = Array.isArray(r.responsable) ? r.responsable : (r.responsable ? [r.responsable] : []);
        reps.forEach(rep => { if (respCounts[rep] !== undefined) respCounts[rep]++; });
    });

    if (chartResponsable) chartResponsable.destroy();
    const ctxResp = document.getElementById('responsableChart');
    if (ctxResp) {
        chartResponsable = new Chart(ctxResp.getContext('2d'), {
            type: 'bar',
            data: {
                labels: Object.keys(respCounts),
                datasets: [{ data: Object.values(respCounts), backgroundColor: '#00c875', borderRadius: 4 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    // Iniciativa Chart Data
    const initCounts = {};
    tableData.forEach(r => {
        if(r.iniciativa && r.iniciativa.trim() !== '') {
            initCounts[r.iniciativa] = (initCounts[r.iniciativa] || 0) + 1;
        }
    });
    
    // Sort iniciativas por cantidad para mejor visualización
    const sortedInitKeys = Object.keys(initCounts).sort((a,b) => initCounts[b] - initCounts[a]);
    const sortedInitVals = sortedInitKeys.map(k => initCounts[k]);

    if (chartIniciativa) chartIniciativa.destroy();
    const ctxInit = document.getElementById('iniciativaChart');
    if (ctxInit) {
        chartIniciativa = new Chart(ctxInit.getContext('2d'), {
            type: 'bar',
            data: {
                labels: sortedInitKeys.map(k => k.substring(0, 30) + (k.length > 30 ? '...' : '')),
                datasets: [{ data: sortedInitVals, backgroundColor: '#e2445c', borderRadius: 4 }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                indexAxis: 'y',
                plugins: { legend: { display: false } } 
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

window.showCustomModal = function(title, body, type = 'confirm', placeholder = '', onConfirm) {
    document.getElementById('genericModalTitle').innerText = title;
    document.getElementById('genericModalBody').innerHTML = body;
    const inputObj = document.getElementById('genericModalInput');
    if (type === 'prompt') {
        inputObj.style.display = 'block';
        inputObj.placeholder = placeholder;
        inputObj.value = '';
        inputObj.focus();
    } else {
        inputObj.style.display = 'none';
    }
    document.getElementById('genericModalOverlay').style.display = 'flex';
    
    // Replace nodes to prevent duplicate listeners
    const confirmBtn = document.getElementById('genericModalConfirmBtn');
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    const cancelBtn = document.getElementById('genericModalCancelBtn');
    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

    newCancelBtn.onclick = () => {
        document.getElementById('genericModalOverlay').style.display = 'none';
    };

    newConfirmBtn.onclick = () => {
        document.getElementById('genericModalOverlay').style.display = 'none';
        if (type === 'prompt') {
            onConfirm(document.getElementById('genericModalInput').value);
        } else {
            onConfirm();
        }
    };
}

window.deleteRow = function(index) {
    showCustomModal('tablero-vtd.vercel.app dice', '¿Seguro que deseas eliminar esta fila?', 'confirm', '', () => {
        tableData.splice(index, 1);
        saveData();
        renderRows();
    });
}

window.deleteFile = function(rowIndex, fileIndex) {
    showCustomModal('Confirmar eliminación', '¿Seguro de eliminar este archivo?', 'confirm', '', () => {
        tableData[rowIndex].archivos.splice(fileIndex, 1);
        saveData();
        renderPanelContent(rowIndex);
    });
}

window.deleteComment = function(rowIndex, commentIndex) {
    showCustomModal('Confirmar eliminación', '¿Seguro de eliminar este comentario?', 'confirm', '', () => {
        tableData[rowIndex].comentarios.splice(commentIndex, 1);
        saveData();
        renderPanelContent(rowIndex);
    });
}

window.promptLink = function() {
    const sel = window.getSelection();
    if(sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);

    showCustomModal('Añadir Enlace', 'Ingresa la URL a continuación para vincularla al texto seleccionado:', 'prompt', 'https://...', (url) => { 
        if(url) {
            sel.removeAllRanges();
            sel.addRange(range);
            document.execCommand('createLink', false, url); 
        }
    });
}

window.openImageViewer = function(url) {
    if (!url) return;
    document.getElementById('imageViewerPreview').src = url;
    document.getElementById('imageViewerOverlay').style.display = 'flex';
}

// Fitlers Logic
window.currentSearchFilter = '';
window.currentPersonFilters = [];

window.updateTableFilter = function() {
    const el = document.getElementById('globalSearchInput');
    window.currentSearchFilter = el ? el.value.toLowerCase() : '';
    applyFilters();
}

window.togglePersonFilter = function(e) {
    const popover = document.getElementById('personFilterPopover');
    if (popover.style.display === 'block') {
        popover.style.display = 'none';
        return;
    }
    
    // Position
    const rect = e.currentTarget.getBoundingClientRect();
    popover.style.top = (rect.bottom + window.scrollY + 8) + 'px';
    popover.style.left = (rect.left + window.scrollX - 50) + 'px';
    
    // Populate
    let keys = Object.keys(allProfiles);
    if(keys.length === 0 && currentUserEmail) keys = [currentUserEmail];
    
    let html = '';
    keys.forEach(email => {
        const p = allProfiles[email] || { name: email.split('@')[0], color: '#0073ea' };
        const initial = p.name ? p.name.charAt(0).toUpperCase() : '?';
        const isChecked = window.currentPersonFilters.includes(email) ? 'checked' : '';
        html += `
            <label style="display:flex; align-items:center; gap:8px; cursor:pointer; color:var(--text-main); font-size:13px;">
                <input type="checkbox" ${isChecked} onchange="window.updatePersonFilter('${email}', this.checked)" style="accent-color:var(--primary);">
                <div style="background:${p.color}; width:24px; height:24px; border-radius:50%; color:white; display:flex; align-items:center; justify-content:center; font-size:10px; flex-shrink:0;">${initial}</div>
                <div style="flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.name}</div>
            </label>
        `;
    });
    
    document.getElementById('personFilterList').innerHTML = html;
    popover.style.display = 'block';
}

window.updatePersonFilter = function(email, isChecked) {
    if (isChecked && !window.currentPersonFilters.includes(email)) {
        window.currentPersonFilters.push(email);
    } else if (!isChecked) {
        window.currentPersonFilters = window.currentPersonFilters.filter(e => e !== email);
    }
    applyFilters();
}

window.clearPersonFilter = function() {
    window.currentPersonFilters = [];
    document.querySelectorAll('#personFilterList input').forEach(el => el.checked = false);
    applyFilters();
}

document.addEventListener('click', (e) => {
    const popover = document.getElementById('personFilterPopover');
    if (popover && popover.style.display === 'block' && !e.target.closest('#personFilterPopover') && !e.target.closest('[onclick*=\"togglePersonFilter\"]')) {
        popover.style.display = 'none';
    }
});

function applyFilters() {
    const searchTerm = window.currentSearchFilter.toLowerCase();
    const persons = window.currentPersonFilters;
    
    document.querySelectorAll('tbody[id^=\"group_rows_\"] tr:not(.group-columns-row):not(:last-child)').forEach((tr) => {
        const index = tr.dataset.index;
        if (!index) return;
        const row = tableData[index];
        if (!row) return;
        
        let searchMatched = false;
        if (!searchTerm) {
            searchMatched = true;
        } else {
            const str = JSON.stringify(row).toLowerCase();
            if (str.includes(searchTerm)) searchMatched = true;
        }
        
        let personMatched = false;
        if (persons.length === 0) {
            personMatched = true;
        } else if (row.responsable && row.responsable.length > 0) {
            personMatched = row.responsable.some(r => persons.includes(r.email));
        }
        
        if (searchMatched && personMatched) {
            tr.style.display = '';
        } else {
            tr.style.display = 'none';
        }
    });
}
