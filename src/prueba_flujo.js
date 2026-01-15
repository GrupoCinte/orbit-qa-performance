import { check, group, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { config, getStages } from './config.js';
import {
    performLogin,
    performLogout,
    loadMenu,
    applyFilter,
    verCruce,
    extractViewState,
    mergeCookies,
    getRandomInt
} from './utils.js';
import { handleSummary as htmlSummary } from './summary.js';

const users = new SharedArray('users', function () {
    return open('/data/users.csv')
        .split('\n')
        .slice(1) // Omitir encabezado
        .filter(line => line.trim())
        .map(line => {
            const parts = line.split(';');
            return { 
                correo: parts[0]?.trim(), 
                password: parts[1]?.trim() 
            };
        })
        .filter(u => u.correo && u.password);
});

export const options = {
    stages: getStages(__ENV.TEST_TYPE || 'smokeTest'),
    thresholds: config.thresholds
};

export default function () {
    // Validar que existen usuarios
    if (users.length === 0) {
        throw new Error('No users en users.csv');
    }

    const user = users[getRandomInt(users.length)];
    let cookies = '';
    let viewState = '';

    // GRUPO 1: LOGIN

    group('login', function () {
        const loginRes = performLogin(user);
        
        if (!loginRes.success) {
            console.error(`Login fallido para usuario: ${user.correo}`);
            return; // Abortar iteración si login falla
        }
        
        cookies = loginRes.cookies;
        viewState = loginRes.viewState;
        sleep(config.delays.afterLogin);
    });

    // Si el login falló, no continuar con el resto del flujo
    if (!cookies) return;


    // GRUPO 2: MENÚ
    group('menu', function () {
        const menuRes = loadMenu(cookies);
        
        if (!menuRes.success) {
            console.error(`Error cargando menú para usuario: ${user.correo}`);
            return;
        }
        
        cookies = menuRes.cookies;
        viewState = menuRes.viewState;
        sleep(config.delays.afterMenuLoad);
    });

    // Si el menú falló, no continuar
    if (!viewState) return;

    // GRUPO 3: FILTRO AJAX
    group('filtro', function () {
        const filterRes = applyFilter(cookies, viewState);
        
        if (!filterRes.success) {
            console.error(`Error aplicando filtro para usuario: ${user.correo}`);
            return;
        }
        
        cookies = filterRes.cookies;
        // viewState se mantiene igual después del filtro
        sleep(config.delays.afterFilter);
    });

    // GRUPO 4: VER CRUCE (EDITAR FLUJO)
    group('ver_cruce', function () {
        const editRes = verCruce(cookies, viewState);
        
        if (!editRes.success) {
            console.error(`Error editando flujo para usuario: ${user.correo}`);
            return;
        }
        
        cookies = editRes.cookies;
        // viewState se mantiene igual
        sleep(config.delays.afterEditFlow);
    });

    // GRUPO 5: LOGOUT
    group('logout', function () {
        const logoutSuccess = performLogout(cookies, viewState);
        
        if (!logoutSuccess) {
            console.error(`Error en logout para usuario: ${user.correo}`);
        }
        
        sleep(config.delays.afterLogout);
    });
}

// Setup
export function setup() {
    console.log(
        `PRUEBA DE RENDIMIENTO - Ambiente: ${config.baseUrl}, ` +
        `Usuarios: ${users.length}, Tipo: ${__ENV.TEST_TYPE || 'smokeTest'}`
    );
}

// Teardown
export function teardown() {
    console.log('PRUEBA COMPLETADA');
}

export { htmlSummary as handleSummary };