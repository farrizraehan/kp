import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { KEUANGAN } from "@/lib/roles";
import { rupiah } from "@/lib/pembayaran";
import { hariIni } from "@/lib/waktu";
import { Notice, PageHead, one } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { buatTagihan } from "../actions";

export const metadata = { title: "Buat tagihan" };

const TINGKAT: Record<number, string> = { 10: "X", 11: "XI", 12: "XII" };

export default async function BuatTagihan({ searchParams }: PageProps<"/dashboard/pembayaran/buat">) {
  await requireRole(KEUANGAN);
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: biaya }, { data: kelas }] = await Promise.all([
    supabase.from("biaya").select("id, nama, nominal, tingkat, periode").eq("aktif", true).order("nama"),
    supabase.from("kelas").select("id, nama").order("nama"),
  ]);
  const bulanIni = hariIni().slice(0, 7);

  return (
    <>
      <PageHead
        title="Buat tagihan"
        note="Tagihan dibuat untuk semua siswa aktif sesuai tingkat biaya. Potongan keringanan atau beasiswa diterapkan otomatis."
        actions={
          <Link className="btn btn--sm" href="/dashboard/pembayaran">
            Daftar tagihan
          </Link>
        }
      />
      <Notice error={one(sp.error)} info={one(sp.info)} />

      {(biaya ?? []).length === 0 ? (
        <p className="empty-hint">
          Belum ada jenis biaya aktif. <Link href="/dashboard/data/biaya/baru">Tambahkan master biaya</Link> lebih dulu.
        </p>
      ) : (
        <form action={buatTagihan} className="formgrid formgrid--flat">
          <label>
            Jenis biaya
            <select name="biaya" required defaultValue="">
              <option value="" disabled>
                Pilih jenis biaya
              </option>
              {(biaya ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nama} · {b.tingkat ? `kelas ${TINGKAT[b.tingkat]}` : "semua tingkat"} · {rupiah(Number(b.nominal))} · {b.periode}
                </option>
              ))}
            </select>
          </label>
          <label>
            Periode
            <input name="periode" required defaultValue={bulanIni} placeholder="mis. 2026-11 atau Semester 1 2026/2027" />
            <span className="hint">Tagihan dengan biaya dan periode yang sama untuk satu siswa tidak dibuat dua kali.</span>
          </label>
          <label>
            Jatuh tempo
            <input name="jatuh_tempo" type="date" />
          </label>
          <label>
            Kelas (opsional)
            <select name="kelas" defaultValue="">
              <option value="">Semua kelas</option>
              {(kelas ?? []).map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </select>
          </label>
          <div className="formgrid__actions">
            <SubmitButton pendingText="Membuat tagihan…">Buat tagihan</SubmitButton>
          </div>
        </form>
      )}

      <ul className="shortcuts">
        <li>
          <Link href="/dashboard/data/biaya">
            <strong>Master biaya</strong>
            <span>Jenis biaya, nominal per tingkat, dan periode.</span>
          </Link>
        </li>
        <li>
          <Link href="/dashboard/data/keringanan">
            <strong>Keringanan dan beasiswa</strong>
            <span>Potongan persen atau nominal per siswa.</span>
          </Link>
        </li>
      </ul>
    </>
  );
}
