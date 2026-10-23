'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Lock, Mail, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { user, login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      if (user.role === 'ADMIN') {
        router.push('/admin');
      } else if (user.role === 'SELLER') {
        router.push('/seller');
      }
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await login(email.trim(), password);
    } catch (err: any) {
      if (err.statusCode === 403) {
        setError('Tu perfil comercial se encuentra desactivado. Comunícate con la administración.');
      } else {
        setError(err.message || 'Credenciales incorrectas o error en inicio de sesión.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4 space-y-6">
      <div className="text-center space-y-3">
        <div className="relative w-16 h-16 mx-auto">
          <Image
            src="/sakura-logo.png"
            alt="Sakura Beauty"
            fill
            className="object-contain filter drop-shadow-[0_0_15px_rgba(255,45,155,0.4)]"
            priority
          />
        </div>
        <h1 className="text-2xl font-black text-white">
          Sakura <span className="text-sakura">Beauty</span>
        </h1>
        <p className="text-xs text-[#A09098]">
          Acceso exclusivo para Vendedoras y Administradoras
        </p>
      </div>

      <div className="bg-[#0D0A0C] rounded-2xl border border-[rgba(255,45,155,0.25)] p-6 space-y-4 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
        {error && (
          <div className="bg-red-950/40 border border-red-500/40 text-red-200 px-3.5 py-2.5 rounded-xl text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#A09098] uppercase tracking-wider mb-1">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="email"
                required
                placeholder="vendedora@sakurabeauty.gt"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-sm rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#131014] text-white placeholder-[#5C4E54] focus:outline-none focus:border-sakura focus:ring-1 focus:ring-sakura"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#A09098] uppercase tracking-wider mb-1">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-11 py-2 text-sm rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#131014] text-white placeholder-[#5C4E54] focus:outline-none focus:border-sakura focus:ring-1 focus:ring-sakura"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={showPassword}
                title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#A09098] transition-colors hover:bg-white/5 hover:text-sakura focus:outline-none focus:ring-1 focus:ring-sakura"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-2.5 px-4 rounded-xl text-white font-bold text-sm transition-all shadow-[0_0_20px_rgba(255,45,155,0.3)] flex items-center justify-center space-x-2 ${
              isLoading
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                : 'bg-sakura hover:bg-sakura-glow active:scale-[0.98]'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Verificando...</span>
              </>
            ) : (
              <span>Ingresar a mi cuenta</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
