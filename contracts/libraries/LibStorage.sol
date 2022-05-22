// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../interfaces/IREQ.sol";
import "../interfaces/ICreditREQ.sol";
import "../interfaces/IAuthority.sol";
import "./LibDiamond.sol";

// enum here jsut for reference - uint256 used for upgradability
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

struct Queue {
    // STATUS managing;
    uint256 managing;
    address toPermit;
    address calculator;
    uint256 timelockEnd;
    bool nullify;
    bool executed;
}

struct TreasuryStorage {
    // authority
    IAuthority authority;
    // requiem global assets
    IREQ REQ;
    ICreditREQ CREQ;
    // general registers
    mapping(uint256 => address[]) registry;
    mapping(uint256 => mapping(address => bool)) permissions;
    mapping(address => address) assetPricer;
    mapping(address => uint256) debtLimits;
    // asset data
    mapping(address => uint256) assetReserves;
    mapping(address => uint256) assetDebt;
    // aggregted data
    uint256 totalReserves;
    uint256 totalDebt;
    uint256 reqDebt;
    Queue[] permissionQueue;
    uint256 blocksNeededForQueue;
    bool timelockEnabled;
    bool initialized;
    bool useExcessReserves;
    uint256 onChainGovernanceTimelock;
}

/**
 * All of Requiems's treasury storage is stored in a single TreasuryStorage struct.
 *
 * The Diamond Storage pattern (https://dev.to/mudgen/how-diamond-storage-works-90e)
 * is used to set the struct at a specific place in contract storage. The pattern
 * recommends that the hash of a specific namespace (e.g. "darkforest.game.storage")
 * be used as the slot to store the struct.
 *
 * Additionally, the Diamond Storage pattern can be used to access and change state inside
 * of Library contract code (https://dev.to/mudgen/solidity-libraries-can-t-have-state-variables-oh-yes-they-can-3ke9).
 * Instead of using `LibStorage.gameStorage()` directly, a Library will probably
 * define a convenience function to accessing state, similar to the `gs()` function provided
 * in the `WithStorage` base contract below.
 *
 * This pattern was chosen over the AppStorage pattern (https://dev.to/mudgen/appstorage-pattern-for-state-variables-in-solidity-3lki)
 * because AppStorage seems to indicate it doesn't support additional state in contracts.
 * This becomes a problem when using base contracts that manage their own state internally.
 *
 * There are a few caveats to this approach:
 * 1. State must always be loaded through a function (`LibStorage.treasuryStorage()`)
 *    instead of accessing it as a variable directly. The `WithStorage` base contract
 *    below provides convenience functions, such as `gs()`, for accessing storage.
 * 2. Although inherited contracts can have their own state, top level contracts must
 *    ONLY use the Diamond Storage. This seems to be due to how contract inheritance
 *    calculates contract storage layout.
 * 3. The same namespace can't be used for multiple structs. However, new namespaces can
 *    be added to the contract to add additional storage structs.
 * 4. If a contract is deployed using the Diamond Storage, you must ONLY ADD fields to the
 *    very end of the struct during upgrades. During an upgrade, if any fields get added,
 *    removed, or changed at the beginning or middle of the existing struct, the
 *    entire layout of the storage will be broken.
 * 5. Avoid structs within the Diamond Storage struct, as these nested structs cannot be
 *    changed during upgrades without breaking the layout of storage. Structs inside of
 *    mappings are fine because their storage layout is different. Consider creating a new
 *    Diamond storage for each struct.
 *
 * More information on Solidity contract storage layout is available at:
 * https://docs.soliditylang.org/en/latest/internals/layout_in_storage.html
 *
 * Nick Mudge, the author of the Diamond Pattern and creator of Diamond Storage pattern,
 * wrote about the benefits of the Diamond Storage pattern over other storage patterns at
 * https://medium.com/1milliondevs/new-storage-layout-for-proxy-contracts-and-diamonds-98d01d0eadb#bfc1
 */
library LibStorage {
    // Storage are structs where the data gets updated throughout the lifespan of the project
    bytes32 constant TREASURY_STORAGE = keccak256("requiem.storage.treasury");

    // Treasury access control
    function enforcePolicy() internal view {
        require(msg.sender == treasuryStorage().authority.policy(), "Treasury: Must be policy");
    }

    function enforceGovernor() internal view {
        require(msg.sender == treasuryStorage().authority.governor(), "Treasury: Must be governor");
    }

    function enforceGuardian() internal view {
        require(msg.sender == treasuryStorage().authority.guardian(), "Treasury: Must be guardian");
    }

    function enforceVault() internal view {
        require(msg.sender == treasuryStorage().authority.guardian(), "Treasury: Must be vault");
    }

    function treasuryStorage() internal pure returns (TreasuryStorage storage ts) {
        bytes32 position = TREASURY_STORAGE;
        assembly {
            ts.slot := position
        }
    }
}

/**
 * The `WithStorage` contract provides a base contract for Facet contracts to inherit.
 *
 * It mainly provides internal helpers to access the storage structs, which reduces
 * calls like `LibStorage.gameStorage()` to just `gs()`.
 *
 * To understand why the storage stucts must be accessed using a function instead of a
 * state variable, please refer to the documentation above `LibStorage` in this file.
 */
contract WithStorage {
    function ts() internal pure returns (TreasuryStorage storage) {
        return LibStorage.treasuryStorage();
    }
}
