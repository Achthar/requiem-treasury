![image](https://requiem-finance.s3.eu-west-2.amazonaws.com/logos/requiem/requiem-finance-column.svg)

# Implementation of Requiem Finance Treasury using an Upgradeable Diamond

The implementation of Requiemm's Treasury uses [EIP-2535 Diamond Standard](https://github.com/ethereum/EIPs/issues/2535) derived from https://github.com/mudgen/diamond. 

Using that standards allows continuous improvement with highest flexibility - functions and datatypes can be added over time without size restrictions as in UUPS Proxies.

## Facet Information

The `contracts/Diamond.sol` file shows the implementation of the diamond.

The `contracts/facets/DiamondCutFacet.sol` file shows how to implement the `diamondCut` external function.

The `contracts/facets/DiamondLoupeFacet.sol` file shows how to implement the four standard loupe functions.

The `contracts/libraries/LibDiamond.sol` file shows how to implement Diamond Storage and a `diamondCut` internal function.

The `scripts/deploy.js` file shows how to deploy a diamond.

The `test/diamondTest.js` file gives tests for the `diamondCut` function and the Diamond Loupe functions.

## Core functions

1. Deposit assets - there are no restrictions except for the asset providing a balance function

2. Issue asset-backed Requiem tokens in exchange for other assets


Specifically you can copy and use the [DiamondCutFacet.sol](./contracts/facets/DiamondCutFacet.sol) and [DiamondLoupeFacet.sol](./contracts/facets/DiamondLoupeFacet.sol) contracts. They implement the `diamondCut` function and the loupe functions.

The [Diamond.sol](./contracts/Diamond.sol) contract could be used as is, or it could be used as a starting point and customized. This contract is the diamond. Its deployment creates a diamond. It's address is a stable diamond address that does not change.

The [LibDiamond.sol](./contracts/libraries/LibDiamond.sol) library could be used as is. It shows how to implement Diamond Storage. This contract includes contract ownership which you might want to change if you want to implement DAO-based ownership or other form of contract ownership. Go for it. Diamonds can work with any kind of contract ownership strategy. This library contains an internal function version of `diamondCut` that can be used in the constructor of a diamond or other places.

## Calling Treasury Functions

For most block explorers, calls from their provided site will not work as the Diamond itself uses the fallback function which then delegates the call to another address - the respective facet. Calling facet fonctions manually will do nothing as these contracts have no own storage.

The app will later provide a subdomain where the overview of functions is displayed. That will also be shown in the docs.


## Author

This implementation is based on code provided by Nick Mudge.

Contact:

- contact@requiem.finance

## License

MIT license. See the license file.
Anyone can use or modify this software for their purposes.

