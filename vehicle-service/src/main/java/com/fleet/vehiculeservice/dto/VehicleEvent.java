package com.fleet.vehiculeservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class VehicleEvent {
    private Long vehicleId;
    private String licensePlate;
    private String status;
    private String message;
}