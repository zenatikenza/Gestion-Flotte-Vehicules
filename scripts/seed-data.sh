#!/bin/bash
# Injecte des données de démo : 5 véhicules + simulateur GPS

echo "Injection des données de démo..."

# Crée 5 véhicules
for i in 1 2 3 4 5; do
  BRANDS=("Renault" "Peugeot" "Citroën" "Volkswagen" "BMW")
  MODELS=("Clio" "308" "C3" "Golf" "Serie3")
  BRAND=${BRANDS[$((i-1))]}
  MODEL=${MODELS[$((i-1))]}

  TOKEN=$(curl -s -X POST "http://127.0.0.1:8080/realms/FleetManagement/protocol/openid-connect/token" \
    -d "client_id=fleet-frontend" -d "username=admin_flotte" -d "password=Admin1234!" \
    -d "grant_type=password" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
  curl -s -X POST http://127.0.0.1:8081/api/vehicles \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{\"licensePlate\":\"DEMO-00$i\",\"brand\":\"$BRAND\",\"model\":\"$MODEL\",\"mileage\":$((i*1000)),\"status\":\"AVAILABLE\"}" \
    > /dev/null
  echo "Véhicule $i ($BRAND $MODEL) créé"
done

# Active le simulateur GPS pour chaque véhicule
for i in 1 2 3 4 5; do
  curl -s -X POST http://127.0.0.1:8084/api/positions/simulateur/vehicules \
    -H "Content-Type: application/json" \
    -d "{\"vehiculeId\":\"$i\"}" \
    > /dev/null
done
echo "Simulateur GPS activé pour 5 véhicules"

echo ""
echo "Données de démo créées !"
echo "Frontend : http://127.0.0.1:5173"
echo "Grafana  : http://127.0.0.1:3001"
echo "Jaeger   : http://127.0.0.1:16686"
