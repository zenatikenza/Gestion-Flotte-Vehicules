package com.fleet.vehiculeservice.service;

import com.fleet.vehiculeservice.dto.VehicleEvent;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
public class VehicleProducer {

    private final KafkaTemplate<String, VehicleEvent> kafkaTemplate;

    public VehicleProducer(KafkaTemplate<String, VehicleEvent> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void sendEvent(VehicleEvent event) {
        kafkaTemplate.send("vehicle-topic", event);
        System.out.println(">>> Message envoyé à Kafka : " + event.getMessage());
    }
}