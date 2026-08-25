import { Outlet } from 'react-router';
import { Nav } from './Nav';

export function AppLayout() {
  return (
    <div className="app-shell">
      <Nav />
      <main>
        <Outlet />
      </main>
    </div>
  );
}
