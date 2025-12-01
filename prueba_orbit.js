import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

const users = new SharedArray('users', function() {
    return open('users.csv').split('\n').slice(1).filter(line => line.trim()).map(line => {
        const parts = line.split(';');
        return {
            correo: parts[0] ? parts[0].trim() : '',
            password: parts[1] ? parts[1].trim() : ''
        };
    }).filter(u => u.correo && u.password);
});

export const options = {
    stages: [
        { duration: '10m', target: 7 },
        { duration: '20m', target: 20 },
        { duration: '8m', target: 3 },
    ],
};

export default function () {
    if (users.length === 0) {
        throw new Error('No users in users.csv');
    }

    const loginUrl = 'http://localhost:8080/Integracion-areas/index.xhtml';
    const user = users[Math.floor(Math.random() * users.length)];

    const getRes = http.get(loginUrl);
    const viewStateMatch = getRes.body.match(/ViewState"\s+.*?value="([^"]+)"/);

    if (!viewStateMatch) return;

    const viewState = viewStateMatch[1];
    const cookies = Object.keys(getRes.cookies).map(n => `${n}=${getRes.cookies[n][0].value}`).join('; ');

    sleep(1);

    const payload = `j_idt5=j_idt5&j_idt5:correo=${encodeURIComponent(user.correo)}&j_idt5:password=${encodeURIComponent(user.password)}&j_idt5:button=Ingresar&javax.faces.ViewState=${encodeURIComponent(viewState)}`;

    const postRes = http.post(loginUrl, payload, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookies,
        },
        redirects: 0
    });

    check(postRes, {
        'login 302': (r) => r.status === 302
    });

    sleep(2);
}