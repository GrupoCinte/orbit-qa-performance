import http from 'k6/http';
import { check, sleep } from 'k6';
import { config, getUrl } from './config.js';

export function getRandomInt(max) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0] % max;
}

export function getRandomFactor(variance = 30) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const r = array[0] / 0xFFFFFFFF;
    return 1 + ((r - 0.5) * 2 * variance) / 100;
}

/**
 * Sleep con varianza aleatoria para simular comportamiento humano
 * @param {number} baseSeconds - Segundos base de espera
 * @param {number} variance - Porcentaje de varianza
 */
export function sleepWithVariance(baseSeconds = 1, variance = 30) {
    const factor = getRandomFactor(variance);
    sleep(baseSeconds * factor);
}

export function extractViewState(body) {
    const match = body.match(/ViewState"\s+id[^>]*?value="([^"]+)"/);
    return match ? match[1] : null;
}

export function mergeCookies(res, currentCookies) {
    let cookieMap = {};

    // Parsear cookies existentes
    if (currentCookies) {
        currentCookies.split('; ').forEach(cookie => {
            const [name, value] = cookie.split('=');
            if (name) cookieMap[name] = value;
        });
    }

    // Agregar/actualizar con nuevas cookies
    Object.keys(res.cookies).forEach(name => {
        cookieMap[name] = res.cookies[name][0].value;
    });

    // Reconstruir string de cookies
    return Object.keys(cookieMap)
        .map(name => `${name}=${cookieMap[name]}`)
        .join('; ');
}


export function validateAjaxResponse(body) {
    return body && body.includes('<?xml') && body.length > 50;
}

/**
 * Construye headers HTTP estándar
 */
export function buildHeaders(cookies, isAjax = false) {
    return {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': cookies,
        ...(isAjax && { 'Faces-Request': 'partial/ajax' })
    };
}

export function performLogin(user) {
    const loginUrl = getUrl('login');

    try {
        // GET inicial para obtener ViewState
        const getRes = http.get(loginUrl, {
            timeout: `${config.timeouts.login}ms`
        });

        const ok = check(getRes, {
            'GET login 200': r => r.status === 200
        });

        if (!ok) {
            return { success: false, cookies: '', viewState: '' };
        }

        const viewState = extractViewState(getRes.body);
        if (!viewState) {
            console.error(`[${user.correo}] No se pudo extraer ViewState en login`);
            return { success: false, cookies: '', viewState: '' };
        }

        let cookies = mergeCookies(getRes, '');

        // POST para realizar login
        const payload =
            `${config.jsfComponents.loginForm}=${config.jsfComponents.loginForm}&` +
            `${config.jsfComponents.loginForm}:correo=${encodeURIComponent(user.correo)}&` +
            `${config.jsfComponents.loginForm}:password=${encodeURIComponent(user.password)}&` +
            `${config.jsfComponents.loginForm}:button=${encodeURIComponent(config.jsfComponents.loginButton)}&` +
            `javax.faces.ViewState=${encodeURIComponent(viewState)}`;

        const postRes = http.post(loginUrl, payload, {
            headers: buildHeaders(cookies),
            redirects: 0,
            timeout: `${config.timeouts.login}ms`
        });

        check(postRes, {
            'POST login 302': r => r.status === 302
        });

        if (postRes.status !== 302) {
            console.error(`[${user.correo}] Login falló con status ${postRes.status}`);
            return { success: false, cookies: '', viewState: '' };
        }

        cookies = mergeCookies(postRes, cookies);
        return { success: true, cookies, viewState };

    } catch (err) {
        console.error(`Error en login [${user.correo}]: ${err.message}`);
        return { success: false, cookies: '', viewState: '' };
    }
}

/**
 * Cierra la sesión del usuario
 * @param {string} cookies - String de cookies
 * @param {string} viewState - ViewState actual
 * @returns {boolean} true si logout exitoso
 */
export function performLogout(cookies, viewState) {
    const logoutUrl = getUrl('logout');
    
    const payload =
        `${config.jsfComponents.logoutForm}=${config.jsfComponents.logoutForm}&` +
        `${config.jsfComponents.logoutForm}%3Aj_idt44=${encodeURIComponent(config.jsfComponents.logoutButton)}&` +
        `javax.faces.ViewState=${encodeURIComponent(viewState)}`;

    try {
        const logoutRes = http.post(logoutUrl, payload, {
            headers: buildHeaders(cookies),
            redirects: 0,
            timeout: `${config.timeouts.http}ms`
        });

        const ok = check(logoutRes, {
            'logout exitoso 302': r => r.status === 302
        });

        return ok;

    } catch (err) {
        console.error(`Error en logout: ${err.message}`);
        return false;
    }
}


export function loadMenu(cookies) {
    const menuUrl = getUrl('menu');

    try {
        const menuRes = http.get(menuUrl, {
            headers: buildHeaders(cookies),
            timeout: `${config.timeouts.pageLoad}ms`
        });

        const ok = check(menuRes, {
            'GET menu 200': r => r.status === 200,
            'menu contiene tabla': r => r.body.includes(config.jsfComponents.tabla)
        });

        if (!ok) {
            console.error('GET menu falló');
            return { success: false, viewState: null, cookies };
        }

        const viewState = extractViewState(menuRes.body);
        if (!viewState) {
            console.error('No se pudo extraer ViewState en menú');
            return { success: false, viewState: null, cookies };
        }

        return {
            success: true,
            viewState: viewState,
            cookies: mergeCookies(menuRes, cookies)
        };

    } catch (err) {
        console.error(`Error al cargar menú: ${err.message}`);
        return { success: false, viewState: null, cookies };
    }
}

/**
 * Aplica filtro AJAX en la tabla de facturación
 */
export function applyFilter(cookies, viewState, cliente = null) {
    const clienteFilter = cliente || config.defaults.clienteFilter;
    const filterUrl = getUrl('filtro');

    const payload = 
        `javax.faces.partial.ajax=true&` +
        `javax.faces.source=${config.jsfComponents.tablaCliFac}&` +
        `javax.faces.partial.execute=${config.jsfComponents.tablaCliFac}&` +
        `javax.faces.partial.render=${config.jsfComponents.tablaCliFac}&` +
        `${config.jsfComponents.tablaCliFac}=${config.jsfComponents.tablaCliFac}&` +
        `${config.jsfComponents.tablaCliFac}_filtering=true&` +
        `${config.jsfComponents.tablaCliFac}_encodeFeature=true&` +
        `${config.jsfComponents.tabla}=${config.jsfComponents.tabla}&` +
        `${config.jsfComponents.tablaCliFac}%3AglobalFilter=&` +
        `${config.jsfComponents.tablaCliFac}_rppDD=${config.defaults.rowsPerPage}&` +
        `${config.jsfComponents.tablaCliFac}%3AclienteFilter=${clienteFilter}&` +
        `${config.jsfComponents.tablaCliFac}%3AnumFilter=&` +
        `${config.jsfComponents.tablaCliFac}%3AfiltroOc=&` +
        `${config.jsfComponents.tablaCliFac}%3AfiltroAnio=&` +
        `${config.jsfComponents.tablaCliFac}%3AestadoFilter=&` +
        `${config.jsfComponents.tablaCliFac}_scrollState=0%2C0&` +
        `javax.faces.ViewState=${encodeURIComponent(viewState)}`;

    try {
        const postRes = http.post(filterUrl, payload, {
            headers: buildHeaders(cookies, true),
            timeout: `${config.timeouts.http}ms`
        });

        const ok = check(postRes, {
            'POST filtro 200': r => r.status === 200,
            'respuesta AJAX válida': r => validateAjaxResponse(r.body)
        });

        if (!ok) {
            console.error('POST filtro falló');
            return { success: false, viewState, cookies };
        }

        if (!validateAjaxResponse(postRes.body)) {
            console.error('Respuesta AJAX filtro inválida');
            return { success: false, viewState, cookies };
        }

        return {
            success: true,
            viewState: viewState,
            cookies: mergeCookies(postRes, cookies)
        };

    } catch (err) {
        console.error(`Error en filtro: ${err.message}`);
        return { success: false, viewState, cookies };
    }
}

/**
 * Ver cruce
 */
export function verCruce(cookies, viewState) {
    const editUrl = getUrl('vercruce');

    const payload = 
        `javax.faces.partial.ajax=true&` +
        `javax.faces.source=${config.jsfComponents.verCrucesBoton}&` +
        `javax.faces.partial.execute=%40all&` +
        `javax.faces.partial.render=${config.jsfComponents.frmVerCruces}&` +
        `${config.jsfComponents.verCrucesBoton}=${config.jsfComponents.verCrucesBoton}&` +
        `${config.jsfComponents.tabla}=${config.jsfComponents.tabla}&` +
        `${config.jsfComponents.tablaCliFac}%3AglobalFilter=&` +
        `${config.jsfComponents.tablaCliFac}_rppDD=${config.defaults.rowsPerPage}&` +
        `${config.jsfComponents.tablaCliFac}%3AclienteFilter=${config.defaults.clienteFilter}&` +
        `${config.jsfComponents.tablaCliFac}%3AnumFilter=&` +
        `${config.jsfComponents.tablaCliFac}%3AfiltroOc=&` +
        `${config.jsfComponents.tablaCliFac}%3AfiltroAnio=&` +
        `${config.jsfComponents.tablaCliFac}%3AestadoFilter=&` +
        `${config.jsfComponents.tablaCliFac}_scrollState=0%2C0&` +
        `javax.faces.ViewState=${encodeURIComponent(viewState)}`;

    try {
        const postRes = http.post(editUrl, payload, {
            headers: buildHeaders(cookies, true),
            timeout: `${config.timeouts.http}ms`
        });

        const ok = check(postRes, {
            'POST ver cruce 200': r => r.status === 200,
            'respuesta contiene datos': r => validateAjaxResponse(r.body)
        });

        if (!ok) {
            console.error('POST ver cruce falló');
            return { success: false, viewState, cookies };
        }

        if (!validateAjaxResponse(postRes.body)) {
            console.error('Respuesta AJAX  inválida');
            return { success: false, viewState, cookies };
        }

        return {
            success: true,
            viewState: viewState,
            cookies: mergeCookies(postRes, cookies)
        };

    } catch (err) {
        console.error(`Error en ver cruce: ${err.message}`);
        return { success: false, viewState, cookies };
    }
}
