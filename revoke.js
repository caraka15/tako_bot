require('dotenv').config();
const { ethers } = require('ethers');
const readline = require('readline');
const config = require('./config/config.json');
const abiApprove = require('./config/abi_approve.json');

const provider = new ethers.JsonRpcProvider(config.rpc_url);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const tokenAddress = config.address_asset;
const tokenContract = new ethers.Contract(tokenAddress, abiApprove, wallet);

const gasPrice = ethers.parseUnits(config.gas_price_gwei, 'gwei');
const gasLimit = config.gas_limit;

// Contract addresses
const TOKEN_CONTRACT = config.contract_address; // 0x3A2Fd8a16030fFa8D66E47C3f1C0507c673C841e
const ETH_NATIVE_CONTRACT = "0xA35f53a71FA6cd7AC9Df7F7814ecBc49dF255A38";

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function revokeApproval(spenderAddress, contractType) {
  try {
    console.log(`\n=== REVOKING APPROVAL FOR ${contractType.toUpperCase()} ===`);
    console.log(`Spender Contract: ${spenderAddress}`);
    console.log(`Token Address: ${tokenAddress}`);
    console.log(`Setting allowance to 0...`);

    const tx = await tokenContract.approve(spenderAddress, 0, { gasPrice, gasLimit });

    console.log(`Revoke transaction sent. Hash: ${tx.hash}`);
    console.log('Waiting for confirmation...');
    await tx.wait();

    console.log(`✅ Successfully revoked approval for ${contractType.toUpperCase()}`);
    console.log(`Allowance set to 0 for spender: ${spenderAddress}\n`);

    return true;
  } catch (error) {
    console.error(`❌ Error revoking approval for ${contractType}:`, error.shortMessage || error.message);
    return false;
  }
}

async function showMenu() {
  console.log('\n==================== REVOKE APPROVAL BOT ====================');
  console.log('Choose which contract to revoke approval from:');
  console.log('1. Token Contract (from config.json)');
  console.log(`   Address: ${TOKEN_CONTRACT}`);
  console.log('2. ETH Native Contract');
  console.log(`   Address: ${ETH_NATIVE_CONTRACT}`);
  console.log('3. Both Contracts');
  console.log('4. Exit');
  console.log('=========================================================\n');
}

async function main() {
  console.log('🔧 Revoke Approval Bot Starting...');
  console.log(`Connected to: ${config.rpc_url}`);
  console.log(`Wallet Address: ${wallet.address}`);
  console.log(`Token to revoke: ${tokenAddress}\n`);

  while (true) {
    await showMenu();

    const choice = await askQuestion('Enter your choice (1-4): ');

    switch (choice.trim()) {
      case '1':
        console.log('\n📋 Selected: Token Contract');
        await revokeApproval(TOKEN_CONTRACT, 'Token Contract');
        break;

      case '2':
        console.log('\n🔄 Selected: ETH Native Contract');
        await revokeApproval(ETH_NATIVE_CONTRACT, 'ETH Native Contract');
        break;

      case '3':
        console.log('\n🔄📋 Selected: Both Contracts');
        console.log('Revoking approval from both contracts...\n');

        const result1 = await revokeApproval(TOKEN_CONTRACT, 'Token Contract');
        const result2 = await revokeApproval(ETH_NATIVE_CONTRACT, 'ETH Native Contract');

        if (result1 && result2) {
          console.log('✅ Successfully revoked approval from BOTH contracts!');
        } else {
          console.log('⚠️  Some revocations may have failed. Check logs above.');
        }
        break;

      case '4':
        console.log('\n👋 Exiting Revoke Bot. Goodbye!');
        rl.close();
        return;

      default:
        console.log('\n❌ Invalid choice. Please enter 1, 2, 3, or 4.');
        continue;
    }

    const continueChoice = await askQuestion('\nDo you want to perform another revoke operation? (y/n): ');
    if (continueChoice.toLowerCase() !== 'y') {
      console.log('\n👋 Revoke Bot shutting down. Goodbye!');
      break;
    }
  }

  rl.close();
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n🛑 Process interrupted. Cleaning up...');
  rl.close();
  process.exit(0);
});

main().catch((error) => {
  console.error('Fatal error:', error);
  rl.close();
  process.exit(1);
});