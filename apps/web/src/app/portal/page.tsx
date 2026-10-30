'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Lock, Mail, AlertCircle, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../lib/auth-context';
import { getLoginErrorMessage } from '../../lib/login-error';
import { resolvePortalDestination } from '../../lib/portal-routing';

export default function PortalLoginPage() {
  const router = useRouter();
  const { user, login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Errores específicos por campo y general
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const redirectParam =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('redirect')
          : null;
      router.replace(resolvePortalDestination(user.role, redirectParam));
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setGeneralError(null);
    setEmailError(null);
    setPasswordError(null);

    // Soporte para autofill del navegador leyendo el DOM si el estado aún no sincronizó
    const form = e.currentTarget;
    const emailField = form.elements.namedItem('email') as HTMLInputElement | null;
    const passwordField = form.elements.namedItem('password') as HTMLInputElement | null;

    const emailValue = (email || emailField?.value || '').trim();
    const passwordValue = password || passwordField?.value || '';

    let hasError = false;

    if (!emailValue) {
      setEmailError('Por favor, ingresa tu correo electrónico.');
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      setEmailError('Ingresa un formato de correo válido (ej. vendedora@empresa.com).');
      hasError = true;
    }

    if (!passwordValue) {
      setPasswordError('Por favor, ingresa tu contraseña.');
      hasError = true;
    }

    if (hasError) {
      return;
    }

    setIsLoading(true);

    try {
      const loggedUser = await login(emailValue, passwordValue);

      const redirectParam =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('redirect')
          : null;
      router.replace(resolvePortalDestination(loggedUser.role, redirectParam));
      router.refresh();
    } catch (err: unknown) {
      setGeneralError(getLoginErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-12">
      <div className="space-y-3 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-sakura/30 bg-[rgba(255,45,155,0.1)] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-sakura">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Portal Interno</span>
        </div>
        <h1 className="relative mx-auto !mt-6 h-20 w-64 sm:h-24 sm:w-80">
          <Image
            src="/sakura-brand.webp"
            alt="Sakura Makeup"
            fill
            sizes="(max-width: 640px) 224px, 256px"
            className="object-contain drop-shadow-[0_0_14px_rgba(255,45,155,0.25)]"
            priority
          />
        </h1>
        <p className="text-xs text-[#A09098]">
          Acceso exclusivo para Vendedoras y Administradoras autorizadas
        </p>
      </div>

      <div className="space-y-5 rounded-2xl border border-[rgba(255,45,155,0.25)] bg-[#0D0A0C] p-6 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
        {generalError && (
          <div
            role="alert"
            className="flex items-start space-x-2.5 rounded-xl border border-red-500/50 bg-red-950/50 p-3.5 text-xs text-red-200"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" aria-hidden="true" />
            <span className="leading-relaxed">{generalError}</span>
          </div>
        )}

        <form noValidate onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="login-email"
              className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#A09098]"
            >
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5C4E54]" aria-hidden="true" />
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="nombre@empresa.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                }}
                aria-invalid={Boolean(emailError)}
                aria-describedby={emailError ? 'login-email-error' : 'login-email-help'}
                className={`w-full rounded-lg border bg-[#131014] py-2.5 pl-9 pr-3.5 text-sm text-[#F8F0F5] placeholder-[#5C4E54] transition-colors focus:outline-none ${
                  emailError
                    ? 'border-red-500/80 bg-red-950/15 focus:border-red-500 focus:ring-1 focus:ring-red-500/40'
                    : 'border-[rgba(255,255,255,0.08)] focus:border-sakura focus:ring-1 focus:ring-sakura'
                }`}
              />
            </div>
            {emailError ? (
              <p
                id="login-email-error"
                role="alert"
                className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-400"
              >
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                <span>{emailError}</span>
              </p>
            ) : (
              <p id="login-email-help" className="mt-1 text-[11px] text-[#A09098]">
                Usa el correo asignado a tu perfil comercial.
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#A09098]"
            >
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5C4E54]" aria-hidden="true" />
              <input
                id="login-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError(null);
                }}
                aria-invalid={Boolean(passwordError)}
                aria-describedby={passwordError ? 'login-password-error' : 'login-password-help'}
                className={`w-full rounded-lg border bg-[#131014] py-2.5 pl-9 pr-11 text-sm text-[#F8F0F5] placeholder-[#5C4E54] transition-colors focus:outline-none ${
                  passwordError
                    ? 'border-red-500/80 bg-red-950/15 focus:border-red-500 focus:ring-1 focus:ring-red-500/40'
                    : 'border-[rgba(255,255,255,0.08)] focus:border-sakura focus:ring-1 focus:ring-sakura'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-pressed={showPassword}
                title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-[#A09098] transition-colors hover:bg-white/5 hover:text-sakura focus:outline-none focus:ring-1 focus:ring-sakura"
              >
                {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
            {passwordError ? (
              <p
                id="login-password-error"
                role="alert"
                className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-red-400"
              >
                <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
                <span>{passwordError}</span>
              </p>
            ) : (
              <p id="login-password-help" className="mt-1 text-[11px] text-[#A09098]">
                La contraseña se valida de forma segura.
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`flex w-full items-center justify-center space-x-2 rounded-xl px-4 py-3 text-sm font-bold text-white shadow-[0_0_20px_rgba(255,45,155,0.3)] transition-all ${
              isLoading
                ? 'cursor-not-allowed bg-gray-800 text-gray-500'
                : 'bg-sakura-700 hover:bg-sakura-600 active:scale-[0.98]'
            }`}
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
                <span>Verificando credenciales...</span>
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
