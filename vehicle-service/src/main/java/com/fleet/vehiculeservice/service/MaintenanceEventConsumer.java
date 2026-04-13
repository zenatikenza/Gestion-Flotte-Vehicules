package com.fleet.vehiculeservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fleet.vehiculeservice.model.Vehicle;
import com.fleet.vehiculeservice.model.VehicleStatus;
import com.fleet.vehiculeservice.repository.VehicleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;

/**
 * Consumer SAGA — écoute le topic {@code maintenance-alerts} publié par maintenance-service (NestJS).
 *
 * <ul>
 *   <li>{@code maintenance.created}   → statut du véhicule passe à {@code MAINTENANCE}</li>
 *   <li>{@code maintenance.updated}   → statut du véhicule passe à {@code MAINTENANCE}</li>
 *   <li>{@code maintenance.completed} → statut du véhicule revient à {@code AVAILABLE}</li>
 *   <li>{@code maintenance.cancelled} → statut du véhicule revient à {@code AVAILABLE}</li>
 * </ul>
 *
 * Le véhicule est identifié en priorité par {@code vehicle_id} (Long), avec repli sur
 * {@code vehicleImmat} (licensePlate) si l'ID est absent ou nul.
 *
 * Utilise {@code maintenanceEventContainerFactory} (StringDeserializer) car les messages
 * NestJS ne transportent pas les headers {@code __TypeId__} de Spring Kafka.
 */
@Service
public class MaintenanceEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(MaintenanceEventConsumer.class);

    private final VehicleRepository vehicleRepository;
    private final ObjectMapper objectMapper;

    public MaintenanceEventConsumer(VehicleRepository vehicleRepository, ObjectMapper objectMapper) {
        this.vehicleRepository = vehicleRepository;
        this.objectMapper = objectMapper;
    }

    @KafkaListener(
            topics = "maintenance-alerts",
            groupId = "fleet-maintenance-group",
            containerFactory = "maintenanceEventContainerFactory"
    )
    public void consume(String rawMessage) {
        System.out.println("[SAGA-Maintenance] Message Kafka reçu : " + rawMessage);
        Map<String, Object> event;
        try {
            event = objectMapper.readValue(rawMessage, Map.class);
        } catch (Exception e) {
            log.error("[SAGA-Maintenance] Impossible de désérialiser le message : {}", rawMessage, e);
            return;
        }

        String eventType = (String) event.get("eventType");
        log.info("[SAGA-Maintenance] Événement reçu : {}", eventType);

        if (eventType == null) {
            log.warn("[SAGA-Maintenance] eventType absent, message ignoré.");
            return;
        }

        switch (eventType) {
            case "maintenance.created", "maintenance.updated" ->
                    updateVehicleStatus(event, VehicleStatus.MAINTENANCE);
            case "maintenance.completed", "maintenance.cancelled" ->
                    updateVehicleStatus(event, VehicleStatus.AVAILABLE);
            default ->
                    log.debug("[SAGA-Maintenance] Événement ignoré : {}", eventType);
        }
    }

    private void updateVehicleStatus(Map<String, Object> event, VehicleStatus newStatus) {
        Optional<Vehicle> vehicleOpt = resolveVehicle(event);

        if (vehicleOpt.isEmpty()) {
            log.warn("[SAGA-Maintenance] Véhicule introuvable pour l'événement : {}", event);
            return;
        }

        Vehicle vehicle = vehicleOpt.get();
        VehicleStatus previousStatus = vehicle.getStatus();
        vehicle.setStatus(newStatus);
        vehicleRepository.save(vehicle);

        log.info("[SAGA-Maintenance] Véhicule {} (id={}) : {} → {}",
                vehicle.getLicensePlate(), vehicle.getId(), previousStatus, newStatus);
    }

    /**
     * Résolution du véhicule : priorité à vehicle_id (Long), repli sur vehicleImmat (licensePlate).
     */
    private Optional<Vehicle> resolveVehicle(Map<String, Object> event) {
        // Tentative par vehicle_id
        Object vehicleIdRaw = event.get("vehicle_id");
        if (vehicleIdRaw != null) {
            try {
                Long vehicleId = Long.parseLong(vehicleIdRaw.toString());
                if (vehicleId > 0) {
                    Optional<Vehicle> found = vehicleRepository.findById(vehicleId);
                    if (found.isPresent()) return found;
                }
            } catch (NumberFormatException e) {
                log.warn("[SAGA-Maintenance] vehicle_id '{}' non convertible en Long", vehicleIdRaw);
            }
        }

        // Repli sur vehiculeImmat (licensePlate) — orthographe exacte du JSON NestJS
        String immat = (String) event.get("vehiculeImmat");
        if (immat != null && !immat.isBlank()) {
            return vehicleRepository.findByLicensePlate(immat);
        }

        return Optional.empty();
    }
}
