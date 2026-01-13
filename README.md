# Pruebas de Carga K6 - Orbit QA Performance

Pruebas automatizadas de carga y rendimiento para la aplicación Orbit usando Grafana K6. Incluye ejecución local y mediante GitHub Actions.

## Estructura del Proyecto

```
orbit-qa-performance/
├── .github/
│   └── workflows/
│       └── main.yml          # Pipeline GitHub Actions
├── src/
│   ├── config.js                      # Configuración centralizada
│   ├── utils.js                       # Funciones reutilizables
│   ├── summary.js                     # Generador de reportes HTML
│   ├── prueba_flujo.js                # Prueba original
│   ├── prueba_flujo_mejorada.js       # Prueba principal (recomendada)
│   └── prueba_orbit.js                # Prueba básica login
├── data/
│   └── users.csv                      # Credenciales de usuarios
├── reports/                           # Reportes generados
│   ├── report-*.html                  # Reportes HTML con timestamp
│   └── results-*.json                 # Datos JSON raw
├── run-k6.sh                          # Script para ejecutar   
└── README.md
```

##  Requisitos

- **K6** v0.43.0+ ([Descargar](https://k6.io/))
- **Docker** (opcional, para GitHub Actions)
- Aplicación Orbit corriendo en el ambiente de QA
- Credenciales válidas en `data/users.csv`

## Instalación

1. Clonar el repositorio:
```bash
git clone <repository-url>
cd orbit-qa-performance
```

2. Instalar K6 (si no lo tienes):
   - **Windows**: Usar Chocolatey: `choco install k6`
   - **Mac**: `brew install k6`
   - **Linux**: Descargar desde [k6.io](https://k6.io/)

3. Configurar credenciales en `data/users.csv`

## Ejecución Local

### Windows
```powershell
.\run-k6.sh
```

### Ejecución manual
```bash
# Prueba mejorada 
k6 run src/prueba_flujo_mejorada.js
```

## GitHub Actions - CI/CD

El proyecto incluye un pipeline automático que:

1. Se ejecuta al hacer push a `main`
2. Ejecuta K6 en un contenedor Docker
3. Genera reportes HTML con timestamp
4. Limpia reportes antiguos (mantiene los últimos 5)
5. Sube artefactos a GitHub

### Configuración de Secretos

En **Settings → Secrets and variables → Actions**, agregar:

```
QA_URL = agregar la url del ambiente QA
```


## Reportes Generados

Cada ejecución genera automáticamente:

- **report-{escenarios}-{timestamp}.html** - Reporte visual interactivo
- **results-{timestamp}.json** - Datos raw en JSON

**Ejemplo**: `report-01_login-02_menu-03_filtro-2025-01-06-140530.html`

El reporte incluye:
- Escenarios ejecutados
- Configuración (VUs, duración)
- Métricas estándar (Response Time, Error Rate, etc.)
- Checks personalizados
- Thresholds
- Datos raw JSON

## 🔧 Configuración de Pruebas

### Tipos de Prueba

En `src/config.js`, define los stages:

```javascript
const stages = {
  loadTest: [
    { duration: '5m', target: 10 },    // Ramp-up
    { duration: '10m', target: 10 },   // Stay
    { duration: '5m', target: 0 }      // Ramp-down
  ],
  stressTest: [...],
  spikeTest: [...]
};
```

##  Métricas Principales

- **http_reqs** - Total de requests
- **http_req_duration** - Tiempo de respuesta
- **http_req_failed** - Requests fallidos
- **checks** - Validaciones personalizadas
- **iterations** - Iteraciones completadas
- **vus** - Virtual users activos

## Troubleshooting

### Error: "No users found in CSV"
- Verificar que `data/users.csv` existe y tiene formato correcto
- Formato: `correo;password`

### Error: "Connection refused"
- Verificar que la URL del ambiente QA es correcta
- Asegurar que `BASE_URL` está configurado

### Reportes no se generan
- Ejecutar manualmente para ver errores: `k6 run src/prueba_flujo_mejorada.js -v`
- Verificar permisos en la carpeta `./reports`

##  Archivos Clave

| Archivo                      | Propósito |
|------------------------------|-----------|
| `config.js`                  | Configuración centralizada, stages, thresholds |
| `utils.js`                   | Funciones HTTP, login, manejo de cookies |
| `summary.js`                 | Generador automático de reportes HTML |
| `prueba_flujo_mejorada.js`   | Script principal con flujo completo |
| `.github/workflows/main.yml` | Pipeline GitHub Actions |
