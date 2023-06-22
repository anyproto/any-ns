//SPDX-License-Identifier: MIT
pragma solidity ~0.8.17;

interface IAnytypeRegistrarControllerPrivate {
    function available(string memory) external returns (bool);

    function makeCommitment(
        string memory,
        address,
        uint256,
        bytes32,
        address,
        bytes[] calldata,
        bool,
        uint16
    ) external view returns (bytes32);

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

    function renew(string calldata, uint256) external;
}
