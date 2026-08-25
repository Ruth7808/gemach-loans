import { NavLink } from 'react-router';

const links = [
  { to: '/', label: 'דשבורד' },
  { to: '/borrowers', label: 'לווים' },
  { to: '/loans', label: 'הלוואות' },
];

export function Nav() {
  return (
    <nav className="app-nav">
      <h2>גמ"ח כספים</h2>
      <ul>
        {links.map((link) => (
          <li key={link.to}>
            <NavLink
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) => (isActive ? 'active' : undefined)}
            >
              {link.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
