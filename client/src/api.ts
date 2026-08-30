const API_BASE = '/api';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`שגיאה בפנייה לשרת: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function checkHealth(): Promise<{ status: string }> {
  return apiFetch('/health');
}

export interface Borrower {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  totalOwed: number;
  isLate: boolean;
}

export interface NewBorrower {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
}

export function listBorrowers(): Promise<Borrower[]> {
  return apiFetch('/borrowers');
}

export function createBorrower(data: NewBorrower): Promise<Borrower> {
  return apiFetch('/borrowers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateBorrower(id: number, data: NewBorrower): Promise<Borrower> {
  return apiFetch(`/borrowers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export interface LoanSummary {
  id: number;
  amount: number;
  givenDate: string;
  numInstallments: number;
  status: string;
  remaining: number;
}

export interface BorrowerDetail extends Borrower {
  loans: LoanSummary[];
}

export function getBorrower(id: number): Promise<BorrowerDetail> {
  return apiFetch(`/borrowers/${id}`);
}

export interface Loan {
  id: number;
  borrowerId: number;
  amount: number;
  givenDate: string;
  numInstallments: number;
  status: string;
  notes: string | null;
  createdAt: string;
  borrower: { id: number; firstName: string; lastName: string };
  remaining: number;
  isLate: boolean;
  nextDueDate: string | null;
}

export function listLoans(): Promise<Loan[]> {
  return apiFetch('/loans');
}

export interface Installment {
  id: number;
  loanId: number;
  number: number;
  dueDate: string;
  amount: number;
  paid: number;
  status: string;
}

export interface Allocation {
  id: number;
  paymentId: number;
  installmentId: number;
  allocatedAmount: number;
}

export interface Payment {
  id: number;
  loanId: number;
  borrowerId: number;
  paymentDate: string;
  amount: number;
  notes: string | null;
  createdAt: string;
  allocations: Allocation[];
}

export interface LoanDetail {
  id: number;
  borrowerId: number;
  amount: number;
  givenDate: string;
  numInstallments: number;
  status: string;
  notes: string | null;
  createdAt: string;
  borrower: { id: number; firstName: string; lastName: string };
  installments: Installment[];
  payments: Payment[];
  remaining: number;
  isLate: boolean;
  nextDueDate: string | null;
}

export function getLoan(id: number): Promise<LoanDetail> {
  return apiFetch(`/loans/${id}`);
}

export interface NewPayment {
  loanId: number;
  amount: number;
  paymentDate: string;
  notes?: string;
}

export function createPayment(data: NewPayment): Promise<Payment> {
  return apiFetch('/payments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export interface NewLoan {
  borrowerId: number;
  amount: number;
  numInstallments: number;
  givenDate: string;
  installmentDueDates: string[];
  notes?: string;
}

export function createLoan(data: NewLoan): Promise<LoanDetail> {
  return apiFetch('/loans', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export interface MonthlyPoint {
  month: string;
  amount: number;
  isCurrent: boolean;
}

export interface DueTodayItem {
  installmentId: number;
  loanId: number;
  borrowerId: number;
  borrowerName: string;
  amount: number;
}

export interface DashboardData {
  openingBalance: number;
  availableFunds: number;
  expectedThisMonth: number;
  dueToday: DueTodayItem[];
  monthlyCollected: MonthlyPoint[];
  monthlyForecast: MonthlyPoint[];
}

export function getDashboard(): Promise<DashboardData> {
  return apiFetch('/dashboard');
}

export function updateOpeningBalance(value: number): Promise<{ value: number }> {
  return apiFetch('/settings/opening-balance', {
    method: 'PUT',
    body: JSON.stringify({ value }),
  });
}
