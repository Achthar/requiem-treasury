/* global ethers */
/* eslint prefer-const: "off" */

const TreasuryArtifact = require('../artifacts/contracts/facets/TreasuryFacet.sol/TreasuryFacet.json')
const { pricers } = require('../addresses/pricers')
const { assets } = require('../addresses/assets')
const { quotes } = require('../addresses/quotes')
const { bondDepo, diamondAddress } = require('../addresses/general')
const { ethers } = require('hardhat')

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

const status = {
    'ASSETDEPOSITOR': 0,
    'ASSET': 1,
    'ASSETMANAGER': 2,
    'REWARDMANAGER': 3,
    'DEBTMANAGER': 4,
}

const queues = {
    DEPOSITOR: false,
    STABLEPRICER: false,
    ASSET: false,
    ASSETMANAGER: false,
    REWARDMANAGER: false,
    TRIVIAL: true
}


// simple script for queuing actions
// sometimes then execute command does not work right away
async function main() {
    const network = await ethers.getDefaultProvider().getNetwork();
    const chainId = network.chainId

    const accounts = await ethers.getSigners()
    const operator = accounts[0]

    const treasuryContract = new ethers.Contract(diamondAddress[chainId], new ethers.utils.Interface(TreasuryArtifact.abi), operator)

    if (queues.DEPOSITOR) {
        console.log("queue Asset Depositor")
        await treasuryContract.queueTimelock(
            status.ASSETDEPOSITOR,
            bondDepo[chainId],
            ethers.constants.AddressZero,
            ethers.constants.AddressZero
        )

        console.log("execute Asset Depositor")
        await treasuryContract.execute(1)
    }

    if (queues.REWARDMANAGER) {
        console.log("queue Rewardmanager")
        await treasuryContract.queueTimelock(
            status.REWARDMANAGER,
            bondDepo[chainId],
            ethers.constants.AddressZero,
            ethers.constants.AddressZero
        )

        console.log("execute Rewardmanager")
        await treasuryContract.execute(2)
    }

    if (queues.STABLEPRICER) {
        await treasuryContract.queueTimelock(
            status.ASSET,
            assets[chainId].STABLELP,
            pricers[chainId].STABLE,
            quotes[chainId].DAI
        )

        console.log("execute calculator")
        await treasuryContract.execute(3)
    }

    if (queues.TRIVIAL) {
        await treasuryContract.queueTimelock(
            status.ASSET,
            assets[chainId].DAI,
            pricers[chainId].TRIVIAL,
            quotes[chainId].DAI
        )

        console.log("execute calculator")
        await treasuryContract.execute(4)
    }

    console.log('Completed execution')
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });