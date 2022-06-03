/* global ethers */
/* eslint prefer-const: "off" */

const { FacetCutAction, getSelectors } = require('../libraries/diamond.js')
const { ethers } = require('hardhat')

const { addresses } = require('../../deployments/addresses')
const oldABI = require('../../contracts/oldFacets/v01/treasuryFacetABI.json')

// script for upgrading the treasury facet
// we assume that all functions are desired to be replaced
async function main() {
    const chainId = await (await ethers.getSigner()).getChainId();

    const accounts = await ethers.getSigners()
    const operator = accounts[0]


    // get old facet address
    const oldTreasuryfacetAddress = '0x40103f8C109C92E7abe460ceFDCD539F0eB4D521'

    // get new contract factory
    const TreasuryFacet = await ethers.getContractFactory('TreasuryFacet')

    // deploy new facet contract
    const treasuryFacet = await TreasuryFacet.deploy()

    const diamondLoupeFacet = await ethers.getContractAt('DiamondLoupeFacet', addresses.diamondAddress[chainId])

    // get diamondCutFacet for upgrading
    const diamondCutFacet = await ethers.getContractAt('DiamondCutFacet', addresses.diamondAddress[chainId])


    // get old contract data
    const oldContract = new ethers.Contract(addresses.diamondAddress[chainId], new ethers.utils.Interface(oldABI))

    const oldSelectors = getSelectors(oldContract)

    // old selectors
    let selectors = await diamondLoupeFacet.facetFunctionSelectors(oldTreasuryfacetAddress)

    let tx
    let receipt
    if (selectors.length > 0) {
        // remove selectors
        tx = await diamondCutFacet.diamondCut(
            [{
                facetAddress: ethers.constants.AddressZero,
                action: FacetCutAction.Remove,
                functionSelectors: selectors
            }],
            ethers.constants.AddressZero, '0x', { gasLimit: 8000000 }
        )
        receipt = await tx.wait()

        // throw error in case of a failure
        if (!receipt.status) {
            throw Error(`Diamond remove failed: ${tx.hash}`)
        } else {
            console.log("Upgrade succeeded")
        }
    }

    // add execution
    tx = await diamondCutFacet.diamondCut(
        [{
            facetAddress: treasuryFacet.address,
            action: FacetCutAction.Add,
            functionSelectors: getSelectors(treasuryFacet)
        }],
        ethers.constants.AddressZero, '0x', { gasLimit: 8000000 }
    )
    receipt = await tx.wait()

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