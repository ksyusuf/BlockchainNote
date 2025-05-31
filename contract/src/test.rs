#![cfg(test)]

use super::*;
use soroban_sdk::{testutils::{Address as _, AuthorizedFunction, AuthorizedInvocation}, Address, Env, InvokeError, String};

#[test]
fn test_initialize_contract() {
    let env = Env::default();
    let contract_id = env.register_contract(None, NotesContract);
    let client = NotesContractClient::new(&env, &contract_id);
    
    let dev_wallet = Address::generate(&env);
    let fee = 1_000_000i128; // 1 XLM
    
    client.initialize(&dev_wallet, &fee);
    
    assert_eq!(client.get_dev_wallet(), dev_wallet);
    assert_eq!(client.get_note_fee(), fee);
    assert_eq!(client.get_total_notes_count(), 0);
}

#[test]
fn test_create_note() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register_contract(None, NotesContract);
    let client = NotesContractClient::new(&env, &contract_id);
    
    let dev_wallet = Address::generate(&env);
    let user = Address::generate(&env);
    let fee = 1_000_000i128;
    
    // Initialize contract
    client.initialize(&dev_wallet, &fee);
    
    // Create note
    let title = String::from_str(&env, "Test Note");
    let ipfs_hash = String::from_str(&env, "QmTestHashXXXXXXXXXXXXXXXXXX");
    
    let note_id = client.create_note(&user, &title, &ipfs_hash);
    
    assert_eq!(note_id, 1);
    assert_eq!(client.get_total_notes_count(), 1);
    
    // Get user notes
    let user_notes = client.get_user_notes(&user);
    assert_eq!(user_notes.len(), 1);
    
    let note = &user_notes.get(0).unwrap();
    assert_eq!(note.id, 1);
    assert_eq!(note.owner, user);
    assert_eq!(note.title, title);
    assert_eq!(note.ipfs_hash, ipfs_hash);
    assert_eq!(note.is_active, true);
}

#[test]
fn test_get_note_with_auth() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register_contract(None, NotesContract);
    let client = NotesContractClient::new(&env, &contract_id);
    
    let dev_wallet = Address::generate(&env);
    let user = Address::generate(&env);
    let other_user = Address::generate(&env);
    
    client.initialize(&dev_wallet, &1_000_000i128);
    
    let title = String::from_str(&env, "Private Note");
    let ipfs_hash = String::from_str(&env, "QmPrivateHashXXXXXXXXXXXXXX");
    
    let note_id = client.create_note(&user, &title, &ipfs_hash);
    
    // User can get their own note
    let note = client.get_note(&note_id, &user);
    assert!(note.is_some());
    assert_eq!(note.unwrap().title, title);
    
    // Other user cannot get the note
    let note = client.get_note(&note_id, &other_user);
    assert!(note.is_none());
}

#[test]
fn test_update_note() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register_contract(None, NotesContract);
    let client = NotesContractClient::new(&env, &contract_id);
    
    let dev_wallet = Address::generate(&env);
    let user = Address::generate(&env);
    
    client.initialize(&dev_wallet, &1_000_000i128);
    
    let title = String::from_str(&env, "Original Title");
    let ipfs_hash = String::from_str(&env, "QmOriginalHashXXXXXXXXXXXXX");
    
    let note_id = client.create_note(&user, &title, &ipfs_hash);
    
    // Update note
    let new_title = String::from_str(&env, "Updated Title");
    let new_ipfs_hash = String::from_str(&env, "QmUpdatedHashXXXXXXXXXXXXXX");
    
    let success = client.update_note(&note_id, &user, &new_title, &new_ipfs_hash);
    assert!(success);
    
    // Verify update
    let note = client.get_note(&note_id, &user).unwrap();
    assert_eq!(note.title, new_title);
    assert_eq!(note.ipfs_hash, new_ipfs_hash);
}

#[test]
fn test_delete_note() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register_contract(None, NotesContract);
    let client = NotesContractClient::new(&env, &contract_id);
    
    let dev_wallet = Address::generate(&env);
    let user = Address::generate(&env);
    
    client.initialize(&dev_wallet, &1_000_000i128);
    
    let title = String::from_str(&env, "To Be Deleted");
    let ipfs_hash = String::from_str(&env, "QmToBeDeletedXXXXXXXXXXXXXX");
    
    let note_id = client.create_note(&user, &title, &ipfs_hash);
    
    // Delete note
    let success = client.delete_note(&note_id, &user);
    assert!(success);
    
    // Note should not be accessible after deletion
    let note = client.get_note(&note_id, &user);
    assert!(note.is_none());
    
    // User notes should show 0 active notes
    let user_notes = client.get_user_notes(&user);
    assert_eq!(user_notes.len(), 0);
}

#[test]
fn test_user_stats() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register_contract(None, NotesContract);
    let client = NotesContractClient::new(&env, &contract_id);
    
    let dev_wallet = Address::generate(&env);
    let user = Address::generate(&env);
    
    client.initialize(&dev_wallet, &1_000_000i128);
    
    // Create 3 notes
    for i in 1..=3 {
        let title = String::from_str(&env, &format!("Note {}", i));
        let ipfs_hash = String::from_str(&env, &format!("QmHash{}XXXXXXXXXXXXXXXXX", i));
        client.create_note(&user, &title, &ipfs_hash);
    }
    
    // Delete one note
    client.delete_note(&1, &user);
    
    let (total, active) = client.get_user_stats(&user);
    assert_eq!(total, 3);
    assert_eq!(active, 2);
}

#[test]
fn test_update_fee_authorization() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register_contract(None, NotesContract);
    let client = NotesContractClient::new(&env, &contract_id);
    
    let dev_wallet = Address::generate(&env);
    let unauthorized_user = Address::generate(&env);
    
    client.initialize(&dev_wallet, &1_000_000i128);
    
    // Dev wallet can update fee
    client.update_fee(&dev_wallet, &2_000_000i128);
    assert_eq!(client.get_note_fee(), 2_000_000i128);
}

#[test]
fn test_multiple_users() {
    let env = Env::default();
    env.mock_all_auths();
    
    let contract_id = env.register_contract(None, NotesContract);
    let client = NotesContractClient::new(&env, &contract_id);
    
    let dev_wallet = Address::generate(&env);
    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);
    
    client.initialize(&dev_wallet, &1_000_000i128);
    
    // User1 creates 2 notes
    client.create_note(&user1, &String::from_str(&env, "User1 Note1"), &String::from_str(&env, "QmHash1"));
    client.create_note(&user1, &String::from_str(&env, "User1 Note2"), &String::from_str(&env, "QmHash2"));
    
    // User2 creates 1 note
    client.create_note(&user2, &String::from_str(&env, "User2 Note1"), &String::from_str(&env, "QmHash3"));
    
    // Check user notes
    let user1_notes = client.get_user_notes(&user1);
    let user2_notes = client.get_user_notes(&user2);
    
    assert_eq!(user1_notes.len(), 2);
    assert_eq!(user2_notes.len(), 1);
    assert_eq!(client.get_total_notes_count(), 3);
}