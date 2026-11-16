/*
 * GORILAND · js/config.js
 * Configuración: conexión a Supabase, equipos de F1, nombres de competiciones, tamaños de logos, orden de posiciones
 * y textos de los criterios de puntuación. Es lo primero que se carga.
 */

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

/**
 * k = abreviatura, n = nombre, c = color. Edita aquí nombres o colores.
 */
const TEAMS = [['MCL', 'McLaren', '#FF8000'], ['MER', 'Mercedes', '#27F4D2'], ['RBR', 'Red Bull Racing', '#3671C6'], ['FER', 'Ferrari', '#E8002D'], ['WIL', 'Williams', '#64C4FF'], ['RCB', 'Racing Bulls', '#6692FF'], ['AMR', 'Aston Martin', '#229971'], ['HAA', 'Haas', '#B6BABD'], ['AUD', 'Audi', '#F50537'], ['ALP', 'Alpine', '#0093CC'], ['CAD', 'Cadillac', '#4A4A4A']].map(([k, n, c]) => ({ k, n, c }));

/**
 * Busca un equipo por su abreviatura.
 */
const tm = k => TEAMS.find(t => t.k == k);

/**
 * Alto (px) de los logos de competición: etiqueta de tarjeta, pestañas del ranking,
 * títulos de sección de Eventos y panel Admin.
 */
const LS = { tag: 24, pill: 24, sec: 30, adm: 36 };

 // tamaño (px) de los logos de competición: etiqueta, pestañas, títulos de sección, admin
/**
 * Nombre de cada competición según el deporte (f = fútbol, k = karts).
 */
const SPN = { f: 'Cortijos League', k: 'GP Goriland' };

/**
 * Nombre de cada tipo de sesión de karts.
 */
const SK = { t: 'Entrenamiento', q: 'Clasificación', r: 'Carrera' };

/**
 * Criterios de puntuación que se muestran junto a cada ranking (la clave es el ranking).
 */
const CR = {
    g: `Suma de los puntos de todas las competiciones.<br><br><b>Cortijos League:</b><br><br>Victoria: 10 puntos<br>Empate: 7 puntos<br>Derrota: 5 puntos<br>Gol: 2 puntos<br>Asistencia: 1 punto<br>MVP: 5 puntos<br><br><b>GP Goriland:</b><br><br>Participación: 5 puntos<br>Clasificación: del 10º (1 punto) al 1º (10 puntos)<br>Carrera: del 10º (1 punto) al 1º (10 puntos)<br><br>Los entrenamientos no puntúan.`,
    f: `Estadísticas acumuladas de la <b>Cortijos League</b>.<br><br>PJ = Partidos jugados<br>V = Victorias<br>E = Empates<br>D = Derrotas<br>G = Goles<br>A = Asistencias<br>MVP = Jugador más valioso<br><br>Desglose de puntos:<br><br>Victoria: 10 puntos<br>Empate: 7 puntos<br>Derrota: 5 puntos<br>Gol: 2 puntos<br>Asistencia: 1 punto<br>MVP: 5 puntos<br>`,
    k: `Estadísticas acumuladas del <b>GP Goriland</b>.<br>GP = eventos disputados<br>VR = vueltas rápidas en carrera<br>PP = pole position<br>1º, 2º y 3º = veces que se ha acabado una carrera en ese puesto.<br>T5 = 4º o 5º<br>T10 = del 6º al 10º<br>T15 = del 11º al 15º<br>+16 = a partir del 16º<br><br>Participación: 5 puntos<br>Clasificación: del 10º (1 punto) al 1º (10 puntos)<br>Carrera: del 10º (1 punto) al 1º (10 puntos)<br>Los entrenamientos no puntúan.`,
    c: `Ranking de equipos del <b>GP Goriland</b>, independiente de los integrantes.<br><br>Suma los puntos de sus pilotos en clasificación y carrera.<br><br>Desglose de puntos:<br><br>${Array.from({ length: 22 }, (_, n) => `${n + 1}º = ${22 - n}${n ? '' : ' puntos'}`).join('<br>')}<br><br>Los entrenamientos no puntúan.`
};

/**
 * Orden de las posiciones de fútbol en las tablas.
 */
const POS = { POR: 0, DEF: 1, MED: 2, DEL: 3 };

/**
 * Nombre de cada posición de fútbol.
 */
const POSN = { POR: 'Portero', DEF: 'Defensa', MED: 'Medio', DEL: 'Delantero' };
