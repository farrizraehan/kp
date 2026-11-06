import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LIHAT_KEUANGAN } from "@/lib/roles";
import { hitungTagihan, rupiah, terbilang } from "@/lib/pembayaran";
import { tanggalPanjang } from "@/lib/waktu";
import { Crest } from "@/components/crest";
import { PageHead } from "@/components/ui";
import { PrintButton } from "@/components/print-button";

export const metadata = { title: "Kuitansi" };

type B = {
  id: number;
  jumlah: number;
  metode: string;
  tanggal: string;
  nomor: string;
  referensi: string | null;
  status: string;
  tagihan: {
    id: number;
    periode: string;
    nominal: number;
    potongan: number;
    batal: boolean;
    siswa: { nama: string; nisn: string | null; kelas: { nama: string } | null } | null;
    biaya: { nama: string } | null;
    pembayaran: { jumlah: number; status: string }[];
  } | null;
};

export default async function Kuitansi({ params }: PageProps<"/dashboard/pembayaran/kuitansi/[id]">) {
  await requireRole(LIHAT_KEUANGAN);
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("pembayaran")
    .select(
      "id, jumlah, metode, tanggal, nomor, referensi, status, tagihan(id, periode, nominal, potongan, batal, siswa(nama, nisn, kelas(nama)), biaya(nama), pembayaran(jumlah, status))",
    )
    .eq("id", Number(id))
    .maybeSingle();
  if (!data || !(data as unknown as B).tagihan) notFound();
  const b = data as unknown as B;
  const t = b.tagihan!;
  const h = hitungTagihan(t);
  const batal = b.status !== "terverifikasi";

  return (
    <>
      <div className="noprint">
        <PageHead
          title="Kuitansi"
          actions={
            <>
              <PrintButton label="Cetak kuitansi" className="btn btn--sm" />
              <Link className="btn btn--sm" href={`/dashboard/pembayaran/tagihan/${t.id}`}>
                Kembali
              </Link>
            </>
          }
        />
      </div>

      <article className="rapor">
        <header className="kop">
          <Crest size={72} />
          <div>
            <p className="kop__yay">Yayasan Pendidikan Islam Al-Riyadhul Janah</p>
            <p className="kop__nama">Madrasah Aliyah Al-Riyadhul Janah</p>
            <p className="kop__alamat">Jl. Johar Atmaja, Kp. Kaburon, Desa Maja, Kec. Maja, Kab. Lebak, Banten</p>
          </div>
        </header>

        <h2 className="rapor__judul">Kuitansi pembayaran{batal ? " (DIBATALKAN)" : ""}</h2>
        <dl className="rapor__id">
          <div><dt>Nomor</dt><dd>{b.nomor}</dd></div>
          <div><dt>Tanggal</dt><dd>{tanggalPanjang(b.tanggal)}</dd></div>
          <div><dt>Telah terima dari</dt><dd>{t.siswa?.nama ?? "—"}{t.siswa?.kelas ? ` (${t.siswa.kelas.nama})` : ""}</dd></div>
          <div><dt>NISN</dt><dd>{t.siswa?.nisn ?? "—"}</dd></div>
          <div><dt>Untuk pembayaran</dt><dd>{t.biaya?.nama ?? "—"} · {t.periode}</dd></div>
          <div><dt>Metode</dt><dd>{b.metode === "tunai" ? "Tunai" : "Transfer bank"}{b.referensi ? ` · ${b.referensi}` : ""}</dd></div>
        </dl>

        <p className="rapor__judul" style={{ textTransform: "none" }}>
          {rupiah(Number(b.jumlah))}
        </p>
        <p className="muted">Terbilang: {terbilang(Number(b.jumlah))}</p>

        <dl className="rapor__id">
          <div><dt>Total tagihan</dt><dd>{rupiah(h.total)}</dd></div>
          <div><dt>Sudah dibayar</dt><dd>{rupiah(h.dibayar)}</dd></div>
          <div><dt>Sisa tagihan</dt><dd>{h.sisa === 0 ? "Lunas" : rupiah(h.sisa)}</dd></div>
        </dl>

        <p className="muted">Kuitansi ini sah dan dicetak dari sistem informasi madrasah.</p>
      </article>
    </>
  );
}
