Pruebas de Carga con K6: Login y Flujo Completo

Este repositorio reúne dos pruebas de carga básicas desarrolladas con Grafana K6:
una enfocada en validar el proceso de login y otra en ejecutar un flujo funcional completo dentro de Orbit.

Este proyecto proporciona un conjunto completo de scripts de prueba de carga que simulan comportamiento real de usuarios en la aplicación Orbit. Incluye:

```
## Estructura del proyecto
├── src/
│   ├── config.js                    # Configuración centralizada
│   ├── utils.js                     # Funciones reutilizables
│   ├── prueba_flujo.js              # Prueba original 
│   ├── prueba_flujo_mejorada.js     # Prueba mejorada 
│   └── prueba_orbit.js              # Prueba básica login 
│
├── data/
├── data/  # Datos usados en las pruebas (CSV)
│     └── users.csv
└── .gitignore
```
├── src/ # Scripts principales de K6
│ ├── prueba_flujo.js
│ └── prueba_orbit.js

### 1. Requisitos
- [Grafana K6](https://k6.io/) v0.43.0+
- La aplicación Orbit corriendo en `http://localhost:8080`
- Credenciales válidas en `data/users.csv`
├── README.md # Documentación del proyecto

```

### 3. Ejecutar Prueba Simple
```powershell
k6 run src/prueba_flujo_mejorada.js
```
Cómo ejecutar una prueba

Si quieres ejecutar la prueba básica:
```
k6 run src/prueba_flujo.js
```

Asegúrate de tener instalado K6.
