import { useCallback, useSyncExternalStore } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// Estado module-level (fora do React): o evento "beforeinstallprompt" pode
// disparar em QUALQUER página assim que o site carrega — não só quando o
// utilizador abre o Perfil. Se ficássemos à espera de montar o componente do
// Perfil para começar a ouvir, o evento já teria disparado e perdido. Por
// isso registamos o listener já ao nível do módulo (ver o import em
// __root.tsx), garantindo que é capturado logo na primeira página visitada.
let deferredEvent: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

if (typeof window !== "undefined") {
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  if (standalone) installed = true;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredEvent = e as BeforeInstallPromptEvent;
    notify();
  });

  window.addEventListener("appinstalled", () => {
    installed = true;
    deferredEvent = null;
    notify();
  });
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/**
 * Expõe o evento "beforeinstallprompt" (Android/Chrome/Edge) de forma
 * reutilizável. No iOS/Safari este evento não existe — nesse caso
 * `canInstall` fica false e a UI deve mostrar as instruções manuais.
 */
export function useInstallPrompt() {
  const canInstall = useSyncExternalStore(
    subscribe,
    () => deferredEvent !== null,
    () => false,
  );
  const isInstalled = useSyncExternalStore(
    subscribe,
    () => installed,
    () => false,
  );

  const promptInstall = useCallback(async () => {
    if (!deferredEvent) return null;
    const event = deferredEvent;

    try {
      await event.prompt();
      const choice = await event.userChoice;
      return choice.outcome;
    } finally {
      // O mesmo evento não pode ser reutilizado depois de abrir o diálogo.
      deferredEvent = null;
      notify();
    }
  }, []);

  return {
    canInstall,
    installed: isInstalled,
    promptInstall,
  };
}
