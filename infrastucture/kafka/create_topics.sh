#!/bin/bash

BOOTSTRAP_SERVER="localhost:9092"

TOPICS=(
  "vehicle-events"
  "driver-events"
  "maintenance-alerts"
  "location-updates"
  "system-notifications"
)

echo "--- Initialisation des topics Kafka via Docker ---"

for TOPIC in "${TOPICS[@]}"; do
  kafka-topics --bootstrap-server $BOOTSTRAP_SERVER --list | grep -q "^$TOPIC$"
  
  if [ $? -eq 0 ]; then
    echo "Topic '$TOPIC' existe déjà."
  else
    echo "Création du topic : $TOPIC"
    kafka-topics --create \
      --topic "$TOPIC" \
      --bootstrap-server "$BOOTSTRAP_SERVER" \
      --partitions 3 \
      --replication-factor 1
  fi
done