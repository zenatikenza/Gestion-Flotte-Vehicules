$ErrorActionPreference = "Stop"

Write-Host "Obtention du token Keycloak..."
$tokenBody = "client_id=fleet-frontend&username=admin_flotte&password=Admin1234!&grant_type=password"
$tokenResp = Invoke-RestMethod -Uri "http://127.0.0.1:8080/realms/FleetManagement/protocol/openid-connect/token" -Method POST -Body $tokenBody -ContentType "application/x-www-form-urlencoded"
$token = $tokenResp.access_token
if (-not $token) { Write-Error "Impossible d'obtenir le token"; exit 1 }
Write-Host "Token OK"

$authHeaders = @{"Content-Type" = "application/json"; "Authorization" = "Bearer $token"}

Write-Host "Injection des vehicules..."

$data = @(
  '{"licensePlate":"DEMO-001","brand":"Renault","model":"Clio","mileage":1000,"status":"AVAILABLE"}',
  '{"licensePlate":"DEMO-002","brand":"Peugeot","model":"308","mileage":2000,"status":"AVAILABLE"}',
  '{"licensePlate":"DEMO-003","brand":"Citroen","model":"C3","mileage":3000,"status":"AVAILABLE"}',
  '{"licensePlate":"DEMO-004","brand":"Volkswagen","model":"Golf","mileage":4000,"status":"AVAILABLE"}',
  '{"licensePlate":"DEMO-005","brand":"BMW","model":"X5","mileage":5000,"status":"AVAILABLE"}'
)

foreach ($body in $data) {
  try {
    $resp = Invoke-RestMethod -Uri "http://127.0.0.1:8081/api/vehicles" -Method POST -Headers $authHeaders -Body $body
    Write-Host "  OK : $($resp.licensePlate) $($resp.brand) $($resp.model) (id=$($resp.id))"
  } catch {
    Write-Host "  ERREUR : $_"
  }
}

Write-Host "Activation GPS..."
for ($i = 1; $i -le 5; $i++) {
  $gpsBody = '{"vehiculeId":"' + $i + '"}'
  try {
    Invoke-RestMethod -Uri "http://127.0.0.1:8084/api/positions/simulateur/vehicules" -Method POST -Headers $authHeaders -Body $gpsBody | Out-Null
    Write-Host "  GPS vehicule $i OK"
  } catch {
    Write-Host "  GPS vehicule $i ERREUR : $_"
  }
}

Write-Host ""
Write-Host "Donnees de demo creees !"
Write-Host "Frontend : http://127.0.0.1:5173"
Write-Host "Grafana  : http://127.0.0.1:3001"
Write-Host "Jaeger   : http://127.0.0.1:16686"
