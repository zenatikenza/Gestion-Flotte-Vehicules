package com.fleet.vehiculeservice.service;
import java.util.List;
import com.fleet.vehiculeservice.model.Vehicle;
import com.fleet.vehiculeservice.repository.VehicleRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VehicleServiceTest {

    @Mock
    private VehicleRepository vehicleRepository;

    @InjectMocks
    private VehicleService vehicleService;

    @Test
    void testFindById_Success() {
        // Arrange : On simule un véhicule existant
        Vehicle vehicle = new Vehicle();
        vehicle.setId(1L);
        vehicle.setBrand("Renault");
        when(vehicleRepository.findById(1L)).thenReturn(Optional.of(vehicle));

        // Act : On appelle la méthode du service
        Vehicle result = vehicleService.findById(1L);

        // Assert : On vérifie les résultats
        assertNotNull(result);
        assertEquals("Renault", result.getBrand());
    }

    @Test
    void testFindById_NotFound() {
        // Arrange : On simule une base vide pour cet ID
        when(vehicleRepository.findById(99L)).thenReturn(Optional.empty());

        // Act & Assert : On vérifie que l'exception est bien levée
        Exception exception = assertThrows(RuntimeException.class, () -> {
            vehicleService.findById(99L);
        });

        assertTrue(exception.getMessage().contains("non trouvé"));
    }

    @Test
    void testSave() {
        // Arrange
        Vehicle vehicle = new Vehicle();
        vehicle.setBrand("Tesla");
        when(vehicleRepository.save(any(Vehicle.class))).thenReturn(vehicle);

        // Act
        Vehicle saved = vehicleService.save(vehicle);

        // Assert
        assertNotNull(saved);
        assertEquals("Tesla", saved.getBrand());
        verify(vehicleRepository, times(1)).save(vehicle);
    }

@Test
    void testUpdate_Success() {
        // Arrange : On simule un véhicule existant et les nouvelles données
        Vehicle existingVehicle = new Vehicle();
        existingVehicle.setId(1L);
        existingVehicle.setBrand("Peugeot");

        Vehicle details = new Vehicle();
        details.setBrand("Peugeot");
        details.setModel("3008");
        details.setLicensePlate("AA-123-BB");

        when(vehicleRepository.findById(1L)).thenReturn(Optional.of(existingVehicle));
        when(vehicleRepository.save(any(Vehicle.class))).thenReturn(existingVehicle);

        // Act
        Vehicle updated = vehicleService.update(1L, details);

        // Assert
        assertEquals("3008", updated.getModel());
        assertEquals("AA-123-BB", updated.getLicensePlate());
        verify(vehicleRepository).save(existingVehicle);
    }

    @Test
    void testDelete_Success() {
        // Arrange
        Vehicle vehicle = new Vehicle();
        vehicle.setId(1L);
        when(vehicleRepository.findById(1L)).thenReturn(Optional.of(vehicle));

        // Act
        vehicleService.delete(1L);

        // Assert
        verify(vehicleRepository, times(1)).delete(vehicle);
    }
    @Test
    void testFindAll() {
        // Arrange
        when(vehicleRepository.findAll()).thenReturn(List.of(new Vehicle(), new Vehicle()));

        // Act
        List<Vehicle> result = vehicleService.findAll();

        // Assert
        assertEquals(2, result.size());
        verify(vehicleRepository, times(1)).findAll();
    }

    @Test
    void testDelete_NotFound() {
        // Arrange : On simule que le véhicule à supprimer n'existe pas
        when(vehicleRepository.findById(99L)).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(RuntimeException.class, () -> vehicleService.delete(99L));
    }
    
    @Test
    void testUpdate_NotFound() {
        // Arrange
        when(vehicleRepository.findById(99L)).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(RuntimeException.class, () -> vehicleService.update(99L, new Vehicle()));
    }

}