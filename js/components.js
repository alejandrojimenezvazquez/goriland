/*
 * GORILAND · js/components.js
 * Piezas de interfaz reutilizables: logos, tablas, tarjetas de eventos y gráfico de tiempos por vuelta.
 */

/**
 * Escudo: imagen subida (sin marco) si hay url u; si no, círculo con iniciales.
 * n = nombre, z = tamaño en px, c = color, u = url del escudo.
 */
const logo = (n, z = 34, c, u) => u ? `<img src="${esc(u)}" alt="" style="width:${z}px;height:${z}px;object-fit:contain;flex:none">` : `<span class=lg style="width:${z}px;height:${z}px;background:${c || col(n)};text-shadow:0 0 3px #000">${esc((n || '?').slice(0, 2).toUpperCase())}</span>`;

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
    const key = 'team-' + encodeURIComponent(k);
    if (MISSING.has(key))
        return c;
    const u = sb.storage.from('escudos').getPublicUrl(key).data.publicUrl + '?v=' + LV.v;
    return `<img src="${u}" alt="${esc(k)}" style="width:${z}px;height:${z}px;object-fit:contain;flex:none" data-k="${esc(key)}" data-fb="${esc(c)}" onerror="logoMissing(this)">`;
};

/**
 * Logo de la competición k (archivo logo-f / logo-k en Storage). Se oculta si no existe (y se recuerda en MISSING para no volver a pedirlo).
 */
const sl = (k, z = 18) => MISSING.has('logo-' + k) ? '' : `<img src="${sb.storage.from('escudos').getPublicUrl('logo-' + k).data.publicUrl}?v=${LV.v}" alt="" data-k="logo-${k}" style="height:${z}px;width:auto;max-width:${z * 3}px;object-fit:contain;vertical-align:middle" onerror="logoMissing(this)">`;

/**
 * Logo + nombre de la competición (z = alto del logo).
 */
const spn = (k, z = LS.tag) => `<span style="display:inline-flex;align-items:center;gap:6px">${sl(k, z)}${SPN[k]}</span>`;

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
 * Nombre con el mote en gris y la marca de invitado.
 */
const nm = m => esc(m.name) + (m.nick ? ` <span class=nk>“${esc(m.nick)}”</span>` : '') + (m.guest ? ' <span class=mu>(inv.)</span>' : '');

/**
 * Botón de YouTube de un evento (solo enlaces de youtube.com / youtu.be).
 */
const ytl = e => /^https?:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//.test(e.yt || '') ? `<p><a class="btn" style="text-decoration:none;display:inline-block" href="${esc(e.yt)}" target=_blank rel="noopener noreferrer">▶ Ver vídeo en YouTube</a></p>` : '';

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
 * Se ejecuta si un logo no existe en Storage: lo recuerda y lo sustituye por su alternativa (data-fb) o lo quita.
 */
function logoMissing(img) {
    MISSING.add(img.dataset.k);
    img.outerHTML = img.dataset.fb || '';
}
