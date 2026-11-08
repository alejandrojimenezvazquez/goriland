/*
 * GORILAND · scripts.js
 * Lógica de la web: datos, cálculo de puntos, vistas y panel Admin.
 * Necesita que index.html cargue antes la librería de Supabase (supabase-js).
 */
// ========== ATAJOS ==========
/**
 * Atajo de document.querySelector.
 */
const $ = s => document.querySelector(s);
/**
 * Contenedor donde se pinta toda la aplicación.
 */
const root = $('#app');
// ========== CONFIGURACIÓN DE SUPABASE ==========
/**
 * URL base del proyecto (sin /rest/v1/).
 */
const SUPABASE_URL = 'https://spvkeuxmqednihwcdhnv.supabase.co';
/**
 * Clave publishable. Es pública por diseño: la seguridad la dan las políticas RLS de supabase.sql, storage.sql y storage_logos.sql.
 * Nunca pongas aquí la clave secreta (service_role).
 */
const SUPABASE_ANON_KEY = 'sb_publishable_B3WeSiFAGj2irkA9uQfyIg_CaDnaVwH';
/**
 * Cliente de Supabase: base de datos, autenticación y almacenamiento de imágenes (bucket «escudos»).
 */
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
sb.auth.onAuthStateChange((_, x) => {
    admin = !!x;
    render();
});
// ========== ESTADO DE LA APLICACIÓN ==========
/**
 * Datos cargados desde Supabase.
 * members: [{id, name, nick, by (año de nacimiento), age (antiguo), guest}]
 * events: [{id, sport 'f'|'k', date, time, place, yt, done,
 *           f: {a, b, ca, cb, la, lb, sa, sb, pl:[{p, t, pos, g, a, m}]},
 *           k: {ss:[{kind 't'|'q'|'r', rows:[{p, team, lap, vr}]}]}}]
 */
let D = { members: [], events: [] };
/**
 * Pestaña activa: home | mem | ev | rk | adm.
 */
let tab = 'home';
/**
 * Ranking activo: g (general) | f (Cortijos League) | k (GP Goriland, integrantes) | c (constructores).
 */
let rk = 'g';
/**
 * true si hay una sesión de administrador iniciada.
 */
let admin = false;
/**
 * Sin uso (resto de la versión publicada en Claude); puede borrarse.
 */
let ART = null;
/**
 * Evento que se está creando o editando en Admin (null si no hay ninguno).
 */
let draft = null;
/**
 * HTML de la ventana emergente abierta ('' si no hay ninguna).
 */
let modal = '';
/**
 * true mientras se guarda en Supabase.
 */
let busy = false;
/**
 * Pestaña activa del panel Admin: mem (miembros) | ev (eventos) | img (imágenes de las competiciones).
 */
let at = 'mem';
// ========== UTILIDADES ==========
/**
 * Escapa texto para insertarlo en HTML de forma segura.
 */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/**
 * Integrante con ese id (o uno vacío si no existe).
 */
const M = id => D.members.find(m => m.id == id) || { name: '?', nick: '' };
/**
 * Color estable (HSL) generado a partir de un texto; da color a los avatares sin imagen.
 */
const col = s => {
    let h = 0;
    for (const c of String(s || '?'))
        h = (h * 31 + c.charCodeAt(0)) % 360;
    return `hsl(${h} 50% 42%)`;
};
/**
 * Escudo: imagen subida (sin marco) si hay url u; si no, círculo con iniciales.
 * n = nombre, z = tamaño en px, c = color, u = url del escudo.
 */
const logo = (n, z = 34, c, u) => u ? `<img src="${esc(u)}" alt="" style="width:${z}px;height:${z}px;object-fit:contain;flex:none">` : `<span class=lg style="width:${z}px;height:${z}px;background:${c || col(n)};text-shadow:0 0 3px #000">${esc((n || '?').slice(0, 2).toUpperCase())}</span>`;
// ========== EQUIPOS DE LA GP GORILAND (parrilla F1 2026) ==========
/**
 * k = abreviatura, n = nombre, c = color. Edita aquí nombres o colores.
 */
const TEAMS = [['MCL', 'McLaren', '#FF8000'], ['MER', 'Mercedes', '#27F4D2'], ['RBR', 'Red Bull Racing', '#3671C6'], ['FER', 'Ferrari', '#E8002D'], ['WIL', 'Williams', '#64C4FF'], ['RCB', 'Racing Bulls', '#6692FF'], ['AMR', 'Aston Martin', '#229971'], ['HAA', 'Haas', '#B6BABD'], ['AUD', 'Audi', '#F50537'], ['ALP', 'Alpine', '#0093CC'], ['CAD', 'Cadillac', '#4A4A4A']].map(([k, n, c]) => ({ k, n, c }));
/**
 * Busca un equipo por su abreviatura.
 */
const tm = k => TEAMS.find(t => t.k == k);
/**
 * Nombre del equipo (o el texto tal cual si no está en la lista).
 */
