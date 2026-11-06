import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { KEUANGAN, LIHAT_KEUANGAN } from "@/lib/roles";
import { hitungTagihan, labelStatus, rupiah, type StatusTagihan } from "@/lib/pembayaran";
import { Notice, PageHead, one } from "@/components/ui";

export const metadata = { title: "Tagihan" };

type T = {
  id: number;
  periode: string;
  jatuh_tempo: string | null;
  nominal: number;
  potongan: number;
  batal: boolean;
  siswa: { id: number; nama: string; nisn: string | null; kelas: { id: number; nama: string } | null } | null;
  biaya: { id: number; nama: string } | null;
  pembayaran: { jumlah: number; status: string }[] | null;
};

const STATUS: StatusTagihan[] = ["belum", "sebagian", "lunas", "batal"];

export default async function Tagihan({ searchParams }: PageProps<"/dashboard/pembayaran">) {
  const p = await requireRole(LIHAT_KEUANGAN);
  const sp = await searchParams;
  const q = (one(sp.q) ?? "").trim().toLowerCase();
  const kelasId = one(sp.kelas) ?? "";
  const biayaId = one(sp.biaya) ?? "";
  const status = one(sp.status) ?? "";
  const periode = (one(sp.periode) ?? "").trim().toLowerCase();
  const supabase = await createClient();

  const [{ data }, { data: kelas }, { data: biaya }] = await Promise.all([
    supabase
      .from("tagihan")
      .select("id, periode, jatuh_tempo, nominal, potongan, batal, siswa(id, nama, nisn, kelas(id, nama)), biaya(id, nama), pembayaran(jumlah, status)")
      .order("id", { ascending: false })
      .limit(2000),
    supabase.from("kelas").select("id, nama").order("nama"),
    supabase.from("biaya").select("id, nama").order("nama"),
  ]);

  const semua = ((data ?? []) as unknown as T[]).map((t) => ({ ...t, h: hitungTagihan(t) }));
  const rows = semua.filter(
    (t) =>
      (!q || t.siswa?.nama.toLowerCase().includes(q) || (t.siswa?.nisn ?? "").includes(q)) &&
      (!kelasId || String(t.siswa?.kelas?.id) === kelasId) &&
      (!biayaId || String(t.biaya?.id) === biayaId) &&
      (!status || t.h.status === status) &&
      (!periode || t.periode.toLowerCase().includes(periode)),
  );
  const tampil = rows.slice(0, 300);
  const aktif = rows.filter((t) => t.h.status !== "batal");
  const tagih = aktif.reduce((a, t) => a + t.h.total, 0);
  const terbayar = aktif.reduce((a, t) => a + t.h.dibayar, 0);
  const bisaKelola = KEUANGAN.includes(p.role);

  return (
    <>
      <PageHead
        title="Tagihan"
        note="Tagihan per siswa. Klik satu tagihan untuk mencatat pembayaran atau mencetak kuitansi."
        actions={
          bisaKelola ? (
            <Link className="btn btn--sm" href="/dashboard/pembayaran/buat">
              Buat tagihan
            </Link>
          ) : undefined
        }
      />
      <Notice error={one(sp.error)} />

      <ul className="stats">
        <li>
          <span className="stats__n">{aktif.length}</span>
          <span className="stats__l">Tagihan sesuai filter</span>
        </li>
        <li>
          <span className="stats__n">{rupiah(tagih)}</span>
          <span className="stats__l">Total tagihan</span>
        </li>
        <li>
          <span className="stats__n">{rupiah(terbayar)}</span>
          <span className="stats__l">Sudah dibayar</span>
        </li>
        <li>
          <span className="stats__n">{rupiah(tagih - terbayar)}</span>
          <span className="stats__l">Belum dibayar</span>
        </li>
      </ul>

      <form className="filterbar" method="get">
        <label>
          Cari siswa
          <input name="q" defaultValue={one(sp.q) ?? ""} placeholder="Nama atau NISN" />
        </label>
        <label>
          Kelas
          <select name="kelas" defaultValue={kelasId}>
            <option value="">Semua</option>
            {(kelas ?? []).map((k) => (
              <option key={k.id} value={k.id}>
                {k.nama}
              </option>
            ))}
          </select>
        </label>
        <label>
          Biaya
          <select name="biaya" defaultValue={biayaId}>
            <option value="">Semua</option>
            {(biaya ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.nama}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select name="status" defaultValue={status}>
            <option value="">Semua</option>
            {STATUS.map((s) => (
              <option key={s} value={s}>
                {labelStatus[s]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Periode
          <input name="periode" defaultValue={one(sp.periode) ?? ""} placeholder="mis. 2026-11" />
        </label>
        <button className="btn btn--sm" type="submit">
          Terapkan
        </button>
      </form>

      {tampil.length === 0 ? (
        <p className="empty-hint">Belum ada tagihan yang sesuai. {bisaKelola && <Link href="/dashboard/pembayaran/buat">Buat tagihan</Link>}</p>
      ) : (
        <div className="tablewrap">
          <table className="table">
            <thead>
              <tr>
                <th>Siswa</th>
                <th>Kelas</th>
                <th>Biaya</th>
                <th>Periode</th>
                <th>Jatuh tempo</th>
                <th>Tagihan</th>
                <th>Sisa</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {tampil.map((t) => (
                <tr key={t.id}>
                  <td>
                    <Link href={`/dashboard/pembayaran/tagihan/${t.id}`}>{t.siswa?.nama ?? "-"}</Link>
                  </td>
                  <td>{t.siswa?.kelas?.nama ?? "-"}</td>
                  <td>{t.biaya?.nama ?? "-"}</td>
                  <td>{t.periode}</td>
                  <td>{t.jatuh_tempo ?? "-"}</td>
                  <td className="num-cell">{rupiah(t.h.total)}</td>
                  <td className="num-cell">{rupiah(t.h.sisa)}</td>
                  <td>
                    <span className="tag">{labelStatus[t.h.status]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > tampil.length && <p className="muted">Menampilkan 300 dari {rows.length} tagihan. Persempit dengan filter.</p>}
    </>
  );
}
