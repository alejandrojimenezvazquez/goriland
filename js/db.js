/*
 * GORILAND · js/db.js
 * Acceso a datos (Supabase): inicio de sesión, carga, guardado y borrado.
 */

/**
 * Inicio de sesión del administrador.
 */
async function login() {
    const r = await sb.auth.signInWithPassword({ email: $('#le').value, password: $('#lp').value });
    if (r.error)
        alert('Credenciales incorrectas');
}

/**
 * Ordena integrantes: originales primero, luego invitados y, dentro de cada grupo, por orden alfabético.
 */
const sortMembers = () => D.members.sort((a, b) => !!a.guest - !!b.guest || a.name.localeCompare(b.name, 'es'));
/**
 * Carga integrantes y eventos desde Supabase y vuelve a pintar.
 */
async function load() {
    const [m, e] = await Promise.all([sb.from('members').select('data').order('id'), sb.from('events').select('data')]);
    D.members = (m.data || []).map(x => x.data);
    D.events = (e.data || []).map(x => x.data);
    sortMembers();
    STATS = null;
    MIDX = null;
    render();
}
/**
 * Inserta o actualiza un solo registro (tabla members o events).
 */
async function dbSave(table, rec) {
    const r = await sb.from(table).upsert({ id: rec.id, data: rec });
    if (r.error)
        throw r.error;
}
/**
 * Borra un solo registro por id.
 */
async function dbDelete(table, id) {
    const r = await sb.from(table).delete().eq('id', id);
    if (r.error)
        throw r.error;
}
/**
 * Guarda un cambio ya aplicado en D: muestra «Guardando…», ejecuta la operación (una sola petición) y vuelve a pintar.
 * Si falla, avisa y recarga los datos reales de Supabase.
 */
async function commit(op) {
    busy = true;
    STATS = null;
    MIDX = null;
    render();
    try {
        await op();
    }
    catch (e) {
        alert('Error al guardar: ' + (e.message || e));
        await load();
    }
    busy = false;
    sortMembers();
    render();
}