const tn = k => esc(tm(k)?.n || k);
/**
 * Logo del equipo de F1 (subido en Admin > Imágenes) o, si no existe, círculo de color con su abreviatura.
 */
const tl = (k, z) => {
    if (!k)
        return '';
    const c = `<span class=lg style="width:${z}px;height:${z}px;background:${tm(k)?.c || col(k)};font-size:${z > 30 ? 11 : 9}px;text-shadow:0 0 3px #000">${esc(String(k).slice(0, 3).toUpperCase())}</span>`;
    const u = sb.storage.from('escudos').getPublicUrl('team-' + encodeURIComponent(k)).data.publicUrl + '?v=' + LV.v;
    return `<img src="${u}" alt="${esc(k)}" style="width:${z}px;height:${z}px;object-fit:contain;flex:none" data-fb="${esc(c)}" onerror="this.outerHTML=this.dataset.fb">`;
};
/**
 * Puntos de constructores por equipo; se recalcula en stats().
 */
let TP = {};
// ========== COMPETICIONES, LOGOS Y TEXTOS ==========
/**
 * Alto (px) de los logos de competición: etiqueta de tarjeta, pestañas del ranking,
 * títulos de sección de Eventos y panel Admin.
 */
const LS = { tag: 24, pill: 24, sec: 30, adm: 36 }; // tamaño (px) de los logos de competición: etiqueta, pestañas, títulos de sección, admin
/**
 * Nombre de cada competición según el deporte (f = fútbol, k = karts).
 */
const SPN = { f: 'Cortijos League', k: 'GP Goriland' };
/**
 * Nombre de cada tipo de sesión de karts.
 */
const SK = { t: 'Entrenamiento', q: 'Clasificación', r: 'Carrera' };
/**
 * Versión para saltarse la caché del navegador al refrescar un logo recién subido.
 */
const LV = { v: Date.now() };
/**
 * Logo de la competición k (archivo logo-f / logo-k en Storage). Se oculta si no existe.
 */
const sl = (k, z = 18) => `<img src="${sb.storage.from('escudos').getPublicUrl('logo-' + k).data.publicUrl}?v=${LV.v}" alt="" style="height:${z}px;width:auto;max-width:${z * 3}px;object-fit:contain;vertical-align:middle" onerror="this.remove()">`;
/**
 * Logo + nombre de la competición (z = alto del logo).
 */
const spn = (k, z = LS.tag) => `<span style="display:inline-flex;align-items:center;gap:6px">${sl(k, z)}${SPN[k]}</span>`;
/**
 * Fila con el mejor tiempo de una sesión (la vuelta rápida de una carrera).
 */
const fastest = s => {
    const L = s.rows.filter(r => lap(r.lap) != null);
    return L.length ? L.reduce((a, b) => lap(b.lap) < lap(a.lap) ? b : a) : null;
};
/**
 * Dos tablas de rendimiento de un partido de fútbol, una por equipo, sombreadas con el color de su equipación.
 */
const ptb = f => ['A', 'B'].map(t => {
    const c = shade(t == 'A' ? f.ca : f.cb);
    const box = c ? `background:${c}26;border:1px solid ${c}66` : 'background:var(--cd);border:1px solid var(--ln)';
    const rows = f.pl.filter(p => p.t == t).sort((a, b) => POS[a.pos] - POS[b.pos]).map(p => [nm(M(p.p)), POSN[p.pos] || p.pos, 1, p.g, p.a, p.m ? '★' : '']);
    return `<div style="${box};border-radius:12px;padding:10px 12px;margin-top:12px"><h3 style="margin:0 0 4px">${esc(t == 'A' ? f.a : f.b)}</h3>` + tbl(['Jugador', 'Pos.', 'PJ', 'G', 'A', 'MVP'], rows) + `</div>`;
}).join('');
/**
 * Devuelve el color si es un #rrggbb válido (si no, null); sirve para sombrear las tablas de cada equipo.
 */
const shade = c => /^#[0-9a-f]{6}$/i.test(c || '') ? c : null;
/**
 * Pestaña Eventos: «Por disputar» y «Disputados» y, dentro de cada uno, un bloque por competición.
 */
const evView = () => {
    const sec = (t, done) => {
        const L = [...D.events].filter(e => !!e.done == done).sort((a, b) => done ? (b.date || '').localeCompare(a.date || '') : (a.date || '9').localeCompare(b.date || '9'));
        if (!L.length)
            return '';
        return `<h2>${t}</h2>` + ['f', 'k'].map(k => {
            const X = L.filter(e => e.sport == k);
            return X.length ? `<h3 class=sh>${spn(k, LS.sec)}</h3><div class=g2>${X.map(evCard).join('')}</div>` : '';
        }).join('');
    };
    return sec('Por disputar', false) + sec('Disputados', true) || '<h2>Eventos</h2><p class=mu>Sin eventos.</p>';
};
/**
 * Bloque «Próximos eventos» de Inicio (los 2 más cercanos; vacío si no hay ninguno).
 */
