//SPDX-License-Identifier: MIT
pragma solidity ~0.8.17;

import "./IAnytypePriceOracle.sol";

interface IAnytypeRegistrarController {
    function rentPrice(
        string memory,
        uint256
    ) external view returns (IAnytypePriceOracle.Price memory);

    function available(string memory) external returns (bool);

    function addERC20UsdPaymentOption(address _token, uint8 _decimals) external;

    function updateERC20UsdPaymentOption(
        address _token,
        uint8 _decimals,
        bool _enabled
    ) external;

    function makeCommitment(
        string memory,
        address,
        uint256,
        bytes32,
        address,
        bytes[] calldata,
        bool,
        uint16
    ) external pure returns (bytes32);

    function commit(bytes32) external;

    function register(
        string calldata,
        address,
        uint256,
        bytes32,
        address,
        bytes[] calldata,
        bool,
        uint16
    ) external;

    function renew(string calldata, address, uint256) external;
}
