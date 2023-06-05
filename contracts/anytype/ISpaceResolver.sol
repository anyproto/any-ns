// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

interface ISpaceResolver {
    event SpaceIDChanged(bytes32 indexed node, bytes spaceId);

    /**
     * Anytype uses CID as a content hash format. Returns the space ID associated with an ENS node.
     * @param node The ENS node to query.
     * @return The associated Anytype Space ID.
     */
    function spaceId(bytes32 node) external view returns (bytes memory);
}
