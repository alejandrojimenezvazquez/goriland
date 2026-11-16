/*
 * GORILAND · js/state.js
 * Estado de la aplicación (datos y variables de interfaz) y cachés. Son variables globales compartidas por todos los archivos.
 */

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

/**
 * Puntos de constructores por equipo; se recalcula en stats().
 */
let TP = {};

/**
 * Versión para saltarse la caché del navegador al refrescar un logo recién subido.
 */
const LV = { v: Date.now() };

/**
 * Integrante vacío (plantilla del formulario).
 */
const MD0 = { id: '', name: '', nick: '', by: '', guest: false };

/**
 * Integrante que se está editando.
 */
let md = { ...MD0 };

/**
 * Estadísticas ya calculadas (caché de stats()); se pone a null cuando cambian los datos.
 */
let STATS = null;
/**
 * Índice id -> integrante (caché de M()); se pone a null cuando cambian los integrantes.
 */
let MIDX = null;
/**
 * Logos que no existen en Storage; se recuerdan para no volver a pedirlos en cada pintado.
 */
const MISSING = new Set();
