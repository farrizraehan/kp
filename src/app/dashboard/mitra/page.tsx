import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHead } from "@/components/ui";

export const metadata = { title: "Beranda" };

export default async function MitraHome() {
  const p = await requireRole(["mitra"]);
  const supabase = await createClient();
  const { data: mitra } = await supabase.from("mitra").select("id").eq("profile_id", p.id).maybeSingle();
  const { count } = mitra
    ? await supabase.from("info_karier").select("*", { count: "exact", head: true }).eq("mitra_id", mitra.id)
    : { count: 0 };

  return (
    <>
      <PageHead title={`Halo, ${p.nama}`} note="Pasang info beasiswa, lowongan, atau program kerja sama untuk siswa dan alumni." />

      <ul className="stats">
        <li>
          <Link href="/dashboard/data/info-karier">
            <span className="stats__n">{count ?? 0}</span>
            <span className="stats__l">Info yang Anda pasang</span>
          </Link>
        </li>
      </ul>

      {!mitra && <p className="notice">Akun Anda belum tertaut ke data mitra. Hubungi admin madrasah.</p>}

      <ul className="shortcuts">
        <li>
          <Link href="/dashboard/data/info-karier/baru">
            <strong>Pasang info baru</strong>
            <span>Tambah info kampus, beasiswa, atau lowongan.</span>
          </Link>
        </li>
      </ul>
    </>
  );
}
