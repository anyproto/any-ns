pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title AnytypePriceOracle
 * @dev Token contract that allows to buy or renew a single name for 1 year
 * It should not be used for monetary purposes, this is an utility token
 *
 * TODO: turn off transferability
 *
 * Workflow:
 *   Anytype Admin mints 1 token to a user
 *   User can use this token to buy/renew a name for 1 year
 */
contract ERC20NameToken is Ownable, IERC20 {
    string public name = "AnyNameToken";
    string public symbol = "ANT";
    uint8 public decimals = 6;
    uint256 public total;

    mapping(address => uint256) balances;
    mapping(address => mapping(address => uint256)) allowances;

    constructor() {}

    // use it for tests
    function mint(address to, uint256 amount) external onlyOwner {
        total += amount;
        balances[to] += amount;

        emit Transfer(address(0), to, amount);
    }

    function burn(address account, uint amount) public onlyOwner {
        uint256 accountBalance = balances[account];
        require(accountBalance >= amount, "ERC20: burn amount exceeds balance");

        unchecked {
            balances[account] = accountBalance - amount;

            // Overflow not possible: amount <= accountBalance <= totalSupply.
            total -= amount;
        }

        emit Transfer(account, address(0), amount);
    }

    function approveFor(
        address from,
        address spender,
        uint256 value
    ) public onlyOwner returns (bool) {
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
