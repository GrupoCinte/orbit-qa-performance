export const config = {
    // URL base de la aplicación
    baseUrl: __ENV.BASE_URL || 'http://localhost:8080',
    appPath: '/Integracion-areas',

    // Endpoints (rutas de la aplicación)
    endpoints: {
        login: '/index.xhtml',
        menu: '/App/Provisiones/Flujo/',
        flujo: '/App/Provisiones/Flujo/index.xhtml'
    },

    // Criterios de éxito/fallo (thresholds)
    thresholds: {
        'http_req_duration': ['p(95)<500', 'p(99)<1000'],
        'http_req_failed': ['rate<0.1'],
        'http_reqs': ['count>100']
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
        afterEdit: 2,
        beforeLogout: 1
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
        ]
    }
};

/**
 * Obtener URL completa del endpoint
 * @param {string} endpoint - Nombre del endpoint (login, menu, flujo)
 * @returns {string} URL completa
 */
export function getUrl(endpoint) {
    const path = config.endpoints[endpoint];
    if (!path) throw new Error(`Endpoint no encontrado: ${endpoint}`);
    return `${config.baseUrl}${config.appPath}${path}`;
}

/**
 * Obtener stages según tipo de prueba
 * @param {string} testType - Tipo de prueba (smokeTest, loadTest, stressTest)
 * @returns {array} Array de stages
 */
export function getStages(testType = 'loadTest') {
    return config.stages[testType] || config.stages.loadTest;
}
