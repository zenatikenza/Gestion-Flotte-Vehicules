/**
 * Tests E2E — Gestion des véhicules (/vehicles)
 *
 * L'API vehicle-service (port 8081) est stubée via cy.intercept pour :
 *  - rendre les tests déterministes (pas de dépendance au backend)
 *  - éviter de polluer la base avec des données de test
 *
 * Structure DOM clé (Vehicles.tsx) :
 *  - Bouton "+ Ajouter un véhicule"
 *  - Modal avec titre "Nouveau véhicule"
 *  - Formulaire : labels "Immatriculation", "Marque", "Modèle", "Kilométrage"
 *  - Bouton "Créer" (submit)
 *  - Tableau avec colonnes : Immatriculation, Marque, Modèle, ...
 */
export {}

const VEHICLE_API = 'http://localhost:8081/api/vehicles'
const MAINTENANCE_API = 'http://localhost:8083/api/interventions'

/** Données de stub renvoyées par le GET initial */
const STUB_VEHICLES = [
  { id: 1, licensePlate: 'AB-123-CD', brand: 'Peugeot', model: '208', mileage: 15000, status: 'AVAILABLE' },
  { id: 2, licensePlate: 'EF-456-GH', brand: 'Renault', model: 'Clio', mileage: 32000, status: 'RESERVED'  },
]

/** Données après création de CYPRESS-001 */
const STUB_VEHICLES_AFTER_CREATE = [
  ...STUB_VEHICLES,
  { id: 3, licensePlate: 'CYPRESS-001', brand: 'Toyota', model: 'Corolla', mileage: 1000, status: 'AVAILABLE' },
]

describe('Gestion des véhicules', () => {
  beforeEach(() => {
    cy.loginKeycloak('admin_flotte', 'Admin1234!')

    // Stub GET véhicules → liste initiale
    cy.intercept('GET', VEHICLE_API, { statusCode: 200, body: STUB_VEHICLES }).as('getVehicles')
    // Stub GET interventions (chargé en parallèle)
    cy.intercept('GET', MAINTENANCE_API, { statusCode: 200, body: [] }).as('getInterventions')

    cy.visit('/vehicles')
    cy.wait('@getVehicles')
  })

  // ── Affichage de la liste ────────────────────────────────────────────────
  it('affiche le tableau des véhicules avec les données stubées', () => {
    cy.get('table').should('exist')
    cy.contains('td', 'AB-123-CD').should('be.visible')
    cy.contains('td', 'Peugeot').should('be.visible')
    cy.contains('td', 'EF-456-GH').should('be.visible')
    cy.contains('td', 'Renault').should('be.visible')
  })

  it("affiche le bouton '+ Ajouter un véhicule'", () => {
    cy.contains('button', '+ Ajouter un véhicule').should('be.visible')
  })

  // ── Ouverture / fermeture de la modale ───────────────────────────────────
  it("ouvre la modale de création au clic sur '+ Ajouter un véhicule'", () => {
    cy.contains('button', '+ Ajouter un véhicule').click()
    cy.contains('h3', 'Nouveau véhicule').should('be.visible')
  })

  it("ferme la modale au clic sur 'Annuler'", () => {
    cy.contains('button', '+ Ajouter un véhicule').click()
    cy.contains('h3', 'Nouveau véhicule').should('be.visible')
    cy.contains('button', 'Annuler').click()
    cy.contains('h3', 'Nouveau véhicule').should('not.exist')
  })

  // ── Création d'un véhicule ───────────────────────────────────────────────
  it("crée un véhicule CYPRESS-001 et le voit apparaître dans le tableau", () => {
    const newVehicle = { id: 3, licensePlate: 'CYPRESS-001', brand: 'Toyota', model: 'Corolla', mileage: 1000, status: 'AVAILABLE' }

    // Stub POST → retourne le véhicule créé
    cy.intercept('POST', VEHICLE_API, { statusCode: 201, body: newVehicle }).as('createVehicle')
    // Stub GET après création → liste avec CYPRESS-001
    cy.intercept('GET', VEHICLE_API, { statusCode: 200, body: STUB_VEHICLES_AFTER_CREATE }).as('getVehiclesAfterCreate')

    cy.contains('button', '+ Ajouter un véhicule').click()
    cy.contains('h3', 'Nouveau véhicule').should('be.visible')

    // Remplir le formulaire via les labels (Vehicles.tsx utilise des <label> + <input>)
    cy.contains('label', 'Immatriculation').parent().find('input')
      .clear().type('CYPRESS-001')
    cy.contains('label', 'Marque').parent().find('input')
      .clear().type('Toyota')
    cy.contains('label', 'Modèle').parent().find('input')
      .clear().type('Corolla')
    cy.contains('label', 'Kilométrage').parent().find('input')
      .clear().type('1000')

    // Soumettre
    cy.contains('button', 'Créer').click()
    cy.wait('@createVehicle')

    // La modale se ferme
    cy.contains('h3', 'Nouveau véhicule').should('not.exist')

    // Après rechargement, CYPRESS-001 apparaît dans le tableau
    cy.wait('@getVehiclesAfterCreate')
    cy.contains('td', 'CYPRESS-001').should('be.visible')
    cy.contains('td', 'Toyota').should('be.visible')
    cy.contains('td', 'Corolla').should('be.visible')
  })

  // ── Recherche ────────────────────────────────────────────────────────────
  it("filtre le tableau par immatriculation via le champ de recherche", () => {
    cy.get('input[placeholder*="Rechercher"]').type('Peugeot')
    cy.contains('td', 'AB-123-CD').should('be.visible')
    // Renault ne doit plus apparaître
    cy.contains('td', 'EF-456-GH').should('not.exist')
  })
})
