/* global describe it before ethers */

const {
  getSelectors,
  FacetCutAction,
  removeSelectors,
  findAddressPositionInFacets
} = require('../scripts/libraries/diamond.js')

const { deployDiamond } = require('../scripts/deployTreasury.js')

const { assert } = require('chai')
const { ethers } = require('hardhat')
const { parseUnits } = require('ethers/lib/utils')

describe('DiamondTestTreasury', async function () {
  let diamondAddress
  let diamondCutFacet
  let diamondLoupeFacet
  let ownershipFacet
  let treasuryFacet
  let treasuryFacetV2
  let tx
  let receipt
  let result
  let mockREQ
  let mockDAI
  let mockAssetPricer
  const addresses = []
  let contractOwner

  // enum STATUS {
  //     ASSETDEPOSITOR, =0
  //     ASSET, = 1
  //     ASSETMANAGER, = 2
  //     REWARDMANAGER, = 3
  //     DEBTMANAGER, = 4
  //     DEBTOR, = 5
  //     COLLATERAL, = 6
  //     CREQ = 7
  // }

  before(async function () {
    const accounts = await ethers.getSigners()
    contractOwner = accounts[0]
    const [_diamondAddress, mockREQAddress] = await deployDiamond()
    diamondAddress = _diamondAddress
    diamondCutFacet = await ethers.getContractAt('DiamondCutFacet', diamondAddress)
    diamondLoupeFacet = await ethers.getContractAt('DiamondLoupeFacet', diamondAddress)
    ownershipFacet = await ethers.getContractAt('OwnershipFacet', diamondAddress)
    treasuryFacet = await ethers.getContractAt('TreasuryBaseFacet', diamondAddress)
    treasuryFacetV2 = await ethers.getContractAt('TreasuryBaseFacetV2', diamondAddress)
    mockREQ = await ethers.getContractAt('MockREQ', mockREQAddress)
    const MockDAI = await ethers.getContractFactory('MockERC20')
    mockDAI = await MockDAI.deploy('DAI', 'DAI Stablecoin', 18)

    const MockPricer = await ethers.getContractFactory('MockAssetPricer')
    mockAssetPricer = await MockPricer.deploy(mockREQ.address, parseUnits('5', 18))

    await mockDAI.mint(contractOwner.address, ethers.utils.parseUnits('1000000', 18))


  })

  it('should have four facets -- call to facetAddresses function', async () => {
    for (const address of await diamondLoupeFacet.facetAddresses()) {
      addresses.push(address)
    }

    assert.equal(addresses.length, 4)
  })

  it('facets should have the right function selectors -- call to facetFunctionSelectors function', async () => {
    let selectors = getSelectors(diamondCutFacet)
    result = await diamondLoupeFacet.facetFunctionSelectors(addresses[0])
    assert.sameMembers(result, selectors)
    selectors = getSelectors(diamondLoupeFacet)
    result = await diamondLoupeFacet.facetFunctionSelectors(addresses[1])
    assert.sameMembers(result, selectors)
    selectors = getSelectors(ownershipFacet)
    result = await diamondLoupeFacet.facetFunctionSelectors(addresses[2])
    assert.sameMembers(result, selectors)
    selectors = getSelectors(treasuryFacet)
    result = await diamondLoupeFacet.facetFunctionSelectors(addresses[3])
    assert.sameMembers(result, selectors)
  })

  it('selectors should be associated to facets correctly -- multiple calls to facetAddress function', async () => {
    assert.equal(
      addresses[0],
      await diamondLoupeFacet.facetAddress('0x1f931c1c')
    )
    assert.equal(
      addresses[1],
      await diamondLoupeFacet.facetAddress('0xcdffacc6')
    )
    assert.equal(
      addresses[1],
      await diamondLoupeFacet.facetAddress('0x01ffc9a7')
    )
    assert.equal(
      addresses[2],
      await diamondLoupeFacet.facetAddress('0xf2fde38b')
    )
    assert.equal(
      addresses[3],
      await diamondLoupeFacet.facetAddress('0x40c10f19')
    )
  })


  it('has initialized values', async () => {
    const reqAddr = await treasuryFacet.REQ()
    assert.equal(reqAddr, mockREQ.address)
  })

  it('allows regular queuing', async () => {
    console.log("ARGS",
      0, // asset depositor
      contractOwner.address,
      mockAssetPricer.address
    )
    await treasuryFacet.queueTimelock(
      0, // asset depositor
      contractOwner.address,
      mockAssetPricer.address
    )

    await treasuryFacet.execute(0)

    const entr = await treasuryFacet.permissions(0, contractOwner.address)
    assert.equal(entr, true)
  })

  it('should replace all functions and add some', async () => {
    const treasuryV2Facet = await ethers.getContractFactory('TreasuryBaseFacetV2')
    const treasuryV2FacetContract = await treasuryV2Facet.deploy()
    const oldSelectors = getSelectors(treasuryFacet)
    const selectorsNew = getSelectors(treasuryV2Facet).filter(function (x) { return !oldSelectors.includes(x) })
    tx = await diamondCutFacet.diamondCut(
      [{
        facetAddress: treasuryV2FacetContract.address,
        action: FacetCutAction.Replace,
        functionSelectors: oldSelectors
      },
      {
        facetAddress: treasuryV2FacetContract.address,
        action: FacetCutAction.Add,
        functionSelectors: selectorsNew
      }
      ],
      ethers.constants.AddressZero, '0x', { gasLimit: 800000 })
    receipt = await tx.wait()
    if (!receipt.status) {
      throw Error(`Diamond upgrade failed: ${tx.hash}`)
    }
    result = await diamondLoupeFacet.facetFunctionSelectors(treasuryV2FacetContract.address)
    assert.sameMembers(result, getSelectors(treasuryV2Facet))

    const reqAddr = await treasuryFacet.REQ()
    assert.equal(reqAddr, mockREQ.address)

    const value = ethers.BigNumber.from('123321321')
    await treasuryFacetV2.setNewValue(value)
    const check = await treasuryFacetV2.newValue()
    assert.equal(value.toString(), check.toString())
  })

  it('remove all functions and facets except \'diamondCut\' and \'facets\'', async () => {
    let selectors = []
    let facets = await diamondLoupeFacet.facets()
    for (let i = 0; i < facets.length; i++) {
      selectors.push(...facets[i].functionSelectors)
    }
    selectors = removeSelectors(selectors, ['facets()', 'diamondCut(tuple(address,uint8,bytes4[])[],address,bytes)'])
    tx = await diamondCutFacet.diamondCut(
      [{
        facetAddress: ethers.constants.AddressZero,
        action: FacetCutAction.Remove,
        functionSelectors: selectors
      }],
      ethers.constants.AddressZero, '0x', { gasLimit: 800000 })
    receipt = await tx.wait()
    if (!receipt.status) {
      throw Error(`Diamond upgrade failed: ${tx.hash}`)
    }
    facets = await diamondLoupeFacet.facets()
    assert.equal(facets.length, 2)
    assert.equal(facets[0][0], addresses[0])
    assert.sameMembers(facets[0][1], ['0x1f931c1c'])
    assert.equal(facets[1][0], addresses[1])
    assert.sameMembers(facets[1][1], ['0x7a0ed627'])
  })
})
