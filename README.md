# Tako Deposit/Withdrawal Bot

This bot automates the process of depositing and withdrawing assets to a specified contract on the Taiko network.

## Setup

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/caraka15/tako_bot
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Set up your environment variables:**

    Create a `.env` file in the root of the project and add your private key:

    ```
    PRIVATE_KEY=your_private_key_here
    ```

4.  **Configure the bot:**

    Edit the `config.json` file to set your desired parameters:

    - `rpc_url`: The RPC endpoint for the Taiko network.
    - `contract_address`: The address of the contract to interact with.
    - `address_asset`: The address of the asset to deposit and withdraw.
    - `amount`: The amount of the asset to use in each transaction.
    - `gas_price_gwei`: The gas price to use for transactions, in Gwei.
    - `gas_limit`: The gas limit for transactions.
    - `iterations`: The number of deposit/withdrawal cycles to run.

## Running the Bot

To run the bot, use the following command:

```bash
npm start
```

To run the bot in the background using `screen`, you can do the following:

1.  **Start a new screen session:**

    ```bash
    screen -S tako-bot
    ```

2.  **Run the bot:**

    ```bash
    npm start
    ```

3.  **Detach from the screen session:**

    Press `Ctrl+A` then `d` to detach from the screen session. The bot will continue to run in the background.

    To re-attach to the session later, use:

    ```bash
    screen -r tako-bot
    ```
