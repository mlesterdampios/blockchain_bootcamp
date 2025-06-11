const Web3 = require("web3").Web3;
const ERC20_ABI = require("./MyToken.json");

const web3 = new Web3("https://bsc-testnet.public.blastapi.io");

const MyTokenAddress = "";
const contract = new web3.eth.Contract(ERC20_ABI, MyTokenAddress);

// --- Mint function ---
async function mint(to, amount, privateKey) {
  try {
    const decimals = await contract.methods.decimals().call();
    const mintAmount = BigInt(amount) * BigInt(10 ** Number(decimals));

    const account = web3.eth.accounts.privateKeyToAccount(privateKey);
    web3.eth.accounts.wallet.add(account);

    const tx = contract.methods.mint(to, mintAmount.toString());
    const gas = await tx.estimateGas({ from: account.address });
    const gasPrice = await web3.eth.getGasPrice();

    const txData = {
      from: account.address,
      to: MyTokenAddress,
      data: tx.encodeABI(),
      gas,
      gasPrice,
    };

    const receipt = await web3.eth.sendTransaction(txData);
    console.log("Mint successful! Tx hash:", receipt.transactionHash);
  } catch (error) {
    console.error("Mint error:", error);
  }
}

// Example usage (uncomment and fill in your values to use):
mint("0x8D6E224a2C53F8967342962d74b26E155beAec32", 100, "Private_key_here");

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
  } catch (error) {
    console.error("Error:", error);
  }
})();