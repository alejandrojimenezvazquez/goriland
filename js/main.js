/*
 * GORILAND · js/main.js
 * Pintado general de la página y arranque de la aplicación.
 */

/**
 * Cambios de sesión: solo se vuelve a pintar si cambia el estado de administrador (así un refresco de sesión
 * en segundo plano no borra lo que se esté escribiendo en un formulario).
 */
sb.auth.onAuthStateChange((_, x) => {
    const a = !!x;
    if (a !== admin) {
        admin = a;
        render();
    }
});

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
    const a = !!data.session;
    if (a !== admin) {
        admin = a;
        render();
    }
});
