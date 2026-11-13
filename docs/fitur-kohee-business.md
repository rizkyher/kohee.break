# Inventaris fitur Kohee Break — Manajemen Bisnis

Tanggal pemeriksaan: 7 November 2026 (Asia/Jakarta).
Sumber: https://kohee-break-business-dpen.bolt.host/#penjualan

Catatan ini berdasarkan penelusuran langsung seluruh menu utama dan formulir melalui akun yang diizinkan pemilik. Tidak ada penyimpanan formulir, penghapusan, reset, transaksi, atau perubahan status bisnis. Formulir tambah dibuka untuk membaca field lalu ditutup. Daftar ini mencatat antarmuka yang tersedia, bukan jaminan seluruh proses backend sudah benar atau terintegrasi dengan storefront kohee-break.pages.dev. Kredensial dan data pribadi pelanggan tidak disalin ke dokumen.

## 1. Akun dan navigasi

- Login email dan password; sudah berhasil digunakan.
- Tampilkan/sembunyikan password.
- Tombol pendaftaran akun tersedia di halaman login; alur pendaftaran tidak dijalankan.
- Logout.
- Identitas pengguna/admin dan identitas usaha pada navigasi.
- Sembilan menu utama: Dashboard, Produk & Resep, Inventaris, Penjualan & PO, Keuangan, Waste, Pelanggan, Laporan, Setting.
- Menu samping dengan tombol buka/tutup pada tampilan yang sesuai.
- Header tanggal dan nama aplikasi.

## 2. Dashboard

- Ringkasan total pendapatan, laba kotor, total pengeluaran, dan laba bersih.
- Saldo enam dompet: HPP, biaya produksi, ongkir, profit, waste, dan kas kemajuan usaha.
- Tabel transaksi terakhir: tanggal, produk, total, laba, dan status.
- Peringkat produk terlaris, jumlah terjual, dan pendapatan produk.
- Peringatan stok rendah beserta akses ke inventaris.
- Peringatan bahan kedaluwarsa, mencantumkan nama bahan dan tanggal.

## 3. Produk & Resep

### Katalog internal

- Daftar dan pencarian produk.
- Formulir tambah produk; kontrol edit dan hapus pada baris produk.
- Nama produk.
- Kategori: Coffee, Non-Coffee, Paket.
- Ukuran botol dalam ml.
- Harga jual.
- Biaya produksi per produk.
- Persentase waste per produk, dihitung dari HPP bahan resep.
- Status Aktif / Non-Aktif.
- Ringkasan HPP, biaya produksi, total modal, laba per porsi, margin, persentase waste, dan status.
- Preview kalkulasi modal, laba per porsi, dan margin dalam formulir.

### Resep dan kalkulasi

- Klik nama produk untuk membuka editor resep.
- Pemilihan bahan dari inventaris, termasuk bahan minuman dan kemasan.
- Jumlah bahan, satuan, harga per satuan, dan subtotal setiap bahan.
- Tambah dan hapus baris bahan dalam formulir resep.
- Total HPP resep.
- Total volume cairan dibandingkan kapasitas botol.
- Peringatan resep melebihi ukuran botol.
- Tombol simpan resep dan batal.

## 4. Inventaris

- Daftar dan pencarian bahan baku/kemasan.
- Ringkasan jumlah bahan, total nilai stok, dan jumlah bahan dengan stok rendah.
- Kolom nama, satuan, stok, harga satuan, nilai stok, stok minimum, dan tanggal kedaluwarsa.
- Formulir tambah bahan; kontrol edit dan hapus pada baris bahan.
- Satuan bahan: ml, gram, pcs.
- Stok awal, harga per satuan, stok minimum, tanggal kedaluwarsa opsional.
- Preview nilai stok pada formulir bahan.
- Formulir Tambah Stok: stok saat ini, jumlah penambahan, alasan, dan tanggal.
- Pilihan alasan pada formulir stok: Beli, Produksi, Waste, Rusak. Arah perubahan stok untuk masing-masing alasan belum diuji.
- Riwayat perubahan stok; saat pemeriksaan tampil keadaan kosong.

## 5. Penjualan & PO

### Daftar pesanan

- Membuat PO / mencatat penjualan.
- Pencarian dan filter rentang tanggal.
- Filter Semua dan status Baru Masuk, DP Masuk, Produksi, Siap Kirim, Terkirim, Selesai, Batal.
- Pemilih status langsung pada baris pesanan.
- Kontrol edit dan hapus pesanan.
- Tabel kode PO, tanggal, pelanggan, item, nilai penjualan, ongkir, DP, dan status.
- Kode PO berurutan terlihat pada daftar dan formulir baru.
- Ringkasan total penjualan, HPP bahan, biaya produksi, ongkir, dan net margin.

### Formulir pesanan

- Nama pelanggan melalui combo box, nomor WhatsApp, alamat kirim.
- Tanggal order dan tanggal kirim.
- Pesanan dengan beberapa baris produk.
- Pilih produk, jumlah, harga, dan subtotal tiap baris.
- Tambah dan hapus baris produk sebelum menyimpan.
- Ongkir sebagai komponen terpisah menuju dompet ongkir.
- Diskon dan DP.
- Nama kurir.
- Metode bayar: Cash, Transfer, QRIS. Ini pilihan pencatatan; integrasi pembayaran/QRIS otomatis belum dibuktikan.
- Status PO saat pembuatan.
- Ringkasan subtotal, diskon, total penjualan, ongkir terpisah, tagihan pelanggan, DP, dan sisa bayar.
- Preview subtotal dan total berubah ketika produk ditambahkan; tanpa menyimpan pesanan.

