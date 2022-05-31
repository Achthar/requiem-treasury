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

async function main() {

    const reqAddress = '0xD27388BA6b3A44003A85E336e2Fd76d6e331EF87'
    const diamondAddress = '0xb3f4bCb8f30E70763c0Cf100a01252b81D23D9ec'

    const accounts = await ethers.getSigners()
    const contractOwner = accounts[0]

    const reqContract = new ethers.Contract(reqAddress, new ethers.utils.Interface(ERC20.abi), contractOwner)

    // TreasuryFacetFactory
    const TreasuryFacet = await ethers.getContractFactory('TreasuryFacet')
    const treasuryFacet = await TreasuryFacet.attach(diamondAddress)

    const treasuryContract = new ethers.Contract(diamondAddress, new ethers.utils.Interface(TreasuryArtifact.abi), contractOwner)

    const x = await treasuryContract.permissionQueue(2)

    console.log("TS", x)

    console.log('Completed view')
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });