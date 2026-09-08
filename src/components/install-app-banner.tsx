import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { useInstallPrompt } from "@/hooks/use-install-prompt";

function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function InstallAppBanner() {
  const { canInstall, installed, promptInstall } = useInstallPrompt();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [dismissed, setDismissed] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [ready, setReady] = useState(false);
  const isIos = isIosDevice();
  const isAdminPage = pathname === "/admin";

  useEffect(() => {
    setDismissed(false);
    setShowIosHelp(false);
  }, [isAdminPage]);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 1200);
    return () => window.clearTimeout(timer);
  }, []);

  // No Android/Chrome, o evento nativo é usado quando existe. Se o navegador
  // ainda não o disponibilizou, mostramos o caminho manual em vez de deixar o
  // botão do perfil sem resposta.
  if (!ready || installed || dismissed) return null;

  async function handleInstall() {
    if (canInstall) {
      await promptInstall();
      return;
    }
    setShowIosHelp(true);
  }

  return (
    <aside className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-md rounded-2xl bg-navy-900 p-4 text-white shadow-2xl shadow-navy-900/30">
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Fechar aviso de instalação"
        className="absolute right-3 top-3 rounded-full p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>

      <div className="flex items-start gap-3 pr-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-green text-navy-900">
          <Download className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
        </span>
        <div>
          <p className="font-display text-sm font-semibold">
            {isAdminPage ? "Instale o painel Admin" : "Instale a Group Mobil"}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-white/70">
            {isAdminPage
              ? "Aceda rapidamente ao painel administrativo como uma aplicação."
              : canInstall
                ? "Aceda mais rápido à sua carteira com a experiência de aplicação."
                : "Adicione a Group Mobil ao ecrã principal para abrir como uma aplicação."}
          </p>
        </div>
      </div>

      {showIosHelp ? (
        <p className="mt-3 rounded-xl bg-white/10 px-3 py-2.5 text-xs leading-relaxed text-white/80">
          {isIos ? (
            <>
              No Safari do iPhone/iPad, toque em <strong className="text-white">Partilhar</strong>{" "}
              e depois em{" "}
              <strong className="text-white">Adicionar ao ecrã principal</strong>.
            </>
          ) : (
            <>
              No Chrome ou Edge, abra o menu do navegador (⋮) e escolha{" "}
              <strong className="text-white">Instalar aplicação</strong> ou{" "}
              <strong className="text-white">Adicionar ao ecrã principal</strong>. Se não aparecer,
              atualize a página e tente novamente.
            </>
          )}
        </p>
      ) : (
        <button
          type="button"
          onClick={handleInstall}
          className="mt-3 flex w-full items-center justify-center rounded-xl bg-brand-green py-2.5 text-xs font-bold text-navy-900 transition hover:bg-brand-green/90"
        >
          {canInstall ? "Instalar agora" : "Ver como instalar"}
        </button>
      )}
    </aside>
  );
}
