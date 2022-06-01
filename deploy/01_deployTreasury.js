/* global ethers */
/* eslint prefer-const: "off" */

const { getSelectors, FacetCutAction } = require('../scripts/libraries/diamond.js')

const { ethers } = require('hardhat')

// addresses
const { addresses } = require('../deployments/addresses')

async function main() {
    const chainId = await (await ethers.getSigner()).getChainId();

    console.log("Deploy Treasury Diamond with REQ", addresses.reqAddress[chainId], "on", chainId)

    const accounts = await ethers.getSigners()
    const operator = accounts[0]

    // deploy DiamondCutFacet
    const DiamondCutFacet = await ethers.getContractFactory('DiamondCutFacet')
    const diamondCutFacet = await DiamondCutFacet.deploy()

    await diamondCutFacet.deployed()
    console.log('DiamondCutFacet deployed:', diamondCutFacet.address)

    // deploy Diamond
    const Diamond = await ethers.getContractFactory('Diamond')
    const diamond = await Diamond.deploy(operator.address, diamondCutFacet.address)
    await diamond.deployed()
    console.log('Diamond deployed:', diamond.address)

    // deploy DiamondInit
    // DiamondInit provides a function that is called when the diamond is upgraded to initialize state variables
    // Read about how the diamondCut function works here: https://eips.ethereum.org/EIPS/eip-2535#addingreplacingremoving-functions
    const TreasuryInit = await ethers.getContractFactory('TreasuryInit')
    const treasuryInit = await TreasuryInit.deploy()
    await treasuryInit.deployed()

    console.log('DiamondInit deployed:', treasuryInit.address)

    // deploy facets
    console.log('')
    console.log('Deploying facets')
    const FacetNames = [
        'DiamondLoupeFacet',
        'OwnershipFacet',
        'TreasuryFacet',
        'ManagementFacet'
    ]
    const cut = []
    for (const FacetName of FacetNames) {
        const Facet = await ethers.getContractFactory(FacetName)
        const facet = await Facet.deploy()
        await facet.deployed()
        console.log(`${FacetName} deployed: ${facet.address}`)
        cut.push({
            facetAddress: facet.address,
            action: FacetCutAction.Add,
            functionSelectors: getSelectors(facet)
        })
    }

    // upgrade diamond with facets
    console.log('')
    console.log('Diamond Cut:', cut)

    // console.log(cut.map(x => x.functionSelectors.map(y => abiDecoder.decodeMethod(y))))
    const diamondCut = await ethers.getContractAt('IDiamondCut', diamond.address)
    let tx
    let receipt

    // call to init function
    let functionCall = treasuryInit.interface.encodeFunctionData('init', [operator.address, addresses.reqAddress[chainId], ethers.constants.AddressZero])
    tx = await diamondCut.diamondCut(cut, treasuryInit.address, functionCall)
    console.log('Diamond cut tx: ', tx.hash)
    receipt = await tx.wait()
    if (!receipt.status) {
        throw Error(`Diamond upgrade failed: ${tx.hash}`)
    }
    console.log('Completed diamond cut')
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });