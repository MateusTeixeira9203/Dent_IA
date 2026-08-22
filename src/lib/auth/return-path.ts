/** Impede open redirect preservando caminhos internos e sua query string. */
export function safeReturnPath(value: string | null | undefined, fallback = '/dashboard'): string {
  if (
    !value
    || !value.startsWith('/')
    || value.startsWith('//')
    || value.includes('\\')
    || /^\/(?:%2f|%5c)/i.test(value)
    || /[\u0000-\u001f]|%0[ad]/i.test(value)
  ) {
    return fallback;
  }
  return value;
}

export function authCallbackUrl(origin: string, next: string): string {
  const callback = new URL('/auth/callback', origin);
  callback.searchParams.set('next', safeReturnPath(next));
  return callback.toString();
}
