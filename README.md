# Kohee Break

Storefront satu halaman untuk Kohee Break (kopi botol 250ml), dilengkapi Kohee Studio: admin CMS, katalog dinamis, media R2, checkout WhatsApp tercatat, dan pengelolaan pesanan melalui database D1. Tanpa payment gateway.

**Mulai dari [panduan Kohee Studio](docs/studio.md)** untuk migrasi, bootstrap admin `kohiibreak@gmail.com`, keamanan, pengujian, retensi data, dan deployment. Jalankan `npm run db:migrate` dan `npm run admin:bootstrap` sebelum development pertama.

SvelteKit 3 + Svelte 5 + TypeScript, Tailwind CSS v4, Lucide, di-deploy ke Cloudflare Pages dengan SSR agar publish CMS berlaku tanpa redeploy.

## Arah desain

Japanese retro pop × editorial poster, diturunkan langsung dari materi promosi Kohee Break di [docs/brand-reference/](docs/brand-reference/). Dial: ENERGY 3 / RHYTHM 3 / MOTION 2.

| Keputusan                                                                          | Alasan                                                                                                                                       |
| ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Cream `#F1EADA` dominan, merah `#880B11` sebagai blok besar, ink `#111` untuk teks | Komposisi poster asli. Semua pasangan lolos WCAG AA (merah di cream 8.33:1, ivory di merah 9.87:1, teks muted `#5C534B` 6.27:1).             |
| Anton untuk display, Chakra Petch untuk label, Space Grotesk untuk body            | Anton dipakai di poster "Our Signature"; Chakra Petch paling dekat dengan huruf kotak ala Jepang di poster menu; Space Grotesk sesuai brief. |
| Headline "KURO AREN" berganti warna saat melewati panel merah                      | Trik tipografi dari poster "Our Signature Kuro Aren".                                                                                        |
| Potongan bentuk merah (`hill`, `edge`, `corner`, `wave`)                           | Dijiplak dari bentuk lingkaran besar di poster, bukan blob acak.                                                                             |
| Pola Daruma 5–9% opacity                                                           | Motif latar di poster menu, digambar ulang sebagai SVG line-art.                                                                             |
| Gauge bensin E→F di CTA akhir                                                      | Dari poster "Fuel It Up!".                                                                                                                   |
| Tombol kotak berborder, isi meluncur saat hover                                    | Terasa seperti cap/stempel, cocok dengan gaya poster yang bersudut.                                                                          |
| Satu tema terang                                                                   | Brand-nya cream; tidak ada alasan untuk dark mode.                                                                                           |

Motion: headline hero naik dari mask, botol masuk dengan rotasi, parallax ringan berbasis scroll (CSS `animation-timeline`, tanpa JS), reveal saat scroll, maskot melompat saat item ditambahkan, marquee dengan tombol pause. Semua mati saat `prefers-reduced-motion`.

## Arsitektur

```text
src/
├── env.ts                      # definisi & validasi env publik (WhatsApp, Instagram, URL, fulfillment)
├── routes/
│   ├── +layout.ts              # prerender = false; SSR dari D1
│   ├── +layout.svelte          # font + preload Anton
│   ├── +page.svelte            # susunan section + SEO/Open Graph
│   └── layout.css              # token warna, tipografi, tombol, sheet, keyframes
└── lib/
    ├── products.ts             # kontrak produk storefront; katalog disimpan di D1
    ├── order.ts                # logika murni: qty, harga, validasi, format Rupiah, pesan & URL WhatsApp
    ├── order.test.ts           # unit test logika order
    ├── cart.svelte.ts          # state keranjang reaktif + localStorage, katalog dari server, state overlay
    ├── brand.ts                # nama, tagline, link dari env
    ├── reveal.ts               # action reveal saat scroll (IntersectionObserver)
    ├── assets/                 # foto botol sumber
    └── components/             # Header, Hero, Marquee, Signature, Menu, ProductCard, ProductDialog,
                                # CartDialog, CartFeedback, Story, FinalCta, Footer, Mascot, Shape, QtyStepper
static/                         # mascot.svg (sprite), daruma.svg, favicon, og.png
_headers                        # security headers (digabung adapter ke output Pages)
```

Alur pesan: Menu → Detail (dialog) → Add to Cart → Review keranjang → isi nama/catatan → **Pesan via WhatsApp**. Tombol itu membuka `https://wa.me/{nomor}?text={pesan}`. Keranjang **tidak** dikosongkan otomatis; pelanggan bisa mengosongkannya sendiri setelah chat beres. Halaman tidak pernah menyatakan pesanan "berhasil".

Harga dihitung dari katalog published D1 dan divalidasi ulang di server saat checkout. localStorage hanya menyimpan `id` dan `qty`, dan isinya divalidasi ulang saat dibaca. Checkout membuat catatan Pending Confirmation dan snapshot item sebelum menyiapkan URL WhatsApp.

## Konfigurasi

Salin `.env.example` ke `.env`. Semua nilai **publik** dan di-inline saat build, jadi jangan isi rahasia. WhatsApp, Instagram, dan fulfillment menjadi nilai awal settings D1 pada penggunaan pertama; setelah itu edit melalui Studio. `SITE_URL` tetap konfigurasi build.

