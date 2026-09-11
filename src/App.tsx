/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { UserRole } from './types';
import { api, getStoredRole } from './api';
import { LoginScreen } from './components/LoginScreen';
import { BillingView } from './components/staff/BillingView';
import { OwnerDashboard } from './components/owner/OwnerDashboard';

export default function App() {
  const [role, setRole] = useState<UserRole | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Attempt verifying session via API
        const me = await api.getMe();
        if (me && me.role) {
          setRole(me.role);
          return;
        }
      } catch {
        // If cookie check fails, fall back to check stored role
        const storedRole = getStoredRole();
        if (storedRole) {
          setRole(storedRole);
        }
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuthStatus();
  }, []);

  const handleLoginSuccess = (userRole: UserRole) => {
    setRole(userRole);
  };

  const handleLogout = async () => {
    await api.logout();
    setRole(null);
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#FFFFFF] flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-[#111111] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!role) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  if (role === 'staff') {
    return <BillingView onLogout={handleLogout} />;
  }

  if (role === 'owner') {
    return <OwnerDashboard onLogout={handleLogout} />;
  }

  return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
}
