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

const status = {
    'ASSETDEPOSITOR': 0,
    'ASSET': 1,
    'ASSETMANAGER': 2,
    'REWARDMANAGER': 3,
    'DEBTMANAGER': 4,
}

const queues = {
    DEPOSITOR: false,
    DEPOSITORUSER: false,
    STABLEPRICER: false,
    ASSET: false,
    ASSETMANAGER: false,
    REWARDMANAGER: true,
    TRIVIAL: false
}


// simple script for queuing actions
// sometimes then execute command does not work right away
async function main() {
    const chainId = await (await ethers.getSigner()).getChainId();

    const accounts = await ethers.getSigners()
    const operator = accounts[0]

    const treasuryContract = new ethers.Contract(addresses.diamondAddress[chainId], new ethers.utils.Interface(TreasuryArtifact.abi), operator)

    let currIndex = await treasuryContract.lastPermissionQueueIndex()
    console.log("current index", currIndex)
    if (queues.DEPOSITOR) {
        console.log("queue Asset Depositor")
        await treasuryContract.queueTimelock(
            status.ASSETDEPOSITOR,
            addresses.bondDepo[chainId],
            ethers.constants.AddressZero,
            ethers.constants.AddressZero
        )

        console.log("Queue complete")
        setTimeout(() => { console.log("Waiting done"); }, 5000);

        currIndex = await treasuryContract.lastPermissionQueueIndex()
        console.log("index", currIndex)

        console.log("execute Asset Depositor")
        await treasuryContract.execute(currIndex)
    }

    if (queues.REWARDMANAGER) {
        console.log("queue Rewardmanager")
        await treasuryContract.queueTimelock(
            status.REWARDMANAGER,
            addresses.bondDepo[chainId],
            ethers.constants.AddressZero,
            ethers.constants.AddressZero
        )

        console.log("Queue complete")
        setTimeout(() => { console.log("Waiting done"); }, 5000);

        currIndex = await treasuryContract.lastPermissionQueueIndex()
        console.log("index", currIndex)

        console.log("execute Rewardmanager")
        await treasuryContract.execute(currIndex)
    }

    if (queues.STABLEPRICER) {
        console.log("queue Stablepricer")
        await treasuryContract.queueTimelock(
            status.ASSET,
            addresses.assets.STABLELP[chainId],
            addresses.pricers.STABLE[chainId],
            addresses.quotes.DAI[chainId]
        )

        console.log("Queue complete")
        setTimeout(() => { console.log("Waiting done"); }, 5000);

        currIndex = await treasuryContract.lastPermissionQueueIndex()
        console.log("index", currIndex)

        console.log("execute calculator")
        await treasuryContract.execute(currIndex)
    }

    if (queues.TRIVIAL) {
        console.log("queue Trivial Pricer")
        await treasuryContract.queueTimelock(
            status.ASSET,
            addresses.assets.DAI[chainId],
            addresses.pricers.TRIVIAL[chainId],
            addresses.quotes.DAI[chainId]
        )

        console.log("Queue complete")
        setTimeout(() => { console.log("Waiting done"); }, 5000);

        currIndex = await treasuryContract.lastPermissionQueueIndex()
        console.log("index", currIndex)

        console.log("execute calculator")
        await treasuryContract.execute(currIndex)
    }

    if (queues.DEPOSITORUSER) {
        console.log("queue user as depositor")
        await treasuryContract.queueTimelock(
            status.ASSETDEPOSITOR,
            operator.address,
            ethers.constants.AddressZero,
            ethers.constants.AddressZero
        )

        console.log("Queue complete")
        setTimeout(() => { console.log("Waiting done"); }, 5000);

        currIndex = await treasuryContract.lastPermissionQueueIndex()
        console.log("index", currIndex)

        console.log("execute calculator")
        await treasuryContract.execute(currIndex)
    }

    if (queues.DEPOSITOR) {
        console.log("queue user as depositor")
        await treasuryContract.queueTimelock(
            status.ASSETDEPOSITOR,
            addresses.bondDepo[chainId],
            ethers.constants.AddressZero,
            ethers.constants.AddressZero
        )

        console.log("Queue complete")
        setTimeout(() => { console.log("Waiting done"); }, 5000);

        currIndex = await treasuryContract.lastPermissionQueueIndex()
        console.log("index", currIndex)

        console.log("execute calculator")
        await treasuryContract.execute(currIndex)
    }


    console.log('Completed execution')
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });