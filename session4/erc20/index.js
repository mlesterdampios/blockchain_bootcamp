const Web3 = require("web3").Web3;
const ERC20_ABI = require("./MyToken.json");

const web3 = new Web3("https://bsc-testnet.public.blastapi.io");

const MyTokenAddress = "";
const contract = new web3.eth.Contract(ERC20_ABI, MyTokenAddress);

async function mint(amount, privateKey) {
    try {
        // Setup account from private key
        const account = web3.eth.accounts.privateKeyToAccount(privateKey);
        web3.eth.accounts.wallet.add(account);

        // Get token decimals for proper amount calculation
        const decimals = await contract.methods.decimals().call();
        
        // Calculate amount with decimals (1000 * 10^18 for 18 decimals)
        const mintAmount = BigInt(amount) * BigInt(10 ** Number(decimals));

        // Prepare mint transaction
        const tx = contract.methods.mint(account.address, mintAmount.toString());
        const gas = await tx.estimateGas({ from: account.address });
        const gasPrice = await web3.eth.getGasPrice();

        const txData = {
            from: account.address,
            to: MyTokenAddress,
            data: tx.encodeABI(),
            gas,
            gasPrice
        };

        // Send transaction
        const receipt = await web3.eth.sendTransaction(txData);
        console.log("\nMint transaction successful!");
        console.log("Transaction hash:", receipt.transactionHash);
        console.log(`Minted ${amount} tokens to ${account.address}`);

        // Get new balance
        const balance = await contract.methods.balanceOf(account.address).call();
        console.log("New balance:", Number(balance) / 10 ** Number(decimals));
        
        return receipt;
    } catch (error) {
        console.error("Mint error:", error);
        throw error;
    }
}

// Update the main execution to include minting
(async () => {
  try {
    console.log(`Retrieving ERC20 token details...`);
    const decimals = await contract.methods.decimals().call();
    const tokenName = await contract.methods.name().call();
    const symbol = await contract.methods.symbol().call();
    const supply = await contract.methods.totalSupply().call();

    // Format supply based on decimals
    const formattedSupply = Number(supply) / 10 ** Number(decimals);

    console.log("name:", tokenName);
    console.log("decimals:", decimals);
    console.log("symbol:", symbol);
    console.log("supply:", formattedSupply);

    // Mint 1000 tokens
    const PRIVATE_KEY = "Private_key_here"; // Replace with your private key
    await mint(1000, PRIVATE_KEY);

  } catch (error) {
    console.error("Error:", error);
  }
})();