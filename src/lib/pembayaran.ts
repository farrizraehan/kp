export const rupiah = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

export type StatusTagihan = "belum" | "sebagian" | "lunas" | "batal";

export const labelStatus: Record<StatusTagihan, string> = {
  belum: "Belum bayar",
  sebagian: "Sebagian",
  lunas: "Lunas",
  batal: "Dibatalkan",
};

type Bayar = { jumlah: number | string; status: string };

/** Jumlah yang sudah dibayar: hanya pembayaran yang tidak dibatalkan. */
export const totalDibayar = (pembayaran: Bayar[] | null | undefined) =>
  (pembayaran ?? []).filter((p) => p.status === "terverifikasi").reduce((a, p) => a + Number(p.jumlah), 0);

export function hitungTagihan(t: { nominal: number | string; potongan: number | string; batal: boolean; pembayaran?: Bayar[] | null }) {
  const total = Math.max(0, Number(t.nominal) - Number(t.potongan));
  const dibayar = totalDibayar(t.pembayaran);
  const sisa = Math.max(0, total - dibayar);
  const status: StatusTagihan = t.batal ? "batal" : sisa === 0 ? "lunas" : dibayar > 0 ? "sebagian" : "belum";
  return { total, dibayar, sisa, status };
}

const SATUAN = ["", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh", "sebelas"];

function bilang(n: number): string {
  if (n < 12) return SATUAN[n];
  if (n < 20) return `${bilang(n - 10)} belas`;
  if (n < 100) return `${bilang(Math.floor(n / 10))} puluh${n % 10 ? ` ${bilang(n % 10)}` : ""}`;
  if (n < 200) return `seratus${n % 100 ? ` ${bilang(n % 100)}` : ""}`;
  if (n < 1000) return `${bilang(Math.floor(n / 100))} ratus${n % 100 ? ` ${bilang(n % 100)}` : ""}`;
  if (n < 2000) return `seribu${n % 1000 ? ` ${bilang(n % 1000)}` : ""}`;
  if (n < 1_000_000) return `${bilang(Math.floor(n / 1000))} ribu${n % 1000 ? ` ${bilang(n % 1000)}` : ""}`;
  if (n < 1_000_000_000) return `${bilang(Math.floor(n / 1_000_000))} juta${n % 1_000_000 ? ` ${bilang(n % 1_000_000)}` : ""}`;
  return `${bilang(Math.floor(n / 1_000_000_000))} miliar${n % 1_000_000_000 ? ` ${bilang(n % 1_000_000_000)}` : ""}`;
}

/** 1.250.000 → "Satu juta dua ratus lima puluh ribu rupiah" */
export function terbilang(n: number): string {
  const v = Math.round(n);
  const teks = v === 0 ? "nol" : bilang(v);
  return `${teks[0].toUpperCase()}${teks.slice(1)} rupiah`;
}

/** Nomor HP Indonesia → format wa.me (62...). Kosong bila tidak valid. */
export function nomorWa(hp: string | null | undefined): string {
  const d = (hp ?? "").replace(/\D/g, "");
  if (d.length < 9) return "";
  if (d.startsWith("62")) return d;
  if (d.startsWith("0")) return `62${d.slice(1)}`;
  if (d.startsWith("8")) return `62${d}`;
  return "";
}

export function tautanWa(hp: string | null | undefined, pesan: string): string | null {
  const no = nomorWa(hp);
  return no ? `https://wa.me/${no}?text=${encodeURIComponent(pesan)}` : null;
}
