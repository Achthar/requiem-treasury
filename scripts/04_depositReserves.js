/* global ethers */
/* eslint prefer-const: "off" */

const TreasuryArtifact = require('../artifacts/contracts/facets/TreasuryFacet.sol/TreasuryFacet.json')
const ERC20Artifact = require('../artifacts/contracts/test/ERC20.sol/ERC20.json')

const { ethers } = require('hardhat')

const { addresses } = require('../deployments/addresses')

function delay(delayInms) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(2);
        }, delayInms);
    });
}

// simple script for queuing actions
// sometimes then execute command does not work right away
async function main() {
    const chainId = await (await ethers.getSigner()).getChainId();

    const accounts = await ethers.getSigners()
    const operator = accounts[0]

    const toDeposit = ethers.BigNumber.from('1000').mul(ethers.BigNumber.from(10).pow(6))
    const profit = ethers.BigNumber.from('1').mul(ethers.BigNumber.from(10).pow(18))

    const treasuryContract = new ethers.Contract(addresses.diamondAddress[chainId], new ethers.utils.Interface(TreasuryArtifact.abi), operator)

    const assetContract = new ethers.Contract(addresses.assets.USDC[chainId], new ethers.utils.Interface(ERC20Artifact.abi), operator)

    const allowance = await assetContract.allowance(operator.address, treasuryContract.address)

    if (allowance.lt(toDeposit)) {
        await assetContract.approve(treasuryContract.address, ethers.constants.MaxUint256)
        await delay(10000)
    }

    await treasuryContract.deposit(
        toDeposit, // uint256 _amount,
        assetContract.address, // address _asset,
        profit // uint256 _profit
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