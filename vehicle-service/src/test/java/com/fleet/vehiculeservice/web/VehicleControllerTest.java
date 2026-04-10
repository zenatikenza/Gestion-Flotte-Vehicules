package com.fleet.vehiculeservice.web;

import com.fleet.vehiculeservice.model.Vehicle;
import com.fleet.vehiculeservice.model.VehicleStatus;
import com.fleet.vehiculeservice.service.VehicleService;
import com.fleet.vehiculeservice.service.VehicleProducer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.graphql.test.tester.HttpGraphQlTester;
import org.springframework.http.MediaType;
import org.springframework.test.web.reactive.server.WebTestClient;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@Transactional
class VehicleControllerTest {

    @LocalServerPort
    private int port;

    @Autowired
    private MockMvc mockMvc;

    @Autowired 
    private VehicleService vehicleService; // On utilise le vrai service

    @MockBean
    private VehicleProducer vehicleProducer; // Mocké pour éviter Kafka en test

    private HttpGraphQlTester graphQlTester;

    @BeforeEach
    void setUp() {
        WebTestClient webTestClient = WebTestClient.bindToServer()
                .baseUrl("http://localhost:" + port + "/graphql")
                .build();
        this.graphQlTester = HttpGraphQlTester.create(webTestClient);
    }

    // ==========================================
    // 1. COUVERTURE REST (Cible: 100% VehicleController)
    // ==========================================
    @Test
    void testRestFullCoverage() throws Exception {
        // Test POST (Creation)
        String json = "{\"brand\":\"Renault\",\"model\":\"Clio\",\"licensePlate\":\"AA-111-BB\",\"status\":\"AVAILABLE\",\"mileage\":0.0}";
        mockMvc.perform(post("/api/vehicles")
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isOk());

        // Récupération de l'ID pour les tests suivants
        Vehicle saved = vehicleService.findAll().get(0);
        Long id = saved.getId();

        // Test GET ALL et GET BY ID
        mockMvc.perform(get("/api/vehicles")).andExpect(status().isOk());
        mockMvc.perform(get("/api/vehicles/" + id)).andExpect(status().isOk());

        // Test PUT (Update)
        mockMvc.perform(put("/api/vehicles/" + id)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json))
                .andExpect(status().isOk());

        // Test DELETE
        mockMvc.perform(delete("/api/vehicles/" + id)).andExpect(status().isOk());
    }

    // ==========================================
    // 2. COUVERTURE GRAPHQL (Cible: 100% VehicleGraphqlController)
    // ==========================================
    @Test
    void testGraphQlFullCoverage() {
        // On crée un véhicule pour s'assurer que les queries ont des données
        Vehicle v = Vehicle.builder()
                .brand("Tesla").model("S").licensePlate("TS-001")
                .mileage(100.0).status(VehicleStatus.AVAILABLE).build();
        vehicleService.save(v);

        // CRITIQUE : On demande TOUS les champs pour activer les @SchemaMapping
        String query = "{ allVehicles { id immatriculation marque modele statut kilometrage } }";
        
        graphQlTester.document(query)
                .execute()
                .path("allVehicles")
                .hasValue();

        // Test de la Mutation addVehicle
        String mutation = """
            mutation {
                addVehicle(input: { immatriculation: "GQL-999", marque: "GraphQL", modele: "Test", annee: 2026 }) {
                    id
                }
            }
            """;
        graphQlTester.document(mutation).execute();
    }

    // ==========================================
    // 3. COUVERTURE SERVICE (Cible: 100% VehicleService)
    // ==========================================
    @Test
    void testServiceException() {
        // Force le passage dans le .orElseThrow() du service
        assertThrows(RuntimeException.class, () -> vehicleService.findById(9999L));
    }
}