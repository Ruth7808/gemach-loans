import { NavLink } from 'react-router';
import { HomeIcon, UserIcon, LoanIcon, DepositorIcon, WithdrawalIcon, LoanRequestIcon } from '../icons';

const links = [
  { to: '/', label: 'דשבורד', Icon: HomeIcon, accent: 'primary' as const },
  { to: '/borrowers', label: 'לווים', Icon: UserIcon, accent: 'primary' as const },
  { to: '/loans', label: 'הלוואות', Icon: LoanIcon, accent: 'gold' as const },
  { to: '/loan-requests', label: 'בקשות הלוואה', Icon: LoanRequestIcon, accent: 'teal' as const },
  { to: '/depositors', label: 'מפקידים', Icon: DepositorIcon, accent: 'purple' as const },
  { to: '/withdrawal-requests', label: 'בקשות משיכה', Icon: WithdrawalIcon, accent: 'blue' as const },
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
              className={({ isActive }) => `nav-${link.accent}${isActive ? ' active' : ''}`}
            >
              <link.Icon size={18} />
              {link.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
