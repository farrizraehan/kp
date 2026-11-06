export type Role = "admin" | "kepala" | "operator" | "guru" | "bk" | "siswa" | "alumni" | "ortu" | "mitra";

export const ROLES: Role[] = ["admin", "kepala", "operator", "guru", "bk", "siswa", "alumni", "ortu", "mitra"];

export const roleHome: Record<Role, string> = {
  admin: "/dashboard/admin",
  kepala: "/dashboard/kepala",
  operator: "/dashboard/operator",
  guru: "/dashboard/guru",
  bk: "/dashboard/bk",
  siswa: "/dashboard/siswa",
  alumni: "/dashboard/alumni",
  ortu: "/dashboard/ortu",
  mitra: "/dashboard/mitra",
};

export const roleLabel: Record<Role, string> = {
  admin: "Admin",
  kepala: "Kepala Madrasah",
  operator: "Operator TU",
  guru: "Guru",
  bk: "Guru BK",
  siswa: "Siswa",
  alumni: "Alumni",
  ortu: "Orang tua/wali",
  mitra: "Mitra eksternal",
};

export const isRole = (v: unknown): v is Role => ROLES.includes(v as Role);

/** Semua pegawai madrasah yang boleh melihat data siswa (kepala madrasah hanya melihat, tidak mengubah). */
export const STAF: Role[] = ["admin", "kepala", "operator", "guru", "bk"];
/** Yang mengisi presensi dan nilai (guru BK juga mengajar dan bisa menjadi wali kelas). */
export const PENGAJAR: Role[] = ["admin", "guru", "bk"];
/** Yang boleh melihat rekap presensi dan rapor. */
export const LIHAT_AKADEMIK: Role[] = ["admin", "kepala", "operator", "guru", "bk"];
/** Yang mengelola data induk: siswa, guru, kelas, jadwal, mapel, tahun ajaran, alumni, dan konten website. */
export const KELOLA_DATA: Role[] = ["admin", "operator"];
/** Yang mengelola pembayaran: tagihan, pencatatan bayar, kuitansi. */
export const KEUANGAN: Role[] = ["admin", "operator"];
/** Yang boleh melihat laporan pembayaran (kepala madrasah hanya melihat). */
export const LIHAT_KEUANGAN: Role[] = ["admin", "operator", "kepala"];
/** Yang mengelola Bimbingan dan Konseling (BK): konseling, asesmen minat, dan info karier. */
export const PENGELOLA_BK: Role[] = ["admin", "bk"];
/** Yang boleh memasang info karier (kampus, beasiswa, lowongan): pengelola BK dan mitra eksternal. */
export const PASANG_INFO_KARIER: Role[] = ["admin", "bk", "mitra"];

export const HARI = ["", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

// Bobot nilai akhir: asumsi awal, konfirmasi ke madrasah.
export const BOBOT = { tugas: 0.3, uts: 0.3, uas: 0.4 };

export function nilaiAkhir(n: {
  tugas: number | null;
  uts: number | null;
  uas: number | null;
}) {
  if (n.tugas == null || n.uts == null || n.uas == null) return null;
  return n.tugas * BOBOT.tugas + n.uts * BOBOT.uts + n.uas * BOBOT.uas;
}
