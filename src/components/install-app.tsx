"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

/** Tombol "Pasang aplikasi" pada halaman masuk: Chrome Android memakai dialog pemasangan, iPhone diberi petunjuk. */
export function InstallApp() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [selesaiPasang, setSelesaiPasang] = useState(false);
  const klien = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const standalone = klien && (window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
  const ios = klien && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const terpasang = standalone || selesaiPasang;

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
    };
    const onInstalled = () => {
      setEvent(null);
      setSelesaiPasang(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  if (terpasang || (!event && !ios)) return null;

  async function pasang() {
    if (!event) return;
    await event.prompt();
    await event.userChoice;
    setEvent(null);
  }

  return (
    <section className="form" aria-label="Pasang aplikasi" style={{ marginTop: "1.25rem" }}>
      {event ? (
        <>
          <button type="button" className="btn btn--outline" onClick={pasang}>
            Pasang aplikasi di ponsel
          </button>
          <p className="hint">Ikon portal akan muncul di layar utama dan terbuka layar penuh seperti aplikasi.</p>
        </>
      ) : (
        <p className="hint">
          Pasang di iPhone: buka dengan Safari, ketuk tombol Bagikan, lalu pilih <strong>Tambah ke Layar Utama</strong>.
        </p>
      )}
    </section>
  );
}
