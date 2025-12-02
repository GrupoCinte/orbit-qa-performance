import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

const users = new SharedArray('users', function() {
    return open('users.csv').split('\n').slice(1)
        .filter(line => line.trim())
        .map(line => {
            const parts = line.split(';');
            return {
                correo: parts[0]?.trim() || '',
                password: parts[1]?.trim() || ''
            };
        })
        .filter(u => u.correo && u.password);
});

export const options = {
    stages: [
        { duration: '2m', target: 5 },     // Warm-up suave
        { duration: '3m', target: 20 },    // Subida al nivel mínimo
        { duration: '10m', target: 20 },   // Mantener carga normal
        { duration: '3m', target: 30 },    // Subida al pico
        { duration: '12m', target: 30 },   // Mantener el pico
        { duration: '3m', target: 5 },     // Bajada gradual
        { duration: '1m', target: 0 },     // Fin
    ],
};

const baseHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9',
    'Accept-Encoding': 'gzip, deflate',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
};

function extractViewState(body) {
    const match = body.match(/ViewState"\s+.*?value="([^"]+)"/) ||
                  body.match(/id="j_id__v_0:javax.faces.ViewState:0"\s+value="([^"]+)"/);
    return match ? match[1] : null;
}

export default function () {
    const baseUrl = 'http://localhost:8080/Integracion-areas';
    const loginUrl = `${baseUrl}/index.xhtml`;
    const user = users[Math.floor(Math.random() * users.length)];

    // 1. GET página de login
    const loginRes = http.get(loginUrl, {
        headers: baseHeaders,
        tags: { name: 'GET_Login_Page' }
    });

    const viewState = extractViewState(loginRes.body);
    if (!viewState) {
        console.error('ViewState no encontrado');
        return;
    }

    sleep(1);

    // 2. POST login
    const loginPayload = `j_idt5=j_idt5&j_idt5:correo=${encodeURIComponent(user.correo)}&j_idt5:password=${encodeURIComponent(user.password)}&j_idt5:button=Ingresar&javax.faces.ViewState=${encodeURIComponent(viewState)}`;

    const postRes = http.post(loginUrl, loginPayload, {
        headers: { ...baseHeaders, 'Content-Type': 'application/x-www-form-urlencoded', 'Referer': loginUrl },
        cookies: loginRes.cookies,
        redirects: 0,
        tags: { name: 'POST_Login' }
    });

    if (!check(postRes, { 'login 302': (r) => r.status === 302 })) {
        console.error(`Login falló para ${user.correo}: status ${postRes.status}`);
        return;
    }

    sleep(1);

    //  Seguir redirección
    const allCookies = { ...loginRes.cookies, ...postRes.cookies };
    const homeRes = http.get(`${baseUrl}${postRes.headers['Location']}`, {
        headers: { ...baseHeaders, 'Referer': loginUrl },
        cookies: allCookies,
        tags: { name: 'GET_Home_After_Login' }
    });

    Object.assign(allCookies, homeRes.cookies);
    sleep(1);

    // Acceder a SolicitudFactura
    const facturaUrl = `${baseUrl}/App/Facturacion/SolicitudFactura/`;
    const facturaRes = http.get(facturaUrl, {
        headers: { ...baseHeaders, 'Referer': homeRes.url },
        cookies: allCookies,
        tags: { name: 'GET_SolicitudFactura' }
    });

    const facturaViewState = extractViewState(facturaRes.body);
    if (!facturaViewState) {
        console.error('No se encontró ViewState en SolicitudFactura');
        return;
    }

    sleep(1);

    //  Crear nueva solicitud de factura
    const crearSolicitudPayload = `javax.faces.partial.ajax=true&javax.faces.source=j_idt104%3AcrearBoton&javax.faces.partial.execute=%40all&javax.faces.partial.render=j_idt104%3AsolicitudFactura+tablaSolicitudFact&j_idt104%3AcrearBoton=j_idt104%3AcrearBoton&j_idt104=j_idt104&j_idt104%3AnovCliente=134&j_idt104%3AnovConsultor=DS&j_idt104%3ANovFC=FC+PRUEBA&j_idt104%3AnovValor_input=%24112.000%2C00&j_idt104%3AnovValor_hinput=112000.00&j_idt104%3AnovObservaciones=FG&javax.faces.ViewState=${encodeURIComponent(facturaViewState)}`;

    const crearSolicitudRes = http.post(`${facturaUrl}index.xhtml`, crearSolicitudPayload, {
        headers: {
            ...baseHeaders,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Referer': facturaUrl,
            'Faces-Request': 'partial/ajax',
            'X-Requested-With': 'XMLHttpRequest'
        },
        cookies: allCookies,
        tags: { name: 'POST_Crear_Solicitud_Factura' }
    });

    check(crearSolicitudRes, {
        'Crear solicitud status 200': (r) => r.status === 200,
        'Crear solicitud sin errores': (r) => !r.body.includes('error') && !r.body.includes('exception')
    });

    sleep(2);

    // Logout
    const logoutPayload = `j_idt49=j_idt49&j_idt49:j_idt50=Cerrar+sesi%C3%B3n&javax.faces.ViewState=${encodeURIComponent(facturaViewState)}`;

    const logoutRes = http.post(facturaUrl, logoutPayload, {
        headers: { ...baseHeaders, 'Content-Type': 'application/x-www-form-urlencoded', 'Referer': facturaUrl },
        cookies: allCookies,
        redirects: 0,
        tags: { name: 'POST_Logout' }
    });

    check(logoutRes, { 'Logout exitoso (302)': (r) => r.status === 302 });

    sleep(2);
}