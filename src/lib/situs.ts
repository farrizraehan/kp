import type { SupabaseClient } from "@supabase/supabase-js";

export type KunciSitus =
  | "nama_madrasah"
  | "nama_yayasan"
  | "kepala_madrasah"
  | "alamat"
  | "telepon"
  | "email"
  | "akreditasi"
  | "nomor_sk"
  | "judul_hero"
  | "deskripsi_hero";

export type Situs = Record<KunciSitus, string>;

export const SITUS_BAWAAN: Situs = {
  nama_madrasah: "MA Al-Riyadhul Janah",
  nama_yayasan: "Yayasan Pendidikan Islam Al-Riyadhul Janah",
  kepala_madrasah: "",
  alamat: "Jl. Johar Atmaja, Kp. Kaburon, Desa Maja, Kec. Maja, Kab. Lebak, Banten",
  telepon: "",
  email: "",
  akreditasi: "B",
  nomor_sk: "BAN-SM No. 1346/BAN-SM/SK/2021",
  judul_hero: "Satu portal untuk siswa, guru, dan alumni.",
  deskripsi_hero:
    "Portal resmi Madrasah Aliyah Al-Riyadhul Janah untuk mengelola akademik, membimbing karier siswa, dan menjaga hubungan dengan alumni.",
};

export type FieldSitus = { kunci: KunciSitus; label: string; hint?: string; panjang?: boolean; maks: number };

export const FIELD_SITUS: { judul: string; fields: FieldSitus[] }[] = [
  {
    judul: "Identitas madrasah",
    fields: [
      { kunci: "nama_madrasah", label: "Nama madrasah", maks: 80 },
      { kunci: "nama_yayasan", label: "Nama yayasan", maks: 120 },
      { kunci: "kepala_madrasah", label: "Nama kepala madrasah", hint: "Tampil di profil dan sebagai penanda tangan sambutan. Ganti di sini bila kepala madrasah berganti.", maks: 120 },
      { kunci: "akreditasi", label: "Peringkat akreditasi", hint: "Mis. A atau B. Kosongkan untuk menyembunyikan.", maks: 10 },
      { kunci: "nomor_sk", label: "Nomor SK akreditasi", maks: 120 },
    ],
  },
  {
    judul: "Kontak dan lokasi",
    fields: [
      { kunci: "alamat", label: "Alamat", panjang: true, maks: 300 },
      { kunci: "telepon", label: "Telepon atau WhatsApp", maks: 40 },
      { kunci: "email", label: "Email", maks: 120 },
    ],
  },
  {
    judul: "Teks sambutan di beranda",
    fields: [
      { kunci: "judul_hero", label: "Judul utama", maks: 120 },
      { kunci: "deskripsi_hero", label: "Deskripsi singkat", panjang: true, maks: 400 },
    ],
  },
];

const WAJIB: KunciSitus[] = ["nama_madrasah", "nama_yayasan", "alamat", "judul_hero", "deskripsi_hero"];

/** Membaca pengaturan; bila tabel belum ada atau gagal dibaca, nilai bawaan dipakai agar beranda tetap tampil. */
export async function ambilSitus(supabase: SupabaseClient): Promise<Situs> {
  const hasil: Situs = { ...SITUS_BAWAAN };
  try {
    const { data, error } = await supabase.from("pengaturan_situs").select("kunci, nilai");
    if (error || !data) return hasil;
    for (const r of data as { kunci: string; nilai: string }[]) {
      if (!(r.kunci in hasil)) continue;
      // kolom wajib yang dikosongkan kembali ke bawaan; kolom opsional (mis. akreditasi) boleh kosong untuk disembunyikan
      if (r.nilai.trim() === "" && WAJIB.includes(r.kunci as KunciSitus)) continue;
      hasil[r.kunci as KunciSitus] = r.nilai;
    }
  } catch {
    // abaikan: pakai bawaan
  }
  return hasil;
}
