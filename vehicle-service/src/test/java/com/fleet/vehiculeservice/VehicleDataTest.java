package com.fleet.vehiculeservice;

import com.fleet.vehiculeservice.model.Vehicle;
import com.fleet.vehiculeservice.model.VehicleStatus;
import com.fleet.vehiculeservice.dto.VehicleEvent; // L'import crucial pour le pack .dto
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class VehicleDataTest {

    @Test
    void testVehicleEntity() {
        Vehicle v = new Vehicle();
        v.setId(1L);
        v.setBrand("Renault");
        v.setModel("Clio");
        v.setLicensePlate("AA-123-BB");
        v.setStatus(VehicleStatus.AVAILABLE);

        assertEquals("Renault", v.getBrand());
        assertEquals(1L, v.getId());
    }

    @Test
    void testVehicleEventDto() {
    
        VehicleEvent event = new VehicleEvent();
        event.setVehicleId(1L);
        event.setLicensePlate("AA-123-BB");
        event.setStatus("AVAILABLE");
        event.setMessage("Test coverage");

        assertEquals(1L, event.getVehicleId());
        assertEquals("AA-123-BB", event.getLicensePlate());
        assertNotNull(event.getMessage());
    }
}