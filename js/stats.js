/*
 * GORILAND · js/stats.js
 * Cálculo de puntos y estadísticas de cada persona y filas de los rankings (sin HTML).
 */

/**
 * Calcula puntos y estadísticas de cada persona a partir de los eventos disputados.
 * Cortijos League: victoria 10, empate 7, derrota 5; +2 gol, +1 asistencia, +5 MVP.
 * GP Goriland: 5 por participar; en clasificación y carrera del 10º (1) al 1º (10). Los entrenamientos no puntúan.
 * Constructores (TP): en clasificación y carrera, 22 puntos al 1º, 21 al 2º... 1 al 22º.
 * Devuelve {idPersona: {pts, pf, pk, ev, pj, g, a, m, nk, vr, pp, pos}}
 * (pts total, pf fútbol, pk karts, nk eventos de karts, vr vueltas rápidas, pp poles, pos[0..9] veces en cada puesto).
 */
function computeStats() {
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
 * Estadísticas y puntos de cada persona, guardados en memoria: solo se recalculan cuando los datos cambian (STATS = null).
 */
function stats() {
    return STATS || (STATS = computeStats());
}