const NX = () => {
    const n = [...D.events].filter(e => !e.done).sort((a, b) => (a.date || '9').localeCompare(b.date || '9')).slice(0, 2);
    return n.length ? `<h2>Próximos eventos</h2><div class=g2>${n.map(evCard).join('')}</div>` : '';
};
/**
 * Criterios de puntuación que se muestran junto a cada ranking (la clave es el ranking).
 */
const CR = {
    g: `Suma de los puntos de todas las competiciones.<br>
    <br>
    <b>Cortijos League:</b><br>
    <br>
    Victoria = 10 puntos<br>
    Empate = 7 puntos<br>
    Derrota = 5 puntos<br>
    Gol = 2 puntos<br>
    Asistencia = 1 punto<br>
    MVP = 5 puntos<br>
    <br>
    <b>GP Goriland:</b>
    <br>
    <br>
    Participación = 5 puntos<br>
    Clasificación y Carrera:<br>
    1º = 10 puntos<br>
    2º = 9 puntos<br>
    3º = 8 puntos<br>
    4º = 7 puntos<br>
    5º = 6 puntos<br>
    6º = 5 puntos<br>
    7º = 4 puntos<br>
    8º = 3 puntos<br>
    9º = 2 puntos<br>
    10º = 1 puntos<br>
    <br>
    Los entrenamientos no puntúan.`,
    f: `Estadísticas acumuladas de la <b>Cortijos League</b>.<br>
    <br>
    PJ = Partidos jugados<br>
    V = Victorias<br>
    E = Empates<br>
    D = Derrotas<br>
    G = Goles<br>
    A = Asistencias<br>
    MVP = Jugador más valioso<br>
    <br>
    Desglose de puntos:<br>
    <br>
    Victoria = 10 puntos<br>
    Empate = 7 puntos<br>
    Derrota = 5 puntos<br>
    Gol = 2 puntos<br>
    Asistencia = 1 punto<br>
    MVP = 5 puntos<br>`,
    k: `Estadísticas acumuladas del <b>GP Goriland</b>.<br>
    GP = eventos disputados<br>
    VR = vueltas rápidas en carrera<br>
    PP = pole position<br>
    T5 = Top 5 (4º o 5º)<br>
    T10 = Top 10 (6º-10º)<br>
    T15 = Top 15 (11º-15º)<br>
    +16 = a partir del 16º<br>
    <br>
    Desglose de puntos:<br>
    <br>
    Participación = 5 puntos<br>
    Clasificación y Carrera:<br>
    1º = 10 puntos<br>
    2º = 9 puntos<br>
    3º = 8 puntos<br>
    4º = 7 puntos<br>
    5º = 6 puntos<br>
    6º = 5 puntos<br>
    7º = 4 puntos<br>
    8º = 3 puntos<br>
    9º = 2 puntos<br>
    10º = 1 puntos<br>
    <br>
    Los entrenamientos no puntúan.`,
    c: `Ranking de equipos del <b>GP Goriland</b>, independiente de los integrantes.<br><br>Suma los puntos de sus pilotos en clasificación y carrera.<br><br>Desglose de puntos:<br><br>${Array.from({ length: 22 }, (_, n) => `${n + 1}º = ${22 - n}${n ? '' : ' puntos'}`).join('<br>')}<br><br>Los entrenamientos no puntúan.`
};
// ========== TIEMPOS, FECHAS Y ORDEN ==========
/**
 * Convierte '0:42.310' o '42.310' en segundos (null si está vacío).
 */
const lap = t => {
    t = String(t || '').replace(',', '.').trim();
    if (!t)
        return null;
    if (t.includes(':')) {
        const [a, b] = t.split(':');
        return +a * 60 + +b;
    }
    return +t;
};
/**
 * Filas de una sesión ya ordenadas: entrenamiento y clasificación por tiempo, carrera en orden de llegada.
 */
const srows = s => s.kind != 'r' ? s.rows.filter(r => lap(r.lap) != null).sort((a, b) => lap(a.lap) - lap(b.lap)).concat(s.rows.filter(r => lap(r.lap) == null)) : s.rows;
/**
 * Fecha legible en español.
 */
