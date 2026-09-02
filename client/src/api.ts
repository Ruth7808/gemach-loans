const API_BASE = '/api';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.error || `שגיאה בפנייה לשרת: ${response.status}`);
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

export interface AtRiskWithdrawal {
  requestId: number;
  depositorId: number;
  depositorName: string;
  targetDate: string;
  shortfall: number;
}

export interface PendingLoanRequestItem {
  requestId: number;
  name: string;
  amount: number;
}

export interface DashboardData {
  openingBalance: number;
  availableFunds: number;
  expectedThisMonth: number;
  dueToday: DueTodayItem[];
  monthlyCollected: MonthlyPoint[];
  monthlyForecast: MonthlyPoint[];
  depositorsBalance: number;
  openWithdrawalRequestsCount: number;
  openWithdrawalRequestsTotal: number;
  atRiskWithdrawals: AtRiskWithdrawal[];
  pendingLoanRequests: PendingLoanRequestItem[];
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

export interface Depositor {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
  createdAt: string;
  totalDeposits: number;
}

export interface NewDepositor {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
}

export function listDepositors(): Promise<Depositor[]> {
  return apiFetch('/depositors');
}

export function createDepositor(data: NewDepositor): Promise<Depositor> {
  return apiFetch('/depositors', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateDepositor(id: number, data: NewDepositor): Promise<Depositor> {
  return apiFetch(`/depositors/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export interface Deposit {
  id: number;
  depositorId: number;
  amount: number;
  date: string;
  notes: string | null;
  createdAt: string;
}

export interface WithdrawalRequest {
  id: number;
  depositorId: number;
  amount: number;
  requestDate: string;
  targetDate: string;
  status: string;
  paidSoFar: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  remaining: number;
  isReady: boolean;
  isAtRisk: boolean;
  shortfall: number;
}

export interface WithdrawalRequestWithDepositor extends WithdrawalRequest {
  depositor: { id: number; firstName: string; lastName: string };
}

export interface DepositorDetail extends Depositor {
  deposits: Deposit[];
  withdrawalRequests: WithdrawalRequest[];
}

export interface Withdrawal {
  id: number;
  withdrawalRequestId: number | null;
  depositorId: number;
  amount: number;
  date: string;
  notes: string | null;
  createdAt: string;
}

export interface WithdrawalRequestDetail extends WithdrawalRequestWithDepositor {
  withdrawals: Withdrawal[];
}

export interface NewWithdrawalRequest {
  depositorId: number;
  amount: number;
  notes?: string;
}

export function listWithdrawalRequests(depositorId?: number): Promise<WithdrawalRequestWithDepositor[]> {
  return apiFetch(depositorId !== undefined ? `/withdrawal-requests?depositorId=${depositorId}` : '/withdrawal-requests');
}

export function getWithdrawalRequest(id: number): Promise<WithdrawalRequestDetail> {
  return apiFetch(`/withdrawal-requests/${id}`);
}

export function createWithdrawalRequest(data: NewWithdrawalRequest): Promise<WithdrawalRequestWithDepositor> {
  return apiFetch('/withdrawal-requests', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function cancelWithdrawalRequest(id: number): Promise<WithdrawalRequestWithDepositor> {
  return apiFetch(`/withdrawal-requests/${id}/cancel`, { method: 'POST' });
}

export interface NewWithdrawalPayment {
  amount: number;
  date: string;
  notes?: string;
}

export function payWithdrawalRequest(id: number, data: NewWithdrawalPayment): Promise<WithdrawalRequestDetail> {
  return apiFetch(`/withdrawal-requests/${id}/pay`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export interface LoanRiskCheck {
  hypotheticalAvailableFunds: number;
  insufficientFunds: boolean;
  shortfallAmount: number;
  newlyAtRisk: { requestId: number; depositorName: string; targetDate: string; shortfall: number }[];
}

export function checkLoanRisk(amount: number): Promise<LoanRiskCheck> {
  return apiFetch('/loans/check-risk', {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
}

export function getDepositor(id: number): Promise<DepositorDetail> {
  return apiFetch(`/depositors/${id}`);
}

export interface NewDeposit {
  depositorId: number;
  amount: number;
  date: string;
  notes?: string;
}

export function createDeposit(data: NewDeposit): Promise<Deposit> {
  return apiFetch('/deposits', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export interface LoanRequestBorrower {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
}

export interface LoanRequest {
  id: number;
  source: string;
  externalId: string | null;
  borrowerId: number | null;
  nameAsEntered: string;
  phoneAsEntered: string;
  amount: number;
  numInstallments: number | null;
  notes: string | null;
  status: string;
  loanId: number | null;
  requestDate: string;
  createdAt: string;
  updatedAt: string;
  duplicatePhone: boolean;
  borrower: LoanRequestBorrower | null;
}

export interface LoanRequestDetail extends LoanRequest {
  loan: LoanDetail | null;
  suggestedBorrower: LoanRequestBorrower | null;
}

export interface NewLoanRequest {
  name: string;
  phone: string;
  amount: number;
  numInstallments?: number;
  notes?: string;
}

export interface UpdateLoanRequest {
  name?: string;
  phone?: string;
  amount?: number;
  numInstallments?: number | null;
  notes?: string;
  borrowerId?: number | null;
}

export interface ConvertLoanRequestToLoan {
  amount: number;
  numInstallments: number;
  givenDate: string;
  installmentDueDates: string[];
  notes?: string;
}

export function listLoanRequests(status?: string): Promise<LoanRequest[]> {
  return apiFetch(status ? `/loan-requests?status=${status}` : '/loan-requests');
}

export function getLoanRequest(id: number): Promise<LoanRequestDetail> {
  return apiFetch(`/loan-requests/${id}`);
}

export function createLoanRequest(data: NewLoanRequest): Promise<LoanRequest> {
  return apiFetch('/loan-requests', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateLoanRequest(id: number, data: UpdateLoanRequest): Promise<LoanRequest> {
  return apiFetch(`/loan-requests/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function rejectLoanRequest(id: number, note?: string): Promise<LoanRequest> {
  return apiFetch(`/loan-requests/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}

export function convertLoanRequestToLoan(id: number, data: ConvertLoanRequestToLoan): Promise<LoanRequestDetail> {
  return apiFetch(`/loan-requests/${id}/convert-to-loan`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
