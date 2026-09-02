const REMEMBER_ME_KEY = "gm-remember-me";

/**
 * Preferência "Lembrar de mim", guardada fora do storage de sessão (não é
 * sensível) para que a próxima escrita de token saiba onde guardar.
 * Por omissão é `true` para não desconectar quem já usava a app antes desta
 * opção existir.
 */
export function getRememberMe(): boolean {
  if (typeof window === "undefined") return true;
  const value = localStorage.getItem(REMEMBER_ME_KEY);
  return value === null ? true : value === "true";
}

export function setRememberMe(value: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(REMEMBER_ME_KEY, value ? "true" : "false");
}

/**
 * Storage para o cliente do Supabase Auth:
 * - "Lembrar de mim" ligado -> sessão em localStorage, sobrevive a fechar o
 *   browser/app (é o que a maioria espera de "lembrar de mim").
 * - Desligado -> sessão em sessionStorage, desaparece ao fechar a aba/app,
 *   obrigando a novo login da próxima vez.
 * getItem procura em ambos porque a escolha pode ter mudado entre logins.
 */
export function rememberAwareStorage() {
  return {
    getItem(key: string) {
      return sessionStorage.getItem(key) ?? localStorage.getItem(key);
    },
    setItem(key: string, value: string) {
      if (getRememberMe()) {
        localStorage.setItem(key, value);
        sessionStorage.removeItem(key);
      } else {
        sessionStorage.setItem(key, value);
        localStorage.removeItem(key);
      }
    },
    removeItem(key: string) {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    },
  };
}
