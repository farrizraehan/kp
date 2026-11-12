import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { KELOLA_DATA } from "@/lib/roles";
import { FIELD_SITUS, ambilSitus } from "@/lib/situs";
import { Notice, PageHead, one } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { simpanIdentitas } from "./actions";

export const metadata = { title: "Identitas madrasah" };

export default async function Identitas({ searchParams }: PageProps<"/dashboard/identitas">) {
  await requireRole(KELOLA_DATA);
  const sp = await searchParams;
  const supabase = await createClient();
  const situs = await ambilSitus(supabase);

  return (
    <>
      <PageHead
        title="Identitas madrasah"
        note="Isi di sini tampil di beranda publik. Ubah langsung bila ada pergantian, misalnya kepala madrasah, tanpa mengubah kode."
        actions={
          <Link className="btn btn--sm btn--outline" href="/" target="_blank">
            Lihat beranda
          </Link>
        }
      />
      <Notice error={one(sp.error)} info={one(sp.info)} />

      <form action={simpanIdentitas}>
        {FIELD_SITUS.map((g) => (
          <section key={g.judul}>
            <h2 className="h2">{g.judul}</h2>
            <div className="formgrid formgrid--flat">
              {g.fields.map((f) => (
                <label key={f.kunci}>
                  {f.label}
                  {f.panjang ? (
                    <textarea name={f.kunci} rows={3} maxLength={f.maks} defaultValue={situs[f.kunci]} />
                  ) : (
                    <input name={f.kunci} maxLength={f.maks} defaultValue={situs[f.kunci]} />
                  )}
                  {f.hint && <span className="hint">{f.hint}</span>}
                </label>
              ))}
            </div>
          </section>
        ))}
        <div className="formgrid__actions">
          <SubmitButton pendingText="Menyimpan…">Simpan pengaturan</SubmitButton>
        </div>
      </form>

      <ul className="shortcuts">
        <li>
          <Link href="/dashboard/data/konten-profil">
            <strong>Profil, visi, misi, dan sambutan</strong>
            <span>Teks panjang di beranda: profil, visi, misi, program, fasilitas, dan sambutan.</span>
          </Link>
        </li>
        <li>
          <Link href="/dashboard/data/pengumuman">
            <strong>Pengumuman dan prestasi</strong>
            <span>Berita terbaru dan prestasi yang tampil di beranda.</span>
          </Link>
        </li>
      </ul>
    </>
  );
}
