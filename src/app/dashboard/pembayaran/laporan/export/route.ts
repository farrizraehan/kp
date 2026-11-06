import ExcelJS from "exceljs";
import { getProfile } from "@/lib/auth";
import { LIHAT_KEUANGAN } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { ambilPenerimaan, ambilTunggakan } from "@/lib/laporan-pembayaran";
import { hariIni, tanggalValid } from "@/lib/waktu";

export async function GET(request: Request) {
  const p = await getProfile();
  if (!p || !LIHAT_KEUANGAN.includes(p.role)) return new Response("Tidak diizinkan", { status: 403 });
  const url = new URL(request.url);
  const jenis = url.searchParams.get("jenis") === "tunggakan" ? "tunggakan" : "penerimaan";
  const hari = hariIni();
  const dariIn = url.searchParams.get("dari") ?? undefined;
  const sampaiIn = url.searchParams.get("sampai") ?? undefined;
  const dari = tanggalValid(dariIn) ? dariIn : `${hari.slice(0, 7)}-01`;
  const sampai = tanggalValid(sampaiIn) ? sampaiIn : hari;
  const supabase = await createClient();

  const wb = new ExcelJS.Workbook();
  let nama: string;
  if (jenis === "penerimaan") {
    const rows = await ambilPenerimaan(supabase, dari, sampai);
    const ws = wb.addWorksheet("Penerimaan");
    ws.columns = [
      { header: "Tanggal", key: "tanggal", width: 12 },
      { header: "No. kuitansi", key: "nomor", width: 16 },
      { header: "Siswa", key: "siswa", width: 28 },
      { header: "Kelas", key: "kelas", width: 14 },
      { header: "Biaya", key: "biaya", width: 20 },
      { header: "Periode", key: "periode", width: 16 },
      { header: "Metode", key: "metode", width: 10 },
      { header: "Referensi", key: "referensi", width: 24 },
      { header: "Jumlah (Rp)", key: "jumlah", width: 16 },
    ];
    ws.getRow(1).font = { bold: true };
    rows.forEach((r) => ws.addRow({ ...r, metode: r.metode === "tunai" ? "Tunai" : "Transfer" }));
    const total = ws.addRow({ siswa: "Total", jumlah: rows.reduce((a, r) => a + r.jumlah, 0) });
    total.font = { bold: true };
    ws.getColumn("jumlah").numFmt = "#,##0";
    nama = `penerimaan-${dari}-sd-${sampai}.xlsx`;
  } else {
    const rows = await ambilTunggakan(supabase, hari);
    const ws = wb.addWorksheet("Tunggakan");
    ws.columns = [
      { header: "Siswa", key: "siswa", width: 28 },
      { header: "Kelas", key: "kelas", width: 14 },
      { header: "Biaya", key: "biaya", width: 20 },
      { header: "Periode", key: "periode", width: 16 },
      { header: "Jatuh tempo", key: "jatuhTempo", width: 14 },
      { header: "Terlambat", key: "terlambat", width: 10 },
      { header: "No. HP", key: "noHp", width: 16 },
      { header: "Sisa (Rp)", key: "sisa", width: 16 },
    ];
    ws.getRow(1).font = { bold: true };
    rows.forEach((r) => ws.addRow({ ...r, terlambat: r.terlambat ? "Ya" : "" }));
    const total = ws.addRow({ siswa: "Total", sisa: rows.reduce((a, r) => a + r.sisa, 0) });
    total.font = { bold: true };
    ws.getColumn("sisa").numFmt = "#,##0";
    nama = `tunggakan-${hari}.xlsx`;
  }

  const buf = await wb.xlsx.writeBuffer();
  return new Response(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nama}"`,
    },
  });
}
