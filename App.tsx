import React, { useState, useEffect } from 'react';
import { getCurrentUser, logoutUser } from './services/storageService';
import { User, UserRole } from './types';
import { Header } from './components/Header';
import { Auth } from './components/Auth';
import { TeacherDashboard } from './components/TeacherDashboard';
import { StudentDashboard } from './components/StudentDashboard';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUser = getCurrentUser();
    if (savedUser) {
      setUser(savedUser);
    }
  }, []);

  const handleLogin = (user: User) => {
    setUser(user);
  };

  const handleLogout = () => {
    logoutUser();
    setUser(null);
  };

  return (
    <div className="min-h-screen bg-background font-sans text-gray-900">
      <Header user={user} onLogout={handleLogout} />
      
      <main className="max-w-md mx-auto p-4">
        {!user ? (
          <Auth onLogin={handleLogin} />
        ) : (
          <>
            {user.role === UserRole.ADMIN ? (
              <TeacherDashboard user={user} />
            ) : (
              <StudentDashboard user={user} />
            )}
          </>
        )}
      </main>
      
      {/* Footer */}
      {!user && (
         <footer className="text-center p-6 text-xs text-gray-400">
          <p className="mb-2">EduMatrix Result Management System</p>
          <p>&copy; {new Date().getFullYear()} All Rights Reserved</p>
        </footer>
      )}
    </div>
  );
};

export default App;