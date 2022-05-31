/* global ethers */
/* eslint prefer-const: "off" */

const { FacetCutAction, getSelectors } = require('../libraries/diamond.js')
const { ethers } = require('hardhat')

// script for upgrading the treasury facet
// we assume that all functions are desired to be replaced
async function main() {
    // address of Diamon to upgrade
    const diamondAddress = '0xb3f4bCb8f30E70763c0Cf100a01252b81D23D9ec'

    // get new contract factory
    const TreasuryFacet = await ethers.getContractFactory('TreasuryFacet')

    // deploy new contract
    const treasuryFacet = await TreasuryFacet.deploy()

    const diamondLoupeFacet = await ethers.getContractAt('DiamondLoupeFacet', diamondAddress)

    // get diamondCutFacet for upgrading
    const diamondCutFacet = await ethers.getContractAt('DiamondCutFacet', diamondAddress)

    // funtions to upgrade (all)
    const selectors = getSelectors(treasuryFacet)

    // upgrade execution
    tx = await diamondCutFacet.diamondCut(
        [{
            facetAddress: treasuryFacet.address,
            action: FacetCutAction.Replace,
            functionSelectors: selectors
        }],
        ethers.constants.AddressZero, '0x', { gasLimit: 800000 }
    )
    const receipt = await tx.wait()

    // throw error in case of a failure
    if (!receipt.status) {
        throw Error(`Diamond upgrade failed: ${tx.hash}`)
    } else {
        console.log("Upgrade succeeded")
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });