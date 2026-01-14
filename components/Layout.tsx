
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

// Mobile Bottom Nav Item - Premium 3D Design
const MobileNavItem = ({ id, label, icon: Icon, active, onClick }: any) => (
  <button
    onClick={() => onClick(id)}
    className={`relative flex flex-col items-center justify-center py-2 px-2 min-w-[60px] min-h-[56px] transition-all duration-300 group ${active
      ? 'text-white'
      : 'text-gray-400'
      }`}
  >
    {/* 3D Icon Container */}
    <div className={`relative p-2.5 rounded-2xl transition-all duration-300 transform ${
      active 
        ? 'bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/40 scale-110' 
        : 'bg-gray-50 group-hover:bg-gray-100 group-hover:scale-105'
    }`}>
      {/* 3D Shadow Effect */}
      {active && (
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl"></div>
      )}
      <Icon size={22} strokeWidth={active ? 2.5 : 2} className={active ? 'relative z-10' : ''} />
      
      {/* Glowing dot indicator */}
      {active && (
        <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full shadow-lg animate-pulse"></div>
      )}
    </div>
    <span className={`text-[9px] mt-1.5 font-bold transition-all ${active ? 'text-indigo-600' : 'text-gray-500'}`}>
      {label}
    </span>
  </button>
);

// Desktop Sidebar Nav Item - Premium 3D Design
const NavItem = ({ id, label, icon: Icon, active, onClick }: any) => (
  <button
    onClick={() => onClick(id)}
    className={`relative w-full flex items-center px-4 py-3.5 mb-1 text-sm font-medium transition-all duration-300 rounded-2xl min-h-[48px] overflow-hidden group ${
      active
        ? 'bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 text-white shadow-xl shadow-indigo-500/30 scale-[1.02]'
        : 'text-gray-600 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:scale-[1.01]'
    }`}
  >
    {/* 3D Light Effect for Active */}
    {active && (
      <>
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-tl from-purple-600/20 via-transparent to-transparent"></div>
      </>
    )}
    
    {/* Icon with 3D container */}
    <div className={`relative mr-3 p-1.5 rounded-xl transition-all duration-300 ${
      active 
        ? 'bg-white/10 shadow-inner' 
        : 'group-hover:bg-white group-hover:shadow-sm'
    }`}>
      <Icon size={20} strokeWidth={active ? 2.5 : 2} className="relative z-10" />
    </div>
    
    <span className="relative z-10">{label}</span>
    
    {/* Active indicator bar */}
    {active && (
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-l-full shadow-lg"></div>
    )}
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
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-100 safe-area-top shadow-lg shadow-gray-900/5">
        <div className="flex items-center justify-between px-4 h-16">
          <button
            onClick={() => onTabChange(userRole === 'CHAUFFEUR' ? 'driver-profile' : 'dashboard')}
            className="flex items-center space-x-3 focus:outline-none active:scale-95 transition-transform min-h-[48px] min-w-[48px]"
          >
            {/* 3D Logo with Gradient */}
            <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-500/30">
              <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent rounded-2xl"></div>
              <Truck className="text-white relative z-10" size={20} />
            </div>
            <span className="font-extrabold text-gray-800 text-base tracking-tight">MOMO</span>
          </button>

          <div className="flex items-center space-x-2">
            {/* Language Toggle - 3D Style */}
            <button
              onClick={() => setLanguage(language === 'fr' ? 'ar' : 'fr')}
              className="px-4 py-2 text-sm font-bold bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl min-h-[48px] min-w-[48px] flex items-center justify-center shadow-sm border border-gray-200/50 hover:shadow-md transition-all active:scale-95"
            >
              {language === 'fr' ? 'عربي' : 'FR'}
            </button>

            {/* Logout Button - Premium Red */}
            <button
              onClick={onLogout}
              className="p-3 rounded-xl bg-gradient-to-br from-red-50 to-red-100 text-red-600 hover:from-red-100 hover:to-red-200 transition-all shadow-sm hover:shadow-md min-h-[48px] min-w-[48px] flex items-center justify-center active:scale-95"
              title="Déconnexion"
            >
              <LogOut size={20} />
            </button>

            {/* Menu Button - 3D Style */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-3 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 min-h-[48px] min-w-[48px] flex items-center justify-center shadow-sm hover:shadow-md transition-all border border-gray-200/50 active:scale-95"
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
            className="absolute right-0 top-16 bottom-0 w-72 bg-gradient-to-br from-white via-gray-50 to-gray-100 shadow-2xl overflow-y-auto animate-in slide-in-from-right border-l border-gray-200/50"
            onClick={(e) => e.stopPropagation()}
          >
            {/* User Info - Premium Card */}
            <div className="relative p-6 bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 mb-2 overflow-hidden">
              {/* 3D Background Effects */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
              <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-purple-400/10 rounded-full blur-2xl"></div>
              
              <div className="relative z-10">
                <p className="font-extrabold text-white text-base drop-shadow-lg">{currentUser?.full_name || currentTenant.name}</p>
                <p className="text-sm text-indigo-100 mt-1 font-medium">{userRole}</p>
              </div>
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

            {/* Logout - Premium Style */}
            <div className="p-4 mt-6 border-t border-gray-200">
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center px-6 py-4 text-red-600 bg-gradient-to-br from-red-50 to-red-100 rounded-2xl font-bold hover:from-red-100 hover:to-red-200 transition-all min-h-[56px] shadow-sm hover:shadow-md active:scale-95"
              >
                <LogOut size={20} className="mr-3" />
                <span className="text-base">Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== DESKTOP SIDEBAR ===== */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-gradient-to-br from-white via-gray-50 to-gray-100 backdrop-blur-xl border-r border-gray-200/50 z-30 shadow-xl">
        {/* Logo - Premium 3D */}
        <div className="p-6 border-b border-gray-200/50">
          <div className="flex items-center space-x-3">
            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-500/30">
              {/* 3D Light effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent rounded-2xl"></div>
              <div className="absolute inset-0 bg-gradient-to-tl from-purple-600/20 to-transparent rounded-2xl"></div>
              <Truck className="text-white relative z-10" size={24} />
            </div>
            <div>
              <span className="text-xl font-extrabold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">MOMO</span>
              <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">Suite Pro</p>
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
                <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent flex-1"></div>
                <span className="mx-3 text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Plus</span>
                <div className="h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent flex-1"></div>
              </div>
              <div className="space-y-1">
                {extraNavItems.map(item => (
                  <NavItem key={item.id} {...item} active={activeTab === item.id} onClick={onTabChange} />
                ))}
              </div>
            </>
          )}
        </nav>

        {/* User / Logout - Premium Card */}
        <div className="p-4 border-t border-gray-200/50">
          <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-4 shadow-sm border border-gray-200/50">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">{currentUser?.full_name || currentTenant.name}</p>
                <p className="text-xs text-indigo-600 font-medium">{userRole}</p>
              </div>
              <button 
                onClick={onLogout} 
                className="ml-2 p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all hover:shadow-sm active:scale-95"
              >
                <LogOut size={18} />
              </button>
            </div>
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
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/98 backdrop-blur-xl border-t border-gray-200/50 safe-area-bottom shadow-[0_-8px_16px_-4px_rgba(0,0,0,0.08)]">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-50/50 to-transparent pointer-events-none"></div>
        
        <div className="relative flex items-center justify-around px-2 py-2">
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
