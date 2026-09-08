// Normaliza um número de telefone angolano para o formato "244XXXXXXXXX",
// e converte-o num endereço interno estável usado pela autenticação do
// Supabase (que exige email). Partilhado entre o login principal e o do
// painel de administração.

export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, "");
  const local = digits.startsWith("244") ? digits.slice(3) : digits.replace(/^0+/, "");
  return `244${local}`;
}

export function phoneToEmail(phone: string): string {
  return `${normalizePhone(phone)}@groupmobil.app`;
}

export function validatePhonePassword(phone: string, password: string): string | null {
  const digits = normalizePhone(phone);
  if (digits.length < 11) return "Número de telefone inválido. Ex.: 900 000 000";
  if (!/^[A-Za-z0-9]+$/.test(password)) return "A senha deve conter apenas letras e números.";
  if (password.length < 6) return "A senha deve ter pelo menos 6 caracteres.";
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password))
    return "A senha deve conter letras e números.";
  return null;
}
