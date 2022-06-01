/* global ethers */
/* eslint prefer-const: "off" */

const TreasuryArtifact = require('../artifacts/contracts/facets/TreasuryFacet.sol/TreasuryFacet.json')
const ERC20Artifact = require('../artifacts/contracts/test/ERC20.sol/ERC20.json')

const { ethers } = require('hardhat')

const { diamondAddress } = require('../addresses/general')
const { assets } = require('../addresses/assets')

// simple script for queuing actions
// sometimes then execute command does not work right away
async function main() {
    const network = await ethers.getDefaultProvider().getNetwork();
    const chainId = network.chainId

    const accounts = await ethers.getSigners()
    const operator = accounts[0]

    const toDeposit = ethers.BigNumber.from('10').mul(ethers.BigNumber.from(10).pow(18))

    const treasuryContract = new ethers.Contract(diamondAddress[chainId], new ethers.utils.Interface(TreasuryArtifact.abi), operator)

    const assetContract = new ethers.Contract(assets[chainId].DAI, new ethers.utils.Interface(ERC20Artifact.abi), operator)

    const allowance = await assetContract.allowance(operator.address, treasuryContract.address)

    if (allowance.lt(toDeposit)) {
        await assetContract.approve(treasuryContract.address, ethers.constants.MaxUint256)
    }

    await treasuryContract.deposit(
        toDeposit, // uint256 _amount,
        assetContract.address, // address _asset,
        0 // uint256 _profit
    )

    await treasuryContract.auditReserves()


    console.log('Completed execution')
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });