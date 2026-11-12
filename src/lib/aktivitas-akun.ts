import { createAdminClient } from "@/lib/supabase/admin";

/** Akun yang dibuat tetapi belum pernah dipakai masuk lebih dari batas ini dianggap belum diaktifkan pemiliknya. */
export const BATAS_BELUM_MASUK_HARI = 7;
/** Akun yang pernah masuk tetapi tidak masuk lagi lebih dari batas ini dianggap tidak aktif. */
export const BATAS_TIDAK_AKTIF_HARI = 60;

export type RingkasanAktivitas = {
  belumMasuk: Record<string, number>;
  tidakAktif: Record<string, number>;
};

const HARI_MS = 86_400_000;

/**
 * Menghitung akun yang perlu ditindaklanjuti berdasarkan waktu masuk terakhir (Supabase Auth),
 * dikelompokkan menurut peran. Hanya akun yang sudah diaktifkan admin (profiles.aktif) yang dihitung.
 */
export async function ringkasAktivitasAkun(peran: { id: string; role: string; aktif: boolean }[], sekarang = Date.now()): Promise<RingkasanAktivitas> {
  const hasil: RingkasanAktivitas = { belumMasuk: {}, tidakAktif: {} };
  const role = new Map(peran.filter((p) => p.aktif).map((p) => [p.id, p.role]));
  const admin = createAdminClient();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error || !data) break;
    for (const u of data.users) {
      const r = role.get(u.id);
      if (!r) continue;
      if (!u.last_sign_in_at) {
        const umur = (sekarang - new Date(u.created_at).getTime()) / HARI_MS;
        if (umur > BATAS_BELUM_MASUK_HARI) hasil.belumMasuk[r] = (hasil.belumMasuk[r] ?? 0) + 1;
      } else {
        const lalu = (sekarang - new Date(u.last_sign_in_at).getTime()) / HARI_MS;
        if (lalu > BATAS_TIDAK_AKTIF_HARI) hasil.tidakAktif[r] = (hasil.tidakAktif[r] ?? 0) + 1;
      }
    }
    if (data.users.length < 1000) break;
  }
  return hasil;
}
