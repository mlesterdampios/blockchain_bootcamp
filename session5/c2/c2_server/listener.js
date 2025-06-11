const Web3 = require('web3');
const MessagePortalABI = require('./MessagePortalABI.json');
const crypto = require('crypto');

// Replace these values with your actual values
const CONTRACT_ADDRESS = "";
const PROVIDER_URL = ""; // e.g., "http://localhost:8545" or your network RPC URL
const SERVER_PUBLIC_KEY = ""; // Your Ethereum address in lowercase

// Add your RSA public key in PEM format
const RSA_SERVER_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
-----END PUBLIC KEY-----`;

// Add your RSA private key in PEM format
const RSA_SERVER_PRIVATE_KEY = `-----BEGIN RSA PRIVATE KEY-----
-----END RSA PRIVATE KEY-----`;

function decryptMessage(encryptedBase64) {
    try {
        const buffer = Buffer.from(encryptedBase64, 'base64');
        const decrypted = crypto.privateDecrypt(
            {
                key: RSA_SERVER_PRIVATE_KEY,
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

async function startListening() {
    const web3 = new Web3(PROVIDER_URL);
    const contract = new web3.eth.Contract(MessagePortalABI, CONTRACT_ADDRESS);

    const startTimestamp = Math.floor(Date.now() / 1000);
    console.log(`Started listening for new messages from timestamp: ${startTimestamp}`);

    // Keep track of processed messages and fragments
    const processedMessages = new Set();
    const messageFragments = new Map(); // Store fragments by nonce

    while (true) {
        try {
            const messages = await contract.methods.getAllMessages().call();
            
            // Group messages by nonce for fragment processing
            const newFragments = new Map();
            
            messages.forEach(msg => {
                const messageId = `${msg.nonce}-${msg.messager}-${msg.timestamp}-${msg.fragment}`;
                
                if (!processedMessages.has(messageId) && 
                    Number(msg.timestamp) >= startTimestamp &&
                    msg.messager.toLowerCase() !== SERVER_PUBLIC_KEY.toLowerCase()
                ) {
                    // Add to fragments collection
                    if (!newFragments.has(msg.nonce)) {
                        newFragments.set(msg.nonce, {
                            message1: msg.message,
                            fragments: new Map(),
                            timestamp: msg.timestamp,
                            messager: msg.messager,
                            lastUpdate: Date.now()
                        });
                    }
                    
                    // Store fragment
                    newFragments.get(msg.nonce).fragments.set(
                        Number(msg.fragment), 
                        decryptMessage(msg.message2)
                    );
                    
                    processedMessages.add(messageId);
                }
            });

            // Process collected fragments
            for (const [nonce, data] of newFragments) {
                // If this is a new group or update to existing group
                if (!messageFragments.has(nonce)) {
                    messageFragments.set(nonce, data);
                } else {
                    // Update existing group with new fragments
                    const existing = messageFragments.get(nonce);
                    for (const [fragmentId, content] of data.fragments) {
                        existing.fragments.set(fragmentId, content);
                    }
                    existing.lastUpdate = Date.now();
                }
            }

            // Check for complete messages
            for (const [nonce, data] of messageFragments) {
                // If 5 seconds passed since last update
                if (Date.now() - data.lastUpdate >= 5000) {
                    // Build complete message from fragments
                    const fragments = Array.from(data.fragments.entries())
                        .sort((a, b) => a[0] - b[0])
                        .map(entry => entry[1]);
                    
                    const decryptedMsg1 = decryptMessage(data.message1);
                    const completeMsg2 = fragments.join('');

                    console.log('\nComplete Message Group Detected:');
                    console.log('------------------------');
                    console.log(`Nonce: ${nonce}`);
                    console.log(`From: ${data.messager}`);
                    console.log(`Time: ${new Date(Number(data.timestamp) * 1000).toLocaleString()}`);
                    console.log(`Decrypted Message 1: ${decryptedMsg1}`);
                    console.log(`Complete Message 2: ${completeMsg2}`);
                    console.log(`Number of fragments: ${fragments.length}`);
                    console.log('------------------------');

                    // Remove processed group
                    messageFragments.delete(nonce);
                }
            }

        } catch (error) {
            console.error('Error fetching messages:', error);
        }

        // Wait for next check
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}

// Start the listener
startListening().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});