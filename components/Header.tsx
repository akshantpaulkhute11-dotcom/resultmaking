
import React, { useState, useEffect } from 'react';
import { User, Institution } from '../types';
import { getInstitutionById } from '../services/storageService';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  const [institution, setInstitution] = useState<Institution | null>(null);

  useEffect(() => {
    const fetchInst = async () => {
        if (user) {
            const inst = await getInstitutionById(user.institutionId);
            setInstitution(inst);
        }
    };
    fetchInst();
  }, [user]);

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-50 print:hidden">
      <div className="max-w-md mx-auto flex justify-between items-center p-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl filter drop-shadow-md">🏫</div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">EduMatrix 🎓</h1>
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider flex items-center gap-1">
                {institution?.name || 'Portal'} 
                {institution?.id && <span className="bg-gray-100 px-1 rounded text-gray-600 font-mono">{institution.id}</span>}
            </p>
          </div>
        </div>
        
        {user && (
          <button 
            onClick={onLogout}
            className="p-2.5 bg-gray-50 hover:bg-red-50 text-gray-500 hover:text-red-500 rounded-xl transition-all duration-200"
            aria-label="Logout"
          >
            👋 Logout
          </button>
        )}
      </div>
    </header>
  );
};
