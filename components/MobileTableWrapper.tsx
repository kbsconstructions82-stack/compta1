import React, { useState } from 'react';
import { Table, List } from 'lucide-react';

interface MobileTableWrapperProps {
  children: React.ReactNode;
  mobileCards?: React.ReactNode;
  title?: string;
}

/**
 * Composant wrapper pour les tableaux qui bascule entre:
 * - Vue tableau scrollable horizontal sur mobile
 * - Vue cartes empilées sur mobile (si fournie)
 * - Vue tableau normale sur desktop
 */
export const MobileTableWrapper: React.FC<MobileTableWrapperProps> = ({
  children,
  mobileCards,
  title
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('cards');

  return (
    <div className="w-full">
      {/* Toggle Button (mobile only, if cards are provided) */}
      {mobileCards && (
        <div className="lg:hidden flex justify-between items-center mb-4">
          {title && <h3 className="font-bold text-gray-800">{title}</h3>}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-4 py-2 rounded-md transition-all flex items-center gap-2 min-h-[48px] ${
                viewMode === 'cards'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600'
              }`}
            >
              <List size={18} />
              <span className="text-sm font-medium">Cartes</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded-md transition-all flex items-center gap-2 min-h-[48px] ${
                viewMode === 'table'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600'
              }`}
            >
              <Table size={18} />
              <span className="text-sm font-medium">Tableau</span>
            </button>
          </div>
        </div>
      )}

      {/* Mobile View */}
      <div className="lg:hidden">
        {mobileCards && viewMode === 'cards' ? (
          <div className="mobile-card-list">{mobileCards}</div>
        ) : (
          <div className="mobile-table-wrapper scroll-indicator">
            <div className="inline-block min-w-full align-middle">
              {children}
            </div>
          </div>
        )}
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block overflow-x-auto">
        {children}
      </div>
    </div>
  );
};

/**
 * Composant pour une carte mobile représentant une ligne de tableau
 */
interface MobileCardProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const MobileCard: React.FC<MobileCardProps> = ({
  children,
  onClick,
  className = ''
}) => {
  return (
    <div
      onClick={onClick}
      className={`mobile-card-item ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''} ${className}`}
    >
      {children}
    </div>
  );
};

/**
 * Ligne de champ dans une carte mobile
 */
interface MobileCardRowProps {
  label: string;
  value: React.ReactNode;
  className?: string;
}

export const MobileCardRow: React.FC<MobileCardRowProps> = ({
  label,
  value,
  className = ''
}) => {
  return (
    <div className={`flex justify-between items-center py-2 border-b border-gray-100 last:border-0 ${className}`}>
      <span className="text-sm font-medium text-gray-600">{label}</span>
      <span className="text-sm font-semibold text-gray-800">{value}</span>
    </div>
  );
};
