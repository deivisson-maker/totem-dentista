import { createServerFn } from "@tanstack/react-start";
import { createHash, timingSafeEqual } from "node:crypto";
import type { Prize } from "./prizes";

function passwordMatches(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

function checkPassword(input: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) throw new Error("ADMIN_PASSWORD não configurado no servidor.");
  return passwordMatches(input, expected);
}

export const verifyAdminPassword = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string }) => data)
  .handler(async ({ data }) => ({ ok: checkPassword(data.password) }));

export const savePrizesToDb = createServerFn({ method: "POST" })
  .inputValidator((data: { password: string; prizes: Prize[]; minNoteValue?: number; spinMode?: "por_nota" | "por_valor" }) => data)
  .handler(async ({ data }) => {
    if (!checkPassword(data.password)) {
      return { ok: false as const, error: "Senha incorreta." };
    }
    if (!Array.isArray(data.prizes)) {
      return { ok: false as const, error: "Payload inválido." };
    }
    const minNoteValue = typeof data.minNoteValue === "number" && data.minNoteValue >= 0 ? data.minNoteValue : 400;
    const spinMode = data.spinMode === "por_valor" ? "por_valor" : "por_nota";
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("prize_config")
      .upsert({ id: 1, prizes: data.prizes as unknown as never, min_note_value: minNoteValue, spin_mode: spinMode, updated_at: new Date().toISOString() });
    if (error) {
      console.error("savePrizesToDb error", error);
      return { ok: false as const, error: error.message };
    }
    return { ok: true as const };
  });

