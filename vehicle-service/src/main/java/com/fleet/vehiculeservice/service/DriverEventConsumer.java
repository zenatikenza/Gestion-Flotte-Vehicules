package com.fleet.vehiculeservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fleet.vehiculeservice.dto.DriverEvent;
import com.fleet.vehiculeservice.model.Vehicle;
import com.fleet.vehiculeservice.model.VehicleStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

/**
 * Consumer SAGA — écoute le topic {@code driver-events} publié par conductor-service.
 *
 * <ul>
 *   <li>{@code driver.assigned}   → statut du véhicule passe à {@code RESERVED}</li>
 *   <li>{@code driver.unassigned} → statut du véhicule revient à {@code AVAILABLE}</li>
 * </ul>
 *
 * En cas d'échec (véhicule introuvable, ID non parseable, erreur BDD), un événement
 * compensatoire est publié sur {@code driver-events} pour notifier le conductor-service.
 *
 * Utilise {@code driverEventContainerFactory} (StringDeserializer) car les messages
 * NestJS ne transportent pas les headers {@code __TypeId__} de Spring Kafka.
 */
@Service
public class DriverEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(DriverEventConsumer.class);

    private static final String TOPIC_DRIVER_EVENTS = "driver-events";

    private final VehicleService vehicleService;
    private final KafkaTemplate<String, DriverEvent> kafkaTemplate;
    private final ObjectMapper objectMapper;

    public DriverEventConsumer(VehicleService vehicleService,
                               KafkaTemplate<String, DriverEvent> kafkaTemplate,
                               ObjectMapper objectMapper) {
        this.vehicleService = vehicleService;
        this.kafkaTemplate  = kafkaTemplate;
        this.objectMapper   = objectMapper;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Listener
    // ─────────────────────────────────────────────────────────────────────────

    @KafkaListener(
            topics = TOPIC_DRIVER_EVENTS,
            groupId = "fleet-driver-group",
            containerFactory = "driverEventContainerFactory"
    )
    public void consume(String rawMessage) {
        DriverEvent event;
        try {
            event = objectMapper.readValue(rawMessage, DriverEvent.class);
        } catch (Exception e) {
            log.error("[SAGA] Impossible de désérialiser le message driver-events : {}", rawMessage, e);
            return;
        }

        log.info("[SAGA] Événement driver reçu : {} — véhicule {}", event.getEventType(), event.getVehiculeId());

        switch (event.getEventType() != null ? event.getEventType() : "") {
            case "driver.assigned"   -> handleAssigned(event);
            case "driver.unassigned" -> handleUnassigned(event);
            default -> log.debug("[SAGA] Événement ignoré : {}", event.getEventType());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Handlers
    // ─────────────────────────────────────────────────────────────────────────

    private void handleAssigned(DriverEvent event) {
        Long vehicleId = parseVehicleId(event);
        if (vehicleId == null) {
            publishCompensatoire("driver.assignment.failed", event,
                    "vehiculeId non parseable en Long : " + event.getVehiculeId());
            return;
        }

        try {
            Vehicle vehicle = vehicleService.findById(vehicleId);
            vehicle.setStatus(VehicleStatus.RESERVED);
            vehicleService.save(vehicle);
            log.info("[SAGA] Véhicule {} → RESERVED (conducteur {})", vehicleId, event.getConducteurId());
        } catch (Exception e) {
            log.error("[SAGA] Échec RESERVED pour véhicule {} : {}", vehicleId, e.getMessage());
            publishCompensatoire("driver.assignment.failed", event,
                    "Véhicule introuvable ou erreur BDD : " + e.getMessage());
        }
    }

    private void handleUnassigned(DriverEvent event) {
        Long vehicleId = parseVehicleId(event);
        if (vehicleId == null) {
            publishCompensatoire("driver.unassignment.failed", event,
                    "vehiculeId non parseable en Long : " + event.getVehiculeId());
            return;
        }

        try {
            Vehicle vehicle = vehicleService.findById(vehicleId);
            vehicle.setStatus(VehicleStatus.AVAILABLE);
            vehicleService.save(vehicle);
            log.info("[SAGA] Véhicule {} → AVAILABLE (conducteur libéré)", vehicleId);
        } catch (Exception e) {
            log.error("[SAGA] Échec AVAILABLE pour véhicule {} : {}", vehicleId, e.getMessage());
            publishCompensatoire("driver.unassignment.failed", event,
                    "Véhicule introuvable ou erreur BDD : " + e.getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Tente de convertir {@code event.vehiculeId} (String) en {@code Long}.
     * Retourne {@code null} si la conversion échoue, en loggant l'erreur.
     */
    private Long parseVehicleId(DriverEvent event) {
        if (event.getVehiculeId() == null) {
            log.error("[SAGA] vehiculeId absent dans l'événement {}", event.getEventType());
            return null;
        }
        try {
            return Long.parseLong(event.getVehiculeId());
        } catch (NumberFormatException e) {
            log.error("[SAGA] vehiculeId '{}' non convertible en Long : {}",
                    event.getVehiculeId(), e.getMessage());
            return null;
        }
    }

    /**
     * Publie un événement compensatoire sur {@code driver-events} pour notifier
     * le conductor-service de l'échec de la transaction SAGA.
     */
    private void publishCompensatoire(String failedEventType, DriverEvent original, String raison) {
        DriverEvent compensatoire = new DriverEvent(
                failedEventType,
                original.getConducteurId(),
                original.getNom(),
                original.getVehiculeId(),
                "[SAGA] Échec : " + raison
        );
        kafkaTemplate.send(TOPIC_DRIVER_EVENTS, original.getConducteurId(), compensatoire);
        log.warn("[SAGA] Événement compensatoire publié : {} — {}", failedEventType, raison);
    }
}
