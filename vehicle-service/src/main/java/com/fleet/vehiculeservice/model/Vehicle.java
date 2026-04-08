package com.fleet.vehiculeservice.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;

@Entity
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class Vehicle {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "La plaque d'immatriculation est obligatoire")
    @Column(unique = true)
    private String licensePlate;

    @NotBlank(message = "La marque est obligatoire")
    private String brand;

    @NotBlank(message = "Le modèle est obligatoire")
    private String model;

    @Min(value = 0, message = "Le kilométrage ne peut pas être négatif")
    private double mileage;
    
    @Enumerated(EnumType.STRING)
    @NotNull(message = "Le statut est obligatoire")
    private VehicleStatus status;
}