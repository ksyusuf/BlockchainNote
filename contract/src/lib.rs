#![no_std]
use soroban_sdk::{
    contract, 
    contractimpl,
    contracttype,
    symbol_short,
    Env, 
    Symbol,
    String,
    Vec,
    Address,
    log,
};
// ücret kesme özelliği devredışı olduğu için burası kapalı
// use soroban_sdk::token::{StellarAssetClient, TokenClient};

#[derive(Clone)]
#[contracttype]
pub struct Note {
    pub id: u64,
    pub owner: Address,
    pub title: String,
    pub ipfs_hash: String,
    pub timestamp: u64,
    pub is_active: bool,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    NoteCounter,
    Note(u64),
    UserNotes(Address),
    DevWallet,
    NoteFee,
}

const NOTES_COUNTER: Symbol = symbol_short!("COUNTER");
const DEV_WALLET: Symbol = symbol_short!("DEV_ADDR");
const NOTE_FEE: Symbol = symbol_short!("FEE");

#[contract]
pub struct NotesContract;

#[contractimpl]
impl NotesContract {
    /// Contract'ı başlat
    pub fn initialize(env: Env, dev_wallet: Address, note_fee: i128) {
        // Sadece bir kez initialize edilebilir
        if env.storage().instance().has(&DEV_WALLET) {
            panic!("Contract already initialized");
        }
        
        env.storage().instance().set(&DEV_WALLET, &dev_wallet);
        env.storage().instance().set(&NOTE_FEE, &note_fee);
        env.storage().instance().set(&NOTES_COUNTER, &0u64);
        
        log!(&env, "Notes contract initialized with dev wallet: {}", dev_wallet);
    }
    
    /// Yeni not oluştur
    pub fn create_note(
        env: Env,
        owner: Address,
        title: String,
        ipfs_hash: String,
    ) -> u64 {
        // Kullanıcı kimlik doğrulama
        owner.require_auth();
        
        // Ücret al
        Self::charge_fee(&env, &owner);
        
        // Not ID'si üret
        let mut counter: u64 = env.storage().instance().get(&NOTES_COUNTER).unwrap_or(0);
        counter += 1;
        
        // Not oluştur
        let note = Note {
            id: counter,
            owner: owner.clone(),
            title,
            ipfs_hash,
            timestamp: env.ledger().timestamp(),
            is_active: true,
        };
        
        // Not'u kaydet
        env.storage().persistent().set(&DataKey::Note(counter), &note);
        
        // Kullanıcının notlarını güncelle
        let mut user_notes: Vec<u64> = env.storage()
            .persistent()
            .get(&DataKey::UserNotes(owner.clone()))
            .unwrap_or(Vec::new(&env));
        user_notes.push_back(counter);
        env.storage().persistent().set(&DataKey::UserNotes(owner), &user_notes);
        
        // Counter'ı güncelle
        env.storage().instance().set(&NOTES_COUNTER, &counter);
        
        log!(&env, "Note created with ID: {}", counter);
        counter
    }
    
    /// Kullanıcının tüm notlarını getir
    pub fn get_user_notes(env: Env, user: Address) -> Vec<Note> {
        let note_ids: Vec<u64> = env.storage()
            .persistent()
            .get(&DataKey::UserNotes(user))
            .unwrap_or(Vec::new(&env));
        
        let mut notes = Vec::new(&env);
        
        for id in note_ids.iter() {
            if let Some(note) = env.storage().persistent().get::<DataKey, Note>(&DataKey::Note(id)) {
                if note.is_active {
                    notes.push_back(note);
                }
            }
        }
        
        notes
    }
    
    /// Belirli bir notu getir
    pub fn get_note(env: Env, note_id: u64, requester: Address) -> Option<Note> {
        requester.require_auth();
        
        if let Some(note) = env.storage().persistent().get::<DataKey, Note>(&DataKey::Note(note_id)) {
            // Sadece not sahibi kendi notlarını görebilir
            if note.owner == requester && note.is_active {
                return Some(note);
            }
        }
        None
    }
    
