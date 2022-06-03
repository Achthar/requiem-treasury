/* global ethers */
/* eslint prefer-const: "off" */

const TreasuryArtifact = require('../artifacts/contracts/facets/TreasuryFacet.sol/TreasuryFacet.json')
const ERC20Artifact = require('../artifacts/contracts/test/ERC20.sol/ERC20.json')

const { ethers } = require('hardhat')

const { addresses } = require('../deployments/addresses')

// simple script for queuing actions
// sometimes then execute command does not work right away
async function main() {
    const chainId = await (await ethers.getSigner()).getChainId();

    const accounts = await ethers.getSigners()
    const operator = accounts[0]
    
    const treasuryContract = new ethers.Contract(addresses.diamondAddress[chainId], new ethers.utils.Interface(TreasuryArtifact.abi), operator)

    await treasuryContract.auditReserves()


    console.log('Completed execution')
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });