
// Enums
export enum InvoiceStatus {
  DRAFT = 'Brouillon',
  VALIDATED = 'Validée',
  PAID = 'Payée',
  CANCELLED = 'Annulée'
}

export enum VehicleType {
  TRUCK = 'Camion',
  TRAILER = 'Remorque',
  VAN = 'Fourgonnette'
}

export enum MissionStatus {
  PLANNED = 'Planifiée',
  IN_PROGRESS = 'En cours',
  COMPLETED = 'Terminée',
  DELIVERED = 'Livrée',
  INCOMPLETE = 'Incomplète',
  BILLED = 'Facturée'
}

export enum PaymentMethod {
  CHECK = 'Chèque',
  CASH = 'Espèces',
  TRANSFER = 'Virement',
  PROMISSORY = 'Traite'
}

export enum ExpenseCategory {
  FUEL = 'Carburant',
  MAINTENANCE = 'Entretien',
  SPARE_PARTS = 'Pièces de rechange',
  TOLLS = 'Péage',
  INSURANCE = 'Assurance',
  TAXES = 'Taxes & Vignettes',
  SALARY = 'Salaires',
  OFFICE = 'Bureau',
  PERSONAL = 'Dépense Personnelle',
  OTHER = 'Divers'
}

// --- SaaS & Multi-Tenancy ---

export enum SubscriptionPlan {
  FREE = 'Découverte',
  PRO = 'Professionnel',
  ENTERPRISE = 'Expert & Flotte'
}

export interface Tenant {
  id: string; // UUID
  name: string; // Company Name (e.g., Transport Ben Mahmoud)
  matricule_fiscale: string;
  plan: SubscriptionPlan;

  // Resource Limits
  max_users: number;
  max_vehicles: number;
  storage_limit_gb: number;

  // Current Usage
  current_users: number;
  current_vehicles: number;
  storage_used_gb: number;

  logo_url?: string;
  is_active: boolean;
  created_at: string;
  next_billing_date: string;
}

export interface User {
  id: string;
  tenant_id: string; // Foreign Key for Isolation
  email: string;
  full_name: string;
  role: UserRole;
  last_login: string;
  status: 'Active' | 'Inactive';
}

// --- Security & Audit ---

export type UserRole = 'ADMIN' | 'COMPTABLE' | 'MANAGER' | 'OBSERVATEUR' | 'CHAUFFEUR';

export interface FiscalPeriod {
  id: string;
  tenant_id: string;
  year: number;
  status: 'OPEN' | 'CLOSED';
  closed_at?: string;
  closed_by?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string; // ISO String
  user_name: string;
  tenant_id?: string; // Isolation
  role: UserRole;
  action: 'LOGIN' | 'CREATE' | 'UPDATE' | 'DELETE' | 'VALIDATE' | 'EXPORT' | 'PRINT' | 'CLOSE_PERIOD';
  entity: 'INVOICE' | 'EXPENSE' | 'VEHICLE' | 'EMPLOYEE' | 'SYSTEM' | 'FISCAL_YEAR';
  entity_ref?: string; // ID or Reference number
  details: string; // Description of change
  old_value?: any; // JSONB - Snapshot before change
  new_value?: any; // JSONB - Snapshot after change
  ip_address: string;
  hash?: string; // Integrity check for fiscal events
}

// --- Accounting Engine ---

export interface ChartOfAccount {
  code: string;
  label: string;
  type: 'ASSET' | 'LIABILITY' | 'EXPENSE' | 'REVENUE' | 'EQUITY';
}

export interface AccountingEntry {
  id: string;
  date: string;
  journal_code: 'VT' | 'AC' | 'OD' | 'BQ'; // Vente, Achat, Opérations Diverses, Banque
  account_code: string;
  account_label?: string; // Denormalized for display
  label: string;
  debit: number;
  credit: number;
  reference_id?: string; // Link to Invoice ID, Expense ID
  reference_type?: 'INVOICE' | 'EXPENSE' | 'PAYROLL' | 'CNSS';
}

// --- Fiscal Declarations (EDI Structures) ---

export interface FiscalDeclarationTVA {
  period: string; // YYYY-MM
  sales: {
    base_ht: number; // 701
    vat_collected: number; // 44571
    rate: number;
  };
  purchases: {
    base_ht: number; // 6xx
    vat_deductible: number; // 44566
  };
  credit_reported: number;
  vat_payable: number;
  vat_credit: number;
}

export interface FiscalDeclarationRS {
  month: string;
  withholding: Array<{
    type: 'SALAIRES' | 'HONORAIRES' | 'LOYERS';
    base: number;
    rate: number;
    withheld_amount: number;
    beneficiary_count: number;
  }>;
  total_withheld: number;
}

export interface FiscalDeclarationCNSS {
  quarter: string; // YYYY-Qx
  employees: Array<{
    cnss_number: string;
    full_name: string;
    gross_salary: number; // Salaire déclaré
    employee_part: number;
    employer_part: number;
  }>;
  total_due: number;
}

export interface FiscalDeclarationIS {
  year: number;
  revenue: number;
  expenses_deductible: number;
  expenses_nondeductible: number;
  taxable_profit: number;
  corporate_tax: number; // IS estimé
}

export interface EtatClientFournisseur {
  id: string;
  name: string;
  matricule_fiscal: string;
  total_ht: number;
  total_tva?: number;
}

// --- Database Entities ---

// 1. Companies (Tenants or Clients)
export interface Company {
  id: string; // PK
  tenant_id?: string; // Isolation: The tenant who owns this contact record
  name: string;
  matricule_fiscale: string; // Unique Tax ID
  registre_commerce: string;
  address: string;
  is_client: boolean;
  is_supplier: boolean;
  tva_assujetti: boolean;
  contact_email: string;
  contact_phone: string;
}

// 2. Fleet Management
export interface Vehicle {
  id: string; // PK
  tenant_id?: string; // Isolation
  matricule: string; // Unique Index (e.g., 180 TU 1234)
  type: VehicleType;
  brand: string;
  model: string;
  chassis_number: string;
  purchase_date: string;
  purchase_price: number;
  owner_id: string; // FK to Company (or Owner if personal)

  // Expiry Dates for Alerts
  insurance_expiry: string;
  vignette_expiry: string;
  technical_visit_expiry: string;
  extinguisher_expiry?: string;
  tacho_calibration_expiry?: string; // Chronotachygraphe
  mileage?: number; // Current Odometer
  image_url?: string; // Storage URL
}

// 3. HR & Payroll
export interface Employee {
  id: string; // PK
  tenant_id?: string; // Isolation
  company_id: string; // FK
  cin: string; // Unique Index
  cnss_number: string;
  first_name: string;
  last_name: string;
  role: 'Admin' | 'Chauffeur' | 'Mécano';
  license_number?: string; // Permis (Specific for drivers)
  license_expiry?: string;
  base_salary: number;
  marital_status: 'Single' | 'Married';
  children_count: number;
}

export interface Payroll {
  id: string; // PK
  tenant_id?: string; // Isolation
  employee_id: string; // FK
  month: number;
  year: number;

  // Earnings
  base_salary: number;
  primes_rendement: number;
  primes_presence: number;
  hours_supplementary: number;

  // Deductions
  cnss_employee: number; // 9.18% usually
  irpp: number; // Income Tax
  avance_salary: number;

  // Totals
  net_salary: number;
  cnss_employer: number; // Employer contribution
  cost_total: number;
}

// 4. Operations
export interface Mission {
  id: string; // PK
  tenant_id?: string; // Isolation
  vehicle_id: string; // FK
  driver_id: string; // FK
  client_id: string; // FK to Company

  // Legacy / UI Compat
  vehicleId?: string;
  driverId?: string;

  departure_location: string;
  destination_location: string;
  distance_km: number;
  cargo_weight_tonnes: number;

  start_date: string;
  end_date?: string;

