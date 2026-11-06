"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { KEUANGAN } from "@/lib/roles";
import { hitungTagihan } from "@/lib/pembayaran";
import { hariIni, tanggalValid } from "@/lib/waktu";

const enc = encodeURIComponent;
const str = (v: FormDataEntryValue | null) => (v === null ? "" : String(v).trim());
const BASE = "/dashboard/pembayaran";

/** Membuat tagihan untuk siswa aktif sesuai jenis biaya, lengkap dengan potongan keringanan/beasiswa. */
export async function buatTagihan(formData: FormData) {
  await requireRole(KEUANGAN);
  const biayaId = Number(str(formData.get("biaya")));
  const periode = str(formData.get("periode"));
  const tempo = str(formData.get("jatuh_tempo"));
  const kelasId = Number(str(formData.get("kelas"))) || null;
  const back = `${BASE}/buat`;
  if (!biayaId || !periode) redirect(`${back}?error=${enc("Pilih jenis biaya dan isi periode (mis. 2026-11 atau Semester 1 2026/2027).")}`);
  if (tempo && !tanggalValid(tempo)) redirect(`${back}?error=${enc("Tanggal jatuh tempo tidak valid.")}`);

  const supabase = await createClient();
  const { data: biaya } = await supabase.from("biaya").select("id, nama, nominal, tingkat, aktif").eq("id", biayaId).maybeSingle();
  if (!biaya) redirect(`${back}?error=${enc("Jenis biaya tidak ditemukan.")}`);
  if (!biaya.aktif) redirect(`${back}?error=${enc("Jenis biaya ini tidak aktif.")}`);

  let sq = supabase.from("siswa").select("id, kelas!inner(tingkat)").eq("status", "aktif").limit(5000);
  if (biaya.tingkat) sq = sq.eq("kelas.tingkat", biaya.tingkat);
  if (kelasId) sq = sq.eq("kelas_id", kelasId);
  const { data: siswa } = await sq;
  const ids = (siswa ?? []).map((s) => s.id as number);
  if (ids.length === 0) redirect(`${back}?error=${enc("Tidak ada siswa aktif yang sesuai.")}`);

  const { data: ringan } = await supabase.from("keringanan").select("siswa_id, biaya_id, jenis, nilai").in("siswa_id", ids);
  const nominal = Number(biaya.nominal);
  const potongan = new Map<number, number>();
  for (const r of ringan ?? []) {
    if (r.biaya_id !== null && r.biaya_id !== biaya.id) continue;
    const nilai = Number(r.nilai);
    const p = r.jenis === "persen" ? (nominal * nilai) / 100 : nilai;
    potongan.set(r.siswa_id, (potongan.get(r.siswa_id) ?? 0) + p);
  }

  const rows = ids.map((id) => ({
    siswa_id: id,
    biaya_id: biaya.id,
    periode,
    jatuh_tempo: tempo || null,
    nominal,
    potongan: Math.min(nominal, Math.round(potongan.get(id) ?? 0)),
  }));
  const { data: baru, error } = await supabase
    .from("tagihan")
    .upsert(rows, { onConflict: "siswa_id,biaya_id,periode", ignoreDuplicates: true })
    .select("id");
  if (error) redirect(`${back}?error=${enc(error.message)}`);
  const dibuat = baru?.length ?? 0;
  revalidatePath(BASE);
  redirect(`${back}?info=${enc(`${dibuat} tagihan ${biaya.nama} ${periode} dibuat. ${ids.length - dibuat} siswa sudah punya tagihan yang sama, jadi dilewati.`)}`);
}

export async function catatPembayaran(formData: FormData) {
  await requireRole(KEUANGAN);
  const id = Number(str(formData.get("tagihan")));
  const jumlah = Math.round(Number(str(formData.get("jumlah"))));
  const metode = str(formData.get("metode")) === "transfer" ? "transfer" : "tunai";
  const tanggal = str(formData.get("tanggal")) || hariIni();
  const referensi = str(formData.get("referensi")) || null;
  const back = `${BASE}/tagihan/${id}`;
  if (!id) redirect(BASE);
  if (!(jumlah > 0)) redirect(`${back}?error=${enc("Jumlah pembayaran harus lebih dari nol.")}`);
  if (!tanggalValid(tanggal)) redirect(`${back}?error=${enc("Tanggal tidak valid.")}`);

  const supabase = await createClient();
  const { data: t } = await supabase.from("tagihan").select("nominal, potongan, batal, pembayaran(jumlah, status)").eq("id", id).maybeSingle();
  if (!t) redirect(`${BASE}?error=${enc("Tagihan tidak ditemukan.")}`);
  const h = hitungTagihan(t as never);
  if (h.status === "batal") redirect(`${back}?error=${enc("Tagihan ini sudah dibatalkan.")}`);
  if (jumlah > h.sisa) redirect(`${back}?error=${enc(`Jumlah melebihi sisa tagihan (Rp ${h.sisa.toLocaleString("id-ID")}).`)}`);

  const { data: baru, error } = await supabase
    .from("pembayaran")
    .insert({ tagihan_id: id, jumlah, metode, tanggal, referensi })
    .select("id")
    .single();
  if (error || !baru) redirect(`${back}?error=${enc(error?.message ?? "Gagal menyimpan pembayaran.")}`);
  revalidatePath(BASE);
  redirect(`${back}?ok=bayar&kuitansi=${baru.id}`);
}

export async function batalkanPembayaran(formData: FormData) {
  await requireRole(KEUANGAN);
  const id = Number(str(formData.get("pembayaran")));
  const tagihan = Number(str(formData.get("tagihan")));
  const back = `${BASE}/tagihan/${tagihan}`;
  const supabase = await createClient();
  const { error } = await supabase.from("pembayaran").update({ status: "dibatalkan" }).eq("id", id);
  if (error) redirect(`${back}?error=${enc(error.message)}`);
  revalidatePath(BASE);
  redirect(`${back}?ok=batalbayar`);
}

export async function ubahPotongan(formData: FormData) {
  await requireRole(KEUANGAN);
  const id = Number(str(formData.get("tagihan")));
  const potongan = Math.round(Number(str(formData.get("potongan")) || "0"));
  const keterangan = str(formData.get("keterangan")) || null;
  const back = `${BASE}/tagihan/${id}`;
  const supabase = await createClient();
  const { data: t } = await supabase.from("tagihan").select("nominal").eq("id", id).maybeSingle();
  if (!t) redirect(BASE);
  if (!(potongan >= 0) || potongan > Number(t.nominal)) redirect(`${back}?error=${enc("Potongan harus antara nol dan nominal tagihan.")}`);
  const { error } = await supabase.from("tagihan").update({ potongan, keterangan }).eq("id", id);
  if (error) redirect(`${back}?error=${enc(error.message)}`);
  revalidatePath(BASE);
  redirect(`${back}?ok=potongan`);
}

export async function batalkanTagihan(formData: FormData) {
  await requireRole(KEUANGAN);
  const id = Number(str(formData.get("tagihan")));
  const batal = str(formData.get("batal")) === "1";
  const back = `${BASE}/tagihan/${id}`;
  const supabase = await createClient();
  const { error } = await supabase.from("tagihan").update({ batal }).eq("id", id);
  if (error) redirect(`${back}?error=${enc(error.message)}`);
  revalidatePath(BASE);
  redirect(`${back}?ok=${batal ? "batal" : "aktif"}`);
}
