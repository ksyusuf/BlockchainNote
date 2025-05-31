# İçindekiler

1. [Kontrat Genel Bakış](#contract-overview)
2. [Ön Gereksinimler](#ön-gereksinimler)
3. [Kontrat Detayları](#contract-details)
4. [Test Ağı Kurulumu](#test-ağı-kurulumu)
   - [Docker Image ve Test Ağı](#1-docker-image-çekme-ve-test-ağı-başlatma)
   - [Ağ Durumu Kontrolü](#2-test-ağı-durumunu-kontrol)
5. [Geliştirme Adımları](#development-steps)
   - [Kontrat Kurulumu](#1-contract-setup)
   - [Test Hesapları](#test-account-setup)
   - [Kontrat Dağıtımı](#3-contract-deployment-and-id-management)
   - [Kontrat Başlatma](#4-contract-initialization)
6. [Kontrat Fonksiyonları](#contract-functions)
7. [Veri Yapıları](#data-structures)
8. [Test Komutları](#test-commands)
9. [Sorun Giderme](#troubleshooting)
10. [Sık Karşılaşılan Sorunlar](#common-issues-and-solutions)
11. [IPFS ve Not Yönetimi](#working-with-ipfs-and-notes)
12. [Güvenlik Önerileri](#security-considerations)

# BlockchainNote Smart Contract Documentation

## Contract Overview
BlockchainNote, Soroban platformunda geliştirilmiş bir not tutma ve yönetme kontratıdır. Kullanıcılar blockchain üzerinde notlar oluşturabilir, güncelleyebilir ve silebilir. Her not IPFS üzerinde depolanır ve blockchain'de sadece referans hash'leri tutulur.

## Ön Gereksinimler
1. **Docker Desktop**: Test ağını çalıştırmak için gerekli
2. **Rust**: `rustup` ile kurulum
3. **Soroban CLI**: Kontrat etkileşimleri için gerekli
4. **WSL** (Windows kullanıcıları için): Linux komutlarını çalıştırmak için

## Contract Details
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

## Development Steps

### 1. Contract Setup
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

## Test Account Setup

### 1. Test Hesaplarını Oluşturma
Kontratla etkileşime geçmeden önce iki test hesabı oluşturmanız gerekiyor. Bu hesaplar, farklı kullanıcıların notlarla etkileşimini simüle etmek için kullanılacak.

```bash
# İlk test hesabını oluştur - bu ana geliştirici hesabı olacak
soroban keys generate test1

# İkinci test hesabını oluştur - bu kullanıcı etkileşimlerini test etmek için kullanılacak
soroban keys generate test2
```

Her hesap için oluşturulan genel (public) ve gizli (secret) anahtarları kaydedin - bunlara daha sonra ihtiyacınız olacak.

### 2. Test Hesaplarını Fonlama
Test hesaplarının işlem ücretlerini ödemek ve kontratla etkileşime geçmek için fona ihtiyacı var. Bunun için Stellar test ağının Friendbot servisini kullanacağız.

```bash
# Get the public key for test1
export TEST1_ADDRESS=$(soroban keys address test1)

# Get the public key for test2
export TEST2_ADDRESS=$(soroban keys address test2)

# Fund both accounts
curl "http://localhost:8000/friendbot?addr=$TEST1_ADDRESS"
curl "http://localhost:8000/friendbot?addr=$TEST2_ADDRESS"
```

> **Test hesaplarına neden ihtiyacımız var?**
> 1. Blockchain üzerindeki her işlem, geçerli bir hesaptan imza gerektirir
> 2. İşlemlerin lumen (XLM) cinsinden ödenmesi gereken ücretleri vardır
> 3. Farklı hesaplar, erişim kontrolü ve sahiplik özelliklerini test etmemize yardımcı olur

### 3. Hesap Kurulumunu Doğrulama
Hesaplarınızın doğru şekilde fonlandığını bakiyelerini kontrol ederek doğrulayabilirsiniz:

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

### 3. Contract Deployment and ID Management

```bash
# Deploy the contract and save its ID
CONTRACT_ID=$(soroban contract deploy \
  --wasm target/wasm32-unknown-unknown/release/stellar_notes_contract.wasm \
  --source test1 \
  --network standalone \
  --fee 100000 | tail -n 1)

# Save the contract ID for future use
echo "export CONTRACT_ID=$CONTRACT_ID" >> ~/.bashrc
echo "Contract ID: $CONTRACT_ID"
```

> **Önemli**: Contract ID, kontratınızın blockchain üzerindeki benzersiz adresidir. Kontratla yapacağınız tüm etkileşimlerde bu ID'ye ihtiyacınız olacak. Şunlara dikkat edin:
> 1. Dağıtımdan hemen sonra kaydedin
> 2. Elle yazmamak için ortam değişkenlerini kullanın
> 3. Güvenli tutun - bu ID'ye sahip herkes kontratınızla etkileşime geçmeyi deneyebilir

### 4. Contract Initialization
After deployment, the contract needs to be initialized with its basic configuration:

```bash
# Initialize the contract with the developer wallet and note fee
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

## Contract Functions

### 1. Initialize
- **Function**: `initialize(env: Env, dev_wallet: Address, note_fee: i128)`
- **Description**: Kontratı başlatır ve temel parametreleri ayarlar
- **Parameters**:
  - `dev_wallet`: Geliştirici cüzdan adresi
  - `note_fee`: Not oluşturma/güncelleme ücreti

### 2. Create Note
- **Function**: `create_note(env: Env, owner: Address, title: String, ipfs_hash: String) -> u64`
- **Description**: Yeni not oluşturur
- **Returns**: Oluşturulan notun ID'si

### 3. Get User Notes
- **Function**: `get_user_notes(env: Env, user: Address) -> Vec<Note>`
- **Description**: Kullanıcının tüm aktif notlarını getirir

### 4. Delete Note
- **Function**: `delete_note(env: Env, note_id: u64, owner: Address) -> bool`
- **Description**: Notu soft-delete yapar

### 5. Update Note
- **Function**: `update_note(env: Env, note_id: u64, owner: Address, new_title: String, new_ipfs_hash: String) -> bool`
- **Description**: Mevcut notu günceller

## Data Structures

### Note Structure
```rust
pub struct Note {
    pub id: u64,
    pub owner: Address,
    pub title: String,
    pub ipfs_hash: String,
    pub timestamp: u64,
    pub is_active: bool,
}
```

### Storage Keys
```rust
pub enum DataKey {
    NoteCounter,
    Note(u64),
    UserNotes(Address),
    DevWallet,
    NoteFee,
}
```

## Test Commands

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

## Troubleshooting

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

## Sık Karşılaşılan Sorunlar ve Çözümleri

### 1. Kimlik Doğrulama Hataları
"Authentication Error" veya "Not authorized" hatasını görürseniz:
- Doğru hesabı kullandığınızdan emin olun (--source parametresi)
- Hesapta yeterli bakiye olduğunu kontrol edin
- Not güncelleme/silme işlemleri için notun sahibi olduğunuzdan emin olun

```bash
# Check account balance
soroban contract invoke \
  --network standalone \
  --source test1 \
  -- \
  get_balance \
  --id $TEST1_ADDRESS

# Fund account if needed
curl "http://localhost:8000/friendbot?addr=$TEST1_ADDRESS"
```

### 2. Ağ Bağlantı Sorunları
Komutlar ağ hatalarıyla başarısız olursa:

1. Docker container'ını kontrol edin:
```bash
docker ps | grep stellar
# Çalışmıyorsa:
docker start stellar
sleep 15  # Başlatma için bekleyin
```

2. RPC uç noktasını doğrulayın:
```bash
curl http://localhost:8000/soroban/rpc
```

3. Gerekirse ağı yeniden yapılandırın:
```bash
soroban network rm standalone
soroban network add standalone \
  --rpc-url http://localhost:8000/soroban/rpc \
  --network-passphrase "Standalone Network ; February 2017"
```

### 3. Kontrat Etkileşim Hataları
Kontrat çağrıları başarısız olduğunda:

1. Kontrat durumunu kontrol edin:
```bash
# Kontratın var olduğunu doğrulayın
soroban contract list --source test1 --network standalone

# Kontratın başlatılıp başlatılmadığını kontrol edin
soroban contract invoke \
  --id $CONTRACT_ID \
  --source test1 \
  --network standalone \
  -- \
  get_dev_wallet
```

2. Sık karşılaşılan hata kodları:
- `SCCC` (Kontrat Kısıtlama Kontrolü): Girdi doğrulama hatası
- `SCHC` (Host Kontrat Çağrısı): Kontrat yürütme hatası
- `SDRP` (Veri Kaydı Önkoşulu): Depolama durumu uyuşmazlığı

### Contract ID Kullanımı
```bash
# Contract ID'yi environment variable olarak sakla
$env:CONTRACT_ID="<CONTRACT_ID>"  # Örnek: "CD...KS" (56 karakter)

# Kontrat çağrılarında kullan
soroban contract invoke \
  --id $env:CONTRACT_ID \
  --source test1 \
  --network standalone \
  -- \
  get_user_notes \
  --user $TEST_ADDRESS
```

### Test Senaryoları
```bash
# 1. Not oluştur ve ID'sini sakla
$NOTE_ID = $(soroban contract invoke \
  --id $env:CONTRACT_ID \
  --source test1 \
  --network standalone \
  -- \
  create_note \
  --owner $TEST_ADDRESS \
  --title "Test Note" \
  --ipfs_hash "QmTest123")

# 2. Notu güncelle
soroban contract invoke \
  --id $env:CONTRACT_ID \
  --source test1 \
  --network standalone \
  -- \
  update_note \
  --note_id $NOTE_ID \
  --owner $TEST_ADDRESS \
  --new_title "Updated Note" \
  --new_ipfs_hash "QmUpdated456"

# 3. Notları listele
soroban contract invoke \
  --id $env:CONTRACT_ID \
  --source test1 \
  --network standalone \
  -- \
  get_user_notes \
  --user $TEST_ADDRESS
```

## IPFS ve Not Yönetimi

### IPFS Entegrasyonu
BlockchainNote kontratı, maliyet verimliliği ve ölçeklenebilirlik için not içeriğini IPFS'de saklar. İşte nasıl çalışır:

1. **İçerik Depolama**:
   - Not içeriği IPFS'de saklanır
   - Blockchain'de sadece IPFS hash'i tutulur
   - Bu, blockchain depolama maliyetlerini düşürür
   - Daha büyük notların saklanmasına olanak tanır

2. **Hash Yönetimi**:
```powershell
# IPFS hash ile not oluşturma örneği
$IPFS_HASH = "QmYourIPFSHash123..."
soroban contract invoke \
  --id $env:CONTRACT_ID \
  --source test1 \
  --network standalone \
  -- \
  create_note \
  --owner $env:TEST1_ADDRESS \
  --title "My First Note" \
  --ipfs_hash $IPFS_HASH
```

### Not Yönetimi İyi Uygulamaları

1. **Toplu Güncellemeler**:
Birden fazla notu güncellerken, işlem ücretlerinden tasarruf etmek için toplu güncelleme yapın:

```powershell
# Example of updating multiple notes efficiently
$notes = @(
    @{id="1"; title="Updated Note 1"; hash="QmHash1..."},
    @{id="2"; title="Updated Note 2"; hash="QmHash2..."}
)

foreach ($note in $notes) {
    soroban contract invoke \
        --id $env:CONTRACT_ID \
        --source test1 \
        --network standalone \
        -- \
        update_note \
        --note_id $note.id \
        --owner $env:TEST1_ADDRESS \
        --new_title $note.title \
        --new_ipfs_hash $note.hash
    
    # Add small delay between transactions
    Start-Sleep -Milliseconds 100
}
```

2. **Hata Kurtarma**:
Bir not güncellemesi başarısız olursa, yeniden deneme mantığı uygulayın:

```powershell
function Update-Note {
    param($noteId, $title, $hash)
    
    $maxRetries = 3
    $attempt = 0
    
    while ($attempt -lt $maxRetries) {
        try {
            soroban contract invoke \
                --id $env:CONTRACT_ID \
                --source test1 \
                --network standalone \
                -- \
                update_note \
                --note_id $noteId \
                --owner $env:TEST1_ADDRESS \
                --new_title $title \
                --new_ipfs_hash $hash
            return $true
        }
        catch {
            $attempt++
            if ($attempt -lt $maxRetries) {
                Start-Sleep -Seconds (2 * $attempt)
            }
        }
    }
    return $false
}
```

### Depolama Optimizasyonu

1. **Not İçeriği Kuralları**:
- Başlıkları 100 karakterin altında tutun
- IPFS'de depolamadan önce içerik sıkıştırma kullanın
- İçerik türü sınırlamalarını göz önünde bulundurun

2. **Temizleme Uygulamaları**:
```powershell
# List inactive notes
soroban contract invoke \
    --id $env:CONTRACT_ID \
    --source test1 \
    --network standalone \
    -- \
    get_user_notes \
    --user $env:TEST1_ADDRESS | Where-Object { -not $_.is_active }

# Clean up old notes
soroban contract invoke \
    --id $env:CONTRACT_ID \
    --source test1 \
    --network standalone \
    -- \
    delete_note \
    --note_id $noteId \
    --owner $env:TEST1_ADDRESS
```

> **Depolama İpuçları**:
> 1. Kullanılmayan notları düzenli olarak temizleyin
> 2. Eski notlar için arşivleme stratejileri uygulayın
> 3. Mümkün olduğunda toplu işlemler kullanın
> 4. Depolama kullanımını optimize etmek için izleyin

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

### 2. Erişim Kontrolü Testleri
Düzenli olarak erişim kontrollerini test edin:

```powershell
# Yetkisiz erişim testi (başarısız olmalı)
soroban contract invoke \
    --id $env:CONTRACT_ID \
    --source test2 \
    --network standalone \
    -- \
    update_note \
    --note_id 1 \
    --owner $env:TEST1_PUBLIC \
    --new_title "Yetkisiz Güncelleme" \
    --new_ipfs_hash "QmTest"

# Doğru sahip erişimi testi (başarılı olmalı)
soroban contract invoke \
    --id $env:CONTRACT_ID \
    --source test1 \
    --network standalone \
    -- \
    update_note \
    --note_id 1 \
    --owner $env:TEST1_PUBLIC \
    --new_title "Yetkili Güncelleme" \
    --new_ipfs_hash "QmTest"
```

### 3. Veri Doğrulama
Her zaman girdi verilerini doğrulayın:

- Başlık uzunluğu: 1-100 karakter
- IPFS hash: Geçerli format kontrolü
- Not sahipliği: Güncellemeden önce doğrulama
- Ücret miktarı: Pozitif olmalı

### 4. Hız Sınırlama
İstemci tarafında hız sınırlama uygulayın:

```powershell
function Invoke-RateLimitedOperation {
    param($operation)
    
    # Temel hız sınırlama
    Start-Sleep -Milliseconds 500
    
    try {
        & $operation
    }
    catch {
        Write-Error "İşlem başarısız: $_"
    }
}
```

> **Güvenlik İpuçları**:
> 1. Özel anahtarları asla kodda veya versiyon kontrolünde saklamayın
> 2. Uygun hata yönetimi uygulayın
> 3. Güvenlikle ilgili olayları kaydedin
> 4. Düzenli güvenlik testleri yapın
> 5. Bağımlılıkları güncel tutun