
/* global ethers task */
require("@nomiclabs/hardhat-truffle5");
require('hardhat-contract-sizer');
require('@openzeppelin/hardhat-upgrades');
require('dotenv').config()


const accounts = {
  mnemonic:
    'test test test test test test test test test test test junk',
  accountsBalance: "990000000000000000000",
};

const pk1 = process.env.PK_1 || '';
const pk2 = process.env.PK_2 || '';

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task('accounts', 'Prints the list of accounts', async () => {
  const accounts = await ethers.getSigners()

  for (const account of accounts) {
    console.log(account.address)
  }
})

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
    },
    fuji: {
      url: 'https://api.avax-test.network/ext/bc/C/rpc',
      accounts: [pk1, pk2],
      chainId: 43113,
      live: true,
      saveDeployments: true,
      // tags: ['staging'],
      // gasMultiplier: 4,
      // gas: 800000000,
      // gasPrice: 25000000000,
    },
    'oasis-test': {
      url: 'https://testnet.emerald.oasis.dev',
      accounts: [pk1, pk2],
      chainId: 42261,
      live: true,
      saveDeployments: true,
      // tags: ['staging'],
      // gasMultiplier: 4,
      gas: 8000000,
      gasPrice: 300000000000,
    },
  },
  solidity: {
    version: '0.8.16',
    settings: {
      optimizer: {
        enabled: true,
        runs: 999999
      }
    }
  },
  paths: {
    artifacts: "./artifacts",
    cache: "./cache",
    sources: "./contracts",
    tests: "./test",
    deploy: "./deploy",
    deployments: "./deployments",
  },
  contractSizer: {
    runOnCompile: true,
    disambiguatePaths: false,
  },
  mocha: {
    timeout: 4000000
  }
  // typechain: {
  //   outDir: 'types',
  //   target: 'ethers-v5',
  // },

}
