/**
 * Tests E2E — Page Localisation GPS (/localisation)
 *
 * Les APIs positions et véhicules sont stubées pour rendre les tests
 * déterministes sans backend.
 *
 * Structure DOM clé (Localisation.tsx) :
 *  - h2 "Localisation temps réel"
 *  - Légende : "Dans la zone (50 km autour de Paris)" / "Hors zone géofencing"
 *  - Compteur : "{n} véhicule(s) tracké(s)"
 *  - .leaflet-container  → carte Leaflet
 *  - .leaflet-overlay-pane path → cercle de géofencing (Circle react-leaflet)
 */
export {}

const POSITION_API = 'http://localhost:8084/api/positions'
const VEHICLE_API  = 'http://localhost:8081/api/vehicles'

const STUB_POSITIONS = [
  { vehiculeId: '1', latitude: 48.8566, longitude: 2.3522, vitesse: 0,  horodatage: new Date().toISOString(), enZoneAutorisee: true  },
  { vehiculeId: '2', latitude: 51.5074, longitude: -0.1278, vitesse: 80, horodatage: new Date().toISOString(), enZoneAutorisee: false },
]

const STUB_VEHICLES = [
  { id: 1, licensePlate: 'AB-123-CD', brand: 'Peugeot', model: '208',  mileage: 15000, status: 'AVAILABLE' },
  { id: 2, licensePlate: 'EF-456-GH', brand: 'Renault', model: 'Clio', mileage: 32000, status: 'RESERVED'  },
]

describe('Page Localisation — Carte Leaflet', () => {
  beforeEach(() => {
    cy.loginKeycloak('admin_flotte', 'Admin1234!')

    // Stub positions et véhicules
    cy.intercept('GET', `${POSITION_API}*`, { statusCode: 200, body: STUB_POSITIONS }).as('getPositions')
    cy.intercept('GET', VEHICLE_API,        { statusCode: 200, body: STUB_VEHICLES  }).as('getVehicles')
    // Stub simulateur GPS (appelé pour les véhicules sans position)
    cy.intercept('POST', `${POSITION_API}/simulateur/vehicules`, { statusCode: 200, body: {} }).as('activerGps')
    // Stub position individuelle (pour vérifier si un véhicule a déjà une position)
    cy.intercept('GET', `${POSITION_API}/*`, { statusCode: 200, body: STUB_POSITIONS[0] }).as('getPosition')

    cy.visit('/localisation')
    cy.wait('@getPositions')
  })

  // ── Titre et éléments de la page ─────────────────────────────────────────
  it('affiche le titre "Localisation temps réel"', () => {
    cy.contains('h2', 'Localisation temps réel').should('be.visible')
  })

  it("affiche la légende de géofencing", () => {
    cy.contains('Dans la zone (50 km autour de Paris)').should('be.visible')
    cy.contains('Hors zone géofencing').should('be.visible')
  })

  it("affiche le compteur de véhicules trackés", () => {
    // Localisation.tsx l.163 : "{positions.length} véhicule(s) tracké(s)"
    cy.contains(`${STUB_POSITIONS.length} véhicule(s) tracké(s)`).should('be.visible')
  })

  // ── Carte Leaflet ────────────────────────────────────────────────────────
  it('affiche le conteneur Leaflet', () => {
    // react-leaflet génère toujours .leaflet-container
    cy.get('.leaflet-container', { timeout: 8000 }).should('exist').and('be.visible')
  })

  it('affiche le cercle de géofencing (50 km autour de Paris)', () => {
    // react-leaflet <Circle> → <path> dans .leaflet-overlay-pane > svg
    cy.get('.leaflet-container', { timeout: 8000 }).should('exist')
    cy.get('.leaflet-overlay-pane path', { timeout: 8000 }).should('exist')
  })

  it("affiche les marqueurs des véhicules sur la carte", () => {
    // Les marqueurs Leaflet div-icon sont dans .leaflet-marker-pane
    cy.get('.leaflet-container', { timeout: 8000 }).should('exist')
    cy.get('.leaflet-marker-pane').should('exist')
  })

  it("signale le véhicule hors zone (Londres est à > 50 km de Paris)", () => {
    // Localisation.tsx : "{outsideCount} véhicule(s) hors zone" si outsideCount > 0
    cy.contains('véhicule(s) hors zone').should('be.visible')
  })
})
