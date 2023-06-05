//SPDX-License-Identifier: MIT
pragma solidity ~0.8.17;

import "./IAnytypePriceOracle.sol";
import "../ethregistrar/StringUtils.sol";

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

/**
 * @title AnytypePriceOracle
 * @dev A simple price oracle for Anytype domains.
 */
contract AnytypePriceOracle is IAnytypePriceOracle {
    using StringUtils for *;

    // Rent in base price units by length
    uint256 public immutable price1Letter;
    uint256 public immutable price2Letter;
    uint256 public immutable price3Letter;
    uint256 public immutable price4Letter;
    uint256 public immutable price5Letter;

    event RentPriceChanged(uint256[] prices);

    constructor(uint256[] memory _rentPrices) {
        // in cents per year
        price1Letter = _rentPrices[0];
        price2Letter = _rentPrices[1];
        price3Letter = _rentPrices[2];
        price4Letter = _rentPrices[3];
        price5Letter = _rentPrices[4];
    }

    function price(
        string calldata name,
        uint256 expires,
        uint256 duration
    ) external view override returns (IAnytypePriceOracle.Price memory) {
        uint256 len = name.strlen();
        uint256 yearCount = (duration / 365 days) + 1;

        uint256 centsBasePerYear;

        // TODO: use expires variable!

        if (len >= 5) {
            centsBasePerYear = price5Letter;
        } else if (len == 4) {
            centsBasePerYear = price4Letter;
        } else if (len == 3) {
            centsBasePerYear = price3Letter;
        } else if (len == 2) {
            centsBasePerYear = price2Letter;
        } else {
            centsBasePerYear = price1Letter;
        }

        return
            IAnytypePriceOracle.Price({
                baseCents: yearCount * centsBasePerYear
            });
    }

    function supportsInterface(
        bytes4 interfaceID
    ) public view virtual returns (bool) {
        return
            interfaceID == type(IERC165).interfaceId ||
            interfaceID == type(IAnytypePriceOracle).interfaceId;
    }
}
