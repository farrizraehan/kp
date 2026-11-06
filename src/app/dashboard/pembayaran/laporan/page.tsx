import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LIHAT_KEUANGAN } from "@/lib/roles";
import { rupiah, tautanWa } from "@/lib/pembayaran";
import { ambilPenerimaan, ambilTunggakan } from "@/lib/laporan-pembayaran";
import { hariIni, tanggalValid } from "@/lib/waktu";
import { PageHead, one } from "@/components/ui";

export const metadata = { title: "Laporan pembayaran" };

export default async function Laporan({ searchParams }: PageProps<"/dashboard/pembayaran/laporan">) {
  await requireRole(LIHAT_KEUANGAN);
  const sp = await searchParams;
  const tab = one(sp.tab) === "tunggakan" ? "tunggakan" : "penerimaan";
  const hari = hariIni();
  const awalBulan = `${hari.slice(0, 7)}-01`;
  const dariIn = one(sp.dari);
  const sampaiIn = one(sp.sampai);
  const dari = tanggalValid(dariIn) ? dariIn : awalBulan;
  const sampai = tanggalValid(sampaiIn) ? sampaiIn : hari;
  const supabase = await createClient();

  const tabHref = (t: string) => `/dashboard/pembayaran/laporan?tab=${t}`;
  const exportHref =
    tab === "penerimaan"
      ? `/dashboard/pembayaran/laporan/export?jenis=penerimaan&dari=${dari}&sampai=${sampai}`
      : "/dashboard/pembayaran/laporan/export?jenis=tunggakan";

  return (
    <>
      <PageHead
        title="Laporan pembayaran"
        note="Penerimaan harian atau bulanan dan daftar tunggakan. Keduanya bisa diekspor ke Excel."
        actions={
          <a className="btn btn--sm" href={exportHref}>
            Ekspor Excel
          </a>
        }
      />

      <nav className="tabs" aria-label="Jenis laporan">
        <Link href={tabHref("penerimaan")} aria-current={tab === "penerimaan" ? "page" : undefined}>
          Penerimaan
        </Link>
        <Link href={tabHref("tunggakan")} aria-current={tab === "tunggakan" ? "page" : undefined}>
          Tunggakan
        </Link>
      </nav>

      {tab === "penerimaan" ? <Penerimaan supabase={supabase} dari={dari} sampai={sampai} /> : <Tunggakan supabase={supabase} hari={hari} />}
    </>
  );
}

async function Penerimaan({ supabase, dari, sampai }: { supabase: Awaited<ReturnType<typeof createClient>>; dari: string; sampai: string }) {
  const rows = await ambilPenerimaan(supabase, dari, sampai);
  const total = rows.reduce((a, r) => a + r.jumlah, 0);
  const perHari = new Map<string, number>();
  const perMetode = { tunai: 0, transfer: 0 };
  rows.forEach((r) => {
    perHari.set(r.tanggal, (perHari.get(r.tanggal) ?? 0) + r.jumlah);
    perMetode[r.metode === "transfer" ? "transfer" : "tunai"] += r.jumlah;
  });

  return (
    <>
      <form className="filterbar" method="get">
        <input type="hidden" name="tab" value="penerimaan" />
        <label>
          Dari
          <input type="date" name="dari" defaultValue={dari} />
        </label>
        <label>
          Sampai
          <input type="date" name="sampai" defaultValue={sampai} />
        </label>
        <button className="btn btn--sm" type="submit">
          Tampilkan
        </button>
      </form>

      <ul className="stats">
        <li>
          <span className="stats__n">{rupiah(total)}</span>
          <span className="stats__l">Total penerimaan</span>
        </li>
        <li>
          <span className="stats__n">{rows.length}</span>
          <span className="stats__l">Transaksi</span>
        </li>
        <li>
          <span className="stats__n">{rupiah(perMetode.tunai)}</span>
          <span className="stats__l">Tunai</span>
        </li>
        <li>
          <span className="stats__n">{rupiah(perMetode.transfer)}</span>
          <span className="stats__l">Transfer</span>
        </li>
      </ul>

      {rows.length === 0 ? (
        <p className="empty-hint">Belum ada penerimaan pada rentang ini.</p>
      ) : (
        <>
          <h2 className="h2">Per hari</h2>
          <div className="tablewrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Penerimaan</th>
                </tr>
              </thead>
              <tbody>
                {[...perHari.entries()].map(([tgl, jml]) => (
                  <tr key={tgl}>
                    <td>{tgl}</td>
                    <td className="num-cell">{rupiah(jml)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h2 className="h2">Rincian</h2>
          <div className="tablewrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Kuitansi</th>
                  <th>Siswa</th>
                  <th>Biaya</th>
                  <th>Metode</th>
                  <th>Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{r.tanggal}</td>
                    <td>
                      <Link href={`/dashboard/pembayaran/kuitansi/${r.id}`}>{r.nomor}</Link>
                    </td>
                    <td>
                      {r.siswa} · {r.kelas}
                    </td>
                    <td>
                      {r.biaya} · {r.periode}
                    </td>
                    <td>{r.metode === "tunai" ? "Tunai" : "Transfer"}</td>
                    <td className="num-cell">{rupiah(r.jumlah)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

async function Tunggakan({ supabase, hari }: { supabase: Awaited<ReturnType<typeof createClient>>; hari: string }) {
  const rows = await ambilTunggakan(supabase, hari);
  const total = rows.reduce((a, r) => a + r.sisa, 0);
  const terlambat = rows.filter((r) => r.terlambat);
  const siswa = new Set(rows.map((r) => r.siswaId)).size;

  return (
    <>
      <ul className="stats">
        <li>
          <span className="stats__n">{rupiah(total)}</span>
          <span className="stats__l">Total tunggakan</span>
        </li>
        <li>
          <span className="stats__n">{siswa}</span>
          <span className="stats__l">Siswa menunggak</span>
        </li>
        <li>
          <span className="stats__n">{terlambat.length}</span>
          <span className="stats__l">Tagihan lewat jatuh tempo</span>
        </li>
      </ul>

      {rows.length === 0 ? (
        <p className="empty-hint">Tidak ada tunggakan.</p>
      ) : (
        <div className="tablewrap">
          <table className="table">
            <thead>
              <tr>
                <th>Siswa</th>
                <th>Kelas</th>
                <th>Biaya</th>
                <th>Jatuh tempo</th>
                <th>Sisa</th>
                <th>Pengingat</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const wa = tautanWa(
                  r.noHp,
                  `Assalamualaikum. Mengingatkan pembayaran ${r.biaya} ${r.periode} atas nama ${r.siswa} sebesar ${rupiah(r.sisa)}${r.jatuhTempo ? `, jatuh tempo ${r.jatuhTempo}` : ""}. Terima kasih. MA Al-Riyadhul Janah.`,
                );
                return (
                  <tr key={r.tagihanId}>
                    <td>
                      <Link href={`/dashboard/pembayaran/tagihan/${r.tagihanId}`}>{r.siswa}</Link>
                    </td>
                    <td>{r.kelas}</td>
                    <td>
                      {r.biaya} · {r.periode}
                    </td>
                    <td>
                      {r.jatuhTempo ?? "-"}
                      {r.terlambat ? " (lewat)" : ""}
                    </td>
                    <td className="num-cell">{rupiah(r.sisa)}</td>
                    <td>
                      {wa ? (
                        <a className="linkbtn linkbtn--edit" href={wa} target="_blank" rel="noopener noreferrer">
                          WhatsApp
                        </a>
                      ) : (
                        <span className="muted">Tanpa no. HP</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
