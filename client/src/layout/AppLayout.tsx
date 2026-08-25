import { Outlet } from 'react-router';
import { Nav } from './Nav';
import './AppLayout.css';

export function AppLayout() {
  return (
    <div className="app-shell">
      <Nav />
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}
