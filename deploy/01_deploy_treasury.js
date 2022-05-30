/* global ethers */
/* eslint prefer-const: "off" */

const { getSelectors, FacetCutAction } = require('../scripts/libraries/diamond.js')

const abiDecoder = require('abi-decoder')
const TreasuryArtifact = require('../artifacts/contracts/facets/TreasuryFacet.sol/TreasuryFacet.json')
const DiamondLoupeArtifact = require('../artifacts/contracts/facets/DiamondLoupeFacet.sol/DiamondLoupeFacet.json')
const OwnershipFacet = require('../artifacts/contracts/facets/OwnershipFacet.sol/OwnershipFacet.json')
const ManagementFacet = require('../artifacts/contracts/facets/ManagementFacet.sol/ManagementFacet.json')
const { ethers } = require('hardhat')

async function main() {

    const reqAddress = '0xD27388BA6b3A44003A85E336e2Fd76d6e331EF87'

    abiDecoder.addABI([...TreasuryArtifact.abi, ...DiamondLoupeArtifact.abi, ...OwnershipFacet.abi, ...ManagementFacet.abi]);

    const accounts = await ethers.getSigners()
    const contractOwner = accounts[0]

    // deploy DiamondCutFacet
    const DiamondCutFacet = await ethers.getContractFactory('DiamondCutFacet')
    const diamondCutFacet = await DiamondCutFacet.deploy()

    await diamondCutFacet.deployed()
    console.log('DiamondCutFacet deployed:', diamondCutFacet.address)

    // deploy Diamond
    const Diamond = await ethers.getContractFactory('Diamond')
    const diamond = await Diamond.deploy(contractOwner.address, diamondCutFacet.address)
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
    let functionCall = treasuryInit.interface.encodeFunctionData('init', [contractOwner.address, reqAddress, ethers.constants.AddressZero])
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