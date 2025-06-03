import { isConnected, requestAccess, getPublicKey } from "@stellar/freighter-api";
import { store } from './store';
import { setAddress, setBalance } from './uiSlice';

export async function checkWalletConnection() {
  try {
    const connected = await isConnected();
    if (connected) {
      const walletKey = await getPublicKey();
      if (walletKey) {
        store.dispatch(setAddress(walletKey));
        store.dispatch(setBalance("0")); // Şimdilik sabit değer
        return walletKey;
      }
    }
    return null;
  } catch (error) {
    console.error("Cüzdan bağlantı kontrol hatası:", error);
    return null;
  }
}

export async function connectWallet() {
  try {
    const connected = await isConnected();
    if (!connected) {
      throw new Error("Lütfen Freighter cüzdanını yükleyin!");
    }

    const accessResult = await requestAccess();
    const hasPermission = String(accessResult) === "true" ||
      (typeof accessResult === "string" && /^G[A-Z2-7]{55}$/.test(accessResult));

    if (!hasPermission) {
      throw new Error("Cüzdan bağlantısı iptal edildi veya onay verilmedi.");
    }

    const address = typeof accessResult === "string" && accessResult.startsWith("G")
      ? accessResult
      : await getPublicKey();

    console.log('Wallet Address:', address); // Debug için address'i logla

    // Store'u güncelle
    store.dispatch(setAddress(address));
    store.dispatch(setBalance("0")); // Şimdilik sabit değer

    console.log('Store State after update:', store.getState()); // Debug için store state'ini logla

    return {
      address,
      balance: "0" // Şimdilik sabit bir değer
    };
  } catch (error) {
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("the user rejected this request")) {
        throw new Error("Cüzdan bağlantısını iptal ettiniz.");
      } else if (
        msg.includes("user closed") ||
        msg.includes("cancel") ||
        msg.includes("denied") ||
        msg.includes("rejected") ||
        msg.includes("window closed")
      ) {
        throw new Error("Cüzdan bağlantısı iptal edildi.");
      } else if (msg.includes("unable to send message to extension")) {
        throw new Error("Freighter uzantısına erişilemiyor. Lütfen uzantının yüklü ve aktif olduğundan emin olun.");
      }
    }
    throw error;
  }
} 