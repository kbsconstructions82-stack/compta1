
import { VehicleType, SubscriptionPlan, Tenant, MissionStatus } from './types';

export const APP_NAME = "MOMO Logistics";

// Tarifs par défaut (anciens - conservés pour compatibilité)
// Les nouveaux tarifs sont dans src/utils/tariffs.ts (NEW_BOX_RATES et EMPLOYEE_RATES)
export const TRIP_RATES_DEFAULT = [
  { departure: 'Kairouan', destination: 'Tunis', truck_price: 30 },
  { departure: 'Kairouan', destination: 'Bizerte', truck_price: 35 },
  { departure: 'Kairouan', destination: 'Sousse', truck_price: 20 },
  { departure: 'Kairouan', destination: 'Sfax', truck_price: 30 },
  { departure: 'Kairouan', destination: 'Sidi Lheni', truck_price: 20 },
  { departure: 'Kairouan', destination: 'Kairouan', truck_price: 5 },
  { departure: 'Kairouan', destination: 'Siliana', truck_price: 25 },
  { departure: 'Kairouan', destination: 'Gabes', truck_price: 50 },
  { departure: 'Kairouan', destination: 'Tozeur', truck_price: 50 },
  { departure: 'Kairouan', destination: 'Djerba', truck_price: 50 },
  { departure: 'Kairouan', destination: 'Medenine', truck_price: 50 },
  { departure: 'Kairouan', destination: 'Douz', truck_price: 50 },
  { departure: 'Kairouan', destination: 'Nefta', truck_price: 50 },
  // Reverse routes pour compatibilité
  { departure: 'Sfax', destination: 'Kairouan', truck_price: 30 }
];

export const SAAS_PLANS = {
  [SubscriptionPlan.FREE]: {
    price: 0,
    max_users: 1,
    max_vehicles: 2,
    storage: 0.5, // GB
    features: ['Facturation Simple', 'Suivi Dépenses']
  },
  [SubscriptionPlan.PRO]: {
    price: 89, // TND/month
    max_users: 5,
    max_vehicles: 10,
    storage: 5, // GB
    features: ['Multi-utilisateurs', 'Rapports Avancés', 'Export Expert Comptable', 'Suivi Maintenance']
  },
  [SubscriptionPlan.ENTERPRISE]: {
    price: 249, // TND/month
    max_users: 20,
    max_vehicles: 50,
    storage: 50, // GB
    features: ['API Access', 'Marque Blanche', 'Audit Logs', 'Gestion Multi-sites', 'Support Prioritaire']
  }
};

export const MOCK_TENANTS: Tenant[] = [
  {
    id: 'T001',
    name: 'TunisFret Logistics',
    matricule_fiscale: '1234567/A/M/000',
    plan: SubscriptionPlan.PRO,
    max_users: 5,
    max_vehicles: 10,
    storage_limit_gb: 5,
    current_users: 3,
    current_vehicles: 3,
    storage_used_gb: 1.2,
    is_active: true,
    created_at: '2023-01-01',
    next_billing_date: '2024-06-01'
  },
  {
    id: 'T002',
    name: 'Sfax Trans Rapide',
    matricule_fiscale: '8889991/B/A/000',
    plan: SubscriptionPlan.FREE,
    max_users: 1,
    max_vehicles: 2,
    storage_limit_gb: 0.5,
    current_users: 1,
    current_vehicles: 2,
    storage_used_gb: 0.4,
    is_active: true,
    created_at: '2024-03-15',
    next_billing_date: '2024-06-15'
  }
];

export const TAX_CONFIG = {
  TVA_TRANSPORT: 7, // 7% Standard VAT for Transport (2025 Regularisation)
  TVA_STANDARD: 19, // 19% Standard VAT
  TIMBRE_FISCAL: 1.000, // 1 TND
  RS_TRANSPORT: 1, // 1% Retenue à la source for transport services > 1000 TND
};

export const SOCIAL_RATES = {
  CNSS_EMPLOYEE: 9.18, // 9.18% Employee share
  CNSS_EMPLOYER: 16.57, // Base Employer share
  TFP: 1.0, // Taxe Formation Professionnelle (1% standard, 2% some sectors)
  FOPROLOS: 1.0, // Fonds Promotion Logement Salariés
  ACCIDENT_WORK: 0.5 // Accident de travail (Variable, approx 0.4-2%)
};

