/*
 * GORILAND · js/utils.js
 * Utilidades sin interfaz: HTML seguro, integrantes, colores, tiempos, fechas y orden de las sesiones.
 */

/**
 * Atajo de document.querySelector.
 */
const $ = s => document.querySelector(s);

/**
 * Contenedor donde se pinta toda la aplicación.
 */
const root = $('#app');

/**
 * Escapa texto para insertarlo en HTML de forma segura.
 */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * Integrante con ese id (o uno vacío si no existe). Usa un índice (MIDX) que se reconstruye cuando cambian los datos.
 */
const M = id => (MIDX || (MIDX = new Map(D.members.map(m => [m.id, m])))).get(id) || { name: '?', nick: '' };

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
 * Fila con el mejor tiempo de una sesión (la vuelta rápida de una carrera).
 */
const fastest = s => {
    const L = s.rows.filter(r => lap(r.lap) != null);
    return L.length ? L.reduce((a, b) => lap(b.lap) < lap(a.lap) ? b : a) : null;
};

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

/**
 * Eventos ordenados por fecha, del más reciente al más antiguo.
 */
const evs = () => [...D.events].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

/**
 * Edad calculada con el año de nacimiento (o la edad antigua si no hay año).
 */
const age = m => m.by ? new Date().getFullYear() - m.by : (m.age ?? '?');

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
 * Suma de a[i..j) (para agrupar posiciones en el ranking de karts).
 */
const sm = (a, i, j) => a.slice(i, j).reduce((p, q) => p + q, 0);
