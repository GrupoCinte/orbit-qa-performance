import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { SharedArray } from 'k6/data';

// Usuarios
const users = new SharedArray('users', function() {
    return open('users.csv').split('\n').slice(1)
        .filter(line => line.trim())
        .map(line => {
            const parts = line.split(';');
            return { correo: parts[0]?.trim(), password: parts[1]?.trim() };
        })
        .filter(u => u.correo && u.password);
});

export const options = {
    stages: [
        { duration: '10m', target: 7 },
        { duration: '15m', target: 20 },
        { duration: '10m', target: 3 }
    ],
};

export default function () {
    if (users.length === 0) throw new Error('No users in users.csv');

    const user = users[Math.floor(Math.random() * users.length)];
    let cookies = '';

    // Login
    group('login', function() {
        const loginUrl = 'http://localhost:8080/Integracion-areas/index.xhtml';
        const getRes = http.get(loginUrl);
        const viewStateMatch = getRes.body.match(/ViewState"\s+.*?value="([^"]+)"/);
        if (!viewStateMatch) return;
        const viewState = viewStateMatch[1];

        cookies = Object.keys(getRes.cookies)
            .map(n => `${n}=${getRes.cookies[n][0].value}`).join('; ');

        const payload = `j_idt5=j_idt5&j_idt5:correo=${encodeURIComponent(user.correo)}&j_idt5:password=${encodeURIComponent(user.password)}&j_idt5:button=Ingresar&javax.faces.ViewState=${encodeURIComponent(viewState)}`;

        const postRes = http.post(loginUrl, payload, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': cookies },
            redirects: 0
        });
        check(postRes, { 'login 302': r => r.status === 302 });
        sleep(1);
    });

    // Menu
    group('menu', function() {
        const menuUrl = 'http://localhost:8080/Integracion-areas/App/Provisiones/Flujo/';
        const menuRes = http.get(menuUrl, { headers: { 'Cookie': cookies } });
        check(menuRes, { 'menu cargado (200)': r => r.status === 200 });
        sleep(2);
    });

    // Filtro AJAX
    group('filtro', function() {
        const postUrl = 'http://localhost:8080/Integracion-areas/App/Provisiones/Flujo/index.xhtml';
        const payload = 'javax.faces.partial.ajax=true&javax.faces.source=frmConsultor%3AflujoTable&javax.faces.partial.execute=frmConsultor%3AflujoTable&javax.faces.partial.render=frmConsultor%3AflujoTable&frmConsultor%3AflujoTable=frmConsultor%3AflujoTable&frmConsultor%3AflujoTable_filtering=true&frmConsultor%3AflujoTable_encodeFeature=true&frmConsultor=frmConsultor&frmConsultor%3AflujoTable_rppDD=15&frmConsultor%3AflujoTable%3AclienteFilter=87&frmConsultor%3AflujoTable_scrollState=0%2C0&javax.faces.ViewState=115264589307576193%3A3581904077963643541';
        const postRes = http.post(postUrl, payload, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': cookies, 'Faces-Request': 'partial/ajax' }
        });
        check(postRes, { 'el filtro es exitoso (200)': r => r.status === 200 });
        sleep(2);
    });
    //editar flujo
    group('editar_flujo', function() {
            const postUrl = 'http://localhost:8080/Integracion-areas/App/Provisiones/Flujo/index.xhtml';
            const payload = 'javax.faces.partial.ajax=true&javax.faces.source=frmAfrm%3Aj_idt97&javax.faces.partial.execute=%40all&javax.faces.partial.render=frmAfrm+frmConsultor&frmAfrm%3Aj_idt97=frmAfrm%3Aj_idt97&frmAfrm=frmAfrm&frmAfrm%3AtipoFujo=1&javax.faces.ViewState=721588292342541437%3A973450968289756064';
            const postRes = http.post(postUrl, payload, {
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Cookie': cookies, 'Faces-Request': 'partial/ajax' }
                    });

            check(postRes, {
                'status 200': r => r.status === 200,
            });

        });

        sleep(2);
    //cerrar sesion
    group('logout', function() {
        const logoutUrl = 'http://localhost:8080/Integracion-areas/App/Provisiones/Flujo/index.xhtml';
        const payload ='j_idt49=j_idt49&j_idt49%3Aj_idt50=Cerrar+sesi%C3%B3n&javax.faces.ViewState=721588292342541437%3A973450968289756064';

        const logoutRes = http.post(logoutUrl, payload, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookies,
            },
        });

        check(logoutRes, {
            'logout exitoso': (r) => r.status === 302
        });
    });
    sleep(2);


}
