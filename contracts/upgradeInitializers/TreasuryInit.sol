// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/******************************************************************************\
* Author: Nick Mudge <nick@perfectabstractions.com> (https://twitter.com/mudgen)
* EIP-2535 Diamonds: https://eips.ethereum.org/EIPS/eip-2535
*
* Implementation of a diamond.
/******************************************************************************/

import {LibDiamond} from "../libraries/LibDiamond.sol";
import {LibStorage, WithStorage, TreasuryStorage} from "../libraries/LibStorage.sol";

import {IDiamondLoupe} from "../interfaces/IDiamondLoupe.sol";
import {IDiamondCut} from "../interfaces/IDiamondCut.sol";
import {IERC173} from "../interfaces/IERC173.sol";
import {IERC165} from "../interfaces/IERC165.sol";
import {IAuthority} from "../interfaces/IAuthority.sol";
import {IREQ} from "../interfaces/IREQ.sol";
import {ICreditREQ} from "../interfaces/ICreditREQ.sol";

// It is expected that this contract is customized if you want to deploy your diamond
// with data from a deployment script. Use the init function to initialize state variables
// of your diamond. Add parameters to the init funciton if you need to.

contract TreasuryInit is WithStorage {
    // You can add parameters to this function in order to pass in
    // data to set your own state variables
    function init(
        address _authority,
        address _req,
        address _creq
    ) external {
        // adding ERC165 data
        LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
        ds.supportedInterfaces[type(IERC165).interfaceId] = true;
        ds.supportedInterfaces[type(IDiamondCut).interfaceId] = true;
        ds.supportedInterfaces[type(IDiamondLoupe).interfaceId] = true;
        ds.supportedInterfaces[type(IERC173).interfaceId] = true;

        // add your own state variables
        // EIP-2535 specifies that the `diamondCut` function takes two optional
        // arguments: address _init and bytes calldata _calldata
        // These arguments are used to execute an arbitrary function using delegatecall
        // in order to set state variables in the diamond during deployment or an upgrade
        // More info here: https://eips.ethereum.org/EIPS/eip-2535#diamond-interface


        TreasuryStorage storage ts = LibStorage.treasuryStorage();
        require(_req != address(0), "Zero address: REQ");
        ts.authority = IAuthority(_authority);
        ts.REQ = IREQ(_req);
        ts.timelockEnabled = false;
        ts.initialized = false;
        ts.blocksNeededForQueue = 0;
        ts.useExcessReserves = false;
        ts.CREQ = ICreditREQ(_creq);
    }
}
