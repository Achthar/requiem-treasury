// SPDX-License-Identifier: MIT
pragma solidity ^0.8.14;

import "../libraries/LibStorage.sol";
import "../libraries/SafeERC20.sol";

import "../interfaces/IERC20.sol";
import "../interfaces/IERC20Metadata.sol";
import "../interfaces/ICreditREQ.sol";
import "../interfaces/IAssetPricer.sol";
import "../interfaces/ITreasury.sol";

contract TreasuryBaseFacet is ITreasury, WithStorage {
    using SafeERC20 for IERC20;

    /* ========== EVENTS ========== */
    event Deposit(address indexed token, uint256 amount, uint256 value);
    event Withdrawal(address indexed token, uint256 amount, uint256 value);
    event CreateDebt(address indexed debtor, address indexed token, uint256 amount, uint256 value);
    event RepayDebt(address indexed debtor, address indexed token, uint256 amount, uint256 value);
    event Managed(address indexed token, uint256 amount);
    event ReservesAudited(uint256 indexed totalReserves);
    event Minted(address indexed caller, address indexed recipient, uint256 amount);
    event PermissionQueued(STATUS indexed status, address queued);
    event Permissioned(address addr, STATUS indexed status, bool result);

    string internal notAccepted = "Treasury: not accepted";
    string internal notApproved = "Treasury: not approved";
    string internal invalidAsset = "Treasury: invalid asset";
    string internal insufficientReserves = "Treasury: insufficient reserves";

    // administrative
    modifier onlyGovernor() {
        LibStorage.enforceGovernor();
        _;
    }

    modifier onlyPolicy() {
        LibStorage.enforcePolicy();
        _;
    }

    /* ========== MUTATIVE FUNCTIONS ========== */

    /**
     * @notice allow approved address to deposit an asset for ts().REQ
     * @param _amount uint256
     * @param _token address
     * @param _profit uint256
     * @return send_ uint256
     */
    function deposit(
        uint256 _amount,
        address _token,
        uint256 _profit
    ) external override returns (uint256 send_) {
        if (ts().permissions[STATUS.ASSET][_token]) {
            require(ts().permissions[STATUS.ASSETDEPOSITOR][msg.sender], notApproved);
        } else {
            revert(invalidAsset);
        }

        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);

        uint256 value = assetValue(_token, _amount);
        // mint needed and store amount of rewards for distribution
        send_ = value - _profit;
        ts().REQ.mint(msg.sender, send_);

        ts().totalReserves += value;

        emit Deposit(_token, _amount, value);
    }

    /**
     * @notice allow approved address to burn REQ for reserves
     * @param _amount uint256
     * @param _asset address
     */
    function withdraw(uint256 _amount, address _asset) external override {
        require(ts().permissions[STATUS.ASSET][_asset], notAccepted); // Only reserves can be used for redemptions
        require(ts().permissions[STATUS.ASSETMANAGER][msg.sender], notApproved);

        uint256 value = assetValue(_asset, _amount);
        ts().REQ.burnFrom(msg.sender, value);

        ts().totalReserves -= value;

        IERC20(_asset).safeTransfer(msg.sender, _amount);

        emit Withdrawal(_asset, _amount, value);
    }

    /**
     * @notice allow approved address to withdraw assets
     * @param _asset address
     * @param _amount uint256
     */
    function manage(address _asset, uint256 _amount) external override {
        require(ts().permissions[STATUS.ASSETMANAGER][msg.sender], notApproved);

        if (ts().permissions[STATUS.ASSET][_asset]) {
            uint256 value = assetValue(_asset, _amount);
            if (ts().useExcessReserves) require(int256(value) <= excessReserves(), insufficientReserves);

            ts().totalReserves -= value;
        }
        IERC20(_asset).safeTransfer(msg.sender, _amount);
        emit Managed(_asset, _amount);
    }

    /**
     * @notice mint new ts().REQ using excess reserves
     * @param _recipient address
     * @param _amount uint256
     */
    function mint(address _recipient, uint256 _amount) external override {
        require(ts().permissions[STATUS.REWARDMANAGER][msg.sender], notApproved);
        if (ts().useExcessReserves) require(int256(_amount) <= excessReserves(), insufficientReserves);

        ts().REQ.mint(_recipient, _amount);
        emit Minted(msg.sender, _recipient, _amount);
    }

    /**
     * DEBT: The debt functions allow approved addresses to borrow treasury assets
     * or ts().REQ from the treasury, using sts().REQ as collateral. This might allow an
     * sts().REQ holder to provide ts().REQ liquidity without taking on the opportunity cost
     * of unstaking, or alter their backing without imposing risk onto the treasury.
     * Many of these use cases are yet to be defined, but they appear promising.
     * However, we urge the community to think critically and move slowly upon
     * proposals to acquire these ts().permissions.
     */

    /**
     * @notice allow approved address to borrow reserves
     * @param _amount uint256
     * @param _token address
     */
    function incurDebt(uint256 _amount, address _token) external override {
        uint256 value;
        require(ts().permissions[STATUS.DEBTOR][msg.sender], notApproved);

        if (_token == address(ts().REQ)) {
            value = _amount;
        } else {
            value = assetValue(_token, _amount);
        }
        require(value != 0, invalidAsset);

        ts().CREQ.changeDebt(value, msg.sender, true);
        require(ts().CREQ.debtBalances(msg.sender) <= ts().debtLimit[msg.sender], "Treasury: exceeds limit");
        ts().totalDebt += value;

        if (_token == address(ts().REQ)) {
            ts().REQ.mint(msg.sender, value);
            ts().reqDebt += value;
        } else {
            ts().totalReserves -= value;
            IERC20(_token).safeTransfer(msg.sender, _amount);
        }
        emit CreateDebt(msg.sender, _token, _amount, value);
    }

    /**
     * @notice allow approved address to repay borrowed reserves with reserves
     * @param _amount uint256
     * @param _token address
     */
    function repayDebtWithReserve(uint256 _amount, address _token) external override {
        require(ts().permissions[STATUS.DEBTOR][msg.sender], notApproved);
        require(ts().permissions[STATUS.ASSET][_token], notAccepted);
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
        uint256 value = assetValue(_token, _amount);
        ts().CREQ.changeDebt(value, msg.sender, false);
        ts().totalDebt -= value;
        ts().totalReserves += value;
        emit RepayDebt(msg.sender, _token, _amount, value);
    }

    /**
     * @notice allow approved address to repay borrowed reserves with REQ
     * @param _amount uint256
     */
    function repayDebtWithREQ(uint256 _amount) external {
        require(ts().permissions[STATUS.DEBTOR][msg.sender], notApproved);
        ts().REQ.burnFrom(msg.sender, _amount);
        ts().CREQ.changeDebt(_amount, msg.sender, false);
        ts().totalDebt -= _amount;
        ts().reqDebt -= _amount;
        emit RepayDebt(msg.sender, address(ts().REQ), _amount, _amount);
    }

    /* ========== MANAGERIAL FUNCTIONS ========== */

    /**
     * @notice takes inventory of all tracked assets
     * @notice always consolidate to recognized reserves before audit
     */
    function auditReserves() external onlyGovernor {
        uint256 reserves;
        address[] memory assets = ts().registry[STATUS.ASSET];
        for (uint256 i = 0; i < assets.length; i++) {
            if (ts().permissions[STATUS.ASSET][assets[i]]) {
                reserves += assetValue(assets[i], IERC20(assets[i]).balanceOf(address(this)));
            }
        }
        ts().totalReserves = reserves;
        emit ReservesAudited(reserves);
    }

    /**
     * @notice set max debt for address
     * @param _address address
     * @param _limit uint256
     */
    function setDebtLimit(address _address, uint256 _limit) external onlyGovernor {
        ts().debtLimit[_address] = _limit;
    }

    /**
     * @notice enable permission from queue
     * @param _status STATUS
     * @param _address address
     * @param _calculator address
     */
    function enable(
        STATUS _status,
        address _address,
        address _calculator
    ) external {
        require(ts().timelockEnabled == false, "Use queueTimelock");
        if (_status == STATUS.CREQ) {
            ts().CREQ = ICreditREQ(_address);
        } else {
            ts().permissions[_status][_address] = true;

            if (_status == STATUS.ASSET) {
                ts().assetPricer[_address] = _calculator;
            }

            (bool registered, ) = indexInRegistry(_address, _status);
            if (!registered) {
                ts().registry[_status].push(_address);

                if (_status == STATUS.ASSET) {
                    (bool reg, uint256 index) = indexInRegistry(_address, _status);
                    if (reg) {
                        delete ts().registry[_status][index];
                    }
                }
            }
        }
        emit Permissioned(_address, _status, true);
    }

    /**
     *  @notice disable permission from address
     *  @param _status STATUS
     *  @param _toDisable address
     */
    function disable(STATUS _status, address _toDisable) external {
        require(msg.sender == ts().authority.governor() || msg.sender == ts().authority.guardian(), "Only governor or guardian");
        ts().permissions[_status][_toDisable] = false;
        emit Permissioned(_toDisable, _status, false);
    }

    /**
     * @notice check if ts().registry contains address
     * @return (bool, uint256)
     */
    function indexInRegistry(address _address, STATUS _status) public view returns (bool, uint256) {
        address[] memory entries = ts().registry[_status];
        for (uint256 i = 0; i < entries.length; i++) {
            if (_address == entries[i]) {
                return (true, i);
            }
        }
        return (false, 0);
    }

    /**
     * @notice changes the use of excess reserves for minting
     */
    function setUseExcessReserves() external {
        ts().useExcessReserves = !ts().useExcessReserves;
    }

    /* ========== TIMELOCKED FUNCTIONS ========== */

    // functions are used prior to enabling on-chain governance

    /**
     * @notice queue address to receive permission
     * @param _status STATUS
     * @param _address address
     * @param _calculator address
     */
    function queueTimelock(
        STATUS _status,
        address _address,
        address _calculator
    ) external onlyGovernor {
        require(_address != address(0));
        require(ts().timelockEnabled == true, "Timelock is disabled, use enable");

        uint256 timelock = block.number + ts().blocksNeededForQueue;
        if (_status == STATUS.ASSETMANAGER) {
            timelock = block.number + ts().blocksNeededForQueue * 2;
        }
        ts().permissionQueue.push(
            Queue({managing: _status, toPermit: _address, calculator: _calculator, timelockEnd: timelock, nullify: false, executed: false})
        );
        emit PermissionQueued(_status, _address);
    }

    /**
     *  @notice enable queued permission
     *  @param _index uint256
     */
    function execute(uint256 _index) external {
        require(ts().timelockEnabled == true, "Timelock is disabled, use enable");

        Queue memory info = ts().permissionQueue[_index];

        require(!info.nullify, "Action has been nullified");
        require(!info.executed, "Action has already been executed");
        require(block.number >= info.timelockEnd, "Timelock not complete");

        if (info.managing == STATUS.CREQ) {
            // 9
            ts().CREQ = ICreditREQ(info.toPermit);
        } else {
            ts().permissions[info.managing][info.toPermit] = true;

            if (info.managing == STATUS.ASSET) {
                ts().assetPricer[info.toPermit] = info.calculator;
            }
            (bool registered, ) = indexInRegistry(info.toPermit, info.managing);
            if (!registered) {
                ts().registry[info.managing].push(info.toPermit);

                if (info.managing == STATUS.ASSET) {
                    (bool reg, uint256 index) = indexInRegistry(info.toPermit, STATUS.ASSET);
                    if (reg) {
                        delete ts().registry[STATUS.ASSET][index];
                    }
                }
            }
        }
        ts().permissionQueue[_index].executed = true;
        emit Permissioned(info.toPermit, info.managing, true);
    }

    /**
     * @notice cancel timelocked action
     * @param _index uint256
     */
    function nullify(uint256 _index) external onlyGovernor {
        ts().permissionQueue[_index].nullify = true;
    }

    /**
     * @notice disables timelocked functions
     */
    function disableTimelock() external onlyGovernor {
        require(ts().timelockEnabled == true, "timelock already disabled");
        if (ts().onChainGovernanceTimelock != 0 && ts().onChainGovernanceTimelock <= block.number) {
            ts().timelockEnabled = false;
        } else {
            ts().onChainGovernanceTimelock = block.number + ts().blocksNeededForQueue * 7; // 7-day timelock
        }
    }

    /**
     * @notice enables timelocks after initilization
     */
    function initialize() external onlyGovernor {
        require(ts().initialized == false, "Already initialized");
        ts().timelockEnabled = true;
        ts().initialized = true;
    }

    /* ========== VIEW FUNCTIONS ========== */

    /**
     * @notice returns excess reserves not backing tokens
     * @return int
     */
    function excessReserves() public view returns (int256) {
        return int256(ts().totalReserves) - int256(ts().REQ.totalSupply() - ts().totalDebt);
    }

    /**
     * @notice returns REQ valuation of asset
     * @param _token address
     * @param _amount uint256
     * @return value_ uint256
     */
    function assetValue(address _token, uint256 _amount) public view override returns (uint256 value_) {
        if (ts().permissions[STATUS.ASSET][_token]) {
            value_ = IAssetPricer(ts().assetPricer[_token]).valuation(_token, _amount);
        } else {
            revert(invalidAsset);
        }
    }

    /**
     * @notice returns supply metric that cannot be manipulated by debt
     * @dev use this any time you need to query supply
     * @return uint256
     */
    function baseSupply() external view override returns (uint256) {
        return ts().REQ.totalSupply() - ts().reqDebt;
    }
}
