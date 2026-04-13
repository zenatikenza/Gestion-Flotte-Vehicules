package com.fleet.vehiculeservice.repository;

import com.fleet.vehiculeservice.model.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface VehicleRepository extends JpaRepository<Vehicle, Long> {
    Optional<Vehicle> findByLicensePlate(String licensePlate);
}