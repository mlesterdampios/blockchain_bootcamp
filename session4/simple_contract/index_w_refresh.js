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

async function getTotalWaves() {
    try {
        const total = await contract.methods.getTotalWaves().call();
        console.log("Total waves:", total);
        return total;
    } catch (error) {
        console.error("Error getting total waves:", error);
        throw error;
    }
}

async function getAllWaves() {
    try {
        const waves = await contract.methods.getAllWaves().call();
        console.log("All waves:", waves);
        return waves;
    } catch (error) {
        console.error("Error getting all waves:", error);
        throw error;
    }
}

// Keep track of processed waves to avoid duplicates
const processedWaves = new Set();

async function checkNewWaves() {
    try {
        const waves = await contract.methods.getAllWaves().call();
        
        // Process only new waves
        waves.forEach(wave => {
            // Create a unique identifier for each wave (combine sender, timestamp, and message)
            const waveId = `${wave.waver}-${wave.timestamp}-${wave.message}`;
            
            if (!processedWaves.has(waveId)) {
                console.log('\nNew wave detected!');
                console.log('From:', wave.waver);
                console.log('Time:', new Date(Number(wave.timestamp) * 1000).toLocaleString());
                console.log('Message:', wave.message);
                console.log('-------------------');
                
                // Mark this wave as processed
                processedWaves.add(waveId);
            }
        });
    } catch (error) {
        console.error("Error checking new waves:", error);
    }
}

// Main execution
(async () => {
    try {
        console.log('Starting WavePortal interaction...');
        
        // Get initial waves
        await getTotalWaves();
        const initialWaves = await getAllWaves();
        
        // Process initial waves
        initialWaves.forEach(wave => {
            const waveId = `${wave.waver}-${wave.timestamp}-${wave.message}`;
            processedWaves.add(waveId);
        });
        
        console.log('Watching for new waves...');
        
        // Start polling every 5 seconds
        setInterval(checkNewWaves, 5000);

        // Optional: Send a test wave
        const PRIVATE_KEY = "Private_key_here"; // Replace with your private key
        await wave("Hello Web3!", PRIVATE_KEY);

    } catch (error) {
        console.error("Error:", error);
    }
})();

// Add cleanup handler
process.on('SIGINT', () => {
    console.log('\nStopping wave monitoring...');
    process.exit();
});