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
    DEPOSITOR: true,
    DEPOSITORUSER: false,
    STABLEPRICER: false,
    PAIRPRICER: false,
    WEIGHTEDPRICER: false,
    ASSETMANAGER: false,
    REWARDMANAGER: true,
    TRIVIAL: false,
    ABREQ_PRICER: false
}

function delay(delayInms) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(2);
        }, delayInms);
    });
}


// simple script for queuing actions
// sometimes then execute command does not work right away
async function main() {
    const accounts = await ethers.getSigners()
    const operator = accounts[0]
    const chainId = await operator.getChainId()

    const treasuryContract = new ethers.Contract(addresses.diamondAddress[chainId], new ethers.utils.Interface(TreasuryArtifact.abi), operator)

    let currIndex = await treasuryContract.lastPermissionQueueIndex()
    console.log("current index", currIndex)
    if (queues.DEPOSITOR) {
        console.log("queue depoAddress as depositor")

        await treasuryContract.queueTimelock(
            status.ASSETDEPOSITOR,
            addresses.callableBondDepo[chainId],
            ethers.constants.AddressZero,
            ethers.constants.AddressZero
        )

        console.log("Queue complete")
        await delay(10000)
        console.log("Waiting done");

        currIndex = await treasuryContract.lastPermissionQueueIndex()
        console.log("index", currIndex)

        console.log("execute deositor")
        await treasuryContract.execute(currIndex)
    }

    if (queues.REWARDMANAGER) {
        console.log("queue Rewardmanager")
        await treasuryContract.queueTimelock(
            status.REWARDMANAGER,
            addresses.callableBondDepo[chainId],
            ethers.constants.AddressZero,
            ethers.constants.AddressZero
        )

        console.log("Queue complete")
        await delay(10000)

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
            addresses.quotes.USDC[chainId]
        )

        console.log("Queue complete")
        await delay(10000)

        currIndex = await treasuryContract.lastPermissionQueueIndex()
        console.log("index", currIndex)

        console.log("execute calculator")
        await treasuryContract.execute(currIndex)
    }

    if (queues.TRIVIAL) {
        console.log("queue Trivial Pricer")
        await treasuryContract.queueTimelock(
            status.ASSET,
            addresses.assets.USDC[chainId],
            addresses.pricers.TRIVIAL[chainId],
            addresses.quotes.USDC[chainId]
        )

        console.log("Queue complete")
        await delay(10000)

        currIndex = await treasuryContract.lastPermissionQueueIndex()
        console.log("index", currIndex)

        console.log("execute calculator")
        await treasuryContract.execute(currIndex)
    }

    if (queues.PAIRPRICER) {
        console.log("queue General Pair Pricer")
        await treasuryContract.queueTimelock(
            status.ASSET,
            addresses.assets.PAIR_ABREQ_USDC[chainId],
            addresses.pricers.PAIR[chainId],
            addresses.quotes.USDC[chainId]
        )

        console.log("Queue complete")
        await delay(10000)

        currIndex = await treasuryContract.lastPermissionQueueIndex()
        console.log("index", currIndex)

        console.log("execute calculator")
        await treasuryContract.execute(currIndex)
    }

    if (queues.WEIGHTEDPRICER) {
        console.log("queue Weighted Pool Pricer")
        await treasuryContract.queueTimelock(
            status.ASSET,
            addresses.assets.WEIGHTED_POOL_CLASSIC[chainId],
            addresses.pricers.WEIGHTED[chainId],
            addresses.quotes.USDC[chainId]
        )

        console.log("Queue complete")
        await delay(10000)

        currIndex = await treasuryContract.lastPermissionQueueIndex()
        console.log("index", currIndex)

        console.log("execute calculator")
        await treasuryContract.execute(currIndex)
    }


    if (queues.ABREQ_PRICER) {
        console.log("queue REQ Pair Pricer")
        await treasuryContract.queueTimelock(
            status.ASSET,
            addresses.assets.PAIR_ABREQ_DAI[chainId],
            addresses.pricers.ABREQ_PAIR[chainId],
            addresses.quotes.DAI[chainId]
        )

        console.log("Queue complete")
        await delay(10000)

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
        await delay(10000)

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