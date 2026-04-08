package com.fleet.vehiculeservice.web;

import com.fleet.vehiculeservice.model.Vehicle;
import com.fleet.vehiculeservice.model.VehicleStatus;
import com.fleet.vehiculeservice.service.VehicleService;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.graphql.data.method.annotation.SchemaMapping;
import org.springframework.stereotype.Controller;

import java.util.List;

@Controller
@RequiredArgsConstructor
public class VehicleGraphqlController {

    private final VehicleService vehicleService;

    // --- QUERIES (Lecture) ---
    @QueryMapping
    public List<Vehicle> allVehicles() {
        return vehicleService.findAll();
    }

    @QueryMapping
    public Vehicle vehicleById(@Argument Long id) {
        return vehicleService.findById(id);
    }

    // --- MUTATIONS (Ecriture) ---
    @MutationMapping
    public Vehicle addVehicle(@Argument VehicleInput input) {
        Vehicle vehicle = Vehicle.builder()
                .licensePlate(input.immatriculation())
                .brand(input.marque())
                .model(input.modele())
                .mileage(0) // Initialisation à 0 km
                .status(VehicleStatus.AVAILABLE) // Utilisation de l'Enum correct
                .build();
        return vehicleService.save(vehicle);
    }

    // --- MAPPING DES CHAMPS (Pont entre Schéma FR et Entité EN) ---
    @SchemaMapping(typeName = "Vehicle", field = "immatriculation")
    public String getImmatriculation(Vehicle vehicle) {
        return vehicle.getLicensePlate();
    }

    @SchemaMapping(typeName = "Vehicle", field = "marque")
    public String getMarque(Vehicle vehicle) {
        return vehicle.getBrand();
    }

    @SchemaMapping(typeName = "Vehicle", field = "modele")
    public String getModele(Vehicle vehicle) {
        return vehicle.getModel();
    }

    @SchemaMapping(typeName = "Vehicle", field = "statut")
    public VehicleStatus getStatut(Vehicle vehicle) {
        return vehicle.getStatus();
    }

    @SchemaMapping(typeName = "Vehicle", field = "kilometrage")
    public double getKilometrage(Vehicle vehicle) {
        return vehicle.getMileage();
    }
}

// Record pour recevoir les données de l'input GraphQL
record VehicleInput(String immatriculation, String marque, String modele, Integer annee) {}