## 6. Keuangan

### Dompet dan alokasi

- Ringkasan total pengeluaran dan pemasukan lain.
- Enam dompet: HPP, biaya produksi, ongkir, profit, waste, kas kemajuan usaha.
- Keterangan alokasi HPP dan biaya produksi penuh dari penjualan; ongkir dari PO.
- Alokasi waste berdasarkan HPP resep × persentase waste per produk.
- Pembagian sisa net margin setelah waste ke profit dan kas kemajuan usaha.
- Editor persentase profit dan kas kemajuan, dengan indikator jumlah persentase 100%.
- Nilai pengaturan yang terlihat saat diperiksa: profit 70%, kas kemajuan 30%.

### Pengeluaran

- Daftar pengeluaran: tanggal, kategori, nominal, sumber dompet, keterangan.
- Formulir tambah pengeluaran dan kontrol hapus pada daftar.
- Pilihan kategori: Listrik, Air, Gas, Sarung Tangan, Masker, Es, Sabun Cuci, Ongkir, Beli Alat, Gaji, Lainnya.
- Pemilihan sumber dari enam dompet.

### Pemasukan lain

- Tab dan daftar pemasukan di luar penjualan.
- Tanggal, sumber pemasukan, nominal, dompet tujuan, dan keterangan.
- Formulir tambah pemasukan.
- Pemilihan tujuan dari enam dompet.

## 7. Waste

- Ringkasan nilai waste bulan ini, jumlah botol waste, dan jumlah pencatatan.
- Riwayat waste: tanggal, produk, jumlah botol, alasan, nilai waste.
- Formulir pencatatan waste dengan tanggal, produk, jumlah botol, dan alasan.
- Alasan: Susu Basi, Botol Bocor, Gagal Racik, Tumpah, PO Batal, Expired.
- Menampilkan HPP per botol dan nilai waste otomatis.
- Nilai awal satu botol pada formulir sesuai HPP produk yang dipilih.

## 8. Pelanggan

- Daftar dan pencarian pelanggan.
- Ringkasan total pelanggan, pelanggan langganan, dan reseller.
- Formulir tambah pelanggan; kontrol detail, edit, dan hapus per baris.
- Nama, nomor WhatsApp, alamat, tag.
- Tag: Baru, Langganan, Reseller.
- Jumlah order, total belanja, dan menu favorit pada daftar.
- Detail pelanggan dengan identitas serta riwayat order.
- Keadaan kosong riwayat order saat pelanggan belum memiliki transaksi terhubung.

## 9. Laporan

- Pilihan periode Harian, Mingguan, Bulanan.
- Pemilih bulan terlihat pada tampilan awal laporan.
- Tombol Export Excel dan Export PDF tersedia; file hasil ekspor belum diunduh atau diperiksa.
- Ringkasan omzet, HPP bahan, biaya produksi, net margin, ongkir, profit, waste wallet, kas kemajuan.
- Grafik omzet harian.
- Tabel detail per periode dan baris total untuk metrik keuangan tersebut.
- Peringkat menu terlaris berdasarkan jumlah terjual.
- Peringkat menu paling untung berdasarkan nominal laba.
- Bagian berlabel Menu Paling Rugi yang menampilkan persentase margin. Label ini tidak membuktikan bahwa produk benar-benar rugi; contoh yang terlihat masih bermargin positif.

## 10. Setting

- Profil usaha: nama usaha, nomor WhatsApp, alamat.
- Bagian logo usaha masih eksplisit bertuliskan "Klik untuk upload logo (placeholder)"; belum dianggap fitur unggah selesai.
- Ringkasan pembagian profit dan kas kemajuan, dengan petunjuk mengaturnya melalui Keuangan.
- Pengaturan biaya produksi default untuk botol 250 ml dan 1 liter.
- Pengaturan stok minimum default bahan cair (ml) dan botol (pcs).
- Tombol Simpan Setting.
- Tombol Reset Data ke Awal tersedia; tidak ditekan dan mekanisme pemulihannya belum diperiksa.

## Batas pemeriksaan dan temuan yang perlu dibedakan

- Seluruh sembilan menu utama dan formulir utama telah dilihat; login berhasil, navigasi dan pembukaan formulir bekerja.
- Simpan, edit permanen, hapus, reset, perubahan status, perubahan saldo, pengurangan stok otomatis, ekspor, dan pendaftaran tidak dieksekusi. Dampak backend, validasi lanjutan dan hak akses belum diaudit.
- Belum terbukti ada sinkronisasi aplikasi ini dengan storefront utama, impor order WhatsApp, payment gateway, atau kalkulasi ongkir peta otomatis di aplikasi bisnis ini.
- Nomor WhatsApp pada Setting aplikasi bisnis berbeda dari nomor storefront yang sudah diganti sebelumnya. Tidak diubah karena permintaan kali ini hanya pencatatan.
- Di laporan awal, pemilih bulan menampilkan November 2026 namun tabel/grafik masih memuat transaksi Oktober 2026. Perilaku filter periode perlu diuji sebelum laporan dijadikan acuan final.
- Saldo dompet dashboard/keuangan yang tampil nol berbeda dari nilai alokasi di laporan. Ini pengamatan antarmuka, bukan diagnosis akar masalah.
