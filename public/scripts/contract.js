// Global Variables
let subscriptionContract, walletProvider, userAddress;

function assertLegacyIdentity(provider = walletProvider, account = userAddress) {
    const session = window.DecentHead.getWallet();
    const state = session.snapshot();
    if (!provider || !account || provider !== walletProvider || account !== userAddress ||
        !state.connected || state.address?.toLowerCase() !== account.toLowerCase() ||
        BigInt(state.chainId) !== 137n) {
        throw new Error('Legacy wallet session changed or wrong chain; reconnect and review.');
    }
}

async function verifyLegacyOperation(contract = subscriptionContract) {
    const provider = walletProvider, account = userAddress;
    assertLegacyIdentity(provider, account);
    if (!contract || contract !== subscriptionContract ||
        Number((await provider.getNetwork()).chainId) !== 137 ||
        await provider.getCode(contract.address) === '0x') {
        throw new Error('Legacy Polygon deployment unavailable; no operations enabled');
    }
    assertLegacyIdentity(provider, account);
    if (contract !== subscriptionContract) throw new Error('Legacy contract changed; review again.');
    return contract;
}

// Connect Wallet
async function connectWallet() {
    if (!window.DecentHead?.getWallet().snapshot().connected && !window.DecentHead?.getWallet().available().length) {
        alert("MetaMask is not installed! Please install MetaMask to use this application.");
        return;
    }

    try {
        // Connect wallet
        const session = window.DecentHead.getWallet();
        if (!session.snapshot().connected) await session.connect();
        if (BigInt(session.snapshot().chainId) !== 137n) throw new Error("Legacy subscriptions require documented Polygon chain 137; no switch is automatic.");
        walletProvider = new ethers.providers.Web3Provider(session.rawProvider, 'any');
        userAddress = session.snapshot().address;

        console.log("Wallet connected:", userAddress);

        // Update MetaMask icon to show connection
        const walletButton = document.getElementById("walletConnectButton");
        walletButton.classList.remove("disconnected");
        walletButton.classList.add("connected");
    } catch (error) {
        console.error("Error connecting wallet:", error.message);
        throw error;
    }
}

// Initialize Contract
async function initializeContract(contractAddress) {
    try {
        if (!walletProvider) {
            throw new Error("Wallet is not connected. Please connect your wallet first.");
        }

        const provider = walletProvider, account = userAddress;
        const abi = await loadABI();
        if (Number((await provider.getNetwork()).chainId) !== 137 ||
            await provider.getCode(contractAddress) === '0x') {
            throw new Error('Legacy Polygon deployment unavailable; no operations enabled');
        }
        assertLegacyIdentity(provider, account);
        const signer = provider.getSigner();
        const candidate = new ethers.Contract(contractAddress, abi, signer);
        const influencerAddress = await candidate.owner();
        assertLegacyIdentity(provider, account);
        subscriptionContract = candidate;

        console.log("Decent Subscription Contract Initialized:", subscriptionContract.address);

        // Display contract addressd
        const polygonIcons = Array(4)
            .fill('<img src="./assets/Polygon_Logo.png" class="icon-small" alt="Polygon">')
            .join("");

        const contractDisplay = document.getElementById("contract-address");
        if (contractDisplay) {
            contractDisplay.innerHTML = `
                ${contractAddress.slice(0, 6)}...${polygonIcons}...${contractAddress.slice(-4)}
            `;
            contractDisplay.onclick = () => {
                window.open(`https://polygonscan.com/address/${contractAddress}`, "_blank");
            };
            contractDisplay.classList.remove("hidden");
        }

        // Display influencer address (owner of the contract)
        const influencerDisplay = document.getElementById("influencer-address");
        if (influencerDisplay) {
            influencerDisplay.innerHTML = `
                <strong>Influencer:</strong> ${influencerAddress.slice(0, 6)}...${polygonIcons}...${influencerAddress.slice(-4)}
            `;
            influencerDisplay.onclick = () => {
                window.open(`https://polygonscan.com/address/${influencerAddress}`, "_blank");
            };
            influencerDisplay.classList.remove("hidden");
        }

        // Show Update Fee Button if the connected wallet is the owner
        if (userAddress.toLowerCase() === influencerAddress.toLowerCase()) {
            const updateFeeButton = document.getElementById("updateFeeControl");
            updateFeeButton.classList.remove("hidden");
            updateFeeButton.onclick = () => {
                // Add logic for updating the fee (e.g., open a modal or input field)
                const newFee = prompt("Enter the new subscription fee (in POL):");
                if (newFee) updateSubscriptionFee(newFee);
            };
        }

    } catch (error) {
        console.error("Error initializing contract:", error.message);
        throw error;
    }
}

// Load the ABI
const loadABI = async () => {
    const response = await fetch("./assets/decentSubscriptionABI.json");
    if (!response.ok) throw new Error("Failed to load contract ABI.");
    return response.json();
};