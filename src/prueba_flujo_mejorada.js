import { check, group } from 'k6';
import { SharedArray } from 'k6/data';
import { config, getStages } from './config.js';
import {
    performLogin,
    performLogout,
    loadMenu,
    applyFlowFilter,
    editFlow,
    sleepWithVariance,
    getRandomInt
} from './utils.js';


const users = new SharedArray('users', function () {
    return open('/data/users.csv')
        .split('\n')
        .slice(1)
        .filter(line => line.trim())
        .map(line => {
            const [correo, password] = line.split(';');
            return { correo: correo.trim(), password: password.trim() };
        })
        .filter(u => u.correo && u.password);
});

export const options = {
    stages: getStages(__ENV.TEST_TYPE || 'loadTest'),
    thresholds: config.thresholds
};

export default function () {
    if (!users.length) {
        throw new Error('No hay usuarios en data/users.csv');
    }

    const user = users[getRandomInt(users.length)];
    let cookies = '';
    let viewState = '';

    group('01_login', function () {
        const loginRes = performLogin(user);
        if (!loginRes.success) {
            throw new Error('Login fallido');
        }
        cookies = loginRes.cookies;
        viewState = loginRes.viewState;
        sleepWithVariance(config.delays.afterLogin, 20);
    });

    group('02_menu', function () {
        const menuRes = loadMenu(cookies);
        check(menuRes.success, { 'menú cargado': () => menuRes.success });
        cookies = menuRes.cookies;
        viewState = menuRes.viewState;
        sleepWithVariance(config.delays.afterMenuLoad, 25);
    });

    group('03_filtro', function () {
        const filterRes = applyFlowFilter(cookies, viewState, '87');
        check(filterRes.success, { 'filtro aplicado': () => filterRes.success });
        cookies = filterRes.cookies;
        viewState = filterRes.viewState;
        sleepWithVariance(config.delays.afterFilter, 25);
    });

    group('04_editar_flujo', function () {
        const editRes = editFlow(cookies, viewState, '1');
        check(editRes.success, { 'flujo editado': () => editRes.success });
        cookies = editRes.cookies;
        viewState = editRes.viewState;
        sleepWithVariance(config.delays.afterEdit, 25);
    });

    group('05_logout', function () {
        sleepWithVariance(config.delays.beforeLogout, 20);
        const logoutRes = performLogout(cookies, viewState);
        check(logoutRes, { 'logout exitoso': () => logoutRes });
    });
}

// Setup
export function setup() {
    console.log(
        `PRUEBA DE RENDIMIENTO - Ambiente: ${config.baseUrl}, ` +
        `Usuarios: ${users.length}, Tipo: ${__ENV.TEST_TYPE || 'loadTest'}`
    );
}

// Teardown
export function teardown() {
    console.log('PRUEBA COMPLETADA');
}
