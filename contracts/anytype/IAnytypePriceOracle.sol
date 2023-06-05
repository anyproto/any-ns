//SPDX-License-Identifier: MIT
pragma solidity >=0.8.17 <0.9.0;

/**
 * @title IAnytypePriceOracle
 * @dev This will return price in USD cents!
 * so then it can be then used to calculate price in "stablecoin" units
 * (with different decimals number)
 */
interface IAnytypePriceOracle {
    struct Price {
        uint256 baseCents;
    }

    /**
     * @dev Returns the price to register or renew a name.
     * @param name The name being registered or renewed.
     * @param expires When the name presently expires (0 if this is a new registration).
     * @param duration How long the name is being registered or extended for, in seconds.
     * @return base premium tuple of base price + premium price
     */
    function price(
        string calldata name,
        uint256 expires,
        uint256 duration
    ) external view returns (Price calldata);
}
