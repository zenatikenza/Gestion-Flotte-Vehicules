package com.fleet.vehiculeservice.service;

import com.fleet.vehiculeservice.model.Vehicle;
import com.fleet.vehiculeservice.repository.VehicleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class VehicleService {
    private final VehicleRepository vehicleRepository;

    public List<Vehicle> findAll() { 
        return vehicleRepository.findAll(); 
    }

    public Vehicle findById(Long id) {
        return vehicleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Véhicule non trouvé avec l'id : " + id));
    }

    public Vehicle save(Vehicle vehicle) { 
        return vehicleRepository.save(vehicle); 
    }

    public Vehicle update(Long id, Vehicle vehicleDetails) {
        Vehicle vehicle = findById(id);
        vehicle.setLicensePlate(vehicleDetails.getLicensePlate());
        vehicle.setBrand(vehicleDetails.getBrand());
        vehicle.setModel(vehicleDetails.getModel());
        vehicle.setMileage(vehicleDetails.getMileage());
        vehicle.setStatus(vehicleDetails.getStatus());
        return vehicleRepository.save(vehicle);
    }

    public void delete(Long id) {
        Vehicle vehicle = findById(id);
        vehicleRepository.delete(vehicle);
    }
}