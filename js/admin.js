/*
 * GORILAND · js/admin.js
 * Panel de administración: formularios de integrantes, eventos e imágenes, y las acciones de guardar y borrar.
 */

/* ADMIN */
/**
 * Evento vacío para el formulario.
 */
const newE = () => ({ id: 'e' + Date.now(), sport: 'f', date: '', time: '', place: '', yt: '', done: false, f: { a: '', b: '', ca: '#e53935', cb: '#1e88e5', la: '', lb: '', sa: 0, sb: 0, pl: [] }, k: { ss: [] } });

/**
 * Guarda un valor en el borrador por ruta, p. ej. S_('f.pl.0.g', 2).
 */
function S_(p, v) {
    const k = p.split('.');
    let o = draft;
    k.slice(0, -1).forEach(x => o = o[x]);
    o[k.at(-1)] = v;
}

/**
 * Campo de texto o número enlazado al borrador.
 */
const I = (p, v, t = 'text', ph = '') => `<input type=${t} value="${esc(v)}" placeholder="${ph}" oninput="S_('${p}',this.value)">`;

/**
 * Casilla enlazada al borrador.
 */
const K = (p, v) => `<input type=checkbox ${v ? 'checked' : ''} onchange="S_('${p}',this.checked)">`;

/**
 * Desplegable enlazado al borrador.
 */
