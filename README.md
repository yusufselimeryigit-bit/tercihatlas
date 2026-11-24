# TercihAtlas — YKS 2027 Tercih & Üniversite Rehberi

YÖK Atlas program kodu veya doğrudan sayfa linki ile üniversite bölümlerini tek tıkla çeken; **4 yıllık taban sıralama/puan trendlerini**, **son yerleşen TYT/AYT/YDT net ortalamalarını**, **kontenjan, eğitim dili, akademik kadro ve akreditasyon** bilgilerini Apple/Linear tarzı sade bir arayüzde takip etmeni sağlayan PWA uygulaması.

## Özellikler
- **Canlı YÖK Atlas Veri Çekme:** 9 haneli program kodunu (ör. `102210277`) veya YÖK Atlas linkini yapıştır, tüm veriler otomatik gelsin (toplu kod yapıştırma destekli).
- **4 Yıllık Trend & Net Analizi:** 2023–2026 taban sıralama/puan grafiği + son yerleşenlerin ders bazlı TYT/AYT/YDT net ortalamaları ve OBP.
- **Kart ↔ Kompakt Tablo Geçişi:** Tek tıkla detaylı kartlar veya hızlı tablo görünümü.
- **Sürükle-Bırak Tercih Sıralaması:** ÖSYM listesi gibi sırala, **Hayal / Hedef / Güvenli** etiketle, artı/eksi not ve yıldız puanı ekle.
- **Yan Yana Karşılaştırma & Analiz:** En fazla 4 bölümü yan yana kıyasla, logaritmik sıralama haritasında hedef sıralamanla konumunu gör.
- **Kişisel Anahtar ile Bulut Senkronizasyonu:** Mac, iPhone ve iPad arasında ücretsiz Cloudflare Workers + KV ile anlık eşitleme.
- **Yurt Dışına Hazır Mimari:** Veri modeli `TR` aktif, `DE / IT` (Almanya & İtalya) Faz 2'ye hazır.

## Yerel Çalıştırma
```bash
node dev-server.mjs
# http://127.0.0.1:4173
```

## Cloudflare Worker (Ücretsiz API + Bulut Sync) Yayınlama
```bash
cd worker
npm install
npx wrangler login
npx wrangler kv namespace create TERCIH_KV
# Çıkan id değerini worker/wrangler.jsonc içine yazıp:
npx wrangler deploy
```
