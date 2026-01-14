export const config = {
    // URL base de la aplicación
    baseUrl: __ENV.BASE_URL || '',
    appPath: '',

    // Endpoints (rutas de la aplicación)
    endpoints: {
        login: '/index.xhtml',
        menu: '/GC/crucefacturacion.xhtml',
        filtro: '/GC/crucefacturacion.xhtml',
        vercruce: '/GC/crucefacturacion.xhtml',
        logout: '/GC/crucefacturacion.xhtml'
    },

    // Criterios de éxito/fallo (thresholds)
    thresholds: {
        'http_req_duration': ['p(95)<1000', 'p(99)<2000'],
        'http_req_failed': ['rate<0.1']
    },

    // Timeouts (milisegundos)
    timeouts: {
        http: 30000,      // 30 segundos
        login: 45000,     // 45 segundos
        pageLoad: 60000   // 60 segundos
    },

    // Delays entre acciones (segundos)
    delays: {
        afterLogin: 1,
        afterMenuLoad: 2,
        afterFilter: 2,
        afterEditFlow: 2,
        afterLogout: 2
    },

    // Configuración de stages (escalas de usuarios)
    stages: {
        smokeTest: [
            { duration: '1m', target: 1 }
        ],
        loadTest: [
            { duration: '10m', target: 7 },
            { duration: '15m', target: 20 },
            { duration: '10m', target: 3 }
        ],
        stressTest: [
            { duration: '2m', target: 10 },
            { duration: '5m', target: 50 },
            { duration: '2m', target: 100 },
            { duration: '5m', target: 0 }
        ],
        spikeTest: [
            { duration: '1m', target: 10 },
            { duration: '30s', target: 100 },
            { duration: '2m', target: 10 },
            { duration: '30s', target: 0 }
        ]
    },

    // Parámetros por defecto para filtros
    defaults: {
        clienteFilter: '87',
        rowsPerPage: '15'
    },

    // IDs de componentes JSF (pueden cambiar entre versiones)
    jsfComponents: {
        loginForm: 'j_idt5',
        loginButton: 'Ingresar',
        logoutForm: 'j_idt43',
        logoutButton: 'Cerrar sesión',
        tabla: 'tablaFacturacion',
        tablaCliFac: 'tablaFacturacion:cliFac',
        verCrucesBoton: 'tablaFacturacion:cliFac:0:verCrucesBoton',
        frmVerCruces: 'frmVerCruces'
    }
};

/**
 * Obtener URL completa del endpoint
 * @param {string} endpoint - Nombre del endpoint
 * @returns {string} URL completa
 */
export function getUrl(endpoint) {
    const path = config.endpoints[endpoint];
    if (!path) throw new Error(`Endpoint no encontrado: ${endpoint}`);
    return `${config.baseUrl}${config.appPath}${path}`;
}

/**
 * Obtener stages según tipo de prueba
 * @param {string} testType - Tipo de prueba
 * @returns {array} Array de stages
 */
export function getStages(testType = 'loadTest') {
    return config.stages[testType] || config.stages.loadTest;
}

/**
 * Obtener configuración completa de k6 options
 * @param {string} testType - Tipo de prueba
 * @returns {object} Objeto options para k6
 */
export function getK6Options(testType = 'loadTest') {
    return {
        stages: getStages(testType),
        thresholds: config.thresholds
    };
}