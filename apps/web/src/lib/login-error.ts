interface LoginErrorLike {
  status?: unknown;
  statusCode?: unknown;
  message?: unknown;
}

export function getLoginErrorMessage(error: unknown): string {
  const candidate = error && typeof error === 'object' ? (error as LoginErrorLike) : {};
  const status =
    typeof candidate.statusCode === 'number'
      ? candidate.statusCode
      : typeof candidate.status === 'number'
        ? candidate.status
        : undefined;
  const message = typeof candidate.message === 'string' ? candidate.message.toLowerCase() : '';

  if (status === 403) {
    return 'Tu perfil comercial se encuentra desactivado. Comunícate con la administración.';
  }
  if (status === 401 || message.includes('invalid login credentials')) {
    return 'Credenciales incorrectas. Verifica que tu correo y contraseña sean los correctos.';
  }
  if (status === 0 || message.includes('no se pudo conectar con la api')) {
    return 'No se pudo conectar con el servicio. Inténtalo de nuevo más tarde.';
  }
  return 'No se pudo iniciar sesión. Inténtalo de nuevo.';
}
