pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

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
contract ERC20NameToken is Ownable, ERC20 {
    constructor() ERC20("AnyNameToken", "ANT") {}

    function decimals() public view virtual override returns (uint8) {
        // only 2 decimals here
        return 2;
    }

    function mintToUser(address user_, uint amount_) public onlyOwner {
        _mint(user_, amount_);
    }

    function burnFromUser(address user_, uint amount_) public onlyOwner {
        _burn(user_, amount_);
    }

    function approveFor(
        address from,
        address spender,
        uint256 value
    ) public onlyOwner {
        _approve(from, spender, value);
    }
}
