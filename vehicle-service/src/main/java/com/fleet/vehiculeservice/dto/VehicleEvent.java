package com.fleet.vehiculeservice.dto;

public class VehicleEvent {
    private Long vehicleId;
    private String licensePlate;
    private String status;
    private String message;

    // Constructeur vide
    public VehicleEvent() {}

    // Constructeur avec tous les arguments
    public VehicleEvent(Long vehicleId, String licensePlate, String status, String message) {
        this.vehicleId = vehicleId;
        this.licensePlate = licensePlate;
        this.status = status;
        this.message = message;
    }

    // --- GETTERS ET SETTERS MANUELS ---
    public Long getVehicleId() { return vehicleId; }
    public void setVehicleId(Long vehicleId) { this.vehicleId = vehicleId; }

    public String getLicensePlate() { return licensePlate; }
    public void setLicensePlate(String licensePlate) { this.licensePlate = licensePlate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}