const fd = d => d ? new Date(d + 'T12:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
/**
 * Línea «fecha · hora · lugar» de un evento.
 */
const meta = e => [fd(e.date), e.time, e.place].filter(Boolean).map(esc).join(' · ');
// ========== CÁLCULO DE PUNTOS Y ESTADÍSTICAS ==========
/**
 * Orden de las posiciones de fútbol en las tablas.
 */
const POS = { POR: 0, DEF: 1, MED: 2, DEL: 3 };
/**
 * Nombre de cada posición de fútbol.
 */
const POSN = { POR: 'Portero', DEF: 'Defensa', MED: 'Medio', DEL: 'Delantero' };
/**
 * Calcula puntos y estadísticas de cada persona a partir de los eventos disputados.
 * Cortijos League: victoria 10, empate 7, derrota 5; +2 gol, +1 asistencia, +5 MVP.
 * GP Goriland: 5 por participar; en clasificación y carrera del 10º (1) al 1º (10). Los entrenamientos no puntúan.
 * Constructores (TP): en clasificación y carrera, 22 puntos al 1º, 21 al 2º... 1 al 22º.
 * Devuelve {idPersona: {pts, pf, pk, ev, pj, g, a, m, nk, vr, pp, pos}}
 * (pts total, pf fútbol, pk karts, nk eventos de karts, vr vueltas rápidas, pp poles, pos[0..9] veces en cada puesto).
 */
function stats() {
    TP = {};
    const S = {};
    const g = id => S[id] ??= { id, pts: 0, ev: [], g: 0, a: 0, m: 0, pj: 0, vr: 0, pp: 0, pos: Array(22).fill(0), nk: 0, pf: 0, pk: 0, v: 0, e: 0, d: 0 };
    D.events.filter(e => e.done).forEach(e => {
        if (e.sport == 'f') {
            const f = e.f;
            const sa = +f.sa;
            const sb = +f.sb;
            const r = sa > sb ? 'A' : sa < sb ? 'B' : 'D';
            f.pl.forEach(p => {
                const s = g(p.p);
                const w = r == 'D' ? 7 : r == p.t ? 10 : 5;
                const x = w + 2 * p.g + +p.a + (p.m ? 5 : 0);
                s.pts += x;
                s.pf += x;
                s.pj++;
                if (r == 'D')
                    s.e++;
                else if (r == p.t)
                    s.v++;
                else
                    s.d++;
                s.g += +p.g;
                s.a += +p.a;
                s.m += p.m ? 1 : 0;
                s.ev.push({ e, x, t: (r == 'D' ? 'Empate' : r == p.t ? 'Victoria' : 'Derrota') + ` · ${p.g} G · ${p.a} A${p.m ? ' · MVP' : ''}` });
            });
        }
        else {
            const pt = {};
            e.k.ss.forEach((s, si) => {
                if (s.kind == 't')
                    return;
                const rows = srows(s);
                const fr = s.kind == 'r' ? fastest(s) : null;
                rows.forEach((r, i) => {
                    const o = pt[r.p] ??= { x: 5, l: [] };
                    const st = g(r.p);
                    if (i < 10)
                        o.x += 10 - i;
                    if (r.team)
                        TP[r.team] = (TP[r.team] || 0) + Math.max(0, 22 - i);
                    if (s.kind == 'r') {
                        st.pos[Math.min(i, 21)]++;
                        const v = fr ? r === fr : r.vr;
                        if (v)
                            st.vr++;
                        o.l.push('Carrera P' + (i + 1) + (v ? ' VR' : ''));
                    }
                    else {
                        if (i == 0 && lap(r.lap) != null)
                            st.pp++;
                        o.l.push('Clasif. P' + (i + 1));
                    }
                });
            });
            Object.entries(pt).forEach(([id, o]) => {
                const s = g(id);
                s.pts += o.x;
                s.pk += o.x;
                s.nk++;
                s.ev.push({ e, x: o.x, t: o.l.join(' · ') });
            });
        }
    });
    return S;
}
// ========== COMPONENTES DE INTERFAZ ==========
/**
 * Tabla HTML con scroll horizontal. h = cabeceras, r = filas.
ex (opcional) = por fila, {id, html} de una fila oculta que se despliega debajo (ver tgl).
 */
const tbl = (h, r, ex = []) => `<div class=tw><table><tr>${h.map(x => `<th${lc(x)}>${x}</th>`).join('')}</tr>${r.map((c, n) => `<tr>${c.map((x, i) => `<td${lc(h[i])}>${x}</td>`).join('')}</tr>${ex[n] ? `<tr id="${ex[n].id}" hidden><td colspan="${h.length}">${ex[n].html}</td></tr>` : ''}`).join('')}</table></div>`;
/**
 * Atributo de clase para las columnas de nombres y de equipo (Nombre, Piloto, Jugador, Equipo), que van alineadas a la izquierda;
 * el resto de columnas de las tablas van centradas. Para añadir otra columna a la izquierda, inclúyela en la lista.
 */
const lc = x => ['Nombre', 'Piloto', 'Jugador', 'Equipo'].includes(x) ? ' class=l' : '';
/**
 * Tarjeta de un evento; cambia según el deporte y si está disputado o no.
 */
function evCard(e) {
    let h;
    const t = spn(e.sport);
    const f = e.f;
    if (!e.done)
        h = `<h3>${e.sport == 'f' ? esc((f.a || 'Equipo A') + ' vs ' + (f.b || 'Equipo B')) : SPN.k}</h3><div class=mu>${meta(e)}</div>`;
    else if (e.sport == 'f')
        h = `<div class=sc><div>${logo(f.a, 48, f.ca, f.la)}${esc(f.a)}</div><b>${+f.sa} – ${+f.sb}</b><div>${logo(f.b, 48, f.cb, f.lb)}${esc(f.b)}</div></div><div class=mu style="text-align:center">${fd(e.date)}</div>`;
    else {
        const ss = e.k.ss;
        const s = [...ss].reverse().find(x => x.kind == 'r') || ss[ss.length - 1];
        h = `<div class=mu style="margin-bottom:6px">${fd(e.date)} · ${esc(e.place)}</div>` + (s ? srows(s).slice(0, 5).map((r, i) => `<div class=row><span class=n>${i + 1}</span>${tl(r.team, 26)}<span>${nm(M(r.p))}</span></div>`).join('') : '');
    }
    return `<div class="card ${e.done ? 'click' : ''}" ${e.done ? `onclick="openE('${e.id}')"` : ''}><span class=tag>${t}${e.done ? '' : ' · PRÓXIMO'}</span>${h}</div>`;
}
/**
 * Eventos ordenados por fecha, del más reciente al más antiguo.
 */
const evs = () => [...D.events].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
/**
 * Filas de cada ranking (mode: 'g' general, 'f' Cortijos League, 'k' GP Goriland).
 */
function rankRows(S, mode) {
    const L = D.members.filter(m => !m.guest || S[m.id]).map(m => ({ m, s: S[m.id] || { pts: 0, ev: [], g: 0, a: 0, m: 0, pj: 0, vr: 0, pp: 0, pos: Array(22).fill(0), nk: 0, pf: 0, pk: 0, v: 0, e: 0, d: 0 } }));
    if (mode == 'f')
        return L.filter(x => x.s.pj).sort((a, b) => b.s.pj - a.s.pj || b.s.g - a.s.g);
    if (mode == 'k')
        return L.filter(x => x.s.nk > 0).sort((a, b) => {
            for (let i = 0; i < 10; i++)
                if (b.s.pos[i] != a.s.pos[i])
                    return b.s.pos[i] - a.s.pos[i];
            return b.s.pp - a.s.pp || b.s.vr - a.s.vr;
        });
    return L.sort((a, b) => b.s.pts - a.s.pts);
}
/**
 * Nombre con el mote en gris y la marca de invitado.
 */
const nm = m => esc(m.name) + (m.nick ? ` <span class=nk>“${esc(m.nick)}”</span>` : '') + (m.guest ? ' <span class=mu>(inv.)</span>' : '');
/**
 * Edad calculada con el año de nacimiento (o la edad antigua si no hay año).
 */
const age = m => m.by ? new Date().getFullYear() - m.by : (m.age ?? '?');
// ========== VISTAS Y VENTANAS ==========
/**
 * Contenido de la pestaña activa.
 */
function view(S) {
    if (tab == 'home')
        return `<h2>Bienvenido</h2><p class=intro>GORILAND somos un grupo de colegas de Alhaurín de la Torre. En esta página podéis consultar el histórico de nuestras competiciones: la Cortijos League, el GP Goriland y lo que se nos ocurra.</p>${NX()}<h2>Últimos resultados</h2><div class=g2>${evs().filter(e => e.done).slice(0, 2).map(evCard).join('') || '<p class=mu>Aún no hay resultados.</p>'}</div><h2>Top 5 ranking</h2><div class=card>${rankRows(S, 'g').slice(0, 5).map((x, i) => `<div class=row><span class=n>${i + 1}</span><span style="flex:1">${nm(x.m)}</span><b>${x.s.pts} pts</b></div>`).join('')}</div>`;
    if (tab == 'mem')
        return `<h2>Integrantes</h2><div class=g3>${D.members.filter(m => !m.guest).map(m => `<div class="card click" onclick="openM('${m.id}')"><h3>${esc(m.name)}</h3><div class=mu>“${esc(m.nick)}” · ${age(m)} años</div><p style="margin:10px 0 0"><b>${S[m.id]?.ev.length || 0}</b> <span class=mu>competiciones</span></p></div>`).join('')}</div>`;
    if (tab == 'ev')
        return evView();
    if (tab == 'rk') {
        const P = [['g', 'General'], ['f', spn('f', LS.pill)], ['k', spn('k', LS.pill)]];
        const R = rankRows(S, rk);
        return `<h2>Ranking</h2><div class=pills>${P.map(([k, l]) => `<button class="pill ${rk == k || (k == 'k' && rk == 'c') ? 'on' : ''}" onclick="rk='${k}';render()">${l}</button>`).join('')}</div>${rk == 'k' || rk == 'c' ? `<div class="pills subs">${[['k', 'Pilotos'], ['c', 'Constructores']].map(([k, l]) => `<button class="pill sub ${rk == k ? 'on' : ''}" onclick="rk='${k}';render()">${l}</button>`).join('')}</div>` : ''}` +
            `<div class=rkw><div class=rkt>` + (rk == 'c' ? tbl(['#', 'Equipo', 'Puntos'], [...TEAMS].sort((a, b) => (TP[b.k] || 0) - (TP[a.k] || 0)).map((t, i) => [i + 1, tl(t.k, 22) + ' ' + tn(t.k), `<b>${TP[t.k] || 0}</b>`])) : rk == 'g' ? tbl(['#', 'Nombre', 'Puntos'], R.map((x, i) => [i + 1, nm(x.m), `<b>${x.s.pts}</b>`])) : rk == 'f' ? tbl(['#', 'Nombre', 'PJ', 'V', 'E', 'D', 'G', 'A', 'MVP', 'Puntos'], R.map((x, i) => [i + 1, nm(x.m), x.s.pj, x.s.v, x.s.e, x.s.d, x.s.g, x.s.a, x.s.m, `<b>${x.s.pf}</b>`])) : tbl(['#', 'Nombre', 'GP', 'VR', 'PP', '1º', '2º', '3º', 'T5', 'T10', 'T15', '+16', 'Puntos'], R.map((x, i) => [i + 1, nm(x.m), x.s.nk || 0, x.s.vr, x.s.pp, ...x.s.pos.slice(0, 3), sm(x.s.pos, 3, 5), sm(x.s.pos, 5, 10), sm(x.s.pos, 10, 15), sm(x.s.pos, 15), `<b>${x.s.pk}</b>`]))) + `</div><aside class=card>${CR[rk]}</aside></div>`;
    }
    return adminView();
}
/**
 * Ventana con el desempeño de un integrante en cada competición.
 */
function openM(id) {
    const m = M(id);
    const s = stats()[id];
    modal = `<h3>${esc(m.name)} <span class=mu>“${esc(m.nick)}”</span></h3><p class=mu>${s ? s.pts : 0} puntos · ${s ? s.ev.length : 0} competiciones</p>` + (s ? s.ev.map(v => `<div class=row><span style="flex:1"><b>${SPN[v.e.sport]}</b> · ${fd(v.e.date)}<br><span class=mu>${esc(v.t)}</span></span><b>+${v.x}</b></div>`).join('') : '<p class=mu>Sin competiciones aún.</p>');
    render();
}
/**
 * Botón de YouTube de un evento (solo enlaces de youtube.com / youtu.be).
 */
const ytl = e => /^https?:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//.test(e.yt || '') ? `<p><a class="btn" style="text-decoration:none;display:inline-block" href="${esc(e.yt)}" target=_blank rel="noopener noreferrer">▶ Ver vídeo en YouTube</a></p>` : '';
// ========== TIEMPOS POR VUELTA Y GRÁFICO ==========
/**
 * Segundos de un tiempo escrito ('1:25.589'); null si está vacío o no es válido.
 */
const lv = t => {
    const x = lap(t);
    return x == null || isNaN(x) ? null : x;
};
/**
 * Mejor (más rápido) tiempo escrito entre las vueltas de una fila ('' si no hay ninguno).
 */
const bestOf = r => {
    const L = (r.laps || []).filter(t => lv(t) != null);
    return L.length ? L.reduce((a, b) => lv(b) < lv(a) ? b : a) : '';
};
/**
 * true si la fila tiene al menos una vuelta con tiempo válido.
 */
const hasL = r => (r.laps || []).some(t => lv(t) != null);
/**
 * Segundos -> texto m:ss.mmm.
 */
const fmtT = s => {
    const ms = Math.round(s * 1000);
    return `${Math.floor(ms / 60000)}:${((ms % 60000) / 1000).toFixed(3).padStart(6, '0')}`;
};
/**
 * Rango del eje Y de un evento: del segundo anterior a su vuelta más rápida al segundo siguiente a la más lenta
 * (1:25.589 -> 1:25.000 y 1:30.125 -> 1:31.000). Devuelve [mín, máx] en segundos, o null si no hay vueltas.
 */
const lapRange = e => {
    const all = e.k.ss.flatMap(s => s.rows.flatMap(r => (r.laps || []).map(lv))).filter(v => v != null);
    if (!all.length)
        return null;
    const lo = Math.floor(Math.min(...all));
    let hi = Math.ceil(Math.max(...all));
    if (hi <= lo)
        hi = lo + 1;
    return [lo, hi];
};
/**
 * Gráfico SVG de líneas: eje X = nº de vuelta, eje Y = tiempo. L = segundos por vuelta (null si falta: la línea se interrumpe).
 * Si prefieres el tiempo más rápido arriba, invierte la fórmula de Y (ver comentario dentro).
 */
function lapChart(L, lo, hi) {
    const W = 600;
    const H = 260;
    const ml = 58;
    const mr = 14;
    const mt = 14;
    const mb = 34;
    const pw = W - ml - mr;
    const ph = H - mt - mb;
    const n = L.length;
    const X = i => ml + (n > 1 ? pw * i / (n - 1) : pw / 2);
    const Y = v => mt + ph * (1 - (v - lo) / (hi - lo)); // tiempo bajo abajo; para invertirlo: mt + ph * (v - lo) / (hi - lo)
    const span = hi - lo;
    const step = span <= 10 ? 1 : span <= 20 ? 2 : span <= 50 ? 5 : 10;
    let g = '';
    for (let v = lo; v <= hi + 1e-9; v += step)
        g += `<line x1="${ml}" x2="${W - mr}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--ln)"/><text x="${ml - 8}" y="${Y(v) + 4}" text-anchor="end">${fmtT(v).slice(0, -4)}</text>`;
    for (let i = 0; i < n; i++)
        if (n <= 20 || i == 0 || (i + 1) % 5 == 0)
            g += `<text x="${X(i)}" y="${H - mb + 16}" text-anchor="middle">${i + 1}</text>`;
    let d = '';
    let pen = false;
    L.forEach((v, i) => {
        if (v == null) {
            pen = false;
            return;
        }
        d += `${pen ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)} `;
        pen = true;
    });
    const dots = L.map((v, i) => v == null ? '' : `<circle cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="4" fill="var(--ac)" stroke="var(--fg)" stroke-width="1.5"><title>Vuelta ${i + 1} · ${fmtT(v)}</title></circle>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" style="font-size:11px;fill:var(--mu)" role="img" aria-label="Tiempo por vuelta">${g}<text x="${ml + pw / 2}" y="${H - 3}" text-anchor="middle">Vuelta</text><path d="${d}" fill="none" stroke="var(--fg)" stroke-width="2" stroke-linejoin="round"/>${dots}</svg>`;
}
/**
 * Contenido del desplegable de una fila: lista de tiempos por vuelta (con «-» si falta alguno) y gráfico.
 * El mejor tiempo del piloto va sombreado: morado si es el más rápido de la sesión (sbest), verde si solo es su mejor personal.
 */
const lapBox = (r, rg, sbest) => {
    const L = (r.laps || []).map(lv);
    const best = Math.min(...L.filter(v => v != null));
    const list = L.map((v, i) => `<div class=row><span class=n>${i + 1}</span><span>${v == null ? '-' : v == best ? `<span class="lt ${v == sbest ? 'pu' : 'gr'}">${fmtT(v)}</span>` : fmtT(v)}</span></div>`).join('');
    return `<div class=lapbox><div class=ll>${list}</div>${lapChart(L, rg[0], rg[1])}</div>`;
};
/**
 * Icono de gráfico de línea del botón de cada fila.
 */
const ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/></svg>';
/**
 * Botón (con icono) que despliega la fila id; solo aparece si el piloto tiene tiempos por vuelta.
 */
const lapBtn = (id, r) => hasL(r) ? `<button class="btn s ic" title="Tiempos por vuelta" onclick="tgl('${id}')">${ICON}</button>` : '';
/**
 * Muestra u oculta el elemento con ese id.
 */
function tgl(id) {
    const e = document.getElementById(id);
    if (e)
        e.hidden = !e.hidden;
}
/**
 * Equipo de F1 con su logo y nombre, en una línea.
 */
const tt = k => k ? `<span style="display:inline-flex;align-items:center;gap:6px">${tl(k, 20)}${tn(k)}</span>` : '';
/**
 * Suma de a[i..j) (para agrupar posiciones en el ranking de karts).
 */
const sm = (a, i, j) => a.slice(i, j).reduce((p, q) => p + q, 0);
/**
 * Ventana con el detalle de un evento disputado.
 */
function openE(id) {
    const e = D.events.find(x => x.id == id);
    const f = e.f;
    let h = `<span class=tag>${spn(e.sport)}</span><p class=mu>${meta(e)}</p>${ytl(e)}`;
    if (e.sport == 'f') {
        const lu = t => f.pl.filter(p => p.t == t).map(p => `<span>${logo(M(p.p).name, 44, p.t == 'A' ? f.ca : f.cb)}${esc(M(p.p).name)}<i class=nk style="font-style:normal">${esc(M(p.p).nick)}</i></span>`).join('');
        h += `<div class="sc big"><div>${logo(f.a, 80, f.ca, f.la)}${esc(f.a)}</div><b>${+f.sa} – ${+f.sb}</b><div>${logo(f.b, 80, f.cb, f.lb)}${esc(f.b)}</div></div><div class=g2><div class=card><b>${esc(f.a)}</b><div class=lu>${lu('A')}</div></div><div class=card><b>${esc(f.b)}</b><div class=lu>${lu('B')}</div></div></div><h2>Rendimiento</h2>` +
            ptb(f);
    }
    else
        e.k.ss.forEach((s, i) => {
            const r = srows(s);
            const b = lap(r[0]?.lap);
            const fr = s.kind == 'r' ? fastest(s) : null;
            const gridOf = n => {
                for (let k = n - 1; k >= 0; k--)
                    if (e.k.ss[k].kind == 'q')
                        return srows(e.k.ss[k]).map(x => x.p);
                return null;
            };
            const gq = s.kind == 'r' ? gridOf(i) : null;
            const rg = lapRange(e);
        const sbest = Math.min(...s.rows.flatMap(x => (x.laps || []).map(lv)).filter(v => v != null));
            const ex = r.map((x, j) => hasL(x) ? { id: `lc${i}_${j}`, html: lapBox(x, rg, sbest) } : null);
            const bt = (x, j) => lapBtn(`lc${i}_${j}`, x);
            h += `<h2>${SK[s.kind] || 'Sesión'} ${i + 1}</h2>` + (s.kind != 'r'
                ? tbl(['#', 'Piloto', 'Equipo', 'Tiempo', 'Dif.', ''], r.map((x, j) => [j + 1, nm(M(x.p)), tt(x.team), lap(x.lap) == null ? '–' : j ? `<span class=mu>${esc(x.lap)}</span>` : `<b>${esc(x.lap)}</b>`, lap(x.lap) == null || !j ? '–' : '+' + (lap(x.lap) - b).toFixed(3), bt(x, j)]), ex)
                : tbl(['#', 'Piloto', 'Equipo', 'V. rápida', 'Pos. vs clasif.', ''], r.map((x, j) => {
                    const v = fr ? x === fr : x.vr;
                    const gp = gq ? gq.indexOf(x.p) : -1;
                    const d = gp < 0 ? null : gp - j;
                    return [j + 1, nm(M(x.p)), tt(x.team), lap(x.lap) == null ? (v ? '⚡' : '') : v ? `⚡ <b>${esc(x.lap)}</b>` : `<span class=mu>${esc(x.lap)}</span>`, d == null ? '–' : d > 0 ? `<span style="color:#1fa84f">▲ ${d}</span>` : d < 0 ? `<span style="color:#e5484d">▼ ${-d}</span>` : '0', bt(x, j)];
                }), ex));
        });
    modal = h;
    render();
}
/* ADMIN */
// ========== PANEL DE ADMINISTRACIÓN ==========
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
// ========== ADMIN: TIEMPOS POR VUELTA ==========
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
// ========== SUPABASE: ACCESO, LECTURA Y GUARDADO ==========
/**
 * Inicio de sesión del administrador.
 */
async function login() {
    const r = await sb.auth.signInWithPassword({ email: $('#le').value, password: $('#lp').value });
    if (r.error)
        alert('Credenciales incorrectas');
}
/**
 * Carga integrantes (originales primero, luego invitados, orden alfabético) y eventos.
 */
async function load() {
    const [m, e] = await Promise.all([sb.from('members').select('data').order('id'), sb.from('events').select('data')]);
    D.members = (m.data || []).map(x => x.data).sort((a, b) => !!a.guest - !!b.guest || a.name.localeCompare(b.name, 'es'));
    D.events = (e.data || []).map(x => x.data);
    render();
}
/**
 * Guarda en Supabase: inserta o actualiza todo y borra lo que ya no está; después recarga.
 */
async function pub() {
    busy = true;
    render();
    try {
        for (const [t, L] of [['members', D.members], ['events', D.events]]) {
            if (L.length) {
                const r = await sb.from(t).upsert(L.map(x => ({ id: x.id, data: x })));
                if (r.error)
                    throw r.error;
            }
            const q = await sb.from(t).select('id');
            const ids = L.map(x => x.id);
            const del = (q.data || []).map(y => y.id).filter(i => !ids.includes(i));
            if (del.length) {
                const r = await sb.from(t).delete().in('id', del);
                if (r.error)
                    throw r.error;
            }
        }
    }
    catch (e) {
        alert('Error al guardar: ' + (e.message || e));
    }
    busy = false;
    await load();
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
// ========== ACCIONES DEL ADMIN ==========
/**
 * Integrante vacío (plantilla del formulario).
 */
const MD0 = { id: '', name: '', nick: '', by: '', guest: false };
/**
 * Integrante que se está editando.
 */
let md = { ...MD0 };
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
    pub();
}
/**
 * Borra un integrante (con confirmación).
 */
function delM(id) {
    if (confirm('¿Borrar?')) {
        D.members = D.members.filter(m => m.id != id);
        pub();
    }
}
/**
 * Borra un evento (con confirmación).
 */
function delE(id) {
    if (confirm('¿Borrar evento?')) {
        D.events = D.events.filter(e => e.id != id);
        pub();
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
    pub();
}
// ========== PINTADO Y ARRANQUE ==========
/**
 * Pinta cabecera, pestaña activa y ventana abierta.
 */
function render() {
    const T = [['home', 'Inicio'], ['mem', 'Integrantes'], ['ev', 'Eventos'], ['rk', 'Ranking']];
    T.push(['adm', 'Admin']);
    root.innerHTML = `<header><h1>GORILAND</h1><nav>${T.map(([k, l]) => `<button class="${tab == k ? 'on' : ''}" onclick="tab='${k}';render()">${l}</button>`).join('')}</nav></header><main>${view(stats())}</main>${modal ? `<div class=ov onclick="modal='';render()"><div class=md onclick="event.stopPropagation()"><button class=x onclick="modal='';render()">✕</button>${modal}</div></div>` : ''}`;
}
// Arranque: primer pintado, carga de datos y comprobación de sesión.
render();
load();
sb.auth.getSession().then(({ data }) => {
    admin = !!data.session;
    render();
});
