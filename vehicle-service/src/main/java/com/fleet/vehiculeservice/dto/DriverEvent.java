package com.fleet.vehiculeservice.dto;

/**
 * DTO représentant un événement publié sur le topic {@code driver-events}
 * par le conductor-service (NestJS). Les champs correspondent exactement
 * au format JSON produit par DriverProducerService.
 */
public class DriverEvent {

    private String eventType;
    private String conducteurId;
    private String nom;
    private String vehiculeId;
    private String message;
    private String timestamp;

    // --- constructeurs ---

    public DriverEvent() {}

    public DriverEvent(String eventType, String conducteurId, String nom,
                       String vehiculeId, String message) {
        this.eventType    = eventType;
        this.conducteurId = conducteurId;
        this.nom          = nom;
        this.vehiculeId   = vehiculeId;
        this.message      = message;
    }

    // --- getters / setters ---

    public String getEventType()    { return eventType; }
    public void setEventType(String eventType) { this.eventType = eventType; }

    public String getConducteurId() { return conducteurId; }
    public void setConducteurId(String conducteurId) { this.conducteurId = conducteurId; }

    public String getNom()          { return nom; }
    public void setNom(String nom)  { this.nom = nom; }

    public String getVehiculeId()   { return vehiculeId; }
    public void setVehiculeId(String vehiculeId) { this.vehiculeId = vehiculeId; }

    public String getMessage()      { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getTimestamp()    { return timestamp; }
    public void setTimestamp(String timestamp) { this.timestamp = timestamp; }

    @Override
    public String toString() {
        return "DriverEvent{eventType='" + eventType + "', conducteurId='" + conducteurId
                + "', vehiculeId='" + vehiculeId + "'}";
    }
}
