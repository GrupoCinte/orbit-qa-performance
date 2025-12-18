import http from 'k6/http';
import { check, sleep } from 'k6';
import { config } from './config.js';


export function getRandomInt(max) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0] % max;
}


export function getRandomFactor(variance = 30) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const r = array[0] / 0xFFFFFFFF; // número entre 0 y 1
    return 1 + ((r - 0.5) * 2 * variance) / 100;
}


export function sleepWithVariance(baseSeconds = 1, variance = 30) {
    const factor = getRandomFactor(variance);
    sleep(baseSeconds * factor);
}

export function extractViewState(body) {
    const match = body.match(/javax\.faces\.ViewState"[^>]*value="([^"]+)"/);
    return match ? match[1] : null;
}

export function updateCookies(prevCookies, res) {
    const jar = {};

    if (prevCookies) {
        prevCookies.split(';').forEach(c => {
            const [name, value] = c.trim().split('=');
            if (name && value) jar[name] = value;
        });
    }

    if (res.cookies) {
        for (const name in res.cookies) {
            if (res.cookies[name][0]?.value) jar[name] = res.cookies[name][0].value;
        }
    }

    return Object.entries(jar)
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');
}

export function isAjaxRedirect(body) {
    return body.includes('<partial-response') && body.includes('<redirect');
}

export function buildHeaders(cookies, isAjax = false) {
    return {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookies,
        ...(isAjax && { 'Faces-Request': 'partial/ajax' })
    };
}

// LOGIN / LOGOUT

export function performLogin(user) {
    const loginUrl = `${config.baseUrl}${config.appPath}/index.xhtml`;

    try {
        const getRes = http.get(loginUrl, { timeout: `${config.timeouts.login}ms` });
        if (getRes.status !== 200) return { success: false, cookies: '', viewState: '' };

        let cookies = updateCookies("", getRes);
        let viewState = extractViewState(getRes.body);
        if (!viewState) return { success: false, cookies: '', viewState: '' };

        const payload =
            `j_idt5=j_idt5&` +
            `j_idt5:correo=${encodeURIComponent(user.correo)}&` +
            `j_idt5:password=${encodeURIComponent(user.password)}&` +
            `j_idt5:button=Ingresar&` +
            `javax.faces.ViewState=${encodeURIComponent(viewState)}`;

        const postRes = http.post(loginUrl, payload, {
            headers: buildHeaders(cookies),
            redirects: 0,
            timeout: `${config.timeouts.login}ms`
        });

        cookies = updateCookies(cookies, postRes);
        const ok = postRes.status === 302;

        check(postRes, { 'login 302': () => ok });
        return { success: ok, cookies, viewState };

    } catch (err) {
        console.error(`Error en login: ${err.message}`);
        return { success: false, cookies: '', viewState: '' };
    }
}

export function performLogout(cookies, viewState = "0") {
    const url = `${config.baseUrl}${config.appPath}/App/Provisiones/Flujo/index.xhtml`;
    const payload = `j_idt49=j_idt49&j_idt49%3Aj_idt50=Cerrar+sesi%C3%B3n&javax.faces.ViewState=${encodeURIComponent(viewState)}`;

    try {
        const res = http.post(url, payload, { headers: buildHeaders(cookies), redirects: 0 });
        const ok = res.status === 302;
        check(res, { 'logout 302': () => ok });
        return ok;
    } catch (err) {
        console.error(`Error en logout: ${err.message}`);
        return false;
    }
}


// MENÚ
export function loadMenu(cookies) {
    const url = `${config.baseUrl}${config.appPath}/App/Provisiones/Flujo/`;

    try {
        const res = http.get(url, { headers: buildHeaders(cookies), timeout: `${config.timeouts.pageLoad}ms` });
        const ok = res.status === 200;

        check(res, {
            'menú 200': () => ok,
            'menú tiene contenido': () => res.body.length > 200
        });

        return { success: ok, viewState: extractViewState(res.body), cookies: updateCookies(cookies, res) };

    } catch (err) {
        console.error(`Error al cargar menú: ${err.message}`);
        return { success: false, viewState: null, cookies };
    }
}

// FILTRO AJAX
export function applyFlowFilter(cookies, viewState, cliente = "87") {
    const url = `${config.baseUrl}${config.appPath}/App/Provisiones/Flujo/index.xhtml`;
    const payload =
        `javax.faces.partial.ajax=true&` +
        `javax.faces.source=frmConsultor%3AflujoTable&` +
        `javax.faces.partial.execute=frmConsultor%3AflujoTable&` +
        `javax.faces.partial.render=frmConsultor%3AflujoTable&` +
        `frmConsultor%3AflujoTable_filtering=true&` +
        `frmConsultor%3AflujoTable%3AclienteFilter=${cliente}&` +
        `javax.faces.ViewState=${encodeURIComponent(viewState)}`;

    try {
        const res = http.post(url, payload, { headers: buildHeaders(cookies, true), timeout: `${config.timeouts.http}ms` });
        const ok = res.status === 200 && !isAjaxRedirect(res.body);

        check(res, { 'filtro 200': () => ok });
        return { success: ok, viewState: extractViewState(res.body) || viewState, cookies: updateCookies(cookies, res) };

    } catch (err) {
        console.error(`Error en filtro: ${err.message}`);
        return { success: false, viewState, cookies };
    }
}

// EDITAR FLUJO
export function editFlow(cookies, viewState, tipo = "1") {
    const url = `${config.baseUrl}${config.appPath}/App/Provisiones/Flujo/index.xhtml`;
    const payload =
        `javax.faces.partial.ajax=true&` +
        `javax.faces.source=frmAfrm%3Aj_idt97&` +
        `javax.faces.partial.execute=%40all&` +
        `javax.faces.partial.render=frmAfrm+frmConsultor&` +
        `frmAfrm%3AtipoFujo=${tipo}&` +
        `javax.faces.ViewState=${encodeURIComponent(viewState)}`;

    try {
        const res = http.post(url, payload, { headers: buildHeaders(cookies, true), timeout: `${config.timeouts.http}ms` });
        const ok = res.status === 200;

        check(res, { 'editar 200': () => ok });
        return { success: ok, viewState: extractViewState(res.body) || viewState, cookies: updateCookies(cookies, res) };

    } catch (err) {
        console.error(`Error en edición: ${err.message}`);
        return { success: false, viewState, cookies };
    }
}