    /// Notu sil (soft delete)
    pub fn delete_note(env: Env, note_id: u64, owner: Address) -> bool {
        owner.require_auth();
        
        if let Some(mut note) = env.storage().persistent().get::<DataKey, Note>(&DataKey::Note(note_id)) {
            if note.owner == owner {
                note.is_active = false;
                env.storage().persistent().set(&DataKey::Note(note_id), &note);
                log!(&env, "Note {} deleted by owner", note_id);
                return true;
            }
        }
        false
    }
    
    /// Not'u güncelle
    pub fn update_note(
        env: Env,
        note_id: u64,
        owner: Address,
        new_title: String,
        new_ipfs_hash: String,
    ) -> bool {
        owner.require_auth();
        
        // Güncellemeler için de ücret al
        Self::charge_fee(&env, &owner);
        
        if let Some(mut note) = env.storage().persistent().get::<DataKey, Note>(&DataKey::Note(note_id)) {
            if note.owner == owner && note.is_active {
                note.title = new_title;
                note.ipfs_hash = new_ipfs_hash;
                note.timestamp = env.ledger().timestamp(); // Güncelleme zamanı
                
                env.storage().persistent().set(&DataKey::Note(note_id), &note);
                log!(&env, "Note {} updated by owner", note_id);
                return true;
            }
        }
        false
    }
    
    /// Toplam not sayısını getir
    pub fn get_total_notes_count(env: Env) -> u64 {
        env.storage().instance().get(&NOTES_COUNTER).unwrap_or(0)
    }
    
    /// Geliştirici cüzdanını getir
    pub fn get_dev_wallet(env: Env) -> Address {
        env.storage().instance().get(&DEV_WALLET).unwrap()
    }
    
    /// Not ücreti getir
    pub fn get_note_fee(env: Env) -> i128 {
        env.storage().instance().get(&NOTE_FEE).unwrap_or(1000000) // 1 XLM default
    }
    
    /// Geliştirici ücretini güncelle (sadece dev wallet)
    pub fn update_fee(env: Env, admin: Address, new_fee: i128) {
        admin.require_auth();
        
        let dev_wallet: Address = env.storage().instance().get(&DEV_WALLET).unwrap();
        if admin != dev_wallet {
            panic!("Only dev wallet can update fee");
        }
        
        env.storage().instance().set(&NOTE_FEE, &new_fee);
        log!(&env, "Note fee updated to: {}", new_fee);
    }
    
    /// Kullanıcı istatistikleri
    pub fn get_user_stats(env: Env, user: Address) -> (u64, u64) {
        let note_ids: Vec<u64> = env.storage()
            .persistent()
            .get(&DataKey::UserNotes(user))
            .unwrap_or(Vec::new(&env));
        
        let mut total_notes = 0u64;
        let mut active_notes = 0u64;
        
        for id in note_ids.iter() {
            if let Some(note) = env.storage().persistent().get::<DataKey, Note>(&DataKey::Note(id)) {
                total_notes += 1;
                if note.is_active {
                    active_notes += 1;
                }
            }
        }
        
        (total_notes, active_notes)
    }
    
    /// Ücret tahsil et
    fn charge_fee(_env: &Env, _user: &Address) {
        // ücret kesme özelliğini şimdilik devredışı bırakalım.
        // parametrlerin önündeki "_" işaretleri, bu fonksiyonun şu anda kullanılmadığını gösterir.

        
        // let fee: i128 = env.storage().instance().get(&NOTE_FEE).unwrap_or(1000000);
        // let dev_wallet: Address = env.storage().instance().get(&DEV_WALLET).unwrap();

        // let token_address = Address::from_contract_id(&env, &[...]); // Token sözleşmesinin ID'si
        // let token = TokenClient::new(env, &token_address);
        // token.transfer(user, &dev_wallet, &fee);
        
        // log!(env, "Fee charged: {} from {} to {}", fee, user, dev_wallet);
    }

}