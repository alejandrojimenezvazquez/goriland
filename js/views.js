/*
 * GORILAND · js/views.js
 * Contenido de cada pestaña (view) y ventanas emergentes de detalle (openM, openE).
 */

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
