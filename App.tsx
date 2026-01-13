import React, { useState, useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/lib/react-query';
import './src/index.css';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Fleet } from './components/Fleet';
import { Invoicing } from './components/Invoicing';
import { Accounting } from './components/Accounting';
import { Operations } from './components/Operations';
import { SchemaViewer } from './components/SchemaViewer';
import { Payroll } from './components/Payroll';
import { Expenses } from './components/Expenses';
import { Reporting } from './components/Reporting';
import { SecurityAudit } from './components/SecurityAudit';
import { SaaSModule } from './components/SaaSModule';
import { DriverProfile } from './components/DriverProfile';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { MOCK_TENANTS } from './constants';
import { LanguageProvider } from './contexts/LanguageContext';
import { DatabaseProvider } from './contexts/DatabaseContext';

// New Imports
import { AuthProvider, useAuth } from './src/hooks/useAuth';
import { LoginScreen } from './src/components/auth/LoginScreen';
import { NetworkStatus } from './components/NetworkStatus';
import { SyncQueueManager } from './components/SyncQueueManager';

// Import cleanup utility (makes it available in browser console)
import './src/utils/cleanupSyncQueue';

// Hooks
// All data fetching and mutation hooks are removed as they are not used in AppContent directly.

function AppContent() {
  const { isAuthenticated, currentUser, login, logout, error: loginError, isLoading: authLoading } = useAuth();
  
  // Set default tab based on user role
  const getDefaultTab = () => {
    if (currentUser?.role === 'CHAUFFEUR') {
      return 'driver-profile';
    }
    return 'dashboard';
  };
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'fleet' | 'invoicing' | 'accounting' | 'reports' | 'operations' | 'hr' | 'expenses' | 'schema' | 'security' | 'saas' | 'driver-profile'>(getDefaultTab());

  // Reset activeTab when user logs in
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      setActiveTab(getDefaultTab());
    }
  }, [isAuthenticated, currentUser]);

  // Protect routes: redirect drivers away from admin pages
  useEffect(() => {
    if (currentUser?.role === 'CHAUFFEUR') {
      const allowedTabs = ['driver-profile', 'expenses', 'operations'];
      if (!allowedTabs.includes(activeTab)) {
        setActiveTab('driver-profile');
      }
    }
  }, [activeTab, currentUser]);

  // SaaS State
  const [currentTenantId, setCurrentTenantId] = useState<string>(MOCK_TENANTS[0].id);
  const currentTenant = MOCK_TENANTS.find(t => t.id === currentTenantId) || MOCK_TENANTS[0];

  // --- DATA FETCHING & MUTATIONS ---
  // Data fetching and mutations are now handled within individual components (React Query).

  // --- HANDLERS ---
  // Many handlers are now greatly simplified as state is effectively "remote" (in query cache)

  const handleSwitchTenant = (id: string) => {
    setCurrentTenantId(id);
    // Drivers go to their profile, others go to dashboard
    setActiveTab(currentUser?.role === 'CHAUFFEUR' ? 'driver-profile' : 'dashboard');
  };

  const renderContent = () => {
    // Block drivers from accessing admin pages - redirect to their profile
    if (currentUser?.role === 'CHAUFFEUR') {
      const allowedTabs = ['driver-profile', 'expenses', 'operations'];
      if (!allowedTabs.includes(activeTab)) {
        return <DriverProfile />;
      }
    }

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard
          onNavigate={(tab) => setActiveTab(tab as any)}
        />;
      case 'fleet':
        return <Fleet />;
      case 'invoicing':
        return <Invoicing />;
      case 'accounting':
        return <Accounting />;
      case 'reports':
        return <Reporting />;
      case 'operations':
        return <Operations />;
      case 'schema':
        return <SchemaViewer />;
      case 'hr':
        return <Payroll />;
      case 'expenses':
        return <Expenses />;
      case 'security':
        return <SecurityAudit />;
      case 'saas':
        return <SaaSModule
          currentTenant={currentTenant}
          onSwitchTenant={handleSwitchTenant}
          availableTenants={MOCK_TENANTS}
        />;
      case 'driver-profile':
        return <DriverProfile />;
      default:
        // Drivers go to profile, others go to dashboard
        return currentUser?.role === 'CHAUFFEUR' 
          ? <DriverProfile /> 
          : <Dashboard onNavigate={(tab) => setActiveTab(tab as any)} />;
    }
  };

  // Show loading screen only on initial mount (not during login)
  if (authLoading && !isAuthenticated && !loginError) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Chargement...</p>
      </div>
    </div>;
  }

  if (!isAuthenticated) {
    return <LoginScreen onLogin={login} error={loginError} isLoading={authLoading && !loginError} />;
  }

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={(t) => setActiveTab(t as any)}
      currentTenant={currentTenant}
      userRole={currentUser?.role || 'ADMIN'}
      currentUser={currentUser}
      onLogout={logout}
    >
      <NetworkStatus />
      <SyncQueueManager />
      <PWAInstallPrompt />
      {renderContent()}
    </Layout>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <DatabaseProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </DatabaseProvider>
      </QueryClientProvider>
    </LanguageProvider>
  );
}
