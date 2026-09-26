import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Heart, HouseLine, List, Moon, Sun, X } from '@phosphor-icons/react';
import { Button, ButtonLink } from './UI';
import { useAuth } from '../context/AuthContext';

function Brand() {
  return <Link className="brand" to="/" aria-label="Sublease Master home">
    <span className="brand-mark"><HouseLine size={21} weight="bold" aria-hidden="true" /></span>
    <span>sublease<span className="brand-light">master</span></span>
  </Link>;
}

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('sm-theme') || 'light');

  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('sm-theme', theme); }, [theme]);

  async function signOut() {
    await logout();
    setOpen(false);
    navigate('/');
  }

  return <header className="site-header">
    <div className="header-inner shell">
      <Brand />
      <nav className="desktop-nav" aria-label="Main navigation">
        <NavLink to="/explore">Explore rooms</NavLink>
        <NavLink to="/how-it-works">How it works</NavLink>
        <NavLink to="/safety">Safety</NavLink>
      </nav>
      <div className="header-actions desktop-actions">
        <button className="icon-button theme-button" type="button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}>
          {theme === 'light' ? <Moon size={19} aria-hidden="true" /> : <Sun size={19} aria-hidden="true" />}
        </button>
        {user ? <>
          <Link to="/saved" className="icon-button" aria-label="Saved listings"><Heart size={20} aria-hidden="true" /></Link>
          <Link className="account-link" to="/dashboard">{user.name.split(' ')[0]}</Link>
        </> : <Link className="header-login" to="/login">Log in</Link>}
        <ButtonLink to="/post" size="sm">Post a room</ButtonLink>
      </div>
      <button className="mobile-menu-toggle icon-button" type="button" onClick={() => setOpen(!open)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="mobile-menu">
        {open ? <X size={23} /> : <List size={23} />}
      </button>
    </div>
    {open && <nav className="mobile-nav" id="mobile-menu" aria-label="Mobile navigation">
      <NavLink to="/explore" onClick={() => setOpen(false)}>Explore rooms</NavLink>
      <NavLink to="/how-it-works" onClick={() => setOpen(false)}>How it works</NavLink>
      <NavLink to="/safety" onClick={() => setOpen(false)}>Safety</NavLink>
      {user ? <>
        <NavLink to="/dashboard" onClick={() => setOpen(false)}>Dashboard</NavLink>
        <NavLink to="/inbox" onClick={() => setOpen(false)}>Inbox</NavLink>
        <NavLink to="/saved" onClick={() => setOpen(false)}>Saved rooms</NavLink>
        <button type="button" onClick={signOut}>Log out</button>
      </> : <NavLink to="/login" onClick={() => setOpen(false)}>Log in</NavLink>}
      <ButtonLink to="/post" onClick={() => setOpen(false)}>Post a room</ButtonLink>
      <button type="button" className="mobile-theme" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? 'Dark mode' : 'Light mode'}</button>
    </nav>}
  </header>;
}

export function Footer() {
  return <footer className="site-footer">
    <div className="shell footer-grid">
      <div><Brand /><p>Good rooms. Better handoffs.<br />Built for the in-between months of college life.</p></div>
      <div><h3>Discover</h3><Link to="/explore">Explore rooms</Link><Link to="/post">Post a room</Link><Link to="/pricing">Pricing</Link></div>
      <div><h3>Support</h3><Link to="/how-it-works">How it works</Link><Link to="/safety">Safety tips</Link></div>
      <div className="footer-note"><p>Sublease Master helps students connect. Always verify lease rules, landlord approval, and the other party before sending money.</p></div>
    </div>
    <div className="shell footer-bottom"><span>© {new Date().getFullYear()} Sublease Master</span><span>Made for the move between here and next.</span></div>
  </footer>;
}
