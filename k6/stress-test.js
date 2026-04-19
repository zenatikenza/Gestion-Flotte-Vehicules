import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 10 },
    { duration: '3m', target: 30 },
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.10'],
  },
};

export default function () {
  const responses = http.batch([
    ['GET', 'http://localhost:8081/api/vehicles'],
    ['GET', 'http://localhost:8082/api/conducteurs'],
    ['GET', 'http://localhost:8083/api/interventions'],
    ['GET', 'http://localhost:8084/api/positions'],
  ]);

  responses.forEach(res => {
    check(res, { 'status 2xx': (r) => r.status >= 200 && r.status < 300 });
  });
  sleep(1);
}