| Variabel              | Contoh                                  | Kalau kosong                                                                     |
| --------------------- | --------------------------------------- | -------------------------------------------------------------------------------- |
| `WHATSAPP_NUMBER`     | `6281234567890`                         | Checkout WhatsApp dimatikan dengan pesan yang jelas. Format salah = build gagal. |
| `INSTAGRAM_HANDLE`    | `koheebreak`                            | Link Instagram di footer disembunyikan.                                          |
| `SITE_URL`            | `https://kohee-break.pages.dev`         | `og:image` relatif, preview link di WhatsApp/IG bisa tidak muncul.               |
| `FULFILLMENT_OPTIONS` | `Ambil sendiri,Antar (ongkir via chat)` | Checkout tidak menanyakan cara pengambilan.                                      |

Status stok, harga, produk featured, dan publication sekarang diubah melalui `/admin/products`. Kuro Aren tetap featured pada seed awal, sesuai poster.

## Menjalankan

Butuh Node 22+. `npm ci` (pakai `package-lock.json`) jalan di npm 10.9.8, tapi install tanpa lockfile di npm 10.9.8 crash dengan `Cannot read properties of null (reading 'edgesOut')`, jadi pakai npm 11 kalau menambah dependency.

```bash
npm ci
```

```bash
npm run db:migrate
npm run admin:bootstrap
npm run dev
```

```bash
npm run lint && npm run check && npm test && npm run build
```

```bash
npm run preview
```

`preview` menjalankan hasil build dengan `wrangler pages dev` pada port 4173, sama seperti di Cloudflare Pages.

## Deploy ke Cloudflare Pages

Siapkan binding D1/R2 dan jalankan migrasi remote/bootstrap sesuai [docs/studio.md](docs/studio.md) terlebih dahulu.

Target deploy: akun Cloudflare **Rizky Herdiansyah**, project Pages `kohee-break` (nama dari `wrangler.jsonc`). Semua variabel di bawah dimasukkan ke HTML saat build, jadi set sebagai variabel **build**, bukan runtime.

**Opsi A, Git (disarankan):** Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git → `rizkyher/kohee.break`.

- Framework preset: SvelteKit
- Build command: `npm run build`
- Build output directory: `.svelte-kit/cloudflare`
- Environment variables (Production): `WHATSAPP_NUMBER`, `INSTAGRAM_HANDLE`, `SITE_URL`, opsional `FULFILLMENT_OPTIONS`, plus `NODE_VERSION=22`

**Opsi B, dari lokal dengan Wrangler:** pastikan login ke akun Rizky Herdiansyah, isi `.env`, lalu:

```bash
npx wrangler logout && npx wrangler login
```

```bash
npx wrangler whoami
```

```bash
npx wrangler pages project create kohee-break --production-branch main
```

```bash
npm run deploy
```

Perintah `project create` cukup sekali. Setelah dapat domain `*.pages.dev`, isi `SITE_URL` dengan domain itu lalu deploy ulang supaya preview link (Open Graph) memakai URL absolut.

## Aset

- Botol: dipotong dari poster asli dengan subject lifting bawaan macOS (Vision), tanpa mengubah label. Jarum gauge yang menempel di poster "Fuel It Up!" dihapus.
- Maskot: di-trace ke vektor dari logo asli (`static/mascot.svg`), diwarnai lewat `currentColor`.
- Daruma: gambar SVG line-art orisinal. Referensi gaya (mata berlapis, alis tebal, kumis melingkar, 福 di perut, garis lengkung di badan) dari pencarian Pinterest "daruma line art"; pin-nya tidak disalin atau di-trace karena lisensinya tidak jelas.
- Bentuk merah: digambar ulang sebagai SVG mengikuti poster.
- `static/og.png`: dirender dari aset di atas.

### Kebutuhan aset tambahan

1. **Foto botol terisolasi resolusi tinggi** (PNG transparan, minimal 1200px tinggi). Cutout sekarang hanya ~335×629 (latte) dan ~419×768 (Chocori), sedikit lembut di layar retina.
2. **Foto per varian**. Kuro Aren, Amai Scotch, dan Kuro Latte memakai foto botol yang sama karena kemasannya identik; label atau tutup yang membedakan rasa akan membantu.
3. **Logo/wordmark vektor resmi** "KOHEE BREAK" seperti di label botol. Header saat ini memakai maskot + nama dalam Anton.

## Catatan

- Format pesan WhatsApp memakai tanda "—" persis seperti contoh di brief.
- Belum dibuat: sinkronisasi keranjang antar-tab, menyimpan nama pelanggan, structured data (JSON-LD butuh alamat/jam buka yang belum ada).

## Delivery & shipping

Pengaturan origin, ongkir berbasis rute jalan, dan konfigurasi MapLibre/PMTiles/OSRM tersedia dalam [panduan Smart Delivery](docs/delivery.md). Pengiriman nonaktif sampai admin menetapkan origin dan mengonfigurasi provider.
