/* global ethers */
/* eslint prefer-const: "off" */

const TreasuryArtifact = require('../artifacts/contracts/facets/TreasuryFacet.sol/TreasuryFacet.json')
const DiamondLoupeArtifact = require('../artifacts/contracts/facets/DiamondLoupeFacet.sol/DiamondLoupeFacet.json')
const OwnershipFacet = require('../artifacts/contracts/facets/OwnershipFacet.sol/OwnershipFacet.json')
const ManagementFacet = require('../artifacts/contracts/facets/ManagementFacet.sol/ManagementFacet.json')
const ERC20 = require('../artifacts/contracts/test/ERC20.sol/ERC20.json')

const { addresses } = require('../deployments/addresses')


const { ethers } = require('hardhat')

const status = {
    'ASSETDEPOSITOR': 0,
    'ASSET': 1,
    'ASSETMANAGER': 2,
    'REWARDMANAGER': 3,
    'DEBTMANAGER': 4,
}


async function main() {
    const chainId = await (await ethers.getSigner()).getChainId();

    const accounts = await ethers.getSigners()
    const operator = accounts[0]

    // const reqContract = new ethers.Contract(reqAddress[chainId], new ethers.utils.Interface(ERC20.abi), operator)

    const treasuryContract = new ethers.Contract(addresses.diamondAddress[chainId], new ethers.utils.Interface(TreasuryArtifact.abi), operator)

    const x = await treasuryContract.permissionQueue(3)

    console.log("TS", x)

    console.log('Completed view')
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });