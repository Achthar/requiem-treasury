// SPDX-License-Identifier: MIT

pragma solidity >=0.7.5;

import "../interfaces/IManagement.sol";

abstract contract AccessControlled {
  /* ========== EVENTS ========== */

  event ManagementUpdated(IManagement indexed management);

  string UNAUTHORIZED = "UNAUTHORIZED"; // save gas

  /* ========== STATE VARIABLES ========== */

  IManagement public management;

  /* ========== Constructor ========== */

  function intitalizeManagement(IManagement _management) internal {
    management = _management;
  }

  /* ========== MODIFIERS ========== */

  modifier onlyGovernor() {
    require(msg.sender == management.governor(), UNAUTHORIZED);
    _;
  }

  modifier onlyGuardian() {
    require(msg.sender == management.guardian(), UNAUTHORIZED);
    _;
  }

  modifier onlyPolicy() {
    require(msg.sender == management.policy(), UNAUTHORIZED);
    _;
  }

  modifier onlyVault() {
    require(msg.sender == management.vault(), UNAUTHORIZED);
    _;
  }

  /* ========== GOV ONLY ========== */

  function setManagement(IManagement _newManagement) external onlyGovernor {
    management = _newManagement;
    emit ManagementUpdated(_newManagement);
  }
}
