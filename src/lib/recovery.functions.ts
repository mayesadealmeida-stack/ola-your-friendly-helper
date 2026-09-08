import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { normalizePhone, validatePhoneNumber } from "@/lib/phone";

const recoveryInputSchema = z.object({
  phone: z.string().min(1).max(32),
  firstName: z.string().trim().min(2).max(80),
});

function normalizeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLocaleLowerCase("pt-AO")
    .replace(/\s+/g, " ");
}

function firstName(value: string): string {
  return normalizeName(value).split(" ")[0] ?? "";
}

function createTemporaryPassword(): string {
  // O prefixo garante letras e o UUID fornece entropia sem guardar a senha.
  return `GM-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

export const recoverAccount = createServerFn({ method: "POST" })
  .validator((data: unknown) => recoveryInputSchema.parse(data))
  .handler(async ({ data }) => {
    const phoneError = validatePhoneNumber(data.phone);
    if (phoneError) {
      return { ok: false as const, error: phoneError };
    }

    const requestedFirstName = firstName(data.firstName);
    if (!requestedFirstName) {
      return { ok: false as const, error: "Digite o primeiro nome usado no registo." };
    }

    try {
      // A chave de serviço só é carregada no servidor e nunca chega ao
      // navegador. Ela é necessária para alterar a senha sem a senha antiga.
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: profiles, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("id, full_name, phone")
        .eq("phone", normalizePhone(data.phone))
        .limit(2);

      if (profileError || !profiles || profiles.length !== 1) {
        return {
          ok: false as const,
          error: "Não foi possível confirmar os dados. Verifique o telefone e o primeiro nome.",
        };
      }

      const profile = profiles[0];
      if (!profile) {
        return {
          ok: false as const,
          error: "Não foi possível confirmar os dados. Verifique o telefone e o primeiro nome.",
        };
      }

      if (firstName(profile.full_name) !== requestedFirstName) {
        return {
          ok: false as const,
          error: "Não foi possível confirmar os dados. Verifique o telefone e o primeiro nome.",
        };
      }

      const temporaryPassword = createTemporaryPassword();
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
        password: temporaryPassword,
      });

      if (updateError) {
        console.error("[recovery] password update failed", updateError);
        return {
          ok: false as const,
          error: "Não foi possível gerar uma nova palavra-passe agora. Tente novamente.",
        };
      }

      return { ok: true as const, password: temporaryPassword };
    } catch (error) {
      console.error("[recovery] unavailable", error);
      return {
        ok: false as const,
        error: "A recuperação está temporariamente indisponível. Tente novamente mais tarde.",
      };
    }
  });
