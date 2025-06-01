# 🚀 Stellar Akıllı Kontrat Dağıtım Kılavuzu

## 📋 Gereksinimler
- Rust ve Cargo yüklü olmalı
- Soroban CLI yüklü olmalı
- Stellar testnet hesabı ve private key

## 🔑 Test Hesabı Oluşturma

1. Soroban CLI ile test hesabı oluşturun:
```bash
# Test hesabı oluştur
soroban keys generate test1

# Hesabın public key'ini al
TEST_ADDRESS=$(soroban keys address test1)

# Hesabı test tokenleri ile fonla
curl "https://friendbot.stellar.org/?addr=$TEST_ADDRESS"
```

2. Hesap bilgilerini kontrol edin:
```bash
# Hesap detaylarını görüntüle
soroban keys show test1

# Hesap bakiyesini kontrol et
soroban contract invoke \
  --network testnet \
  --source test1 \
  -- \
  get_balance \
  --id $TEST_ADDRESS
```

## ⚡ Testnet'e Deploy Etme

1. Soroban CLI ile testnet'e bağlanın:
```bash
soroban config network add --global testnet https://soroban-testnet.stellar.org
```

2. Kontratı derleyin:
```bash
cargo build --target wasm32-unknown-unknown --release
```

3. Kontratı testnet'e deploy edin:
```bash
soroban contract deploy \
    --wasm target/wasm32-unknown-unknown/release/your_contract.wasm \
    --source test1 \
    --network testnet
```

4. Deploy işlemi başarılı olduğunda, terminal size bir kontrat ID'si verecektir. Bu ID'yi not alın.

## 📝 Kontrat Fonksiyonları

### create_note
```bash
soroban contract invoke \
  --id $CONTRACT_ID \
  --source test1 \
  --network testnet \
  -- \
  create_note \
  --owner $TEST_ADDRESS \
  --title "Test Notu" \
  --ipfs_hash "QmTest123"
```
- Yeni bir not oluşturur
- Not sahibi, başlık ve IPFS hash'i parametre olarak alır
- Başarılı olursa not ID'sini döndürür

### get_user_notes
```bash
soroban contract invoke \
  --id $CONTRACT_ID \
  --source test1 \
  --network testnet \
  -- \
  get_user_notes \
  --user $TEST_ADDRESS
```
- Kullanıcının tüm aktif notlarını getirir
- Kullanıcı adresi parametre olarak alır
- Not listesini döndürür

### (Henüz Kullanılmıyor) get_note
```bash
soroban contract invoke \
  --id $CONTRACT_ID \
  --source test1 \
  --network testnet \
  -- \
  get_note \
  --note_id 1 \
  --requester $TEST_ADDRESS
```
- Belirli bir notu ID'sine göre getirir
- Sadece not sahibi kendi notlarını görebilir
- Not ID'si ve istek yapan kullanıcı adresi parametre olarak alır

### (Henüz Kullanılmıyor) delete_note
```bash
soroban contract invoke \
  --id $CONTRACT_ID \
  --source test1 \
  --network testnet \
  -- \
  delete_note \
  --note_id 1 \
  --owner $TEST_ADDRESS
```
- Notu soft-delete yapar (tamamen silmez, sadece aktif olmayan olarak işaretler)
- Not ID'si ve not sahibi parametre olarak alır
- Başarılı olursa true döndürür

### (Henüz Kullanılmıyor) update_note
```bash
soroban contract invoke \
  --id $CONTRACT_ID \
  --source test1 \
  --network testnet \
  -- \
  update_note \
  --note_id 1 \
  --owner $TEST_ADDRESS \
  --new_title "Güncellenmiş Başlık" \
  --new_ipfs_hash "QmUpdated456"
```
- Mevcut bir notu günceller
- Not ID'si, sahibi, yeni başlık ve yeni IPFS hash'i parametre olarak alır
- Başarılı olursa true döndürür

### (Henüz Kullanılmıyor) get_user_stats
```bash
soroban contract invoke \
  --id $CONTRACT_ID \
  --source test1 \
  --network testnet \
  -- \
  get_user_stats \
  --user $TEST_ADDRESS
```
- Kullanıcının not istatistiklerini getirir
- Toplam not sayısı ve aktif not sayısını tuple olarak döndürür

## 💻 Client Tarafında Kullanım

1. Client projenizin kök dizininde `.env` dosyası oluşturun (eğer yoksa)

2. Aşağıdaki environment değişkenini ekleyin:
```
NEXT_PUBLIC_CONTRACT_ID=your_contract_id_here
```

3. Client kodunuzda kontrat ID'sine şu şekilde erişebilirsiniz:
```typescript
const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID;
```

## ⚠️ Önemli Notlar
- Kontrat ID'si deploy edildikten sonra değişmez
- Testnet'te deploy edilen kontratlar kalıcı değildir, testnet resetlendiğinde silinir
- Production ortamında mainnet'e deploy etmeden önce testnet'te test etmeyi unutmayın
- Test hesabınızın private key'ini güvenli bir yerde saklayın ve asla paylaşmayın
- Test hesabınızın yeterli XLM bakiyesi olduğundan emin olun