  waybill_number?: string; // Numéro de BL (Bon de Livraison)
  waybill_date?: string; // Date de BL (Bon de Livraison)
  piece_number?: string; // Pièce N° (référence pièce pour facture, distincte du BL)
  status: MissionStatus;

  agreed_price_ttc: number; // For invoicing
  invoice_id?: string; // Link to Invoice

  // Legacy / UI Compat
  missionNumber?: string;
  departure?: string;
  destination?: string;
  distance?: number;
  price?: number;
  date?: string;
  client?: string;
  cargo?: string;
  waybillDate?: string; // Legacy alias for waybill_date
  pieceNumber?: string; // Legacy alias for piece_number
}

// 5. Finance - Expenses
export interface Expense {
  id: string; // PK
  tenant_id?: string; // Isolation
  company_id?: string; // FK
  supplier_id?: string; // FK to Company
  vehicle_id?: string; // FK (Nullable, for cost accounting)
  driver_id?: string; // FK (Nullable, e.g., for food allowance)

  category: ExpenseCategory;
  description?: string;
  date: string;
  invoice_ref_supplier?: string; // Numéro facture fournisseur

  amount_ht: number;
  tva_rate: number;
  tva_amount: number;
  amount_ttc: number;

  is_deductible: boolean; // For tax purposes
  payment_status: 'Paid' | 'Unpaid';
  attachment_url?: string;
  created_at?: string; // Timestamp for sorting
}

// 6. Finance - Invoicing
export interface Invoice {
  id: string; // PK
  tenant_id?: string; // Isolation
  number: string; // Sequential Unique (e.g., FAC-2024-001)
  client_id: string; // FK to Company
  clientName?: string; // UI Helper
  date: string;
  due_date: string;

  items: InvoiceItem[];

  // Totals
  total_ht: number;
  tva_rate: number; // 7% Transport
  tva_amount: number;
  timbre_fiscal: number; // 1.000 TND

  // Retenue à la source
  apply_rs: boolean;
  rs_rate: number; // 1% Transport
  rs_amount: number;

  total_ttc: number;
  net_to_pay: number;

  status: InvoiceStatus;
  attachment_url?: string;
}

export interface InvoiceItem {
  id?: string; // PK
  description: string;
  mission_id?: string; // FK (Optional link to mission)
  quantity: number;
  unit_price: number;

  // New Fields (v2.2)
  trajet?: string; // Ville départ - Ville arrivée
  pref_p?: string; // ABLL (Fixed)
  piece_no?: string; // Reference number
  devise?: string; // TND, EUR, USD
}

// 7. Payments
export interface Payment {
  id: string; // PK
  tenant_id?: string; // Isolation
  invoice_id?: string; // FK (Incoming payment)
  expense_id?: string; // FK (Outgoing payment)

  amount: number;
  date: string;
  method: PaymentMethod;
  reference: string; // Check number, Transfer ref

  bank_account: string;
}

// 8. Tax Declarations (Summaries)
export interface TaxDeclaration {
  id: string;
  tenant_id?: string; // Isolation
  month: number;
  year: number;

  total_revenue_ht: number;
  total_tva_collected: number;

  total_expenses_ht: number;
  total_tva_deductible: number;

  credit_tva_previous: number;

  tva_to_pay: number;

  total_rs_collected: number; // RS we kept from suppliers
  total_rs_on_sales: number; // RS clients kept from us
}

export interface FinancialSummary {
  revenue: number;
  expenses: number;
  netIncome: number;
  tvaCollected: number;
  tvaDeductible: number;
  rsToPay: number;
}

// --- Shared State Types (Lifted form Payroll) ---

export interface DriverState {
  id: string;
  fullName: string;
  role: string;
  baseSalary: number;
  maritalStatus: 'Single' | 'Married';
  childrenCount: number;
  cin?: string;
  vehicleMatricule?: string;
  username?: string;
  password?: string;
}

export interface TripRate {
  id?: string;
  departure: string;
  destination: string;
  rate?: number; // Legacy?
  truck_price: number;
}
