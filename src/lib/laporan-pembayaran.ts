import type { SupabaseClient } from "@supabase/supabase-js";
import { hitungTagihan } from "@/lib/pembayaran";

export type Penerimaan = {
  id: number;
  nomor: string;
  tanggal: string;
  jumlah: number;
  metode: string;
  referensi: string | null;
  siswa: string;
  kelas: string;
  biaya: string;
  periode: string;
};

export async function ambilPenerimaan(supabase: SupabaseClient, dari: string, sampai: string): Promise<Penerimaan[]> {
  const { data } = await supabase
    .from("pembayaran")
    .select("id, nomor, tanggal, jumlah, metode, referensi, tagihan(periode, siswa(nama, kelas(nama)), biaya(nama))")
    .eq("status", "terverifikasi")
    .gte("tanggal", dari)
    .lte("tanggal", sampai)
    .order("tanggal")
    .order("id")
    .limit(10000);
  type Row = {
    id: number;
    nomor: string;
    tanggal: string;
    jumlah: number;
    metode: string;
    referensi: string | null;
    tagihan: { periode: string; siswa: { nama: string; kelas: { nama: string } | null } | null; biaya: { nama: string } | null } | null;
  };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    nomor: r.nomor,
    tanggal: r.tanggal,
    jumlah: Number(r.jumlah),
    metode: r.metode,
    referensi: r.referensi,
    siswa: r.tagihan?.siswa?.nama ?? "-",
    kelas: r.tagihan?.siswa?.kelas?.nama ?? "-",
    biaya: r.tagihan?.biaya?.nama ?? "-",
    periode: r.tagihan?.periode ?? "-",
  }));
}

export type Tunggakan = {
  tagihanId: number;
  siswaId: number;
  siswa: string;
  kelas: string;
  noHp: string | null;
  biaya: string;
  periode: string;
  jatuhTempo: string | null;
  sisa: number;
  terlambat: boolean;
};

export async function ambilTunggakan(supabase: SupabaseClient, hariIni: string): Promise<Tunggakan[]> {
  const { data } = await supabase
    .from("tagihan")
    .select("id, periode, jatuh_tempo, nominal, potongan, batal, siswa(id, nama, no_hp, kelas(nama)), biaya(nama), pembayaran(jumlah, status)")
    .eq("batal", false)
    .limit(10000);
  type Row = {
    id: number;
    periode: string;
    jatuh_tempo: string | null;
    nominal: number;
    potongan: number;
    batal: boolean;
    siswa: { id: number; nama: string; no_hp: string | null; kelas: { nama: string } | null } | null;
    biaya: { nama: string } | null;
    pembayaran: { jumlah: number; status: string }[] | null;
  };
  return ((data ?? []) as unknown as Row[])
    .map((r) => ({ r, h: hitungTagihan(r) }))
    .filter(({ h }) => h.sisa > 0)
    .map(({ r, h }) => ({
      tagihanId: r.id,
      siswaId: r.siswa?.id ?? 0,
      siswa: r.siswa?.nama ?? "-",
      kelas: r.siswa?.kelas?.nama ?? "-",
      noHp: r.siswa?.no_hp ?? null,
      biaya: r.biaya?.nama ?? "-",
      periode: r.periode,
      jatuhTempo: r.jatuh_tempo,
      sisa: h.sisa,
      terlambat: !!r.jatuh_tempo && r.jatuh_tempo < hariIni,
    }))
    .sort((a, b) => a.siswa.localeCompare(b.siswa) || a.periode.localeCompare(b.periode));
}
