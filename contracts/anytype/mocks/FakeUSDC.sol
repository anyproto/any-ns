pragma solidity ^0.8.0;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/* This should be used only for tests or debugging
 * It is not a real stablecoin
 */
contract FakeUSDC is IERC20 {
    string public name = "Fake USDC";
    string public symbol = "FUSDC";
    uint8 public decimals = 6;
    uint256 public total;

    mapping(address => uint256) balances;
    mapping(address => mapping(address => uint256)) allowances;

    constructor() {}

    // use it for tests
    function mint(address to, uint256 valueUsd) external {
        uint256 value = valueUsd * 10 ** uint256(decimals);

        total += value;
        balances[to] += value;

        emit Transfer(address(0), to, value);
    }

    function approveFor(
        address from,
        address spender,
        uint256 value
    ) public returns (bool) {
        allowances[from][spender] = value;
        emit Approval(from, spender, value);
        return true;
    }

    function totalSupply() external view returns (uint256) {
        return total;
    }

    function balanceOf(address account) external view returns (uint256) {
        return balances[account];
    }

    function transfer(address to, uint256 value) public returns (bool) {
        require(balances[msg.sender] >= value, "Insufficient balance");
        balances[msg.sender] -= value;
        balances[to] += value;
        emit Transfer(msg.sender, to, value);
        return true;
    }

    function transferFrom(
        address from,
        address to,
        uint256 value
    ) public returns (bool) {
        require(balances[from] >= value, "Insufficient balance");
        require(
            allowances[from][msg.sender] >= value,
            "Insufficient allowance"
        );
        balances[from] -= value;
        balances[to] += value;
        allowances[from][msg.sender] -= value;
        emit Transfer(from, to, value);
        return true;
    }

    function allowance(
        address owner,
        address spender
    ) external view returns (uint256) {
        return allowances[owner][spender];
    }

    function approve(address spender, uint256 value) public returns (bool) {
        allowances[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }
}
