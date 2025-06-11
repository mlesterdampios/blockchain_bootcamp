import { Web3 } from 'web3';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const WavePortalABI = require('./WavePortal.json');

// Configure endpoints and contract info
const RPC_URL = 'https://bsc-testnet.core.chainstack.com/API_KEY';
const CONTRACT_ADDRESS = '';

// Create HTTP web3 instance for calls and transactions
const web3 = new Web3(RPC_URL);

// Create contract instances for both HTTP and WebSocket
const contract = new web3.eth.Contract(WavePortalABI, CONTRACT_ADDRESS);

async function wave(message, privateKey) {
    try {
        const account = web3.eth.accounts.privateKeyToAccount(privateKey);
        web3.eth.accounts.wallet.add(account);

        const tx = contract.methods.wave(message);
        const gas = await tx.estimateGas({ from: account.address });
        const gasPrice = await web3.eth.getGasPrice();

        const txData = {
            from: account.address,
            to: CONTRACT_ADDRESS,
            data: tx.encodeABI(),
            gas,
            gasPrice
        };

        const receipt = await web3.eth.sendTransaction(txData);
        console.log("Wave sent! Transaction hash:", receipt.transactionHash);
        return receipt;
    } catch (error) {
        console.error("Error sending wave:", error);
        throw error;
    }
}

// Main execution
(async () => {
    try {
        console.log('Starting WavePortal interaction...');
  
        // Optional: Send a test wave
        const PRIVATE_KEY = "Your_Private_Key_Here"; // Replace with your private key
        await wave("hi !!!", PRIVATE_KEY);

    } catch (error) {
        console.error("Error:", error);
    }
})();