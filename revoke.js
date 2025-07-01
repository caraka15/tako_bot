require('dotenv').config();
const { ethers } = require('ethers');
const config = require('./config.json');
const abiApprove = require('./abi_approve.json');

const provider = new ethers.JsonRpcProvider(config.rpc_url);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const spenderAddress = config.contract_address;
const tokenAddress = config.address_asset;

const tokenContract = new ethers.Contract(tokenAddress, abiApprove, wallet);

const gasPrice = ethers.parseUnits(config.gas_price_gwei, 'gwei');
const gasLimit = config.gas_limit;

async function revokeApproval() {
  try {
    console.log(`Attempting to revoke approval for spender: ${spenderAddress}`);
    console.log(`Setting allowance to 0 for token: ${tokenAddress}`);

    const tx = await tokenContract.approve(spenderAddress, 0, { gasPrice, gasLimit });

    console.log('Revoke transaction sent. Waiting for confirmation...');
    await tx.wait();

    console.log('Successfully revoked approval (set allowance to 0).');
  } catch (error) {
    console.error('Error revoking approval:', error);
  }
}

revokeApproval();
