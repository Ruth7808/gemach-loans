import { NavLink } from 'react-router';

const links = [
  { to: '/', label: 'דשבורד' },
  { to: '/borrowers', label: 'לווים' },
  { to: '/loans', label: 'הלוואות' },
];

export function Nav() {
  return (
    <nav>
      <ul>
        {links.map((link) => (
          <li key={link.to}>
            <NavLink to={link.to} end={link.to === '/'}>
              {link.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
