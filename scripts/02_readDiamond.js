/* global ethers */
/* eslint prefer-const: "off" */

const TreasuryArtifact = require('../artifacts/contracts/facets/TreasuryFacet.sol/TreasuryFacet.json')
const DiamondLoupeArtifact = require('../artifacts/contracts/facets/DiamondLoupeFacet.sol/DiamondLoupeFacet.json')
const OwnershipFacet = require('../artifacts/contracts/facets/OwnershipFacet.sol/OwnershipFacet.json')
const ManagementFacet = require('../artifacts/contracts/facets/ManagementFacet.sol/ManagementFacet.json')
const ERC20 = require('../artifacts/contracts/test/ERC20.sol/ERC20.json')

const { reqAddress, diamondAddress } = require('../addresses/general')
const { ethers } = require('hardhat')

async function main() {
    const network = await ethers.getDefaultProvider().getNetwork();
    const chainId = network.chainId

    const accounts = await ethers.getSigners()
    const operator = accounts[0]

    // const reqContract = new ethers.Contract(reqAddress[chainId], new ethers.utils.Interface(ERC20.abi), operator)

    const treasuryContract = new ethers.Contract(diamondAddress[chainId], new ethers.utils.Interface(TreasuryArtifact.abi), operator)

    const x = await treasuryContract.permissionQueue(4)

    console.log("TS", x)

    console.log('Completed view')
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });