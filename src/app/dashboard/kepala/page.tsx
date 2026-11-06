import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { hariIni } from "@/lib/waktu";
import { PageHead } from "@/components/ui";

export const metadata = { title: "Dasbor" };

export default async function KepalaHome() {
  const p = await requireRole(["kepala"]);
  const supabase = await createClient();
  const bulan = hariIni().slice(0, 7);
  const awal = `${bulan}-01`;

  const head = (tabel: string) => supabase.from(tabel).select("*", { count: "exact", head: true });
  const [siswa, guru, kelas, alumni, tracer, konseling, asesmen, presensi] = await Promise.all([
    head("siswa").eq("status", "aktif"),
    head("guru"),
    head("kelas"),
    head("alumni"),
    head("tracer_respons"),
    head("konseling").eq("status", "diajukan"),
    supabase.from("asesmen_hasil").select("siswa_id").limit(5000),
    supabase.from("presensi").select("status").gte("tanggal", awal).limit(50000),
  ]);

  const sudahAsesmen = new Set((asesmen.data ?? []).map((a) => a.siswa_id)).size;
  const pr = presensi.data ?? [];
  const hadir = pr.filter((r) => r.status === "hadir").length;
  const persenHadir = pr.length ? Math.round((hadir / pr.length) * 100) : null;
  const sudahTracer = tracer.count ?? 0;

  return (
    <>
      <PageHead title={`Halo, ${p.nama}`} note="Ringkasan akademik, bimbingan karier, dan alumni. Halaman ini hanya untuk dilihat." />

      <h2 className="h2">Akademik</h2>
      <ul className="stats">
        <li>
          <Link href="/dashboard/data/siswa">
            <span className="stats__n">{siswa.count ?? 0}</span>
            <span className="stats__l">Siswa aktif</span>
          </Link>
        </li>
        <li>
          <Link href="/dashboard/data/guru">
            <span className="stats__n">{guru.count ?? 0}</span>
            <span className="stats__l">Guru dan staf pengajar</span>
          </Link>
        </li>
        <li>
          <Link href="/dashboard/data/kelas">
            <span className="stats__n">{kelas.count ?? 0}</span>
            <span className="stats__l">Kelas</span>
          </Link>
        </li>
        <li>
          <Link href="/dashboard/rekap-presensi">
            <span className="stats__n">{persenHadir === null ? "–" : `${persenHadir}%`}</span>
            <span className="stats__l">Kehadiran bulan ini</span>
          </Link>
        </li>
      </ul>

      <h2 className="h2">Bimbingan karier</h2>
      <ul className="stats">
        <li>
          <Link href="/dashboard/asesmen">
            <span className="stats__n">
              {sudahAsesmen}/{siswa.count ?? 0}
            </span>
            <span className="stats__l">Siswa sudah asesmen minat</span>
          </Link>
        </li>
        <li>
          <span className="stats__n">{konseling.count ?? 0}</span>
          <span className="stats__l">Pengajuan konseling menunggu</span>
        </li>
      </ul>

      <h2 className="h2">Alumni dan tracer study</h2>
      <ul className="stats">
        <li>
          <Link href="/dashboard/data/alumni">
            <span className="stats__n">{alumni.count ?? 0}</span>
            <span className="stats__l">Alumni terdata</span>
          </Link>
        </li>
        <li>
          <Link href="/dashboard/tracer">
            <span className="stats__n">{sudahTracer}</span>
            <span className="stats__l">Tanggapan tracer study</span>
          </Link>
        </li>
      </ul>
    </>
  );
}
