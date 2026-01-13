import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';

export function handleSummary(data) {
    if (!data) {
        console.error('Error: data is undefined en handleSummary');
        return {
            stdout: 'Error: No se recibieron datos del resumen'
        };
    }

    console.log('Generando reporte...');

    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);

    try {
        const htmlContent = generateGraphicalHTML(data);
        const filename = `/reports/report-${timestamp}.html`;

        return {
            [filename]: htmlContent,
            stdout: textSummary(data, { indent: ' ', enableColors: true }),
        };
    } catch (error) {
        console.error('Error al generar reporte:', error);
        return {
            stdout: textSummary(data, { indent: ' ', enableColors: true }),
        };
    }
}

function generateGraphicalHTML(data) {
    const timestamp = new Date().toISOString();
    const duration = (data.state.testRunDurationMs / 1000).toFixed(2);

    // Extraer métricas clave
    const metrics = data.metrics || {};
    const httpReqDuration = metrics.http_req_duration?.values || {};
    const iterations = metrics.iterations?.values.count || 0;
    const httpReqs = metrics.http_reqs?.values.count || 0;
    const checks = metrics.checks?.values || {};
    const dataReceived = ((metrics.data_received?.values.count || 0) / 1024 / 1024).toFixed(2);
    const dataSent = ((metrics.data_sent?.values.count || 0) / 1024).toFixed(2);

    // Preparar datos para gráficos
    const durationData = {
        avg: (httpReqDuration.avg || 0).toFixed(2),
        min: (httpReqDuration.min || 0).toFixed(2),
        max: (httpReqDuration.max || 0).toFixed(2),
        p90: (httpReqDuration['p(90)'] || 0).toFixed(2),
        p95: (httpReqDuration['p(95)'] || 0).toFixed(2),
        p99: (httpReqDuration['p(99)'] || 0).toFixed(2),
    };

    const checksPass = checks.passes || 0;
    const checksFail = checks.fails || 0;
    const checksRate = ((checks.rate || 0) * 100).toFixed(2);

    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>K6 Performance Report - ${timestamp}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #0b0c0e;
            color: #d4d4d8;
            padding: 20px;
            line-height: 1.6;
        }

        .container {
            max-width: 1600px;
            margin: 0 auto;
        }

        .header {
            background: linear-gradient(135deg, #18181b 0%, #27272a 100%);
            border: 1px solid #3f3f46;
            padding: 30px;
            border-radius: 8px;
            margin-bottom: 20px;
        }

        .header h1 {
            color: #fbbf24;
            font-size: 2em;
            margin-bottom: 8px;
            font-weight: 600;
        }

        .header .subtitle {
            color: #a1a1aa;
            font-size: 0.95em;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }

        .stat-card {
            background: linear-gradient(135deg, #18181b 0%, #27272a 100%);
            border: 1px solid #3f3f46;
            padding: 20px;
            border-radius: 8px;
            position: relative;
            overflow: hidden;
        }

        .stat-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            background: linear-gradient(180deg, #3b82f6 0%, #8b5cf6 100%);
        }

        .stat-card .label {
            color: #a1a1aa;
            font-size: 0.85em;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 8px;
        }

        .stat-card .value {
            font-size: 2.2em;
            font-weight: 600;
            color: #fafafa;
            font-family: 'Courier New', monospace;
        }

        .stat-card .trend {
            color: #10b981;
            font-size: 0.85em;
            margin-top: 8px;
        }

        .charts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(600px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }

        .chart-container {
            background: linear-gradient(135deg, #18181b 0%, #27272a 100%);
            border: 1px solid #3f3f46;
            padding: 24px;
            border-radius: 8px;
            position: relative;
        }

        .chart-container h2 {
            color: #fafafa;
            margin-bottom: 20px;
            font-size: 1.1em;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .chart-container h2::before {
            content: '';
            width: 3px;
            height: 18px;
            background: #3b82f6;
            border-radius: 2px;
        }

        .chart-wrapper {
            position: relative;
            height: 320px;
        }

        .metrics-table {
            background: linear-gradient(135deg, #18181b 0%, #27272a 100%);
            border: 1px solid #3f3f46;
            padding: 24px;
            border-radius: 8px;
        }

        .metrics-table h2 {
            color: #fafafa;
            margin-bottom: 20px;
            font-size: 1.1em;
            font-weight: 600;
        }

        table {
            width: 100%;
            border-collapse: collapse;
        }

        th, td {
            padding: 16px;
            text-align: left;
            border-bottom: 1px solid #3f3f46;
        }

        th {
            background: #18181b;
            color: #a1a1aa;
            font-weight: 600;
            font-size: 0.85em;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        td {
            color: #d4d4d8;
        }

        tr:hover {
            background: #27272a;
        }

        .success {
            color: #10b981;
            font-weight: 600;
        }

        .error {
            color: #ef4444;
            font-weight: 600;
        }

        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 0.8em;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .badge-success {
            background: rgba(16, 185, 129, 0.2);
            color: #10b981;
            border: 1px solid #10b981;
        }

        .badge-error {
            background: rgba(239, 68, 68, 0.2);
            color: #ef4444;
            border: 1px solid #ef4444;
        }

        .badge-warning {
            background: rgba(251, 191, 36, 0.2);
            color: #fbbf24;
            border: 1px solid #fbbf24;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚡ K6 Performance Testing Report</h1>
            <div class="subtitle">
                Generated: ${new Date(timestamp).toLocaleDateString('es-ES')} | Duration: ${duration}s
            </div>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="label">Total Iterations</div>
                <div class="value">${iterations}</div>
            </div>

            <div class="stat-card">
                <div class="label">HTTP Requests</div>
                <div class="value">${httpReqs}</div>
            </div>

            <div class="stat-card">
                <div class="label">Success Rate</div>
                <div class="value">${checksRate}%</div>
            </div>

            <div class="stat-card">
                <div class="label">Avg Response Time</div>
                <div class="value">${durationData.avg}<span style="font-size: 0.5em; color: #a1a1aa;">ms</span></div>
            </div>
        </div>

        <div class="charts-grid">
            <div class="chart-container">
                <h2>HTTP Request Duration</h2>
                <div class="chart-wrapper">
                    <canvas id="durationChart"></canvas>
                </div>
            </div>

            <div class="chart-container">
                <h2>Response Time Percentiles</h2>
                <div class="chart-wrapper">
                    <canvas id="percentilesChart"></canvas>
                </div>
            </div>
        </div>

        <div class="charts-grid">
            <div class="chart-container">
                <h2>Check Results Distribution</h2>
                <div class="chart-wrapper">
                    <canvas id="checksChart"></canvas>
                </div>
            </div>

            <div class="chart-container">
                <h2>Data Transfer</h2>
                <div class="chart-wrapper">
                    <canvas id="dataChart"></canvas>
                </div>
            </div>
        </div>

        <div class="metrics-table">
            <h2>Detailed Metrics</h2>
            <table>
                <thead>
                    <tr>
                        <th>Metric</th>
                        <th>Value</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Successful Checks</td>
                        <td class="success">${checksPass}</td>
                        <td><span class="badge badge-success">PASS</span></td>
                    </tr>
                    <tr>
                        <td>Failed Checks</td>
                        <td class="error">${checksFail}</td>
                        <td><span class="badge ${checksFail > 0 ? 'badge-error' : 'badge-success'}">${checksFail > 0 ? 'FAIL' : 'PASS'}</span></td>
                    </tr>
                    <tr>
                        <td>Data Received</td>
                        <td>${dataReceived} MB</td>
                        <td><span class="badge badge-success">OK</span></td>
                    </tr>
                    <tr>
                        <td>Data Sent</td>
                        <td>${dataSent} KB</td>
                        <td><span class="badge badge-success">OK</span></td>
                    </tr>
                    <tr>
                        <td>Test Duration</td>
                        <td>${duration}s</td>
                        <td><span class="badge badge-success">OK</span></td>
                    </tr>
                    <tr>
                        <td>Min Response Time</td>
                        <td>${durationData.min} ms</td>
                        <td><span class="badge badge-success">OK</span></td>
                    </tr>
                    <tr>
                        <td>Max Response Time</td>
                        <td>${durationData.max} ms</td>
                        <td><span class="badge ${parseFloat(durationData.max) > 1000 ? 'badge-warning' : 'badge-success'}">${parseFloat(durationData.max) > 1000 ? 'SLOW' : 'OK'}</span></td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <script>
        // Configuración de tema oscuro estilo Grafana
        Chart.defaults.font.family = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
        Chart.defaults.color = '#a1a1aa';
        Chart.defaults.borderColor = '#3f3f46';

        const grafanaColors = {
            blue: '#3b82f6',
            purple: '#8b5cf6',
            green: '#10b981',
            red: '#ef4444',
            yellow: '#fbbf24',
            cyan: '#06b6d4',
            pink: '#ec4899',
            orange: '#f97316'
        };

        // Gráfico de barras - Tiempos de Respuesta
        const durationCtx = document.getElementById('durationChart').getContext('2d');
        new Chart(durationCtx, {
            type: 'bar',
            data: {
                labels: ['Min', 'Avg', 'Max', 'P90', 'P95', 'P99'],
                datasets: [{
                    label: 'Response Time (ms)',
                    data: [${durationData.min}, ${durationData.avg}, ${durationData.max}, ${durationData.p90}, ${durationData.p95}, ${durationData.p99}],
                    backgroundColor: [
                        grafanaColors.green + '99',
                        grafanaColors.blue + '99',
                        grafanaColors.red + '99',
                        grafanaColors.yellow + '99',
                        grafanaColors.orange + '99',
                        grafanaColors.pink + '99'
                    ],
                    borderColor: [
                        grafanaColors.green,
                        grafanaColors.blue,
                        grafanaColors.red,
                        grafanaColors.yellow,
                        grafanaColors.orange,
                        grafanaColors.pink
                    ],
                    borderWidth: 2,
                    borderRadius: 4,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#18181b',
                        titleColor: '#fafafa',
                        bodyColor: '#d4d4d8',
                        borderColor: '#3f3f46',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                return context.parsed.y + ' ms';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: '#3f3f46',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#a1a1aa'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#3f3f46',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#a1a1aa',
                            callback: function(value) {
                                return value + ' ms';
                            }
                        }
                    }
                }
            }
        });

        // Gráfico de línea - Percentiles
        const percentilesCtx = document.getElementById('percentilesChart').getContext('2d');
        new Chart(percentilesCtx, {
            type: 'line',
            data: {
                labels: ['Min', 'Avg', 'P90', 'P95', 'P99', 'Max'],
                datasets: [{
                    label: 'Response Time',
                    data: [${durationData.min}, ${durationData.avg}, ${durationData.p90}, ${durationData.p95}, ${durationData.p99}, ${durationData.max}],
                    borderColor: grafanaColors.cyan,
                    backgroundColor: grafanaColors.cyan + '22',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: grafanaColors.cyan,
                    pointBorderColor: '#18181b',
                    pointBorderWidth: 2,
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#18181b',
                        titleColor: '#fafafa',
                        bodyColor: '#d4d4d8',
                        borderColor: '#3f3f46',
                        borderWidth: 1,
                        padding: 12,
                        callbacks: {
                            label: function(context) {
                                return context.parsed.y + ' ms';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: '#3f3f46',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#a1a1aa'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#3f3f46',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#a1a1aa',
                            callback: function(value) {
                                return value + ' ms';
                            }
                        }
                    }
                }
            }
        });

        // Gráfico de dona - Checks
        const checksCtx = document.getElementById('checksChart').getContext('2d');
        new Chart(checksCtx, {
            type: 'doughnut',
            data: {
                labels: ['Passed', 'Failed'],
                datasets: [{
                    data: [${checksPass}, ${checksFail}],
                    backgroundColor: [
                        grafanaColors.green + 'cc',
                        grafanaColors.red + 'cc'
                    ],
                    borderColor: [
                        grafanaColors.green,
                        grafanaColors.red
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#a1a1aa',
                            padding: 20,
                            font: {
                                size: 13
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: '#18181b',
                        titleColor: '#fafafa',
                        bodyColor: '#d4d4d8',
                        borderColor: '#3f3f46',
                        borderWidth: 1,
                        padding: 12
                    }
                }
            }
        });

        // Gráfico de barras horizontales - Datos
        const dataCtx = document.getElementById('dataChart').getContext('2d');
        new Chart(dataCtx, {
            type: 'bar',
            data: {
                labels: ['Received', 'Sent'],
                datasets: [{
                    label: 'Data Transfer',
                    data: [${dataReceived}, ${dataSent / 1024}],
                    backgroundColor: [
                        grafanaColors.blue + '99',
                        grafanaColors.purple + '99'
                    ],
                    borderColor: [
                        grafanaColors.blue,
                        grafanaColors.purple
                    ],
                    borderWidth: 2,
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#18181b',
                        titleColor: '#fafafa',
                        bodyColor: '#d4d4d8',
                        borderColor: '#3f3f46',
                        borderWidth: 1,
                        padding: 12,
                        callbacks: {
                            label: function(context) {
                                return context.parsed.x.toFixed(2) + ' MB';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: {
                            color: '#3f3f46',
                            drawBorder: false
                        },
                        ticks: {
                            color: '#a1a1aa',
                            callback: function(value) {
                                return value + ' MB';
                            }
                        }
                    },
                    y: {
                        grid: {
                            display: false,
                            drawBorder: false
                        },
                        ticks: {
                            color: '#a1a1aa'
                        }
                    }
                }
            }
        });
    </script>
</body>
</html>
`;
}