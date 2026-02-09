/**
 * DevTunnel+ Main Application
 * 
 * Routes:
 * - / : Landing Page
 * - /dashboard : Main Dashboard with Analytics
 * - /docs : Documentation
 * - /onboarding : Interactive Setup Guide
 */

import { Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import DocsPage from './pages/DocsPage';
import OnboardingPage from './pages/OnboardingPage';

function App() {
    return (
        <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/docs" element={<DocsPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
        </Routes>
    );
}

export default App;
