
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Truck, FileText, Briefcase, Users, Calculator, PieChart, Database, BarChart2, Shield, Building, LogOut, Menu, X, Home } from 'lucide-react';
import { Tenant } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { useSwipe } from '../src/hooks/useTouchGestures';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: any) => void;
  currentTenant: Tenant;
  userRole: 'ADMIN' | 'COMPTABLE' | 'MANAGER' | 'OBSERVATEUR' | 'CHAUFFEUR';
  currentUser?: any;
  onLogout: () => void;
}

// Mobile Bottom Nav Item
const MobileNavItem = ({ id, label, icon: Icon, active, onClick }: any) => (
  <button
    onClick={() => onClick(id)}
    className={`flex flex-col items-center justify-center py-2 px-2 min-w-[60px] min-h-[56px] transition-all ${active
      ? 'text-indigo-600'
      : 'text-gray-400'
      }`}
  >
    <div className={`p-2.5 rounded-xl transition-all ${active ? 'bg-indigo-100' : ''}`}>
      <Icon size={22} strokeWidth={active ? 2.5 : 2} />
    </div>
    <span className={`text-[10px] mt-1 font-medium ${active ? 'text-indigo-600' : 'text-gray-500'}`}>
      {label}
    </span>
  </button>
);

// Desktop Sidebar Nav Item
const NavItem = ({ id, label, icon: Icon, active, onClick }: any) => (
  <button
    onClick={() => onClick(id)}
    className={`relative w-full flex items-center px-4 py-3.5 mb-1 text-sm font-medium transition-all duration-200 rounded-xl min-h-[48px] ${active
      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
      : 'text-gray-600 hover:bg-gray-100'
      }`}
  >
    <Icon size={20} className="mr-3" strokeWidth={active ? 2.5 : 2} />
    <span>{label}</span>
  </button>
);

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange, currentTenant, userRole, currentUser, onLogout }) => {
  const { language, setLanguage, t, dir } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Gesture handlers pour swipe
  const swipeHandlers = useSwipe({
    onSwipeLeft: () => {
      if (mobileMenuOpen) setMobileMenuOpen(false);
    },
    onSwipeRight: () => {
      if (!mobileMenuOpen) setMobileMenuOpen(true);
    },
  });

  // Attacher les event listeners pour le swipe
  useEffect(() => {
    const element = document.getElementById('main-content');
    if (!element) return;

    element.addEventListener('touchstart', swipeHandlers.onTouchStart as any);
    element.addEventListener('touchmove', swipeHandlers.onTouchMove as any);
    element.addEventListener('touchend', swipeHandlers.onTouchEnd as any);

    return () => {
      element.removeEventListener('touchstart', swipeHandlers.onTouchStart as any);
      element.removeEventListener('touchmove', swipeHandlers.onTouchMove as any);
      element.removeEventListener('touchend', swipeHandlers.onTouchEnd as any);
    };
  }, [mobileMenuOpen, swipeHandlers]);

  // Navigation items based on role
  const getNavItems = () => {
    if (userRole === 'CHAUFFEUR') {
      return [
        { id: 'driver-profile', label: 'Profil', icon: Users },
        { id: 'operations', label: 'Missions', icon: Briefcase },
        { id: 'expenses', label: 'Frais', icon: PieChart },
      ];
    }
    return [
      { id: 'dashboard', label: 'Accueil', icon: Home },
      { id: 'operations', label: 'Missions', icon: Briefcase },
      { id: 'invoicing', label: 'Factures', icon: FileText },
      { id: 'expenses', label: 'Charges', icon: PieChart },
      { id: 'hr', label: 'RH', icon: Users },
    ];
  };

  const navItems = getNavItems();

  // Extra items for desktop sidebar (admin only)
  const extraNavItems = userRole !== 'CHAUFFEUR' ? [
    { id: 'fleet', label: t('fleet'), icon: Truck },
    { id: 'accounting', label: t('accounting'), icon: Calculator },
    { id: 'reports', label: t('reports'), icon: BarChart2 },
    { id: 'saas', label: t('saas'), icon: Building },
    { id: 'security', label: t('security'), icon: Shield },
    { id: 'schema', label: t('schema'), icon: Database },
  ] : [];

  return (
    <div className="flex flex-col h-screen bg-transparent overflow-hidden" dir={dir}>
      {/* ===== MOBILE HEADER ===== */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-white/20 safe-area-top shadow-sm">
        <div className="flex items-center justify-between px-4 h-16">
          <button
            onClick={() => onTabChange(userRole === 'CHAUFFEUR' ? 'driver-profile' : 'dashboard')}
            className="flex items-center space-x-3 focus:outline-none active:opacity-70 transition-opacity min-h-[48px] min-w-[48px]"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
              <Truck className="text-white" size={20} />
            </div>
            <span className="font-bold text-gray-800 text-sm">MOMO</span>
          </button>

          <div className="flex items-center space-x-2">
            {/* Language Toggle */}
            <button
              onClick={() => setLanguage(language === 'fr' ? 'ar' : 'fr')}
              className="px-4 py-2 text-sm font-bold bg-gray-100 rounded-lg min-h-[48px] min-w-[48px] flex items-center justify-center"
            >
              {language === 'fr' ? 'عربي' : 'FR'}
            </button>

            {/* Logout Button - Always visible */}
            <button
              onClick={onLogout}
              className="p-3 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center"
              title="Déconnexion"
            >
              <LogOut size={20} />
            </button>

            {/* Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-3 rounded-lg bg-gray-100 min-h-[48px] min-w-[48px] flex items-center justify-center"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* ===== MOBILE SLIDE-OUT MENU ===== */}
      {mobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-in fade-in" 
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="absolute right-0 top-16 bottom-0 w-72 bg-white shadow-2xl overflow-y-auto animate-in slide-in-from-right"
            onClick={(e) => e.stopPropagation()}
          >
            {/* User Info */}
            <div className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 mb-2">
              <p className="font-bold text-gray-800 text-base">{currentUser?.full_name || currentTenant.name}</p>
              <p className="text-sm text-gray-600 mt-1">{userRole}</p>
            </div>

            {/* All Nav Items */}
            <div className="px-4 py-2 space-y-1">
              {[...navItems, ...extraNavItems].map(item => (
                <NavItem
                  key={item.id}
                  {...item}
                  active={activeTab === item.id}
                  onClick={(id: string) => {
                    onTabChange(id);
                    setMobileMenuOpen(false);
                  }}
                />
              ))}
            </div>

            {/* Logout - Also in menu for redundancy */}
            <div className="p-4 mt-6 border-t border-gray-100">
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center px-6 py-4 text-red-600 bg-red-50 rounded-xl font-medium hover:bg-red-100 transition-colors min-h-[56px]"
              >
                <LogOut size={20} className="mr-3" />
                <span className="text-base">Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== DESKTOP SIDEBAR ===== */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white/80 backdrop-blur-xl border-r border-white/40 z-30 shadow-sm">
        {/* Logo */}
        <div className="p-6 border-b border-gray-100/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Truck className="text-white" size={20} />
            </div>
            <div>
              <span className="text-lg font-bold text-gray-800">MOMO Logistics</span>
              <p className="text-[10px] text-gray-400 uppercase tracking-wider">Suite Pro</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-4 py-6 overflow-y-auto">
          <div className="space-y-1">
            {navItems.map(item => (
              <NavItem key={item.id} {...item} active={activeTab === item.id} onClick={onTabChange} />
            ))}
          </div>

          {extraNavItems.length > 0 && (
            <>
              <div className="my-6 px-2 flex items-center">
                <div className="h-px bg-gray-200 flex-1"></div>
                <span className="mx-2 text-[10px] font-bold text-gray-400 uppercase">Plus</span>
                <div className="h-px bg-gray-200 flex-1"></div>
              </div>
              <div className="space-y-1">
                {extraNavItems.map(item => (
                  <NavItem key={item.id} {...item} active={activeTab === item.id} onClick={onTabChange} />
                ))}
              </div>
            </>
          )}
        </nav>

        {/* User / Logout */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-gray-800">{currentUser?.full_name || currentTenant.name}</p>
              <p className="text-xs text-gray-500">{userRole}</p>
            </div>
            <button onClick={onLogout} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <main 
        id="main-content"
        className="flex-1 lg:ml-64 pt-16 pb-20 lg:pt-0 lg:pb-0 overflow-y-auto overflow-x-hidden bg-transparent"
      >
        <div className="p-4 lg:p-8 min-h-full max-w-[1920px] mx-auto">
          {children}
        </div>
      </main>

      {/* ===== MOBILE BOTTOM NAVIGATION ===== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-white/20 safe-area-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map(item => (
            <MobileNavItem
              key={item.id}
              {...item}
              active={activeTab === item.id}
              onClick={onTabChange}
            />
          ))}
        </div>
      </nav>
    </div>
  );
};
