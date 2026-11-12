"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { KELOLA_DATA } from "@/lib/roles";
import { FIELD_SITUS } from "@/lib/situs";

const enc = encodeURIComponent;
const BASE = "/dashboard/identitas";

export async function simpanIdentitas(formData: FormData) {
  await requireRole(KELOLA_DATA);
  const rows = FIELD_SITUS.flatMap((g) => g.fields).map((f) => ({
    kunci: f.kunci,
    nilai: String(formData.get(f.kunci) ?? "").trim().slice(0, f.maks),
    updated_at: new Date().toISOString(),
  }));

  const supabase = await createClient();
  const { error } = await supabase.from("pengaturan_situs").upsert(rows, { onConflict: "kunci" });
  if (error) {
    const pesan = /pengaturan_situs/i.test(error.message)
      ? "Tabel pengaturan belum dibuat. Jalankan supabase/patch-10-pengaturan-situs.sql di Supabase SQL Editor."
      : error.message;
    redirect(`${BASE}?error=${enc(pesan)}`);
  }
  revalidatePath("/");
  redirect(`${BASE}?info=${enc("Pengaturan disimpan. Beranda diperbarui dalam beberapa saat.")}`);
}
