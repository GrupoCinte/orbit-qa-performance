Pruebas de Carga con K6: Login y Flujo Completo

Este repositorio reúne dos pruebas de carga básicas desarrolladas con Grafana K6:
una enfocada en validar el proceso de login y otra en ejecutar un flujo funcional completo dentro de Orbit.

```
## Estructura del proyecto

orbit-qa-performance/
├── data/  # Datos usados en las pruebas (CSV)
│     └── users.csv
│
├── src/ # Scripts principales de K6
│ ├── prueba_flujo.js
│ └── prueba_orbit.js
│
├── README.md # Documentación del proyecto
└── .gitignore

```

Cómo ejecutar una prueba

Si quieres ejecutar la prueba básica:
```
k6 run src/prueba_flujo.js
```

Asegúrate de tener instalado K6.
Puedes verificarlo con:
```
k6 version
```

Ejecutar la prueba enviando métricas a Prometheus

Si necesitas ejecutar la prueba y al mismo tiempo enviar las métricas a Prometheus (por ejemplo, para visualizarlas en Grafana), puedes usar este comando:
```
k6 run -o experimental-prometheus-rw src/prueba_flujo.js
```
¿Qué significa?

-o experimental-prometheus-rw → Envía las métricas al endpoint remoto de Prometheus.

prueba_flujo.js → Es el script que estás ejecutando.