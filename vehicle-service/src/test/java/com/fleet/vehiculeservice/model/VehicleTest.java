package com.fleet.vehiculeservice.model;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class VehicleTest {
    @Test
    void testVehicleEntity() {
        Vehicle v = new Vehicle();
        v.setId(1L);
        v.setBrand("Renault");
        v.setModel("Megane");
        v.setLicensePlate("2026-KAFKA");
        v.setMileage(15000.0);
        v.setStatus(VehicleStatus.AVAILABLE);

        assertEquals(1L, v.getId());
        assertEquals("Renault", v.getBrand());
        assertEquals("Megane", v.getModel());
        assertEquals("2026-KAFKA", v.getLicensePlate());
        assertEquals(VehicleStatus.AVAILABLE, v.getStatus());
    }
}