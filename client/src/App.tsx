import { Route, Routes } from 'react-router';
import { AppLayout } from './layout/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { BorrowersPage } from './pages/BorrowersPage';
import { BorrowerDetailPage } from './pages/BorrowerDetailPage';
import { LoansPage } from './pages/LoansPage';
import { LoanDetailPage } from './pages/LoanDetailPage';

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="borrowers" element={<BorrowersPage />} />
        <Route path="borrowers/:id" element={<BorrowerDetailPage />} />
        <Route path="loans" element={<LoansPage />} />
        <Route path="loans/:id" element={<LoanDetailPage />} />
      </Route>
    </Routes>
  );
}

export default App;