const Se = (p, v, o) => `<select onchange="S_('${p}',this.value)">${o.map(([k, l]) => `<option value="${k}" ${k == v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;

/**
 * Opciones de personas para los desplegables.
 */
const MO = () => [['', '— persona —'], ...D.members.map(m => [m.id, m.name + (m.guest ? ' (inv.)' : '')])];

/**
 * Pestaña «Miembros» del Admin: formulario de integrante y lista con Editar / Borrar.
 */
function admMem() {
    return `<h2>${md.id ? 'Editar integrante' : 'Nuevo integrante o invitado'}</h2><div class=fg><input id=mn placeholder=Nombre value="${esc(md.name)}"><input id=mk placeholder=Mote value="${esc(md.nick)}"><input id=my type=number placeholder="Año nac." value="${esc(md.by || '')}" style="width:110px"><label><input id=mg type=checkbox ${md.guest ? 'checked' : ''}> Invitado</label><button class=btn onclick=saveM()>${md.id ? 'Guardar' : 'Añadir'}</button>${md.id ? '<button class="btn s" onclick="resetM()">Cancelar</button>' : ''}</div><h2>Integrantes e invitados</h2>${D.members.map(m => `<div class=row><span style="flex:1">${nm(m)} <span class=mu>· ${age(m)} años</span></span><button class="btn s" onclick="editM('${m.id}')">Editar</button><button class="btn s" onclick="delM('${m.id}')">Borrar</button></div>`).join('') || '<p class=mu>Aún no hay integrantes.</p>'}`;
}

/**
 * Pestaña «Imágenes» del Admin: logos de las competiciones (Cortijos League y GP Goriland).
 */
function admImg() {
    return `<h2>Logos de las competiciones</h2><div class=fg>${['f', 'k'].map(k => `<span>${SPN[k]} ${sl(k, LS.adm)} <input type=file accept="image/*" onchange="upLogo('${k}',this)"></span>`).join('')}</div><h2>Logos de los equipos de F1</h2><p class=mu>Sube el logo de cada equipo (PNG, SVG o WebP, con fondo transparente). Hasta entonces se muestra su abreviatura con el color del equipo.</p><div class=g3>${TEAMS.map(t => `<div class=card><div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">${tl(t.k, 36)}<b>${t.n}</b></div><input type=file accept="image/*" onchange="upTeam('${t.k}',this)"></div>`).join('')}</div>`;
}

/**
 * Texto « (n)» con el nº de vueltas de una fila, para el botón Vueltas.
 */
const nL = r => (r.laps || []).length ? ` (${r.laps.length})` : '';

/**
 * Campo de mejor tiempo de una fila: editable si no hay vueltas; si las hay, se calcula solo (solo lectura).
 */
const lapIn = (i, j, r, s) => hasL(r)
    ? `<input type=text value="${esc(bestOf(r))}" readonly title="Mejor vuelta, calculada con las vueltas" style="opacity:.7">`
    : I(`k.ss.${i}.rows.${j}.lap`, r.lap || '', 'text', s.kind == 'r' ? 'Vuelta rápida 0:42.310' : 'Tiempo 0:42.310');

/**
 * Abre o cierra el desplegable de vueltas de un piloto.
 */
function toggleLaps(i, j) {
    const r = draft.k.ss[i].rows[j];
    r.open = !r.open;
    render();
}

/**
 * Fija el nº de vueltas de un piloto (conserva los tiempos ya escritos).
 */
function setLaps(i, j, n) {
    const r = draft.k.ss[i].rows[j];
    n = Math.max(0, Math.min(99, +n || 0));
    r.laps = Array.from({ length: n }, (_, k) => (r.laps || [])[k] || '');
    render();
}

/**
 * Desplegable de vueltas: nº de vueltas y una caja de texto por vuelta.
 */
const lapsPanel = (i, j, r) => `<div class=lapsbox><label>Nº de vueltas <input type=number min=0 max=99 value="${(r.laps || []).length}" onchange="setLaps(${i},${j},this.value)"></label><div class=lapgrid>${(r.laps || []).map((t, k) => `<label>V${k + 1} ${I(`k.ss.${i}.rows.${j}.laps.${k}`, t, 'text', '1:25.589')}</label>`).join('')}</div><p class=mu>Deja en blanco la vuelta que falte (se mostrará «-»). La mejor vuelta se calcula sola.</p></div>`;

/**
 * Pestaña «Eventos» del Admin: lista de eventos o, si hay borrador, el formulario del evento.
 */
function admEv() {
    let h = '';
    if (!draft)
        return h + `<h2>Eventos</h2><button class=btn onclick="draft=newE();render()">+ Nuevo evento</button>${evs().map(e => `<div class=row><span style="flex:1">${SPN[e.sport]} · ${fd(e.date)} · ${esc(e.place)}${e.done ? '' : ' (próximo)'}</span><button class="btn s" onclick="draft=JSON.parse(JSON.stringify(D.events.find(x=>x.id=='${e.id}')));render()">Editar</button><button class="btn s" onclick="delE('${e.id}')">Borrar</button></div>`).join('')}`;
    const e = draft;
    const f = e.f;
    h += `<h2>${D.events.some(x => x.id == e.id) ? 'Editar' : 'Nuevo'} evento</h2><div class=fg><select onchange="S_('sport',this.value);render()"><option value=f ${e.sport == 'f' ? 'selected' : ''}>Cortijos League</option><option value=k ${e.sport == 'k' ? 'selected' : ''}>GP Goriland</option></select>${I('date', e.date, 'date')}${I('time', e.time, 'time')}${I('place', e.place, 'text', 'Ubicación')}${I('yt', e.yt || '', 'url', 'Enlace de YouTube')}<label>${K('done', e.done)} Disputado</label></div>`;
    if (e.sport == 'f')
        h += `<div class=fg>${I('f.a', f.a, 'text', 'Equipo A')}<input type=color value="${f.ca || '#e53935'}" oninput="S_('f.ca',this.value)">${logo(f.a, 30, f.ca, f.la)}<input type=file accept="image/*" onchange="up('f.la',this)"></div><div class=fg>${I('f.b', f.b, 'text', 'Equipo B')}<input type=color value="${f.cb || '#1e88e5'}" oninput="S_('f.cb',this.value)">${logo(f.b, 30, f.cb, f.lb)}<input type=file accept="image/*" onchange="up('f.lb',this)"></div><div class=fg>${I('f.sa', f.sa, 'number')} – ${I('f.sb', f.sb, 'number')}</div><h2>Jugadores</h2>${f.pl.map((p, i) => `<div class=fg>${Se(`f.pl.${i}.p`, p.p, MO())}${Se(`f.pl.${i}.t`, p.t, [['A', 'Eq. A'], ['B', 'Eq. B']])}${Se(`f.pl.${i}.pos`, p.pos, Object.entries(POSN))}G${I(`f.pl.${i}.g`, p.g, 'number')}A${I(`f.pl.${i}.a`, p.a, 'number')}<label>${K(`f.pl.${i}.m`, p.m)}MVP</label><button class="btn s" onclick="draft.f.pl.splice(${i},1);render()">✕</button></div>`).join('')}<button class="btn s" onclick="draft.f.pl.push({p:'',t:'A',pos:'DEL',g:0,a:0,m:false});render()">+ Jugador</button>`;
    else
        h += e.k.ss.map((s, i) => `<h2>Sesión ${i + 1}</h2><div class=fg>${`<select onchange="S_('k.ss.${i}.kind',this.value);render()"><option value=t ${s.kind == 't' ? 'selected' : ''}>Entrenamiento</option><option value=q ${s.kind == 'q' ? 'selected' : ''}>Clasificación</option><option value=r ${s.kind == 'r' ? 'selected' : ''}>Carrera</option></select>`}<button class="btn s" onclick="draft.k.ss.splice(${i},1);render()">Quitar sesión</button></div><p class=mu>${s.kind == 'r' ? 'Añade los pilotos en orden de llegada y su vuelta rápida; la más rápida se marca sola.' : s.kind == 't' ? 'Entrenamiento: no puntúa. Escribe el mejor tiempo (0:42.310); se ordenan solos.' : 'Escribe el mejor tiempo (0:42.310); se ordenan solos.'}</p>${s.rows.map((r, j) => `<div class=fg><select onchange="pickK(${i},${j},this.value)">${MO().map(([k, l]) => `<option value="${k}" ${k == r.p ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>${Se(`k.ss.${i}.rows.${j}.team`, r.team, TO)}${lapIn(i, j, r, s)}<button class="btn s" onclick="toggleLaps(${i},${j})">Vueltas${nL(r)}</button><button class="btn s" onclick="draft.k.ss[${i}].rows.splice(${j},1);render()">✕</button></div>${r.open ? lapsPanel(i, j, r) : ''}`).join('')}<button class="btn s" onclick="draft.k.ss[${i}].rows.push({p:'',team:'',lap:'',vr:false});render()">+ Piloto</button>`).join('') + `<p><button class="btn s" onclick="draft.k.ss.push({kind:'q',rows:[]});render()">+ Sesión</button></p>`;
    return h + `<p><button class=btn onclick=saveE() ${busy ? 'disabled' : ''}>${busy ? 'Guardando…' : 'Guardar evento'}</button> <button class="btn s" onclick="draft=null;render()">Cancelar</button></p>`;
}

/**
 * Panel Admin: acceso y 3 pestañas (miembros, eventos e imágenes de las competiciones).
 */
function adminView() {
    if (!admin)
        return `<h2>Acceso</h2><div class=fg><input id=le type=email placeholder=Email><input id=lp type=password placeholder=Contraseña><button class=btn onclick=login()>Entrar</button></div>`;
    const T = [['mem', 'Miembros'], ['ev', 'Eventos'], ['img', 'Imágenes']];
    return `<p><button class="btn s" onclick="sb.auth.signOut()">Salir</button></p><div class=pills>${T.map(([k, l]) => `<button class="pill ${at == k ? 'on' : ''}" onclick="at='${k}';render()">${l}</button>`).join('')}</div>` + { mem: admMem, ev: admEv, img: admImg }[at]();
}

/**
 * Opciones de equipos de F1 para el desplegable.
 */
const TO = [['', '— equipo —'], ...TEAMS.map(t => [t.k, t.n])];

/**
 * Al elegir piloto, copia su equipo si ya salió en otra sesión del mismo evento.
 */
function pickK(i, j, v) {
    const rows = draft.k.ss[i].rows;
    rows[j].p = v;
    const o = draft.k.ss.flatMap(x => x.rows).find(r => v && r.p == v && r.team);
    if (o)
        rows[j].team = o.team;
    render();
}

/**
 * Sube un escudo de fútbol a Storage y guarda su URL en el borrador.
 */
async function up(p, inp) {
    const f = inp.files[0];
    if (!f)
        return;
    const n = 'x' + Date.now() + '-' + f.name.replace(/[^\w.]/g, '_');
    const r = await sb.storage.from('escudos').upload(n, f);
    if (r.error)
        return alert('Error al subir: ' + r.error.message);
    S_(p, sb.storage.from('escudos').getPublicUrl(n).data.publicUrl);
    render();
}

/**
 * Sube o sustituye el logo de una competición.
 */
async function upLogo(k, inp) {
    const f = inp.files[0];
    if (!f)
        return;
    const r = await sb.storage.from('escudos').upload('logo-' + k, f, { upsert: true, contentType: f.type });
    if (r.error)
        return alert('Error al subir: ' + r.error.message);
    LV.v = Date.now();
    MISSING.clear();
    render();
}

/**
 * Sube o sustituye el logo de un equipo de F1 (archivo team-ABC en Storage).
 */
async function upTeam(k, inp) {
    const f = inp.files[0];
    if (!f)
        return;
    const r = await sb.storage.from('escudos').upload('team-' + k, f, { upsert: true, contentType: f.type });
    if (r.error)
        return alert('Error al subir: ' + r.error.message);
    LV.v = Date.now();
    MISSING.clear();
    render();
}

/**
 * Cancela la edición de un integrante.
 */
const resetM = () => {
    md = { ...MD0 };
    render();
};

/**
 * Carga un integrante en el formulario para editarlo.
 */
function editM(id) {
    md = { ...MD0, ...D.members.find(m => m.id == id) };
    render();
}

/**
 * Valida y guarda el integrante del formulario.
 */
function saveM() {
    const n = $('#mn').value.trim();
    if (!n)
        return alert('Falta el nombre');
    const by = +$('#my').value || 0;
    if (by && (by < 1900 || by > new Date().getFullYear()))
        return alert('Año de nacimiento no válido');
    const m = { id: md.id || 'm' + Date.now(), name: n, nick: $('#mk').value.trim(), by: by || undefined, age: by ? undefined : md.age, guest: $('#mg').checked || undefined };
    const i = D.members.findIndex(x => x.id == m.id);
    i < 0 ? D.members.push(m) : D.members[i] = m;
    md = { ...MD0 };
    commit(() => dbSave('members', m));
}

/**
 * Borra un integrante (con confirmación).
 */
function delM(id) {
    if (confirm('¿Borrar?')) {
        D.members = D.members.filter(m => m.id != id);
        commit(() => dbDelete('members', id));
    }
}

/**
 * Borra un evento (con confirmación).
 */
function delE(id) {
    if (confirm('¿Borrar evento?')) {
        D.events = D.events.filter(e => e.id != id);
        commit(() => dbDelete('events', id));
    }
}

/**
 * Valida (máx. 2 pilotos por equipo en cada sesión) y guarda el evento del borrador.
 */
function saveE() {
    const e = draft;
    e.f.pl = e.f.pl.filter(p => p.p);
    e.k.ss.forEach(s => s.rows = s.rows.filter(r => r.p));
    e.k.ss.forEach(s => s.rows.forEach(r => {
        delete r.open;
        if (r.laps)
            r.laps = r.laps.map(t => String(t).trim());
        if (r.laps && !r.laps.some(t => t))
            delete r.laps;
        const b = bestOf(r);
        if (b)
            r.lap = b;
    }));
    for (const s of e.k.ss) {
        const c = {};
        for (const r of s.rows)
            if (r.team) {
                c[r.team] = (c[r.team] || 0) + 1;
                if (c[r.team] > 2)
                    return alert('Máximo 2 pilotos por equipo: ' + (tm(r.team)?.n || r.team));
            }
    }
    const i = D.events.findIndex(x => x.id == e.id);
    i < 0 ? D.events.push(e) : D.events[i] = e;
    draft = null;
    commit(() => dbSave('events', e));
}
