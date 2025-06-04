<div align="center">
  <img src="https://github.com/ksyusuf/BlockchainNote/blob/master/BloackchainHeisenberg.png" alt="BlockchainHeisenberg" width="400"/>
</div>

# 📝 Stellar-Soroban Note Application (BlockchainNote)

This project is a secure note-taking application based on blockchain, created using **Stellar and Soroban**. Safely record and manage your notes.

## 🚀 Features

- 🌐 Modern frontend based on **Next.js**
- 📜 **Rust / Soroban** smart contract integration
- 🔑 **Freighter wallet** connection
- 💾 Recording notes to the blockchain
- 🎨 Stylish and intuitive user interface (with Tailwind CSS)

## 📂 Project Structure

```bash
/contract             # Rust/Soroban smart contract code (if any)
/client               # Next.js application
/client/app           # Application pages and components
/client/app/globals.css # Global styles
/client/app/tailwind.config.js # Tailwind configuration
/README.md            # This document!
```

## 🛠️ Setup

1️⃣ **Clone the repository:**
```bash
git clone https://github.com/ksyusuf/BlockchainNote
cd BlockchainNote
```

2️⃣ **Install dependencies:**
```bash
npm install
cd client
npm install
cd ..
```

3️⃣ **Start the development server:**
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

4️⃣ **Build the smart contract (if there is a `contract` folder):**
```bash
cd contract
cargo build --target wasm32-unknown-unknown --release
```

## ⚙️ Usage

- Connect your Freighter wallet on the main page.
- Enter the note title and content using the new note form.
- When you save your note (currently a mock transaction), it will be added to the list as if it were recorded on the blockchain.

## 📸 Screenshots

(You can add your app's screenshot here)

![App screenshot](./screenshots/note-app.png)
(If the `screenshots` folder and `note-app.png` exist, leave this line; otherwise, remove or update it)

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

✨ **If you want to contribute:**  
- We are waiting for your PRs!  
- You can open new feature suggestions and bug reports.

---

🔗 **Links:**
- 🌐 [Stellar Developer Docs](https://developers.stellar.org/docs/)
- 🔧 [Soroban Documentation](https://soroban.stellar.org/docs)
- 💼 [Freighter Wallet](https://freighter.app/)

---

> **Note:** To fully run your project and actually save the notes to the blockchain, you need to write and deploy the Soroban smart contract and replace the mock functions in the `client/app/page.tsx` file with real contract calls.

## 🔒 Smart Contract

The project includes a contract deployed on Stellar Test Net with the following address:
```
CC3WXG57TMKW6BLXWYXJVNLNR7VZNC37H7YT2OMVL2E2GAAVVST45PZM
```

Translated with DeepL.com (free version)
