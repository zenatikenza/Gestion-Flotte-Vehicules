import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 5,
  duration: '2m',
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  // 1. Récupère la liste des véhicules
  const vehiclesRes = http.get('http://localhost:8081/api/vehicles');
  check(vehiclesRes, { 'vehicles 2xx': (r) => r.status >= 200 && r.status < 300 });
  let vehicleId = null;
  if (vehiclesRes.status === 200) {
    const vehicles = JSON.parse(vehiclesRes.body);
    if (vehicles.length > 0) vehicleId = vehicles[0].id;
  }

  // 2. Récupère la liste des conducteurs
  const conducteursRes = http.get('http://localhost:8082/api/conducteurs');
  check(conducteursRes, { 'conducteurs 2xx': (r) => r.status >= 200 && r.status < 300 });

  // 3. Liste les interventions
  const interventionsRes = http.get('http://localhost:8083/api/interventions');
  check(interventionsRes, { 'interventions 2xx': (r) => r.status >= 200 && r.status < 300 });

  // 4. Position GPS du premier véhicule
  if (vehicleId) {
    const posRes = http.get(`http://localhost:8084/api/positions/${vehicleId}`);
    check(posRes, { 'position 2xx': (r) => r.status >= 200 && r.status < 300 });
  }

  sleep(1);
}
