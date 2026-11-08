// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import "./PaymentAsset.sol";

/// @notice Prepaid passes, not automatic recurring debits.
contract DecentSubscriptionsV1 is PaymentAsset {
    struct Plan {
        address payee;
        address asset;
        uint256 price;
        uint256 duration;
        bool enabled;
        string context;
    }
    uint256 public planCount;
    mapping(uint256 => Plan) public plans;
    mapping(uint256 => mapping(address => uint256)) public expiry;

    event PlanCreated(uint256 indexed id, address indexed payee, address asset, uint256 price, uint256 duration, string context);
    event PlanEnabled(uint256 indexed id, bool enabled);
    event Purchased(uint256 indexed id, address indexed payer, address indexed subscriber, uint256 periods, uint256 expires);
    event Canceled(uint256 indexed id, address indexed subscriber);

    function createPlan(address asset, uint256 price, uint256 duration, string calldata context) external returns (uint256 id) {
        require(price > 0 && duration > 0, "Invalid terms");
        require(bytes(context).length <= 512, "Reference too long");
        _asset(asset);
        id = ++planCount;
        plans[id] = Plan(msg.sender, asset, price, duration, true, context);
        emit PlanCreated(id, msg.sender, asset, price, duration, context);
    }

    function setEnabled(uint256 id, bool enabled) external {
        require(msg.sender == plans[id].payee, "Only payee");
        plans[id].enabled = enabled;
        emit PlanEnabled(id, enabled);
    }

    function subscribe(uint256 id, address subscriber, uint256 periods) external payable nonReentrant {
        Plan storage plan = plans[id];
        require(plan.enabled, "Plan unavailable");
        require(subscriber != address(0) && subscriber != address(this), "Invalid subscriber");
        require(periods > 0, "Invalid periods");
        uint256 amount = plan.price * periods;
        uint256 start = expiry[id][subscriber];
        if (start < block.timestamp) start = block.timestamp;
        uint256 expires = start + plan.duration * periods;
        expiry[id][subscriber] = expires;
        _collect(plan.asset, amount);
        _send(plan.asset, plan.payee, amount);
        emit Purchased(id, msg.sender, subscriber, periods, expires);
    }

    function cancel(uint256 id) external nonReentrant {
        require(expiry[id][msg.sender] > block.timestamp, "Not active");
        expiry[id][msg.sender] = block.timestamp;
        emit Canceled(id, msg.sender);
    }

    function isActive(uint256 id, address subscriber) external view returns (bool) {
        return expiry[id][subscriber] > block.timestamp;
    }
}
