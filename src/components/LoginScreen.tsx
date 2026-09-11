import React, { useState } from 'react';
import { api } from '../api';
import { UserRole } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (role: UserRole) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await api.login(password);
      if (res.success && res.role) {
        onLoginSuccess(res.role);
      }
    } catch (err: any) {
      // Per specification: generic message, do not reveal which check failed
      setError('Invalid password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#FFFFFF] px-4 py-8">
      {/* Centered Login Card */}
      <div className="w-full max-w-[320px] bg-[#FAFAFA] border border-[#E5E5E5] rounded-xl p-7 text-center">
        {/* Solid black circle logo mark */}
        <div className="mx-auto mb-4 w-9 h-9 rounded-full bg-[#111111] flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-white" />
        </div>

        {/* App Title & Subtext */}
        <h1 className="text-[20px] font-medium text-[#0A0A0A] mb-1">
          Bake &amp; Brew
        </h1>
        <p className="text-[14px] font-normal text-[#6B6B6B] mb-6">
          Enter your password to continue
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label htmlFor="password-input" className="sr-only">
              Password
            </label>
            <input
              id="password-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              disabled={loading}
              autoFocus
              className="w-full h-11 px-3 bg-white border border-[#E5E5E5] rounded-lg text-[15px] text-[#0A0A0A] placeholder-[#6B6B6B] focus:outline-none focus:border-[#111111] focus:ring-1 focus:ring-[#111111] transition-colors"
            />
          </div>

          {error && (
            <p className="text-[13px] text-[#DC2626] font-normal text-center" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            id="login-submit-btn"
            disabled={loading}
            className="w-full h-11 bg-[#111111] hover:bg-[#222222] text-white rounded-lg text-[15px] font-medium transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Verifying...' : 'Log in'}
          </button>
        </form>
      </div>

    </div>
  );
};