export const IRPP_CONFIG = {
  BRACKETS: [
    { limit: 5000, rate: 0 },
    { limit: 20000, rate: 0.26 },
    { limit: 30000, rate: 0.28 },
    { limit: 50000, rate: 0.32 },
    { limit: Infinity, rate: 0.35 }
  ],
  DEDUCTIONS: {
    PROFESSIONAL_RATE: 0.10, // 10%
    PROFESSIONAL_CAP: 2000, // Max 2000 TND
    CHEF_FAMILLE: 300, // 300 TND/year
    CHILD_1: 100,
    CHILD_2: 100,
    CHILD_3: 100,
    CHILD_4: 100
  }
};

export const MOCK_VEHICLES = [
  {
    id: '1',
    tenant_id: 'T001',
    matricule: '180 TU 4521',
    type: VehicleType.TRUCK,
    brand: 'Volvo',
    model: 'FH16',
    chassis_number: 'VH123456789',
    purchase_price: 280000,
    owner_id: 'CMP001',
    purchase_date: '2020-01-15',
    insurance_expiry: '2024-12-31',
    vignette_expiry: '2024-12-31',
    technical_visit_expiry: '2024-06-15'
  },
  {
    id: '2',
    tenant_id: 'T001',
    matricule: '195 TU 8892',
    type: VehicleType.TRUCK,
    brand: 'Scania',
    model: 'R450',
    chassis_number: 'VH987654321',
    purchase_price: 310000,
    owner_id: 'CMP001',
    purchase_date: '2021-05-20',
    insurance_expiry: '2024-11-30',
    vignette_expiry: '2024-12-31',
    technical_visit_expiry: '2024-08-20'
  },
  {
    id: '3',
    tenant_id: 'T001',
    matricule: '210 TU 1122',
    type: VehicleType.TRAILER,
    brand: 'Schmitz',
    model: 'Cargobull',
    chassis_number: 'TR11223344',
    purchase_price: 85000,
    owner_id: 'CMP001',
    purchase_date: '2022-03-10',
    insurance_expiry: '2025-01-15',
    vignette_expiry: '2024-12-31',
    technical_visit_expiry: '2025-03-10'
  },
];

export const MOCK_DRIVERS = [
  { id: '1', tenant_id: 'T001', fullName: 'Mohamed Ben Ali', cin: '08541236', role: 'Chauffeur', maritalStatus: 'Married', childrenCount: 2, baseSalary: 600, username: 'ali', password: '123', vehicleMatricule: '180 TU 4521' },
  { id: '2', tenant_id: 'T001', fullName: 'Sami Tounsi', cin: '09876543', role: 'Chauffeur', maritalStatus: 'Single', childrenCount: 0, baseSalary: 550, username: 'sami', password: '123', vehicleMatricule: '195 TU 8892' },
];

export const INITIAL_MISSIONS = [
  {
    id: '101',
    missionNumber: '2024-101',
    status: MissionStatus.IN_PROGRESS,
    departure: 'Sbeitla',
    destination: 'Gafsa', // Note: Gafsa uses default/Sud rate logic or handled generically
    date: '2024-05-24',
    vehicleId: '1',
    driverId: '1',
    client: 'Groupe Chimique',
    cargo: 'Engrais - 24 Tonnes',
    distance: 120,
    price: 1200
  },
  {
    id: '102',
    missionNumber: '2024-102',
    status: MissionStatus.IN_PROGRESS,
    departure: 'Sbeitla',
    destination: 'Tunis',
    date: '2024-05-25',
    vehicleId: '2',
    driverId: '2',
    client: 'SOTUVER',
    cargo: 'Verre - 18 Tonnes',
    distance: 270,
    price: 950
  },
  {
    id: '103',
    missionNumber: '2024-103',
    status: 'Planifiée',
    departure: 'Sbeitla',
    destination: 'Sousse', // Sahel
    date: '2024-05-26',
    vehicleId: '3',
    driverId: '1',
    client: 'Cimenterie',
    cargo: 'Ciment - 30 Tonnes',
    distance: 180,
    price: 700
  }
];
