/* global ethers */
/* eslint prefer-const: "off" */

const TreasuryArtifact = require('../artifacts/contracts/facets/TreasuryFacet.sol/TreasuryFacet.json')
const DiamondLoupeArtifact = require('../artifacts/contracts/facets/DiamondLoupeFacet.sol/DiamondLoupeFacet.json')
const OwnershipFacet = require('../artifacts/contracts/facets/OwnershipFacet.sol/OwnershipFacet.json')
const ManagementFacet = require('../artifacts/contracts/facets/ManagementFacet.sol/ManagementFacet.json')
const ERC20 = require('../artifacts/contracts/test/ERC20.sol/ERC20.json')
const { ethers } = require('hardhat')

// abREQ 0xD27388BA6b3A44003A85E336e2Fd76d6e331EF87
// Admin 0x3FB5Dc8B6792943c6b6d42Bd0Aaec3bF539b31a9
// Proxy 0x337AaE5Dd7e0b98d3F558E2eeeA6cE5b9A5b3E63


// DiamondCutFacet deployed: 0xBeA71D6De9Bf877413953cED302566eCF811A700
// Diamond deployed: 0xb3f4bCb8f30E70763c0Cf100a01252b81D23D9ec
// DiamondInit deployed: 0x9360Cfe6dfb2f0f64ABC6cFF35F8B8F89eA206E9

// Deploying facets
// DiamondLoupeFacet deployed: 0x4bEd3ed09698DCc2B2F13E47Be275eaa30D336e3
// OwnershipFacet deployed: 0x48111866672535Ef44CA589672Fe37C7451B0149
// TreasuryFacet deployed: 0xcd064614BA6e6Fc7C99D6cAbA2c1C30fe4309ecD
// ManagementFacet deployed: 0x1851a5E0d6e8732C3798ba8C7a9870dE17D69Ee4

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


// simple script for queuing actions
// sometimes then execute command does not work right away
async function main() {


    const queues = {
        'DEPOSITOR': false,
        'STABLEPRICER': true,
        'ASSET': false,
        'ASSETMANAGER': false,
        'REWARDMANAGER': false,

    }

    const diamondAddress = '0xb3f4bCb8f30E70763c0Cf100a01252b81D23D9ec'
    const bondDepo = '0x56055f641DCb7a5C399553CdCA03E5C56E301A27'
    const accounts = await ethers.getSigners()
    const contractOwner = accounts[0]

    const treasuryContract = new ethers.Contract(diamondAddress, new ethers.utils.Interface(TreasuryArtifact.abi), contractOwner)

    if (queues.DEPOSITOR) {
        console.log("queue Asset Depositor")
        await treasuryContract.queueTimelock(
            status.ASSETDEPOSITOR,
            bondDepo,
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
            bondDepo,
            ethers.constants.AddressZero,
            ethers.constants.AddressZero
        )

        console.log("execute Rewardmanager")
        await treasuryContract.execute(2)
    }

    if (queues.STABLEPRICER) {
        console.log("queue Stable Calculator")
        const calculator = '0x3e6f6f5991fa6b94e08cddbecf03567c7e8da38f'
        const asset = '0x99674285c50CdB86AE423aac9be7917d7D054994' // stable LP
        const quote = '0xaea51e4fee50a980928b4353e852797b54deacd8' // dai
        await treasuryContract.queueTimelock(
            status.ASSET,
            asset,
            calculator,
            quote
        )

        console.log("execute calculator")
        await treasuryContract.execute(3)
    }


    console.log('Completed execution')
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });