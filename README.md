# 📝 Stellar-Soroban Not Uygulaması (BlockchainNote)

Bu proje, **Stellar ve Soroban** kullanarak oluşturulmuş, blockchain tabanlı güvenli bir not tutma uygulamasıdır. Notlarınızı güvenli bir şekilde kaydedin ve yönetin.

## 🚀 Özellikler

- 🌐 **Next.js** tabanlı modern frontend
- 📜 **Rust / Soroban** akıllı sözleşme entegrasyonu (Not kaydı için)
- 🔑 **Freighter cüzdan** bağlantısı
- 💾 Notları blockchain'e (Soroban) kaydetme (şu an mock)
- 🎨 Şık ve sezgisel kullanıcı arayüzü (Tailwind CSS ile)

## 📂 Proje Yapısı

```bash
/contract             # Rust/Soroban akıllı sözleşme kodları (varsa)
/client               # Next.js uygulaması
/client/app           # Uygulama sayfaları ve bileşenleri
/client/app/globals.css # Global stiller
/client/app/tailwind.config.js # Tailwind yapılandırması
/README.md            # Bu döküman!
```

## 🛠️ Kurulum

1️⃣ **Repoyu klonlayın:**
```bash
git clone https://github.com/ksyusuf/BlockchainNote
cd BlockchainNote
```

2️⃣ **Bağımlılıkları yükleyin:**
```bash
npm install
cd client
npm install
cd ..
```

3️⃣ **Geliştirme sunucusunu başlatın:**
```bash
npm run dev
```
Tarayıcıda `http://localhost:3000` adresini açın.

4️⃣ **Akıllı sözleşmeyi build etmek (eğer `contract` klasörü varsa):**
```bash
cd contract
cargo build --target wasm32-unknown-unknown --release
```

## ⚙️ Kullanım

- Ana sayfada Freighter cüzdanınızı bağlayın.
- Yeni not oluştur formunu kullanarak not başlığı ve içeriğini girin.
- Notunuzu kaydettiğinizde (şu an mock işlem), blockchain'e kaydedilmiş gibi listeye eklenecektir.

## 📸 Ekran Görüntüleri

(Buraya uygulamanızın ekran görüntüsünü ekleyebilirsiniz)

![Uygulama ekran görüntüsü](./screenshots/note-app.png)
(Eğer `screenshots` klasörü ve içinde `note-app.png` varsa bu satırı bırakın, yoksa kaldırın veya güncelleyin)

## 📄 Lisans

Bu proje [MIT Lisansı](LICENSE) ile lisanslanmıştır.

---

✨ **Katkıda bulunmak isterseniz:**  
- PR'larınızı bekliyoruz!  
- Yeni özellik önerileri ve hata bildirimleri açabilirsiniz.

---

🔗 **Bağlantılar:**
- 🌐 [Stellar Developer Docs](https://developers.stellar.org/docs/)
- 🔧 [Soroban Dökümantasyon](https://soroban.stellar.org/docs)
- 💼 [Freighter Wallet](https://freighter.app/)

---

> **Not:** Projenizi tam olarak çalıştırmak ve notları gerçekten blockchain'e kaydetmek için Soroban smart contract'ı yazmanız, deploy etmeniz ve `client/app/page.tsx` dosyasındaki mock fonksiyonları gerçek contract çağrılarıyla değiştirmeniz gerekmektedir.
