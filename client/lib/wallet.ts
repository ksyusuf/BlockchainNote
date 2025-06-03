import { isConnected, requestAccess, getPublicKey } from "@stellar/freighter-api";
import { store } from './store';
import {
  setWalletAddress,
  setWalletBalance,
  setWalletConnection,
  setWalletConnecting,
  setWalletError,
  resetWallet
} from './walletSlice';

export async function checkWalletConnection() {
  try {
    const connected = await isConnected();
    if (connected) {
      // Cüzdan bağlıysa public key'i al
      const address = await getPublicKey();
      if (address) {
        // Horizon API ile bakiyeyi al
        const res = await fetch(`https://horizon-testnet.stellar.org/accounts/${address}`);
        const data = await res.json();

        // Sadece XLM bakiyesi (asset_type: native)
        const xlm = data.balances.find((b: any) => b.asset_type === "native");
        const balance = xlm?.balance || "0";

        // Store'u güncelle
        store.dispatch(setWalletAddress(address));
        store.dispatch(setWalletBalance(balance));
        store.dispatch(setWalletConnection(true));
        return true;
      }
    }
    // Cüzdan bağlı değilse veya public key alınamadıysa
    store.dispatch(setWalletConnection(false));
    return false;
  } catch (error) {
    console.error("Cüzdan bağlantı kontrol hatası:", error);
    store.dispatch(setWalletConnection(false));
    store.dispatch(setWalletError("Cüzdan bağlantı kontrolü sırasında bir hata oluştu"));
    return false;
  }
}

export async function connectWallet() {
  try {
    store.dispatch(setWalletConnecting(true));
    store.dispatch(setWalletError(null));

    const connected = await isConnected();
    if (!connected) {
      store.dispatch(setWalletConnection(false));
      throw new Error("Lütfen Freighter cüzdanını yükleyin!");
    }

    const accessResult = await requestAccess();
    const hasPermission = String(accessResult) === "true" ||
      (typeof accessResult === "string" && /^G[A-Z2-7]{55}$/.test(accessResult));

    if (!hasPermission) {
      store.dispatch(setWalletConnection(false));
      throw new Error("Cüzdan bağlantısı iptal edildi veya onay verilmedi.");
    }

    // Sadece burada getPublicKey() çağrılıyor
    const address = await getPublicKey();
    if (!address) {
      store.dispatch(setWalletConnection(false));
      throw new Error("Cüzdan adresi alınamadı.");
    }

    console.log('Wallet Address:', address); // Debug için address'i logla

    // Horizon API ile bakiyeyi al
    const res = await fetch(`https://horizon-testnet.stellar.org/accounts/${address}`);
    const data = await res.json();

    // Sadece XLM bakiyesi (asset_type: native)
    const xlm = data.balances.find((b: any) => b.asset_type === "native");
    const balance = xlm?.balance || "0";

    // Store'u güncelle
    store.dispatch(setWalletAddress(address));
    store.dispatch(setWalletBalance(balance));
    store.dispatch(setWalletConnection(true));

    console.log('Store State after update:', store.getState());

    return {
      address,
      balance
    };
  } catch (error) {
    store.dispatch(setWalletConnection(false));
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("the user rejected this request")) {
        store.dispatch(setWalletError("Cüzdan bağlantısını iptal ettiniz."));
      } else if (
        msg.includes("user closed") ||
        msg.includes("cancel") ||
        msg.includes("denied") ||
        msg.includes("rejected") ||
        msg.includes("window closed")
      ) {
        store.dispatch(setWalletError("Cüzdan bağlantısı iptal edildi."));
      } else if (msg.includes("unable to send message to extension")) {
        store.dispatch(setWalletError("Freighter uzantısına erişilemiyor. Lütfen uzantının yüklü ve aktif olduğundan emin olun."));
      } else {
        store.dispatch(setWalletError(error.message));
      }
    }
    throw error;
  } finally {
    store.dispatch(setWalletConnecting(false));
  }
} 