import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { nilaiAkhir } from "@/lib/roles";
import { PageHead } from "@/components/ui";
import { tipeInfo, type Tipe } from "@/lib/riasec";

export const metadata = { title: "Anak saya" };

type Anak = { id: number; nama: string; kelas: { nama: string } | null };
type N = { id: number; tugas: number | null; uts: number | null; uas: number | null; mapel: { nama: string } | null };

export default async function OrtuHome() {
  const p = await requireRole(["ortu"]);
  const supabase = await createClient();

  const { data: wali } = await supabase.from("wali").select("id").eq("profile_id", p.id).maybeSingle();
  const { data: tautan } = wali ? await supabase.from("wali_siswa").select("siswa(id, nama, kelas(nama))").eq("wali_id", wali.id) : { data: [] };
  const anak = ((tautan ?? []) as unknown as { siswa: Anak | null }[]).map((t) => t.siswa).filter((s): s is Anak => !!s);

  const rincian = await Promise.all(
    anak.map(async (a) => {
      const [{ data: pr }, { data: nilai }, { data: asesmen }] = await Promise.all([
        supabase.from("presensi").select("status").eq("siswa_id", a.id).limit(5000),
        supabase.from("nilai").select("id, tugas, uts, uas, mapel(nama)").eq("siswa_id", a.id),
        supabase.from("asesmen_hasil").select("kategori_dominan").eq("siswa_id", a.id).order("created_at", { ascending: false }).limit(1),
      ]);
      const hitung = { hadir: 0, izin: 0, sakit: 0, alpa: 0 };
      (pr ?? []).forEach((r) => {
        hitung[r.status as keyof typeof hitung] += 1;
      });
      return { a, hitung, nilai: (nilai ?? []) as unknown as N[], dominan: (asesmen?.[0]?.kategori_dominan ?? null) as Tipe | null };
    }),
  );

  return (
    <>
      <PageHead title={`Halo, ${p.nama}`} note="Nilai, presensi, dan hasil bimbingan karier anak Anda." />

      {rincian.length === 0 && <p className="notice">Belum ada anak yang tertaut ke akun Anda. Hubungi admin madrasah.</p>}

      {rincian.map(({ a, hitung, nilai, dominan }) => {
        const total = hitung.hadir + hitung.izin + hitung.sakit + hitung.alpa;
        return (
          <section key={a.id}>
            <h2 className="h2">
              {a.nama}
              {a.kelas ? ` · ${a.kelas.nama}` : ""}
            </h2>

            <ul className="stats">
              <li>
                <span className="stats__n">{total ? `${Math.round((hitung.hadir / total) * 100)}%` : "–"}</span>
                <span className="stats__l">Kehadiran</span>
              </li>
              <li>
                <span className="stats__n">{hitung.izin + hitung.sakit}</span>
                <span className="stats__l">Izin dan sakit</span>
              </li>
              <li>
                <span className="stats__n">{hitung.alpa}</span>
                <span className="stats__l">Alpa</span>
              </li>
            </ul>

            {nilai.length === 0 ? (
              <p className="empty-hint">Belum ada nilai.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Mata pelajaran</th>
                    <th>Tugas</th>
                    <th>UTS</th>
                    <th>UAS</th>
                    <th>Akhir</th>
                  </tr>
                </thead>
                <tbody>
                  {nilai.map((n) => {
                    const akhir = nilaiAkhir(n);
                    return (
                      <tr key={n.id}>
                        <td>{n.mapel?.nama ?? "-"}</td>
                        <td>{n.tugas ?? "-"}</td>
                        <td>{n.uts ?? "-"}</td>
                        <td>{n.uas ?? "-"}</td>
                        <td>{akhir === null ? "-" : akhir.toFixed(1)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            <p className="muted">
              Hasil asesmen minat: {dominan && tipeInfo[dominan] ? `${tipeInfo[dominan].judul}. ${tipeInfo[dominan].ringkas}` : "belum mengikuti asesmen."}
            </p>
          </section>
        );
      })}
    </>
  );
}
