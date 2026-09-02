import { Route, Routes } from 'react-router';
import { AppLayout } from './layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { BorrowersPage } from './pages/BorrowersPage';
import { BorrowerDetailPage } from './pages/BorrowerDetailPage';
import { LoansPage } from './pages/LoansPage';
import { LoanDetailPage } from './pages/LoanDetailPage';
import { DepositorsPage } from './pages/DepositorsPage';
import { DepositorDetailPage } from './pages/DepositorDetailPage';
import { WithdrawalRequestsPage } from './pages/WithdrawalRequestsPage';
import { LoanRequestsPage } from './pages/LoanRequestsPage';
import { LoanRequestReviewPage } from './pages/LoanRequestReviewPage';

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="borrowers" element={<BorrowersPage />} />
        <Route path="borrowers/:id" element={<BorrowerDetailPage />} />
        <Route path="loans" element={<LoansPage />} />
        <Route path="loans/:id" element={<LoanDetailPage />} />
        <Route path="depositors" element={<DepositorsPage />} />
        <Route path="depositors/:id" element={<DepositorDetailPage />} />
        <Route path="withdrawal-requests" element={<WithdrawalRequestsPage />} />
        <Route path="loan-requests" element={<LoanRequestsPage />} />
        <Route path="loan-requests/:id" element={<LoanRequestReviewPage />} />
      </Route>
    </Routes>
  );
}

export default App;
