import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHead } from "@/components/ui";

export const metadata = { title: "Beranda" };

export default async function OperatorHome() {
  const p = await requireRole(["operator"]);
  const supabase = await createClient();
  const head = (tabel: string) => supabase.from(tabel).select("*", { count: "exact", head: true });
  const [siswa, guru, kelas, alumni] = await Promise.all([head("siswa").eq("status", "aktif"), head("guru"), head("kelas"), head("alumni")]);

  return (
    <>
      <PageHead title={`Halo, ${p.nama}`} note="Kelola data induk madrasah." />

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
            <span className="stats__l">Guru</span>
          </Link>
        </li>
        <li>
          <Link href="/dashboard/data/kelas">
            <span className="stats__n">{kelas.count ?? 0}</span>
            <span className="stats__l">Kelas</span>
          </Link>
        </li>
        <li>
          <Link href="/dashboard/data/alumni">
            <span className="stats__n">{alumni.count ?? 0}</span>
            <span className="stats__l">Alumni</span>
          </Link>
        </li>
      </ul>

      <ul className="shortcuts">
        <li>
          <Link href="/dashboard/data/siswa">
            <strong>Data siswa</strong>
            <span>Tambah, ubah, atau impor data siswa.</span>
          </Link>
        </li>
        <li>
          <Link href="/dashboard/pembayaran">
            <strong>Pembayaran</strong>
            <span>Tagihan siswa, catat pembayaran, kuitansi, dan laporan.</span>
          </Link>
        </li>
        <li>
          <Link href="/dashboard/data/jadwal">
            <strong>Jadwal</strong>
            <span>Atur jadwal pelajaran per kelas.</span>
          </Link>
        </li>
        <li>
          <Link href="/dashboard/data/alumni">
            <strong>Data alumni</strong>
            <span>Perbarui data alumni dan kontaknya.</span>
          </Link>
        </li>
      </ul>
    </>
  );
}
