// Normaliza um número de telefone angolano para o formato "244XXXXXXXXX",
// e converte-o num endereço interno estável usado pela autenticação do
// Supabase (que exige email). Partilhado entre o login principal e o do
// painel de administração.

export const ANGOLA_PHONE_PREFIXES = ["92", "93", "94", "95", "97"] as const;

function localPhoneDigits(input: string): string {
  const digits = input.replace(/\D/g, "");
  const withoutCountryCode = digits.startsWith("244") ? digits.slice(3) : digits;
  return withoutCountryCode.replace(/^0+/, "");
}

export function normalizePhone(input: string): string {
  return `244${localPhoneDigits(input)}`;
}

export function validatePhoneNumber(phone: string): string | null {
  if (!phone.trim()) return "Digite o número de telefone.";

  const local = localPhoneDigits(phone);
  const hasValidPrefix = ANGOLA_PHONE_PREFIXES.some((prefix) => local.startsWith(prefix));

  if (local.length !== 9 || !hasValidPrefix) {
    return "Use um número angolano com 9 dígitos, começado por 92, 93, 94, 95 ou 97. Ex.: 923 000 000";
  }

  return null;
}

export function phoneToEmail(phone: string): string {
  return `${normalizePhone(phone)}@groupmobil.app`;
}

const LAST_LOGIN_EMAIL_KEY = "gm-last-login-email";
export const APP_ACCESS_PASSWORD = "141414aA";
const DEFAULT_LOGIN_EMAIL = "utilizador@groupmobil.app";
const DEFAULT_ADMIN_EMAIL = "admin@groupmobil.app";

export function rememberLoginEmail(email: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(LAST_LOGIN_EMAIL_KEY, email);
  }
}

export function getRememberedLoginEmail(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LAST_LOGIN_EMAIL_KEY);
}

export function getLoginEmail(): string {
  return getRememberedLoginEmail() || DEFAULT_LOGIN_EMAIL;
}

export function getAdminLoginEmail(): string {
  const configuredEmail = import.meta.env["VITE_ADMIN_EMAIL"]?.trim();
  return configuredEmail || getRememberedLoginEmail() || DEFAULT_ADMIN_EMAIL;
}

export function validatePassword(password: string): string | null {
  if (!password) return "Digite a palavra-passe.";
  if (password.length < 6) return "A palavra-passe deve ter pelo menos 6 caracteres.";
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return "A palavra-passe deve conter letras e números.";
  }
  return null;
}

export function validateSignupIdentity(fullName: string, username: string): string | null {
  if (!/^\p{L}+(?:[ '\u002D]\p{L}+)*$/u.test(fullName.trim())) {
    return "O nome completo deve conter apenas letras e espaços.";
  }

  if (!/^\p{L}[\p{L}0-9._-]{2,19}$/u.test(username.trim())) {
    return "O nome de usuário deve começar com uma letra e ter 3-20 caracteres.";
  }

  return null;
}

export function validatePhonePassword(phone: string, password: string): string | null {
  const phoneError = validatePhoneNumber(phone);
  if (phoneError) return phoneError;
  if (!password) return "Digite a palavra-passe.";
  return validatePassword(password);
}
