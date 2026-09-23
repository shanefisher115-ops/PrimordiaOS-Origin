import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import CourtPanel from './panels/court-panel';
import ConstitutionPanel from './panels/constitution-panel';
import GuardianPanel from './panels/guardian-panel';
import GovernmentPanel from './panels/government-panel';

function Navigation() {
  return (
    <nav style={{ padding: '1rem', background: '#111118', borderBottom: '2px solid #333' }}>
      <ul style={{ display: 'flex', gap: '2rem', listStyle: 'none', margin: 0, padding: 0 }}>
        <li>
          <Link to="/" style={{ color: '#E0E0E0', textDecoration: 'none', fontWeight: 'bold' }}>Dashboard</Link>
        </li>
        <li>
          <Link to="/government" style={{ color: '#FFD700', textDecoration: 'none', fontWeight: 'bold' }}>System Government</Link>
        </li>
        <li>
          <Link to="/court" style={{ color: '#E0E0E0', textDecoration: 'none' }}>Court Realm</Link>
        </li>
        <li>
          <Link to="/guardian" style={{ color: '#E0E0E0', textDecoration: 'none' }}>Guardian</Link>
        </li>
        <li>
          <Link to="/constitution" style={{ color: '#E0E0E0', textDecoration: 'none' }}>Constitution</Link>
        </li>
      </ul>
    </nav>
  );
}

function Dashboard() {
  return (
    <div style={{ padding: '2rem', color: '#E0E0E0', background: '#000', minHeight: '100vh' }}>
      <h1>Cockpit Dashboard</h1>
      <p>Select a panel from the navigation menu above.</p>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <div style={{ fontFamily: 'sans-serif' }}>
        <Navigation />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/government" element={<GovernmentPanel />} />
          <Route path="/court" element={<CourtPanel />} />
          <Route path="/guardian" element={<GuardianPanel />} />
          <Route path="/constitution" element={<ConstitutionPanel />} />
        </Routes>
      </div>
    </Router>
  );
}
