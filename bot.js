require('dotenv').config();
const { ethers } = require('ethers');
const abi = require('./config/abi.json');
const config = require('./config/config.json');
const abiApprove = require('./config/abi_approve.json');

const provider = new ethers.JsonRpcProvider(config.rpc_url);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contractAddress = config.contract_address;
const contract = new ethers.Contract(contractAddress, abi, wallet);
const tokenContract = new ethers.Contract(config.address_asset, abiApprove, wallet);

const amount = config.amount;
const gasPrice = ethers.parseUnits(config.gas_price_gwei, 'gwei');
const gasLimit = config.gas_limit;
const maxAmount = ethers.MaxUint256;

// --- Helper for structured logging ---
const log = (level, message) => {
  console.log(`[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}`);
};

async function approve() {
  log('info', `Approving max amount for spender: ${contractAddress}`);
  try {
    const tx = await tokenContract.approve(contractAddress, maxAmount, { gasPrice: gasPrice, gasLimit: gasLimit });
    log('info', `Approval transaction sent. Hash: ${tx.hash}`);
    await tx.wait();
    log('success', 'Successfully approved token spending.');
    return true;
  } catch (error) {
    log('error', `Approval failed: ${error.shortMessage || error.message}`);
    return false;
  }
}

async function deposit() {
  log('info', `Attempting to deposit ${amount} of ${config.address_asset}`);
  try {
    const tx = await contract.deposit(config.address_asset, ethers.parseUnits(amount, 18), wallet.address, 0, { gasPrice: gasPrice, gasLimit: gasLimit });
    log('info', `Deposit transaction sent. Hash: ${tx.hash}`);
    await tx.wait();
    log('success', `Successfully deposited ${amount} of ${config.address_asset}`);
    return true;
  } catch (error) {
    log('error', `Initial deposit failed: ${error.shortMessage || error.message}`);
    if (error.shortMessage && error.shortMessage.includes('transaction execution reverted')) {
      log('warn', 'Transaction reverted. Attempting to approve and retry deposit...');
      const approvalSuccessful = await approve();
      if (approvalSuccessful) {
        log('info', 'Retrying deposit after approval...');
        try {
          const txRetry = await contract.deposit(config.address_asset, ethers.parseUnits(amount, 18), wallet.address, 0, { gasPrice: gasPrice, gasLimit: gasLimit });
          log('info', `Retry deposit transaction sent. Hash: ${txRetry.hash}`);
          await txRetry.wait();
          log('success', `Successfully deposited ${amount} of ${config.address_asset} on retry.`);
          return true;
        } catch (retryError) {
          log('error', `Retry deposit failed: ${retryError.shortMessage || retryError.message}`);
          return false;
        }
      }
    }
    return false;
  }
}

async function withdraw() {
  log('info', `Attempting to withdraw ${amount} of ${config.address_asset}`);
  try {
    const tx = await contract.withdraw(config.address_asset, ethers.parseUnits(amount, 18), wallet.address, { gasPrice: gasPrice, gasLimit: gasLimit });
    log('info', `Withdrawal transaction sent. Hash: ${tx.hash}`);
    await tx.wait();
    log('success', `Successfully withdrew ${amount} of ${config.address_asset}`);
    return true;
  } catch (error) {
    log('error', `Withdrawal failed: ${error.shortMessage || error.message}`);
    return false;
  }
}

async function main() {
    log('info', 'Bot starting...');
    for (let i = 1; i <= config.iterations; i++) {
        console.log(`\n==================== ITERATION ${i} of ${config.iterations} ====================`);
        const depositSuccessful = await deposit();

        if (depositSuccessful) {
            log('info', 'Deposit successful. Proceeding to withdraw.');
            const withdrawSuccessful = await withdraw();
            if (withdrawSuccessful) {
                log('info', 'Withdrawal successful.');
            } else {
                log('warn', 'Withdrawal failed. Continuing to next iteration.');
            }
        } else {
            log('warn', 'Deposit failed. Skipping withdrawal and continuing to next iteration.');
        }
        console.log(`==================== ITERATION ${i} FINISHED ====================\n`);
    }
    log('info', 'All iterations completed. Bot shutting down.');
}

main();