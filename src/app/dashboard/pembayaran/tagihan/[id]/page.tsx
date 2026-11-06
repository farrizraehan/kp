import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { KEUANGAN, LIHAT_KEUANGAN } from "@/lib/roles";
import { hitungTagihan, labelStatus, rupiah } from "@/lib/pembayaran";
import { hariIni } from "@/lib/waktu";
import { Notice, PageHead, one } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { batalkanPembayaran, batalkanTagihan, catatPembayaran, ubahPotongan } from "../../actions";

export const metadata = { title: "Detail tagihan" };

type T = {
  id: number;
  periode: string;
  jatuh_tempo: string | null;
  nominal: number;
  potongan: number;
  keterangan: string | null;
  batal: boolean;
  siswa: { id: number; nama: string; nisn: string | null; kelas: { nama: string } | null } | null;
  biaya: { nama: string } | null;
  pembayaran: { id: number; jumlah: number; metode: string; tanggal: string; nomor: string; referensi: string | null; status: string }[];
};

const OK: Record<string, string> = {
  bayar: "Pembayaran dicatat.",
  batalbayar: "Pembayaran dibatalkan.",
  potongan: "Potongan disimpan.",
  batal: "Tagihan dibatalkan.",
  aktif: "Tagihan diaktifkan kembali.",
};

export default async function DetailTagihan({ params, searchParams }: PageProps<"/dashboard/pembayaran/tagihan/[id]">) {
  const p = await requireRole(LIHAT_KEUANGAN);
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("tagihan")
    .select(
      "id, periode, jatuh_tempo, nominal, potongan, keterangan, batal, siswa(id, nama, nisn, kelas(nama)), biaya(nama), pembayaran(id, jumlah, metode, tanggal, nomor, referensi, status)",
    )
    .eq("id", Number(id))
    .maybeSingle();
  if (!data) notFound();
  const t = data as unknown as T;
  const h = hitungTagihan(t);
  const bisaKelola = KEUANGAN.includes(p.role);
  const bayar = [...t.pembayaran].sort((a, b) => b.id - a.id);
  const ok = one(sp.ok);
  const kuitansi = one(sp.kuitansi);

  return (
    <>
      <PageHead
        title={`${t.biaya?.nama ?? "Tagihan"} · ${t.periode}`}
        note={`${t.siswa?.nama ?? "-"}${t.siswa?.kelas ? ` · ${t.siswa.kelas.nama}` : ""}${t.siswa?.nisn ? ` · NISN ${t.siswa.nisn}` : ""}`}
        actions={
          <Link className="btn btn--sm" href="/dashboard/pembayaran">
            Daftar tagihan
          </Link>
        }
      />
      <Notice error={one(sp.error)} info={ok ? OK[ok] : undefined} />
      {kuitansi && (
        <p className="notice">
          <Link href={`/dashboard/pembayaran/kuitansi/${kuitansi}`}>Cetak kuitansi pembayaran ini</Link>
        </p>
      )}

      <ul className="stats">
        <li>
          <span className="stats__n">{rupiah(Number(t.nominal))}</span>
          <span className="stats__l">Nominal</span>
        </li>
        <li>
          <span className="stats__n">{rupiah(Number(t.potongan))}</span>
          <span className="stats__l">Potongan{t.keterangan ? ` (${t.keterangan})` : ""}</span>
        </li>
        <li>
          <span className="stats__n">{rupiah(h.dibayar)}</span>
          <span className="stats__l">Sudah dibayar</span>
        </li>
        <li>
          <span className="stats__n">{rupiah(h.sisa)}</span>
          <span className="stats__l">Sisa · {labelStatus[h.status]}</span>
        </li>
      </ul>
      {t.jatuh_tempo && <p className="muted">Jatuh tempo: {t.jatuh_tempo}</p>}

      {bisaKelola && h.status !== "batal" && h.sisa > 0 && (
        <>
          <h2 className="h2">Catat pembayaran</h2>
          <form action={catatPembayaran} className="formgrid formgrid--flat">
            <input type="hidden" name="tagihan" value={t.id} />
            <label>
              Jumlah (Rp)
              <input name="jumlah" type="number" min={1} max={h.sisa} defaultValue={h.sisa} required />
            </label>
            <label>
              Metode
              <select name="metode" defaultValue="tunai">
                <option value="tunai">Tunai</option>
                <option value="transfer">Transfer bank</option>
              </select>
            </label>
            <label>
              Tanggal bayar
              <input name="tanggal" type="date" defaultValue={hariIni()} required />
            </label>
            <label>
              Keterangan / no. referensi transfer
              <input name="referensi" placeholder="opsional" />
            </label>
            <div className="formgrid__actions">
              <SubmitButton pendingText="Menyimpan…">Simpan pembayaran</SubmitButton>
            </div>
          </form>
        </>
      )}

      <h2 className="h2">Riwayat pembayaran</h2>
      {bayar.length === 0 ? (
        <p className="empty-hint">Belum ada pembayaran.</p>
      ) : (
        <div className="tablewrap">
          <table className="table">
            <thead>
              <tr>
                <th>Kuitansi</th>
                <th>Tanggal</th>
                <th>Metode</th>
                <th>Jumlah</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {bayar.map((b) => (
                <tr key={b.id}>
                  <td>
                    <Link href={`/dashboard/pembayaran/kuitansi/${b.id}`}>{b.nomor}</Link>
                  </td>
                  <td>{b.tanggal}</td>
                  <td>
                    {b.metode === "tunai" ? "Tunai" : "Transfer"}
                    {b.referensi ? ` · ${b.referensi}` : ""}
                  </td>
                  <td className="num-cell">{rupiah(Number(b.jumlah))}</td>
                  <td>{b.status === "terverifikasi" ? "Terverifikasi" : "Dibatalkan"}</td>
                  <td>
                    {bisaKelola && b.status === "terverifikasi" && (
                      <form action={batalkanPembayaran}>
                        <input type="hidden" name="pembayaran" value={b.id} />
                        <input type="hidden" name="tagihan" value={t.id} />
                        <SubmitButton className="btn btn--sm" pendingText="…">
                          Batalkan
                        </SubmitButton>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {bisaKelola && (
        <>
          <h2 className="h2">Potongan dan pembatalan</h2>
          <form action={ubahPotongan} className="formgrid formgrid--flat">
            <input type="hidden" name="tagihan" value={t.id} />
            <label>
              Potongan (Rp)
              <input name="potongan" type="number" min={0} max={Number(t.nominal)} defaultValue={Number(t.potongan)} />
            </label>
            <label>
              Keterangan potongan
              <input name="keterangan" defaultValue={t.keterangan ?? ""} placeholder="mis. Beasiswa prestasi" />
            </label>
            <div className="formgrid__actions">
              <SubmitButton pendingText="Menyimpan…">Simpan potongan</SubmitButton>
            </div>
          </form>
          <form action={batalkanTagihan}>
            <input type="hidden" name="tagihan" value={t.id} />
            <input type="hidden" name="batal" value={t.batal ? "0" : "1"} />
            <SubmitButton className="btn btn--sm" pendingText="…">
              {t.batal ? "Aktifkan kembali tagihan" : "Batalkan tagihan"}
            </SubmitButton>
          </form>
        </>
      )}
    </>
  );
}
