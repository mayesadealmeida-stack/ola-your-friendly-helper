import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(2000),
});

const inputSchema = z.object({
  messages: z.array(messageSchema).min(1).max(20),
});

const SYSTEM_PROMPT = `Você é o Assistente Group Mobil, o apoio oficial da aplicação Group Mobil (fintech de grupos de poupança em Angola, valores em Kwanza/Kz).

Regras:
- Responda SEMPRE em português de Angola, num tom profissional e cordial, sem gíria. Curto e claro (máximo 6 linhas).
- Ajude o utilizador a usar a aplicação: criar conta, entrar, ver saldo, depositar, levantar, transferir, histórico, grupos, notificações, perfil e segurança.
- Explique passo a passo e numerado quando for um procedimento.
- Nunca peça nem aceite PIN, senha ou códigos de verificação. Se o utilizador partilhar, avise para trocar imediatamente.
- Se a pergunta não tiver relação com a Group Mobil ou com dinheiro/conta, diga com educação que só ajuda com assuntos da aplicação.
- Nunca invente saldos, valores ou dados pessoais do utilizador; peça para conferir no ecrã Carteira.`;

export const askAssistant = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) {
      return { ok: false as const, error: "Assistente indisponível de momento." };
    }

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "system", content: SYSTEM_PROMPT }, ...data.messages],
        }),
      });

      if (res.status === 429) {
        return { ok: false as const, error: "Muitos pedidos agora. Tente daqui a pouco." };
      }
      if (res.status === 402) {
        return { ok: false as const, error: "Créditos de IA esgotados. Tente mais tarde." };
      }
      if (!res.ok) {
        return { ok: false as const, error: "Não consegui responder agora. Tente novamente." };
      }

      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const reply = json.choices?.[0]?.message?.content?.trim();
      if (!reply) {
        return { ok: false as const, error: "Não consegui responder agora. Tente novamente." };
      }
      return { ok: true as const, reply };
    } catch {
      return { ok: false as const, error: "Falha de ligação. Verifique a internet." };
    }
  });
