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

    const loupeContract = new ethers.Contract(addresses.diamondAddress[chainId], new ethers.utils.Interface(DiamondLoupeArtifact.abi), operator)


    const reqContract = new ethers.Contract(addresses.reqAddress[chainId], new ethers.utils.Interface(ERC20.abi), operator)

    const facets = await loupeContract.facets()
    console.log("Facets", facets)

    const currIndex = await treasuryContract.lastPermissionQueueIndex()
    console.log("last queue index", currIndex)

    const queue = await treasuryContract.permissionQueue(16)

    console.log("Queue", queue)
    const indexInRegistryAsset0 = await treasuryContract.indexInRegistry(addresses.assets.DAI[chainId], 1)

    const indexInRegistryAsset1 = await treasuryContract.indexInRegistry(addresses.assets.PAIR_AVAX_USDC[chainId], 1)

    const indexInRegistryAsset2 = await treasuryContract.indexInRegistry(addresses.assets.STABLELP[chainId], 1)

    const indexInRegistryAsset3 = await treasuryContract.indexInRegistry(addresses.assets.WEIGHTED_POOL_CLASSIC[chainId], 1)

    console.log("Index of asset", indexInRegistryAsset0, indexInRegistryAsset1, indexInRegistryAsset2, indexInRegistryAsset3)


    const permissionAssetZero = await treasuryContract.permissions(1, ethers.constants.AddressZero)

    const permissionAsset0 = await treasuryContract.permissions(1, addresses.assets.DAI[chainId])

    const permissionAsset1 = await treasuryContract.permissions(1, addresses.assets.PAIR_AVAX_USDC[chainId])

    const permissionAsset2 = await treasuryContract.permissions(1, addresses.assets.STABLELP[chainId])

    console.log("Assets permission", permissionAssetZero, permissionAsset0, permissionAsset1, permissionAsset2)

    const asset0 = await treasuryContract.registry(1, 0)

    const asset1 = await treasuryContract.registry(1, 1)

    const asset2 = await treasuryContract.registry(1, 2)

    console.log("Assets address", asset0, asset1, asset2)

    const baseSupply = await treasuryContract.baseSupply()

    console.log("Base Supply", ethers.utils.formatEther(baseSupply))

    const excessReserves = await treasuryContract.excessReserves()

    console.log("Excess Reserves", ethers.utils.formatEther(excessReserves))

    const totalReserves = await treasuryContract.totalReserves()

    console.log("Total Reserves", ethers.utils.formatEther(totalReserves))


    const req = await treasuryContract.REQ()

    console.log("REQ", req)

    const reqSupply = await reqContract.totalSupply()

    console.log("REQ supply", ethers.utils.formatEther(reqSupply))

    console.log('Completed view')
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });