import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { askAssistant } from "@/lib/assistant.functions";
import logo from "/logo-group-mobil.webp";

export const Route = createFileRoute("/assistente")({
  head: () => ({
    meta: [
      { title: "Assistente Group Mobil — Ajuda na app" },
      {
        name: "description",
        content:
          "Fale com o Assistente Group Mobil e tire dúvidas sobre saldo, depósitos, levantamentos, grupos e segurança da sua conta.",
      },
      { property: "og:title", content: "Assistente Group Mobil — Ajuda na app" },
      {
        property: "og:description",
        content: "Apoio rápido em português para usar a aplicação Group Mobil.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AssistantPage,
});

type ChatMessage = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Como faço um depósito?",
  "Como criar um grupo de poupança?",
  "Como proteger a minha conta?",
  "Onde vejo o meu histórico?",
];

const WELCOME: ChatMessage = {
  role: "assistant",
  content:
    "Olá! Sou o Assistente Group Mobil. Posso ajudar com saldo, depósitos, levantamentos, transferências, grupos e segurança. O que precisa hoje?",
};

function AssistantPage() {
  const ask = useServerFn(askAssistant);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;

    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const history = next.slice(-12).map((m) => ({ role: m.role, content: m.content }));
      const result = await ask({ data: { messages: history } });
      if (result.ok) {
        setMessages((prev) => [...prev, { role: "assistant", content: result.reply }]);
      } else {
        setError(result.error);
      }
    } catch {
      setError("Não consegui responder agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-secondary/40">
      <header
        className="px-5 pb-6 pt-6"
        style={{
          background:
            "radial-gradient(120% 140% at 82% 0%, oklch(0.3 0.09 261.5) 0%, oklch(0.208 0.078 262.1) 60%)",
        }}
      >
        <div className="mx-auto flex max-w-md items-center gap-3">
          <Link
            to="/home"
            aria-label="Voltar"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/15"
          >
            <span aria-hidden="true">←</span>
          </Link>
          <img
            src={logo}
            alt="Logótipo Group Mobil"
            className="h-10 w-10 rounded-full bg-white object-contain p-1"
            width={40}
            height={40}
          />
          <div>
            <h1 className="font-display text-base font-semibold text-white">
              Assistente Group Mobil
            </h1>
            <p className="text-xs text-white/55">
              {loading ? "A escrever…" : "Online • responde em segundos"}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 space-y-3 px-5 py-5">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-brand-green text-primary-foreground"
                  : "border border-border bg-card text-card-foreground"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex gap-1 rounded-2xl border border-border bg-card px-4 py-3">
              <Dot delay="0ms" />
              <Dot delay="150ms" />
              <Dot delay="300ms" />
            </div>
          </div>
        )}

        {error && (
          <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
        )}

        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => void send(s)}
                className="rounded-full border border-border bg-card px-3 py-2 text-xs font-medium text-card-foreground transition hover:bg-accent"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </main>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="sticky bottom-0 border-t border-border bg-card/95 backdrop-blur"
      >
        <div className="mx-auto flex max-w-md items-center gap-2 px-4 py-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={2000}
            placeholder="Escreva a sua pergunta…"
            aria-label="Mensagem para o assistente"
            className="flex-1 rounded-full border border-border bg-background px-4 py-3 text-sm text-foreground outline-none focus:border-brand-green"
          />
          <button
            type="submit"
            disabled={loading || input.trim().length === 0}
            aria-label="Enviar mensagem"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-green text-primary-foreground transition hover:bg-brand-green-dark disabled:opacity-40"
          >
            <span aria-hidden="true">➤</span>
          </button>
        </div>
      </form>
    </div>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60"
      style={{ animationDelay: delay }}
    />
  );
}
