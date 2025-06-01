# İçindekiler

1. [Kontrat Genel Bakış](#kontrat-genel-bakış)
2. [Ön Gereksinimler](#ön-gereksinimler)
3. [Kontrat Detayları](#kontrat-detayları)
4. [Test Ağı Kurulumu](#test-ağı-kurulumu)
   - [Docker Image ve Test Ağı](#1-docker-image-çekme-ve-test-ağı-başlatma)
   - [Ağ Durumu Kontrolü](#2-test-ağı-durumunu-kontrol)
5. [Geliştirme Adımları](#geliştirme-adımları)
   - [Kontrat Kurulumu](#1-kontrat-kurulumu)
   - [Test Hesapları](#test-hesabı-kurulumu)
   - [Kontrat Dağıtımı](#3-kontrat-dağıtımı-ve-id-yönetimi)
   - [Kontrat Başlatma](#4-kontrat-başlatma)
6. [Test Komutları](#test-komutları)
7. [Sorun Giderme](#sorun-giderme)
8. [Güvenlik Önerileri](#güvenlik-önlemleri)

# BlockchainNote Smart Contract Dokümantasyonu

## Kontrat Genel Bakış
BlockchainNote, Soroban platformunda geliştirilmiş bir not tutma ve yönetme kontratıdır. Kullanıcılar blockchain üzerinde notlar oluşturabilir, güncelleyebilir ve silebilir.

## Ön Gereksinimler
1. **Docker Desktop**: Test ağını çalıştırmak için gerekli
2. **Rust**: `rustup` ile kurulum
3. **Soroban CLI**: Kontrat etkileşimleri için gerekli
4. **WSL** (Windows kullanıcıları için): Linux komutlarını çalıştırmak için

## Kontrat Detayları
- **Contract ID**: `<CONTRACT_ID>` (Dağıtım sırasında oluşturulacak)
- **Network**: Standalone Test Network (Yerel geliştirme ağı)
- **Version**: 1.0.0

> **Not**: Contract ID her dağıtımda benzersiz olacaktır. Dağıtımdan sonra bu ID'yi kaydetmeyi unutmayın.

## Test Ağı Kurulumu

### 1. Docker Image Çekme ve Test Ağı Başlatma
```bash
# Stellar Quickstart image'ını çek
docker pull stellar/quickstart:testing

# Test ağını başlat
docker run --rm -it -p 8000:8000 --name stellar stellar/quickstart:testing --standalone
```
> **Önemli**: Container başlatıldıktan sonra initialization için 15-20 saniye bekleyin. Bu süre zarfında ağ hazır hale gelecektir.

### 2. Test Ağı Durumunu Kontrol
```bash
# Horizon API'nin çalıştığını kontrol et
curl "http://localhost:8000/.well-known/stellar.toml"
```

## Geliştirme Adımları

### 1. Kontrat Kurulumu
```bash
# WebAssembly target'ını ekle
rustup target add wasm32-unknown-unknown

# Kontrat derlemesi
cargo build --target wasm32-unknown-unknown --release

# Network konfigürasyonu
soroban network add standalone \
  --rpc-url http://localhost:8000/soroban/rpc \
  --network-passphrase "Standalone Network ; February 2017"
```

## Test Hesabı Kurulumu

### 1. Test Hesabı Oluşturma
Kontratla etkileşime geçmeden önce bir test hesabı oluşturmanız gerekiyor. Bu hesap, notlarla etkileşimi test etmek için kullanılacak.

```bash
# Test hesabını oluştur - bu ana geliştirici hesabı olacak
soroban keys generate test1
```

Hesap için oluşturulan genel (public) ve gizli (secret) anahtarları kaydedin - bunlara daha sonra ihtiyacınız olacak.

### 2. Test Hesabını Fonlama
Test hesabının işlem ücretlerini ödemek ve kontratla etkileşime geçmek için fona ihtiyacı var. Bunun için Stellar test ağının Friendbot servisini kullanacağız.

```bash
# Test1 için public key'i al
export TEST1_ADDRESS=$(soroban keys address test1)

# Hesabı fonla
curl "http://localhost:8000/friendbot?addr=$TEST1_ADDRESS"
```

> **Test hesabına neden ihtiyacımız var?**
> 1. Blockchain üzerindeki her işlem, geçerli bir hesaptan imza gerektirir
> 2. İşlemlerin lumen (XLM) cinsinden ödenmesi gereken ücretleri vardır
> 3. Hesap, erişim kontrolü ve sahiplik özelliklerini test etmemize yardımcı olur

### 3. Hesap Kurulumunu Doğrulama
Hesabınızın doğru şekilde fonlandığını bakiyesini kontrol ederek doğrulayabilirsiniz:

```bash
soroban contract invoke \
  --network standalone \
  --source test1 \
  -- \
  get_balance \
  --id $TEST1_ADDRESS
```

### 2. Test Hesabı Oluşturma ve Fonlama
```bash
# Test hesabı oluştur
soroban keys generate test1

# Hesabın public key'ini al
TEST_ADDRESS=$(soroban keys address test1)

# Hesabı test tokenleri ile fonla
curl "http://localhost:8000/friendbot?addr=$TEST_ADDRESS"
```
> **Not**: Test hesabının adresini bir değişkende saklayarak daha sonraki komutlarda kolayca kullanabilirsiniz.

### 3. Kontrat Dağıtımı ve ID Yönetimi

```bash
# Kontratı dağıt ve ID'sini kaydet
CONTRACT_ID=$(soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/stellar_notes_contract.wasm \
  --source test1 \
  --network standalone \
  --fee 100000 | tail -n 1)

# Contract ID'yi gelecekteki kullanım için kaydet
echo "export CONTRACT_ID=$CONTRACT_ID" >> ~/.bashrc
echo "Contract ID: $CONTRACT_ID"
```

> **Önemli**: Contract ID, kontratınızın blockchain üzerindeki benzersiz adresidir. Kontratla yapacağınız tüm etkileşimlerde bu ID'ye ihtiyacınız olacak. Şunlara dikkat edin:
> 1. Dağıtımdan hemen sonra kaydedin
> 2. Elle yazmamak için ortam değişkenlerini kullanın
> 3. Güvenli tutun - bu ID'ye sahip herkes kontratınızla etkileşime geçmeyi deneyebilir

### 4. Kontrat Başlatma
Dağıtımdan sonra, kontratın temel yapılandırması ile başlatılması gerekir:

```bash
# Kontratı geliştirici cüzdanı ve not ücreti ile başlat
soroban contract invoke \
  --id $CONTRACT_ID \
  --source test1 \
  --network standalone \
  -- \
  initialize \
  --dev_wallet $(soroban keys address test1) \
  --note_fee 1000000
```

> **Neden başlatma (initialize) gerekli?**
> 1. Not oluşturma ücretlerini alacak geliştirici cüzdanını ayarlar
> 2. Not oluşturma/güncelleme için temel ücreti belirler
> 3. Dahili depolama ve sayaçları başlatır
> 4. Sadece bir kez yapılabilir - sonraki denemeler başarısız olur
>
> **Not Ücreti**: Ücret (örnekte 1000000) stroop cinsindendir (1 XLM = 10^7 stroop).
> Bu değeri dikkatli ayarlayın çünkü kullanıcı maliyetlerini ve kontratın sürdürülebilirliğini etkiler.

## Test Komutları

### Not Oluşturma
```bash
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source test1 \
  --network standalone \
  -- \
  create_note \
  --owner $(soroban keys address test1) \
  --title "Test Note" \
  --ipfs_hash "QmTest123"
```

### Kullanıcı Notlarını Görüntüleme
```bash
soroban contract invoke \
  --id <CONTRACT_ID> \
  --source test1 \
  --network standalone \
  -- \
  get_user_notes \
  --user $(soroban keys address test1)
```

## Sorun Giderme

### Docker Container Yeniden Başlatma Durumu
Eğer Docker container kapanırsa veya yeniden başlatılırsa:
```bash
# Container'ı yeniden başlat
docker start stellar

# 15-20 saniye bekle
Start-Sleep -Seconds 15

# Test hesabını yeniden fonla
curl "http://localhost:8000/friendbot?addr=$TEST_ADDRESS"

# Network ayarlarını güncelle
soroban network rm standalone
soroban network add standalone \
  --rpc-url http://localhost:8000/soroban/rpc \
  --network-passphrase "Standalone Network ; February 2017"
```

### Contract ID Kaybedilme Durumu
```bash
# Tüm kontratları listele
soroban contract list \
  --source test1 \
  --network standalone
```

## Güvenlik Önlemleri

### 1. Anahtar Yönetimi
Geliştirme ve test anahtarlarınızı güvende tutun:

```powershell
# Anahtarları ortam değişkenlerinde saklayın
$env:TEST1_SECRET = "SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
$env:TEST1_PUBLIC = "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"

# Bunları asla loglarda görünür kılmayın
soroban contract invoke \
    --id $env:CONTRACT_ID \
    --source test1 \
    --network standalone \
    -- \
    get_user_notes \
    --user $env:TEST1_PUBLIC  # Sorgular için public key kullanın
```
