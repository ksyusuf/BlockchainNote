import {
  Contract,
  SorobanRpc,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  xdr,
  nativeToScVal,
  scValToNative,
  Address,
  StrKey,
  Account
} from '@stellar/stellar-sdk';
import { signTransaction } from "@stellar/freighter-api";
import { Address as StellarAddress } from '@stellar/stellar-sdk';

// Contract adresi ve network ayarları
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ID || '';
export const NETWORK_PASSPHRASE = process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE || '';
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || '';
export const DEV_WALLET = process.env.NEXT_PUBLIC_DEV_WALLET || '';

// Note interface'ini kontrat ile uyumlu hale getir
export interface Note {
  id: number;
  owner: string;
  title: string;
  ipfs_hash: string;
  timestamp: number;
  is_active: boolean;
}

// Soroban için özel account tipi
interface SorobanAccount extends Account {
  sequence: () => string;
}

export class NotesContractClient {
  private contract: Contract;
  private server: SorobanRpc.Server;

  constructor() {
    this.contract = new Contract(CONTRACT_ADDRESS);
    this.server = new SorobanRpc.Server(RPC_URL, { allowHttp: true });
  }

  // Helper: Adresi ScVal'e dönüştür
  private addressToScVal(address: string): xdr.ScVal {
    try {
      console.log('[addressToScVal] Başlangıç');
      console.log('[addressToScVal] Gelen adres:', address);
      console.log('[addressToScVal] Adres tipi:', typeof address);
      console.log('[addressToScVal] Adres uzunluğu:', address.length);

      if (!StrKey.isValidEd25519PublicKey(address)) {
        console.error('[addressToScVal] Geçersiz Stellar public key');
        throw new Error(`Geçersiz Stellar public key: ${address}`);
      }
      
      // Adresi binary formata dönüştür
      const publicKey = StrKey.decodeEd25519PublicKey(address);
      console.log('[addressToScVal] Binary dönüşüm sonucu:', publicKey);
      console.log('[addressToScVal] Binary uzunluğu:', publicKey.length);
      
      // ScVal oluştur
      const scVal = xdr.ScVal.scvAddress(
        xdr.ScAddress.scAddressTypeAccount(
          xdr.PublicKey.publicKeyTypeEd25519(publicKey)
        )
      );
      console.log('[addressToScVal] ScVal oluşturuldu:', scVal);
      console.log('[addressToScVal] ScVal tipi:', scVal.switch().name);
      
      return scVal;
    } catch (error) {
      console.error('[addressToScVal] Hata:', error);
      throw error;
    }
  }

  // Helper: Kontrat adresini ScVal'e dönüştür
  private contractAddressToScVal(contractId: string): xdr.ScVal {
    try {
      console.log('[contractAddressToScVal] Başlangıç');
      console.log('[contractAddressToScVal] Gelen kontrat ID:', contractId);
      
      // Kontrat ID'sini hex'ten binary'ye dönüştür
      const contractBytes = Buffer.from(contractId, 'hex');
      console.log('[contractAddressToScVal] Binary dönüşüm sonucu:', contractBytes);
      
      // ScVal oluştur
      const scVal = xdr.ScVal.scvAddress(
        xdr.ScAddress.scAddressTypeContract(contractBytes)
      );
      console.log('[contractAddressToScVal] ScVal oluşturuldu:', scVal);
      
      return scVal;
    } catch (error) {
      console.error('[contractAddressToScVal] Hata:', error);
      throw error;
    }
  }

