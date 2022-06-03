/* global ethers */
/* eslint prefer-const: "off" */

const TreasuryArtifact = require('../artifacts/contracts/facets/TreasuryFacet.sol/TreasuryFacet.json')
const { ethers } = require('hardhat')
const { addresses } = require('../deployments/addresses')


// enum STATUS {
//     ASSETDEPOSITOR, = 0
//     ASSET, = 1
//     ASSETMANAGER, = 2
//     REWARDMANAGER, = 3
//     DEBTMANAGER, = 4
//     DEBTOR, = 5
//     COLLATERAL, = 6
//     CREQ = 7
// }

// the status for the treasury
const status = {
    'ASSETDEPOSITOR': 0,
    'ASSET': 1,
    'ASSETMANAGER': 2,
    'REWARDMANAGER': 3,
    'DEBTMANAGER': 4,
}

// define here which action to queue
const queues = {
    DEPOSITOR: false,
    DEPOSITORUSER: false,
    STABLEPRICER: false,
    PAIRPRICER: true,
    WEIGHTEDPRICER: true,
    ASSET: false,
    ASSETMANAGER: false,
    REWARDMANAGER: false,
    TRIVIAL: false
}


// simple script for queuing actions
// sometimes then execute command does not work right away
async function main() {
    const accounts = await ethers.getSigners()
    const operator = accounts[0]
    const chainId = await operator.getChainId()

    const treasuryContract = new ethers.Contract(addresses.diamondAddress[chainId], new ethers.utils.Interface(TreasuryArtifact.abi), operator)

    const permissionAsset0 = await treasuryContract.permissions(1, addresses.assets.DAI[chainId])

    const permissionAsset1 = await treasuryContract.permissions(1, addresses.assets.PAIR_AVAX_USDC[chainId])

    const permissionAsset2 = await treasuryContract.permissions(1, addresses.assets.STABLELP[chainId])

    if (permissionAsset0) {
        console.log("disabling DAI")
        await treasuryContract.disable(1, addresses.assets.DAI[chainId])
        console.log("disabling DAI complete")
    }

    if (permissionAsset1) {
        console.log("disabling Pair")
        await treasuryContract.disable(1, addresses.assets.PAIR_AVAX_USDC[chainId])
        console.log("disabling Pair complete")
    }

    if (permissionAsset2) {
        console.log("disabling Stable LP")
        await treasuryContract.disable(1, addresses.assets.STABLELP[chainId])
        console.log("disabling Stable LP complete")
    }


    console.log('disabling execution')
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });