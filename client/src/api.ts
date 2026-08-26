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
