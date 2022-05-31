/* global describe it before ethers */

const {
  getSelectors,
  FacetCutAction,
  removeSelectors,
  findAddressPositionInFacets
} = require('../scripts/libraries/diamond.js')

const { deployDiamond } = require('../scripts/01_deployTreasuryTest.js')
const { solidity } = require('ethereum-waffle')
const chai = require('chai');
chai.use(solidity);


const { assert, expect } = require('chai')
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
  let mockAsset
  let mockAssetPricer
  const addresses = []
  let contractOwner
  let otherAccount
  let Depo
  let depo

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
    otherAccount = accounts[1]
    const [_diamondAddress, mockREQAddress] = await deployDiamond()
    diamondAddress = _diamondAddress
    diamondCutFacet = await ethers.getContractAt('DiamondCutFacet', diamondAddress)
    diamondLoupeFacet = await ethers.getContractAt('DiamondLoupeFacet', diamondAddress)
    ownershipFacet = await ethers.getContractAt('OwnershipFacet', diamondAddress)
    treasuryFacet = await ethers.getContractAt('TreasuryFacet', diamondAddress)
    treasuryFacetV2 = await ethers.getContractAt('TreasuryFacetV2', diamondAddress)
    mockREQ = await ethers.getContractAt('MockREQ', mockREQAddress)
    const MockDAI = await ethers.getContractFactory('MockERC20')
    mockDAI = await MockDAI.deploy('DAI', 'DAI Stablecoin', 18)

    const MockAsset = await ethers.getContractFactory('MockERC20')
    mockAsset = await MockAsset.deploy('ASSET', 'Asset', 8)
    await mockAsset.mint(contractOwner.address, parseUnits('10000', 8))

    const MockPricer = await ethers.getContractFactory('MockAssetPricer')
    mockAssetPricer = await MockPricer.deploy(mockREQ.address, parseUnits('5', 18))

    await mockDAI.mint(contractOwner.address, ethers.utils.parseUnits('1000000', 18))

    await mockAsset.mint(otherAccount.address, ethers.utils.parseUnits('1000000', 18))

    Depo = await ethers.getContractFactory('MockDepo')
    depo = await Depo.deploy(diamondAddress)


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
    await treasuryFacet.queueTimelock(
      0, // asset depositor
      contractOwner.address,
      ethers.constants.AddressZero,
      ethers.constants.AddressZero
    )

    await treasuryFacet.execute(1)

    const entr = await treasuryFacet.permissions(0, contractOwner.address)
    assert.equal(entr, true)

    await treasuryFacet.queueTimelock(
      1, // asset
      mockAsset.address,
      mockAssetPricer.address,
      mockDAI.address
    )

    await treasuryFacet.execute(2)

    const isAsset = await treasuryFacet.permissions(1, mockAsset.address)
    assert.equal(isAsset, true)

    const calculator = await treasuryFacet.assetPricer(mockAsset.address)
    assert.equal(calculator, mockAssetPricer.address)

    await treasuryFacet.queueTimelock(
      3, // rewardmanger
      depo.address,
      ethers.constants.AddressZero,
      ethers.constants.AddressZero
    )

    await treasuryFacet.execute(3)

    const rewarder = await treasuryFacet.permissions(3, depo.address)
    assert.equal(rewarder, true)

    const toDeposit = parseUnits('12', 7)
    await mockAsset.approve(depo.address, ethers.constants.MaxUint256)
    await depo.mintREQFor(mockAsset.address, toDeposit)
    const assetAm = await mockAsset.balanceOf(diamondAddress)
    assert.equal(assetAm.toString(), toDeposit.toString())
    const reqVal = await treasuryFacet.assetValue(mockAsset.address, toDeposit)
    const reqBal = await mockREQ.balanceOf(contractOwner.address)
    assert.equal(reqVal.toString(), reqBal.toString())

  })


  it('rejects invalid user queue', async () => {
    await expect(treasuryFacet.connect(otherAccount).queueTimelock(
      2, // assetmanager
      otherAccount.address,
      ethers.constants.AddressZero,
      ethers.constants.AddressZero
    )
    ).to.be.revertedWith("Treasury: Must be governor")
  })

  it('rejects invalid deposit', async () => {
    await expect(treasuryFacet.deposit('10', mockDAI.address, '100')).to.be.revertedWith("Treasury: invalid asset")
  })


  it('rejects unauthorized mints', async () => {
    await expect(treasuryFacet.mint(contractOwner.address, '100')).to.be.revertedWith("Treasury: not approved")
  })

  it('rejects unauthorized deposits', async () => {
    await expect(depo.depositForREQ(mockAsset.address, '10')).to.be.revertedWith("Treasury: not approved")
  })

  it('rejects unauthorized withdraws regards to user', async () => {
    await expect(treasuryFacet.withdraw('10', mockAsset.address)).to.be.revertedWith("Treasury: not approved")

  })

  it('rejects unauthorized withdraws regards to asset', async () => {
    await expect(treasuryFacet.connect(otherAccount).withdraw('10', mockDAI.address)).to.be.revertedWith("Treasury: not accepted")

  })


  it('can deposit if approved', async () => {

    await treasuryFacet.queueTimelock(
      0, // depositor
      otherAccount.address,
      ethers.constants.AddressZero,
      ethers.constants.AddressZero
    )

    await treasuryFacet.execute(4)
    await mockAsset.connect(otherAccount).approve(diamondAddress, ethers.constants.MaxUint256)

    const valuation = await treasuryFacet.assetValue(mockAsset.address, '1000')

    await treasuryFacet.connect(otherAccount).deposit('1000', mockAsset.address, 0)

    const retVal = await mockREQ.balanceOf(otherAccount.address)

    expect(retVal).to.equal(valuation)
  })

  it('can withdraw if approved', async () => {

    await treasuryFacet.queueTimelock(
      2, // assetmanager
      otherAccount.address,
      ethers.constants.AddressZero,
      ethers.constants.AddressZero
    )

    await treasuryFacet.execute(5)

    await mockREQ.connect(otherAccount).approve(treasuryFacet.address, ethers.constants.MaxUint256)

    await treasuryFacet.connect(otherAccount).withdraw('10', mockAsset.address)
  })

  it('should replace all functions and add some', async () => {
    const treasuryV2Facet = await ethers.getContractFactory('TreasuryFacetV2')
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
