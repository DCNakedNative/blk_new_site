import { useContext, useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../AuthContext';
import { LogOut, Menu, User, X } from 'lucide-react';

const LINKS = [
  { to: '/events', label: 'Events' },
  { to: '/blog', label: 'Blog' },
  { to: '/travel', label: 'Trips' },
  { to: '/about', label: 'About Us' },
];

const linkClass = ({ isActive }) =>
  `text-sm uppercase tracking-widest font-medium transition-colors ${
    isActive ? 'text-brand-green' : 'text-brand-muted hover:text-brand-ink'
  }`;

export default function Navigation() {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  // Close the phone menu whenever the page changes.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const accountLinks = user ? (
    <>
      <NavLink to="/dashboard" data-testid="nav-dashboard" className={({ isActive }) => `${linkClass({ isActive })} flex items-center gap-2 min-w-0`}>
        <User size={16} aria-hidden="true" className="shrink-0" />
        <span className="truncate max-w-[10rem]">{user.name}</span>
      </NavLink>
      {user.is_admin && (
        <NavLink to="/admin" data-testid="nav-admin" className={linkClass}>
          Admin
        </NavLink>
      )}
      <button
        type="button"
        onClick={handleLogout}
        data-testid="logout-button"
        className="flex items-center gap-2 text-sm uppercase tracking-widest font-medium text-brand-orange hover:text-brand-ink transition-colors"
      >
        <LogOut size={16} aria-hidden="true" />
        Logout
      </button>
    </>
  ) : (
    <Link to="/auth" data-testid="nav-login" className="btn-primary !py-2 !px-6 !text-xs">
      Login
    </Link>
  );

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-brand-cream/90 border-b border-black/5" data-testid="main-navigation" aria-label="Main">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="text-xl sm:text-2xl font-bold tracking-tighter" data-testid="logo-link">
            <span className="font-serif">THE SHENANIGATORS</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} data-testid={`nav-${l.label.toLowerCase().replace(' ', '-')}`} className={linkClass}>
                {l.label}
              </NavLink>
            ))}
            {accountLinks}
          </div>

          <button
            type="button"
            className="md:hidden p-2 -mr-2"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
            data-testid="menu-toggle"
          >
            {open ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-menu" className="md:hidden border-t border-black/5 bg-brand-cream">
          <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col gap-6 items-start">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} className={linkClass}>
                {l.label}
              </NavLink>
            ))}
            <div className="w-full border-t border-black/10 pt-6 flex flex-col gap-6 items-start">{accountLinks}</div>
          </div>
        </div>
      )}
    </nav>
  );
}