  // Kontrat başlatma - sadece bir kez yapılmalı
  async initialize(userAddress: string, devWallet: string, noteFee: bigint): Promise<any> {
    try {
      console.log('[initialize] Başlatılıyor...');
      console.log('[initialize] Kullanıcı Adresi:', userAddress);
      console.log('[initialize] Dev Cüzdanı:', devWallet);
      console.log('[initialize] Not Ücreti:', noteFee.toString());
      
      // Adresleri ScVal'e dönüştür
      const userAddressScVal = this.addressToScVal(userAddress);
      const devWalletScVal = this.addressToScVal(devWallet);
      
      // Kontrat adresini ScVal'e dönüştür
      const contractAddressScVal = this.contractAddressToScVal(CONTRACT_ADDRESS);
      
      // Simülasyon için dummy account kullan
      const account = {
        accountId: () => CONTRACT_ADDRESS,
        sequenceNumber: () => "0",
        sequence: () => "0",
        incrementSequenceNumber: () => {},
        getSequenceNumber: () => "0"
      } as SorobanAccount;
      
      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          this.contract.call(
            'initialize',
            devWalletScVal,
            nativeToScVal(noteFee, { type: 'i128' })
          )
        )
        .setTimeout(30)
        .build();

      const preparedTransaction = await this.server.prepareTransaction(transaction);
      const signedXDR = await signTransaction(preparedTransaction.toXDR(), {
        networkPassphrase: NETWORK_PASSPHRASE,
        accountToSign: userAddress
      });
      const signedTx = TransactionBuilder.fromXDR(signedXDR, NETWORK_PASSPHRASE);
      const result = await this.server.sendTransaction(signedTx);
      return result;
    } catch (error) {
      console.error('[initialize] Hata:', error);
      throw error;
    }
  }

  // Not oluştur
  async createNote(userAddress: string, title: string, ipfsHash: string): Promise<number> {
    try {
      console.log('[createNote] Başlatılıyor...'); // Debug Log
      console.log('[createNote] Kullanıcı Adresi:', userAddress); // Debug Log
      console.log('[createNote] Başlık:', title); // Debug Log
      console.log('[createNote] IPFS Hash:', ipfsHash); // Debug Log
      
      // Adresi ScVal'e dönüştür
      const addressScVal = this.addressToScVal(userAddress);
      console.log('[createNote] Dönüştürülen adres ScVal:', addressScVal); // Debug Log
      
      const account = await this.server.getAccount(userAddress);
      console.log('[createNote] Kullanıcı Hesabı Alındı:', account.accountId()); // Debug Log
      
      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          this.contract.call(
            'create_note',
            addressScVal,
            nativeToScVal(title, { type: 'string' }),
            nativeToScVal(ipfsHash, { type: 'string' })
          )
        )
        .setTimeout(30)
        .build();
      console.log('[createNote] Transaction Oluşturuldu'); // Debug Log
      const preparedTransaction = await this.server.prepareTransaction(transaction);
      console.log('[createNote] Transaction Hazırlandı'); // Debug Log
      const signedXDR = await signTransaction(preparedTransaction.toXDR(), {
        networkPassphrase: NETWORK_PASSPHRASE,
        accountToSign: userAddress
      });
      console.log('[createNote] Transaction İmzalandı'); // Debug Log
      const signedTx = TransactionBuilder.fromXDR(signedXDR, NETWORK_PASSPHRASE);
      const result = await this.server.sendTransaction(signedTx);
      console.log('[createNote] Transaction Gönderildi, Sonuç:', result); // Debug Log

      if ('error' in result) {
        console.error('[createNote] Transaction hatası detay:', result); // Debug Log
        throw new Error(`Transaction failed: ${JSON.stringify(result)}`);
      }
      return 1; // Şimdilik sabit bir değer dönüyoruz
    } catch (error) {
      console.error('[createNote] Hata:', error); // Debug Log
      throw error; // Hatayı yeniden fırlat
    }
  }

  // Kullanıcının notlarını getir
  async getUserNotes(userAddress: string): Promise<Note[]> {
    console.log('=== getUserNotes Başlangıç ===');
    console.log('Gelen userAddress:', userAddress);

    try {
      // 1. Adres doğrulama
      if (!userAddress || typeof userAddress !== 'string' || !userAddress.startsWith('G')) {
        throw new Error('Geçersiz Stellar adresi');
      }

      // 2. Kullanıcı adresini ScVal'e dönüştür
      const userAddressScVal = this.addressToScVal(userAddress);
      console.log('Kullanıcı adresi ScVal:', userAddressScVal);

      // 3. Kontrat adresini ScVal'e dönüştür
      const contractAddressScVal = this.contractAddressToScVal(CONTRACT_ADDRESS);
      console.log('Kontrat adresi ScVal:', contractAddressScVal);

      // 4. Simülasyon için dummy account kullan
      const account = {
        accountId: () => CONTRACT_ADDRESS,
        sequenceNumber: () => "0",
        sequence: () => "0",
        incrementSequenceNumber: () => {},
        getSequenceNumber: () => "0"
      } as SorobanAccount;

      // 5. Transaction oluştur
      console.log('Transaction oluşturuluyor...');
      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          this.contract.call(
            'get_user_notes',
            userAddressScVal
          )
        )
        .setTimeout(30)
        .build();
      console.log('Transaction oluşturuldu:', tx.toXDR());

      // 6. Simülasyon yap
      console.log('Simülasyon başlatılıyor...');
      const simulateResult = await this.server.simulateTransaction(tx);
      console.log('Simülasyon sonucu:', simulateResult);
      
      const retval = (simulateResult as any).retval;
      console.log('Retval:', retval);

      if (!retval) {
        console.log('Retval boş, boş dizi dönülüyor');
        return [];
      }

      // 7. Sonucu işle
      console.log('Sonuç işleniyor...');
      const rawNotes = scValToNative(retval);
      console.log('Raw notes:', rawNotes);
      
      if (!Array.isArray(rawNotes)) {
        console.log('Raw notes dizi değil, boş dizi dönülüyor');
        return [];
      }

      const notes = rawNotes.map((n) => ({
        id: Number(n.id),
        owner: typeof n.owner === 'string' ? n.owner : JSON.stringify(n.owner),
        title: n.title,
        ipfs_hash: n.ipfs_hash,
        timestamp: Number(n.timestamp),
        is_active: Boolean(n.is_active),
      }));
      console.log('İşlenmiş notlar:', notes);

      return notes;

    } catch (error) {
      console.error('=== getUserNotes Genel Hata ===');
      console.error('Hata tipi:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('Hata mesajı:', error instanceof Error ? error.message : String(error));
      console.error('Hata stack:', error instanceof Error ? error.stack : '');
      return [];
    } finally {
      console.log('=== getUserNotes Bitiş ===');
    }
  }

  // Belirli bir notu getir
  async getNote(userAddress: string, noteId: number): Promise<Note | null> {
    try {
      console.log('[getNote] Başlatılıyor...'); // Debug Log
      console.log('[getNote] Kullanıcı Adresi:', userAddress); // Debug Log
      console.log('[getNote] Not ID:', noteId); // Debug Log
      const account = await this.server.getAccount(CONTRACT_ADDRESS);
      console.log('[getNote] Kontrat Hesabı Alındı:', account.accountId()); // Debug Log
      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          this.contract.call(
            'get_note',
            nativeToScVal(noteId, { type: 'u64' }),
            nativeToScVal(StellarAddress.fromString(userAddress).toScAddress(), { type: 'address' }) // Adresi StellarAddress nesnesine dönüştür ve ScAddress formatına getir
          )
        )
        .setTimeout(30)
        .build();
      console.log('[getNote] Simulate transaction başlatılıyor...'); // Debug Log
      const result = await this.server.simulateTransaction(tx);
      console.log('[getNote] Simulate transaction tamamlandı. Sonuç:', result); // Debug Log
      const retval = (result as any).retval;

      if (!retval || (typeof retval === 'object' && Object.keys(retval).length === 0)) {
        console.log('[getNote] Retval boş veya tanımsız.'); // Debug Log
        return null;
      }
      let note;
      try {
        console.log('[getNote] scValToNative ile dönüşüm deneniyor...'); // Debug Log
        note = scValToNative(retval);
        console.log('[getNote] scValToNative sonucu:', note); // Debug Log
      } catch (e) {
        console.error('[getNote] scValToNative parse error detay:', e, 'Retval:', retval); // Debug Log
        return null;
      }
      if (note && typeof note === 'object') {
        console.log('[getNote] Ham not objesi formatında, client formatına dönüştürülüyor...'); // Debug Log
        return {
          id: Number(note.id),
          owner: typeof note.owner === 'string' ? note.owner : JSON.stringify(note.owner), // Adresi string yap
          title: note.title,
          ipfs_hash: note.ipfs_hash,
          timestamp: Number(note.timestamp), // Timestamp'i number yap
          is_active: Boolean(note.is_active), // is_active'i boolean yap
        };
      }
      console.log('[getNote] Ham not obje formatında değil veya null.'); // Debug Log
      return null;
    } catch (error) {
      console.error('[getNote] Hata:', error); // Debug Log
      return null;
    }
  }

  // Kullanıcı istatistikleri (tuple)
  async getUserStats(userAddress: string): Promise<[number, number]> {
    try {
      console.log('[getUserStats] Başlatılıyor...'); // Debug Log
      console.log('[getUserStats] Kullanıcı Adresi:', userAddress); // Debug Log
      const account = await this.server.getAccount(CONTRACT_ADDRESS);
      console.log('[getUserStats] Kontrat Hesabı Alındı:', account.accountId()); // Debug Log
      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          this.contract.call(
            'get_user_stats',
            nativeToScVal(StellarAddress.fromString(userAddress).toScAddress(), { type: 'address' }) // Adresi StellarAddress nesnesine dönüştür ve ScAddress formatına getir
          )
        )
        .setTimeout(30)
        .build();
      console.log('[getUserStats] Simulate transaction başlatılıyor...'); // Debug Log
      const result = await this.server.simulateTransaction(tx);
      console.log('[getUserStats] Simulate transaction tamamlandı. Sonuç:', result); // Debug Log
      const retval = (result as any).retval;

      if (!retval || (typeof retval === 'object' && Object.keys(retval).length === 0)) {
        console.log('[getUserStats] Retval boş veya tanımsız.'); // Debug Log
        return [0, 0];
      }
      let stats;
      try {
        console.log('[getUserStats] scValToNative ile dönüşüm deneniyor...'); // Debug Log
        stats = scValToNative(retval);
        console.log('[getUserStats] scValToNative sonucu:', stats); // Debug Log
      } catch (e) {
        console.error('[getUserStats] scValToNative parse error detay:', e, 'Retval:', retval); // Debug Log
        return [0, 0];
      }
      if (Array.isArray(stats) && stats.length === 2) {
        console.log('[getUserStats] Ham istatistikler dizi formatında, client formatına dönüştürülüyor...'); // Debug Log
        return [Number(stats[0]), Number(stats[1])];
      }
      console.log('[getUserStats] Ham istatistikler dizi formatında değil veya beklendiği gibi 2 elemanlı değil.'); // Debug Log
      return [0, 0];
    } catch (error) {
      console.error('[getUserStats] Hata:', error); // Debug Log
      return [0, 0];
    }
  }

  // Not ücreti getir (i128)
  async getNoteFee(): Promise<number> {
    try {
      console.log('[getNoteFee] Başlatılıyor...'); // Debug Log
      const account = await this.server.getAccount(CONTRACT_ADDRESS);
      console.log('[getNoteFee] Kontrat Hesabı Alındı:', account.accountId()); // Debug Log
      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(this.contract.call('get_note_fee'))
        .setTimeout(30)
        .build();
      console.log('[getNoteFee] Simulate transaction başlatılıyor...'); // Debug Log
      const result = await this.server.simulateTransaction(tx);
      console.log('[getNoteFee] Simulate transaction tamamlandı. Sonuç:', result); // Debug Log
      const retval = (result as any).retval;

      if (!retval || (typeof retval === 'object' && Object.keys(retval).length === 0)) {
        console.log('[getNoteFee] Retval boş veya tanımsız, varsayılan ücret dönülüyor.'); // Debug Log
        return 1000000; // Default fee
      }
      let fee;
      try {
        console.log('[getNoteFee] scValToNative ile dönüşüm deneniyor...'); // Debug Log
        fee = scValToNative(retval);
        console.log('[getNoteFee] scValToNative sonucu:', fee); // Debug Log
      } catch (e) {
        console.error('[getNoteFee] scValToNative parse error detay:', e, 'Retval:', retval); // Debug Log
        return 1000000; // Default fee on error
      }
      console.log('[getNoteFee] Dönüştürülen ücret:', Number(fee)); // Debug Log
      return Number(fee);
    } catch (error) {
      console.error('[getNoteFee] Hata:', error); // Debug Log
      return 1000000; // Default fee on error
    }
  }

  // Not güncelle
  async updateNote(userAddress: string, noteId: number, title: string, ipfsHash: string): Promise<boolean> {
    try {
      console.log('[updateNote] Başlatılıyor...'); // Debug Log
      console.log('[updateNote] Kullanıcı Adresi:', userAddress); // Debug Log
      console.log('[updateNote] Not ID:', noteId); // Debug Log
      console.log('[updateNote] Yeni Başlık:', title); // Debug Log
      console.log('[updateNote] Yeni IPFS Hash:', ipfsHash); // Debug Log
      const account = await this.server.getAccount(userAddress);
      console.log('[updateNote] Kullanıcı Hesabı Alındı:', account.accountId()); // Debug Log
      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          this.contract.call(
            'update_note',
            nativeToScVal(noteId, { type: 'u64' }),
            nativeToScVal(StellarAddress.fromString(userAddress).toScAddress(), { type: 'address' }), // Adresi StellarAddress nesnesine dönüştür ve ScAddress formatına getir
            nativeToScVal(title, { type: 'string' }),
            nativeToScVal(ipfsHash, { type: 'string' })
          )
        )
        .setTimeout(30)
        .build();
      console.log('[updateNote] Transaction Hazırlanıyor...'); // Debug Log
      const preparedTransaction = await this.server.prepareTransaction(tx);
      console.log('[updateNote] Transaction Hazırlandı.'); // Debug Log
      const signedXDR = await signTransaction(preparedTransaction.toXDR(), {
        networkPassphrase: NETWORK_PASSPHRASE,
        accountToSign: userAddress,
      });
      console.log('[updateNote] Transaction İmzalandı.'); // Debug Log
      const signedTx = TransactionBuilder.fromXDR(signedXDR, NETWORK_PASSPHRASE);
      console.log('[updateNote] Transaction Gönderiliyor...'); // Debug Log
      const result = await this.server.sendTransaction(signedTx);
      console.log('[updateNote] Transaction Gönderildi, Sonuç:', result); // Debug Log
      // Rust: bool döner, client: boolean parse edilmeli
      if ((result as any).resultXdr) {
        console.log('[updateNote] Sonuç XDR içeriyor, durum parse ediliyor...'); // Debug Log
        // Eğer resultXdr varsa, simülasyon sonucu parse edilebilir
        // Ancak çoğu zaman sendTransaction sadece status döndürür
        return String(result.status).toLowerCase() === 'success';
      }
      console.log('[updateNote] Sonuç XDR içermiyor, durum parse ediliyor...'); // Debug Log
      return String(result.status).toLowerCase() === 'success';
    } catch (error) {
      console.error('[updateNote] Hata:', error); // Debug Log
      return false;
    }
  }

  // Not sil
  async deleteNote(userAddress: string, noteId: number): Promise<boolean> {
    try {
      console.log('[deleteNote] Başlatılıyor...'); // Debug Log
      console.log('[deleteNote] Kullanıcı Adresi:', userAddress); // Debug Log
      console.log('[deleteNote] Not ID:', noteId); // Debug Log
      const account = await this.server.getAccount(userAddress);
      console.log('[deleteNote] Kullanıcı Hesabı Alındı:', account.accountId()); // Debug Log
      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          this.contract.call(
            'delete_note',
            nativeToScVal(noteId, { type: 'u64' }),
            nativeToScVal(StellarAddress.fromString(userAddress).toScAddress(), { type: 'address' }) // Adresi StellarAddress nesnesine dönüştür ve ScAddress formatına getir
          )
        )
        .setTimeout(30)
        .build();
      console.log('[deleteNote] Transaction Hazırlanıyor...'); // Debug Log
      const preparedTransaction = await this.server.prepareTransaction(tx);
      console.log('[deleteNote] Transaction Hazırlandı.'); // Debug Log
      const signedXDR = await signTransaction(preparedTransaction.toXDR(), {
        networkPassphrase: NETWORK_PASSPHRASE,
        accountToSign: userAddress,
      });
      console.log('[deleteNote] Transaction İmzalandı.'); // Debug Log
      const signedTx = TransactionBuilder.fromXDR(signedXDR, NETWORK_PASSPHRASE);
      console.log('[deleteNote] Transaction Gönderiliyor...'); // Debug Log
      const result = await this.server.sendTransaction(signedTx);
      console.log('[deleteNote] Transaction Gönderildi, Sonuç:', result); // Debug Log
      // Rust: bool döner, client: boolean parse edilmeli
      if ((result as any).resultXdr) {
        console.log('[deleteNote] Sonuç XDR içeriyor, durum parse ediliyor...'); // Debug Log
        // Eğer resultXdr varsa, simülasyon sonucu parse edilebilir
        // Ancak çoğu zaman sendTransaction sadece status döndürür
        return String(result.status).toLowerCase() === 'success';
      }
      console.log('[deleteNote] Sonuç XDR içermiyor, durum parse ediliyor...'); // Debug Log
      return String(result.status).toLowerCase() === 'success';
    } catch (error) {
      console.error('[deleteNote] Hata:', error); // Debug Log
      return false;
    }
  }
}

/**
 * IPFS Mock işlemleri
 */
export class IPFSClient {
  /**
   * IPFS'e veri yükle (mock implementation)
   */
  static async uploadToIPFS(data: { title: string; content: string }): Promise<string> {
    const hash = 'Qm' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Mock IPFS upload:', { data, hash });
    return hash;
  }

  /**
   * IPFS'ten veri çek (mock implementation)
   */
  static async getFromIPFS(hash: string): Promise<{ title: string; content: string } | null> {
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      return {
        title: 'Mock Title',
        content: 'Mock content from IPFS'
      };
    } catch (error) {
      console.error('IPFS get error:', error);
      return null;
    }
  }
}

/**
 * Utility fonksiyonlar
 */
export const formatXLM = (stroops: number): string => {
  return (stroops / 10000000).toFixed(7) + ' XLM';
};

export const formatDate = (timestamp: number): string => {
  return new Date(timestamp * 1000).toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};