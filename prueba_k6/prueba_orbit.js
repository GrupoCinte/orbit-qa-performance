import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';


const users = new SharedArray("users", function () {
    return open('users.csv')
        .split('\n')
        .slice(1)
        .map(line => {
            const parts = line.split(',');
            return { email: parts[0], password: parts[1] };
        });
});


export let options = {
    stages: [
        { duration: '1m', target: 50 },
        { duration: '2m', target: 50 },
        { duration: '1m', target: 0 },
    ],
};

export default function () {
    const user = users[Math.floor(Math.random() * users.length)];

    const payload = JSON.stringify({ email: user.email, password: user.password });
    const params = { headers: { 'Content-Type': 'application/json' } };

    const res = http.post('http://localhost:8080/Integracion-areas/', payload, params);


    check(res, {
        'status 200': (r) => r.status === 200,
        'retorna algo': (r) => r.body && r.body.length > 0,
    });

    sleep(1);
}
