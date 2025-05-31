import {
  Contract,
  SorobanRpc,
  TransactionBuilder,
  Networks,
  BASE_FEE,
  xdr,
  nativeToScVal,
  scValToNative
} from '@stellar/stellar-sdk';
import freighterApi from '@stellar/freighter-api';

// Contract adresi (deploy edildikten sonra güncellenecek)
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '';

// Network ayarları
export const NETWORK_PASSPHRASE = Networks.TESTNET;
export const RPC_URL = 'https://soroban-testnet.stellar.org';

export interface Note {
  id: number;
  owner: string;
  title: string;
  ipfs_hash: string;
  timestamp: number;
  is_active: boolean;
}

export class NotesContractClient {
  private contract: Contract;
  private server: SorobanRpc.Server;

  constructor() {
    this.contract = new Contract(CONTRACT_ADDRESS);
    this.server = new SorobanRpc.Server(RPC_URL);
  }

  /**
   * Contract'ı initialize et
   */
  async initialize(userAddress: string, devWallet: string, noteFee: number) {
    try {
      const account = await this.server.getAccount(userAddress);

      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          this.contract.call(
            'initialize',
            nativeToScVal(devWallet, { type: 'address' }),
            nativeToScVal(noteFee, { type: 'i128' })
          )
        )
        .setTimeout(30)
        .build();

      const preparedTransaction = await this.server.prepareTransaction(transaction);
      const signedXDR = await freighterApi.signTransaction(preparedTransaction.toXDR(), {
        network: NETWORK_PASSPHRASE,
        accountToSign: userAddress,
      });

      const signedTx = TransactionBuilder.fromXDR(signedXDR, NETWORK_PASSPHRASE);
      const result = await this.server.sendTransaction(signedTx);
      return result;
    } catch (error) {
      console.error('Initialize error:', error);
      throw error;
    }
  }

  /**
   * Yeni not oluştur
   */
  async createNote(userAddress: string, title: string, ipfsHash: string): Promise<number> {
    try {
      const account = await this.server.getAccount(userAddress);

      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          this.contract.call(
            'create_note',
            nativeToScVal(userAddress, { type: 'address' }),
            nativeToScVal(title, { type: 'string' }),
            nativeToScVal(ipfsHash, { type: 'string' })
          )
        )
        .setTimeout(30)
        .build();

      const preparedTransaction = await this.server.prepareTransaction(transaction);
      const signedXDR = await freighterApi.signTransaction(preparedTransaction.toXDR(), {
        network: NETWORK_PASSPHRASE,
        accountToSign: userAddress,
      });

      const signedTx = TransactionBuilder.fromXDR(signedXDR, NETWORK_PASSPHRASE);
      const result = await this.server.sendTransaction(signedTx);

      if (result.status === 'SUCCESS') {
        const resultXdr = result.resultXdr;
        if (resultXdr) {
          const transactionResult = xdr.TransactionResult.fromXDR(resultXdr, 'base64');
          // Burada note ID'sini XDR'dan parse edebilirsin
          // Şimdilik mock değer dönüyoruz
          return 1;
        }
      }
      throw new Error('Transaction failed');
    } catch (error) {
      console.error('Create note error:', error);
      throw error;
    }
  }

  /**
   * Kullanıcının notlarını getir
   */
  async getUserNotes(userAddress: string): Promise<Note[]> {
    try {
      // Simülasyon için dummy bir account kullanabilirsin
      const dummyAccount = await this.server.getAccount(CONTRACT_ADDRESS);

      const tx = new TransactionBuilder(dummyAccount, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          this.contract.call(
            'get_user_notes',
            nativeToScVal(userAddress, { type: 'address' })
          )
        )
        .setTimeout(30)
        .build();

      const result = await this.server.simulateTransaction(tx);

      if (result.result?.retval) {
        return scValToNative(result.result.retval) as Note[];
      }
      return [];
    } catch (error) {
      console.error('Get user notes error:', error);
      return [];
    }
  }

  /**
   * Specific not getir
   */
  async getNote(userAddress: string, noteId: number): Promise<Note | null> {
    try {
      const dummyAccount = await this.server.getAccount(CONTRACT_ADDRESS);

      const tx = new TransactionBuilder(dummyAccount, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          this.contract.call(
            'get_note',
            nativeToScVal(noteId, { type: 'u64' }),
            nativeToScVal(userAddress, { type: 'address' })
          )
        )
        .setTimeout(30)
        .build();

      const result = await this.server.simulateTransaction(tx);

      if (result.result?.retval) {
        const note = scValToNative(result.result.retval);
        return note ? (note as Note) : null;
      }
      return null;
    } catch (error) {
      console.error('Get note error:', error);
      return null;
    }
  }

  /**
   * Not güncelle
   */
  async updateNote(userAddress: string, noteId: number, title: string, ipfsHash: string): Promise<boolean> {
    try {
      const account = await this.server.getAccount(userAddress);

      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          this.contract.call(
            'update_note',
            nativeToScVal(noteId, { type: 'u64' }),
            nativeToScVal(userAddress, { type: 'address' }),
            nativeToScVal(title, { type: 'string' }),
            nativeToScVal(ipfsHash, { type: 'string' })
          )
        )
        .setTimeout(30)
        .build();

      const preparedTransaction = await this.server.prepareTransaction(transaction);
      const signedXDR = await freighterApi.signTransaction(preparedTransaction.toXDR(), {
        network: NETWORK_PASSPHRASE,
        accountToSign: userAddress,
      });

      const signedTx = TransactionBuilder.fromXDR(signedXDR, NETWORK_PASSPHRASE);
      const result = await this.server.sendTransaction(signedTx);
      return result.status === 'SUCCESS';
    } catch (error) {
      console.error('Update note error:', error);
      return false;
    }
  }

  /**
   * Not sil
   */
  async deleteNote(userAddress: string, noteId: number): Promise<boolean> {
    try {
      const account = await this.server.getAccount(userAddress);

      const transaction = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          this.contract.call(
            'delete_note',
            nativeToScVal(noteId, { type: 'u64' }),
            nativeToScVal(userAddress, { type: 'address' })
          )
        )
        .setTimeout(30)
        .build();

      const preparedTransaction = await this.server.prepareTransaction(transaction);
      const signedXDR = await freighterApi.signTransaction(preparedTransaction.toXDR(), {
        network: NETWORK_PASSPHRASE,
        accountToSign: userAddress,
      });

      const signedTx = TransactionBuilder.fromXDR(signedXDR, NETWORK_PASSPHRASE);
      const result = await this.server.sendTransaction(signedTx);
      return result.status === 'SUCCESS';
    } catch (error) {
      console.error('Delete note error:', error);
      return false;
    }
  }

  /**
   * Kullanıcı istatistikleri
   */
  async getUserStats(userAddress: string): Promise<[number, number]> {
    try {
      const dummyAccount = await this.server.getAccount(CONTRACT_ADDRESS);

      const tx = new TransactionBuilder(dummyAccount, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(
          this.contract.call(
            'get_user_stats',
            nativeToScVal(userAddress, { type: 'address' })
          )
        )
        .setTimeout(30)
        .build();

      const result = await this.server.simulateTransaction(tx);

      if (result.result?.retval) {
        return scValToNative(result.result.retval) as [number, number];
      }
      return [0, 0];
    } catch (error) {
      console.error('Get user stats error:', error);
      return [0, 0];
    }
  }

  /**
   * Not ücreti getir
   */
  async getNoteFee(): Promise<number> {
    try {
      const dummyAccount = await this.server.getAccount(CONTRACT_ADDRESS);

      const tx = new TransactionBuilder(dummyAccount, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(this.contract.call('get_note_fee'))
        .setTimeout(30)
        .build();

      const result = await this.server.simulateTransaction(tx);

      if (result.result?.retval) {
        return scValToNative(result.result.retval) as number;
      }
      return 1000000; // Default 1 XLM
    } catch (error) {
      console.error('Get note fee error:', error);
      return 1000000;
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