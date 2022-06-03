// SPDX-License-Identifier: MIT
pragma solidity ^0.8.14;

interface IAssetPricer {
  function valuation(address _asset, uint256 _amount)
    external
    view
    returns (uint256);
}