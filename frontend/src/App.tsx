import { useEffect, useState } from 'react';
import { Link, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { Aperture, ChevronDown, CircleHelp, ExternalLink, Laptop, LogOut, Menu, Moon, Sun, X } from 'lucide-react';
import { useWallet } from './contexts/WalletContext';
import { getNetwork, setNetwork, type Network } from './config';
import LandingPage from './pages/LandingPage';
import GatePage from './pages/GatePage';
import AdminPage from './pages/AdminPage';
import ObservatoryPage from './pages/ObservatoryPage';
import PhilosophyPage from './pages/PhilosophyPage';

const THEME_KEY = 'stillroom:theme:v1';

function Mark() { return <span className="brand-mark" aria-hidden="true"><Aperture size={20} strokeWidth={1.7} /></span>; }

export default function App() {
  const wallet = useWallet();
  const location = useLocation();
  const [theme, setTheme] = useState<'night' | 'day'>(() => (localStorage.getItem(THEME_KEY) as 'night' | 'day') || 'night');
  const [network, setNetworkState] = useState<Network>(() => getNetwork());
  const [menuOpen, setMenuOpen] = useState(false);
  const [networkOpen, setNetworkOpen] = useState(false);
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem(THEME_KEY, theme); }, [theme]);
  useEffect(() => setMenuOpen(false), [location.pathname]);
  const shortAddress = wallet.address ? `${wallet.address.slice(0, 7)}…${wallet.address.slice(-5)}` : '';
  const changeNetwork = (next: Network) => { if (next === network) { setNetworkOpen(false); return; } setNetwork(next); setNetworkState(next); wallet.disconnect(); setNetworkOpen(false); };

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    {wallet.error && <div className="global-alert" role="alert"><CircleHelp size={18} aria-hidden="true" /><span>{wallet.error}</span><button onClick={wallet.clearError} aria-label="Dismiss message"><X size={18} /></button></div>}
    <aside className={`sidebar ${menuOpen ? 'is-open' : ''}`}>
      <div className="sidebar-head"><Link to="/" className="brand" aria-label="Stillroom home"><Mark /><span>STILLROOM</span></Link><button className="icon-button mobile-close" onClick={() => setMenuOpen(false)} aria-label="Close navigation"><X size={18} /></button></div>
      <div className="brand-note">Private screening club<br /><span>curated on Midnight</span></div>
      <nav className="side-nav" aria-label="Primary navigation">
        <div className="nav-caption">The house</div>
        <NavLink to="/" end><span>Program</span><small>01</small></NavLink>
        <NavLink to="/gate"><span>Member pass</span><small>02</small></NavLink>
        <NavLink to="/observatory"><span>Signal room</span><small>03</small></NavLink>
        <div className="nav-caption nav-caption-spaced">Back office</div>
        <NavLink to="/operations"><span>Operations</span><small>04</small></NavLink>
        <NavLink to="/philosophy"><span>Privacy notes</span><small>05</small></NavLink>
      </nav>
      <div className="sidebar-bottom"><div className="privacy-chip"><span className="live-pip" />Private by default<span className="mono">ZK</span></div><p>Stillroom publishes the outcome. The reason stays with the member.</p><a href="https://midnight.network" target="_blank" rel="noreferrer" className="quiet-link">Built for Midnight <ExternalLink size={13} aria-hidden="true" /></a></div>
    </aside>
    {menuOpen && <button className="drawer-scrim" onClick={() => setMenuOpen(false)} aria-label="Close navigation overlay" />}
    <div className="content-shell">
      <header className="utility-bar">
        <button className="icon-button mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
        <div className="crumb"><span>STILLROOM</span><span className="crumb-slash">/</span><strong>{location.pathname === '/' ? 'PROGRAM' : location.pathname.slice(1).replace('-', ' ').toUpperCase()}</strong></div>
        <div className="utility-actions">
          <div className="network-switcher"><button className="network-button" onClick={() => setNetworkOpen(!networkOpen)} aria-expanded={networkOpen}><span className="network-dot" />{network}<ChevronDown size={14} /></button>{networkOpen && <div className="network-menu" role="menu"><p>Wallet network</p>{(['preview', 'preprod'] as Network[]).map(item => <button key={item} className={item === network ? 'selected' : ''} onClick={() => changeNetwork(item)} role="menuitem"><span className="network-dot" />{item}{item === network && <span>active</span>}</button>)}</div>}</div>
          <button className="icon-button" onClick={() => setTheme(theme === 'night' ? 'day' : 'night')} aria-label={`Switch to ${theme === 'night' ? 'day' : 'night'} theme`} title="Toggle day and night mode">{theme === 'night' ? <Sun size={17} /> : <Moon size={17} />}</button>
          {wallet.isConnected ? <button className="wallet-button connected" onClick={wallet.disconnect} title="Disconnect wallet"><span className="live-pip" />{wallet.walletName || 'Wallet'} · {shortAddress}<LogOut size={14} aria-hidden="true" /></button> : <button className="wallet-button" onClick={() => void wallet.connect(network)} disabled={wallet.isConnecting || wallet.walletStatus === 'not-found'}>{wallet.isConnecting ? 'Opening wallet…' : wallet.walletStatus === 'not-found' ? 'Install wallet' : 'Connect wallet'}</button>}
        </div>
      </header>
      <main id="main-content"><Routes><Route path="/" element={<LandingPage />} /><Route path="/gate" element={<GatePage />} /><Route path="/operations" element={<AdminPage />} /><Route path="/admin" element={<AdminPage />} /><Route path="/steward" element={<AdminPage />} /><Route path="/observatory" element={<ObservatoryPage />} /><Route path="/philosophy" element={<PhilosophyPage />} /></Routes></main>
      <footer className="site-footer"><span><Mark /> Stillroom / a private admission experiment</span><span className="footer-right">Network state is public. Member evidence is not.</span></footer>
    </div>
  </div>;
}
