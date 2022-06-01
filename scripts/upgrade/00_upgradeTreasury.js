/* global ethers */
/* eslint prefer-const: "off" */

const { FacetCutAction, getSelectors } = require('../libraries/diamond.js')
const { ethers } = require('hardhat')
const { diamondAddress } = require('../../addresses/general')

const oldABI = require('../../contracts/oldFacets/v00/treasuryFacetABI.json')

// script for upgrading the treasury facet
// we assume that all functions are desired to be replaced
async function main() {
    const network = await ethers.getDefaultProvider().getNetwork();
    const chainId = network.chainId

    // get old facet address
    const oldTreasuryfacetAddress = '0xcd064614BA6e6Fc7C99D6cAbA2c1C30fe4309ecD'

    // get new contract factory
    const TreasuryFacet = await ethers.getContractFactory('TreasuryFacet')

    // deploy new facet contract
    const treasuryFacet = await TreasuryFacet.deploy()

    const diamondLoupeFacet = await ethers.getContractAt('DiamondLoupeFacet', diamondAddress[chainId])

    // get diamondCutFacet for upgrading
    const diamondCutFacet = await ethers.getContractAt('DiamondCutFacet', diamondAddress[chainId])


    // get old contract data
    const oldContract = new ethers.Contract(diamondAddress[chainId], new ethers.utils.Interface(oldABI))

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
                functionSelectors: oldSelectors
            }],
            ethers.constants.AddressZero, '0x', { gasLimit: 800000 }
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