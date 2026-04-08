package com.fleet.vehiculeservice.web;

import com.fleet.vehiculeservice.model.Vehicle;
import com.fleet.vehiculeservice.service.VehicleService;
import com.fleet.vehiculeservice.service.VehicleProducer; // Import du Producer
import com.fleet.vehiculeservice.dto.VehicleEvent;      // Import du DTO
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/vehicles")
@RequiredArgsConstructor
@CrossOrigin("*")
public class VehicleController {

    private final VehicleService vehicleService;
    private final VehicleProducer vehicleProducer; // Injection automatique via Lombok

    @GetMapping
    public List<Vehicle> getAll() { 
        return vehicleService.findAll(); 
    }

    @GetMapping("/{id}")
    public Vehicle getById(@PathVariable Long id) {
        return vehicleService.findById(id);
    }

    @PostMapping
    public Vehicle create(@Valid @RequestBody Vehicle vehicle) {
        // 1. Sauvegarde en base de données
        Vehicle savedVehicle = vehicleService.save(vehicle);
        
        // 2. Envoi de l'événement Kafka
        vehicleProducer.sendEvent(new VehicleEvent(
            savedVehicle.getId(),
            savedVehicle.getLicensePlate(),
            savedVehicle.getStatus().toString(), // Conversion de l'enum en String
            "Nouveau véhicule ajouté à la flotte via Kafka"
        ));
        
        return savedVehicle;
    }

    @PutMapping("/{id}")
    public Vehicle update(@PathVariable Long id, @Valid @RequestBody Vehicle vehicle) {
        Vehicle updatedVehicle = vehicleService.update(id, vehicle);
        
        // Optionnel : Envoyer aussi un message pour la mise à jour
        vehicleProducer.sendEvent(new VehicleEvent(
            updatedVehicle.getId(),
            updatedVehicle.getLicensePlate(),
            updatedVehicle.getStatus().toString(),
            "Véhicule mis à jour"
        ));
        
        return updatedVehicle;
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        vehicleService.delete(id);
    }
}