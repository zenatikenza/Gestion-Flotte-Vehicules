package com.fleet.vehiculeservice.service;

import com.fleet.vehiculeservice.dto.VehicleEvent;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
public class VehicleConsumer {

    @KafkaListener(topics = "vehicle-topic", groupId = "fleet-group")
    public void consume(VehicleEvent event) {
        System.out.println("[KAFKA CONSUMER] Événement reçu : " + event.getMessage());
        System.out.println("   Détails -> ID: " + event.getVehicleId() + " | Plaque: " + event.getLicensePlate());
    }
}