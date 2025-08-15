require('dotenv').config();
const { ethers } = require('ethers');
const config = require('./config/config.json');
const abiApprove = require('./config/abi_approve.json');

// ABI untuk native ETH functions dengan MethodID yang benar
const ethABI = [
    {
        "inputs": [
            { "name": "", "type": "address" },
            { "name": "onBehalfOf", "type": "address" },
            { "name": "referralCode", "type": "uint16" }
        ],
        "name": "depositETH",
        "outputs": [],
        "stateMutability": "payable",
        "type": "function"
    },
    {
        "inputs": [
            { "name": "", "type": "address" },
            { "name": "amount", "type": "uint256" },
            { "name": "to", "type": "address" }
        ],
        "name": "withdrawETH",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

const provider = new ethers.JsonRpcProvider(config.rpc_url);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Contract address untuk native ETH operations
const ethContractAddress = "0xA35f53a71FA6cd7AC9Df7F7814ecBc49dF255A38";
const ethContract = new ethers.Contract(ethContractAddress, ethABI, wallet);

// Token contract untuk approve (WETH atau token terkait)
const tokenContract = new ethers.Contract(config.address_asset, abiApprove, wallet);

const ethAmount = config.eth_amount || config.amount; // Prioritas eth_amount, fallback ke amount
const gasPrice = ethers.parseUnits(config.gas_price_gwei, 'gwei');
const gasLimit = config.gas_limit;
const maxAmount = ethers.MaxUint256;

// Amount akan sama untuk deposit dan withdraw

// --- delay iteration ---
const delaySeconds = Number(config.delay_seconds ?? 0);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Helper for structured logging ---
const log = (level, message) => {
    console.log(`[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}`);
};

async function approve() {
    log('info', `Approving max amount for ETH contract: ${ethContractAddress}`);
    try {
        const tx = await tokenContract.approve(ethContractAddress, maxAmount, { gasPrice: gasPrice, gasLimit: gasLimit });
        log('info', `Approval transaction sent. Hash: ${tx.hash}`);
        await tx.wait();
        log('success', 'Successfully approved token spending for ETH contract.');
        return true;
    } catch (error) {
        log('error', `Approval failed: ${error.shortMessage || error.message}`);
        return false;
    }
}

async function depositETH() {
    log('info', `Attempting to deposit ${ethAmount} ETH`);
    try {
        // Untuk deposit ETH native, amount dikirim sebagai value dalam transaction
        const ethValue = ethers.parseEther(ethAmount);

        const tx = await ethContract.depositETH(
            config.contract_address, // parameter pertama (address)
            wallet.address,          // onBehalfOf
            0,                      // referralCode
            {
                value: ethValue,      // ETH amount dikirim sebagai value
                gasPrice: gasPrice,
                gasLimit: gasLimit
            }
        );

        log('info', `Deposit ETH transaction sent. Hash: ${tx.hash}`);
        await tx.wait();
        log('success', `Successfully deposited ${ethAmount} ETH`);
        return true;
    } catch (error) {
        log('error', `Initial ETH deposit failed: ${error.shortMessage || error.message}`);
        if (error.shortMessage && error.shortMessage.includes('transaction execution reverted')) {
            log('warn', 'Transaction reverted. Attempting to approve and retry deposit...');
            const approvalSuccessful = await approve();
            if (approvalSuccessful) {
                log('info', 'Retrying ETH deposit after approval...');
                try {
                    const ethValue = ethers.parseEther(ethAmount);
                    const txRetry = await ethContract.depositETH(
                        config.contract_address,
                        wallet.address,
                        0,
                        {
                            value: ethValue,
                            gasPrice: gasPrice,
                            gasLimit: gasLimit
                        }
                    );
                    log('info', `Retry ETH deposit transaction sent. Hash: ${txRetry.hash}`);
                    await txRetry.wait();
                    log('success', `Successfully deposited ${ethAmount} ETH on retry.`);
                    return true;
                } catch (retryError) {
                    log('error', `Retry ETH deposit failed: ${retryError.shortMessage || retryError.message}`);
                    return false;
                }
            }
        }
        return false;
    }
}

async function withdrawETH() {
    log('info', `Attempting to withdraw ${ethAmount} ETH`);
    try {
        // Untuk withdraw ETH, amount dimasukkan sebagai parameter function (sama dengan deposit)
        const ethValue = ethers.parseEther(ethAmount);

        const tx = await ethContract.withdrawETH(
            config.contract_address, // parameter pertama (address)
            ethValue,               // amount (sama dengan yang di deposit)
            wallet.address,         // to address
            {
                gasPrice: gasPrice,
                gasLimit: gasLimit
            }
        );

        log('info', `Withdraw ETH transaction sent. Hash: ${tx.hash}`);
        await tx.wait();
        log('success', `Successfully withdrew ${ethAmount} ETH`);
        return true;
    } catch (error) {
        log('error', `ETH withdrawal failed: ${error.shortMessage || error.message}`);
        return false;
    }
}

async function main() {
    log('info', 'ETH Native Bot starting...');
    log('info', `Using ETH contract: ${ethContractAddress}`);
    log('info', `Deposit amount: ${ethAmount} ETH`);

    for (let i = 1; i <= config.iterations; i++) {
        console.log(`\n==================== ITERATION ${i} of ${config.iterations} ====================`);

        const depositSuccessful = await depositETH();

        if (depositSuccessful) {
            log('info', 'ETH deposit successful. Proceeding to withdraw.');
            const withdrawSuccessful = await withdrawETH();
            if (withdrawSuccessful) {
                log('info', 'ETH withdrawal successful.');
            } else {
                log('warn', 'ETH withdrawal failed. Continuing to next iteration.');
            }
        } else {
            log('warn', 'ETH deposit failed. Skipping withdrawal and continuing to next iteration.');
        }

        console.log(`==================== ITERATION ${i} FINISHED ====================\n`);

        if (i < config.iterations && delaySeconds > 0 && Number.isFinite(delaySeconds)) {
            log('info', `Waiting ${delaySeconds} second(s) before next iteration...`);
            await sleep(delaySeconds * 1000);
        }
    }

    log('info', 'All iterations completed. ETH Native Bot shutting down.');
}

main().catch(console.error);