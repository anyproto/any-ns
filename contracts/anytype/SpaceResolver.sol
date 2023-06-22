// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "../resolvers/ResolverBase.sol";
import "./ISpaceResolver.sol";

/**
 * Anytype uses CID as a content hash format.
 * If Anytype user buys a single name, he can set a CID as a content hash.
 * Also, Anytype user can attach a space CID to the same name.
 */
abstract contract SpaceResolver is ISpaceResolver, ResolverBase {
    mapping(uint64 => mapping(bytes32 => bytes)) versionable_spaces;

    /**
     * Sets the space ID associated with an ENS node.
     * May only be called by the owner of that node in the ENS registry.
     * @param node The node to update.
     * @param spaceid The space ID to set
     */
    function setSpaceId(
        bytes32 node,
        bytes calldata spaceid
    ) external virtual authorised(node) {
        versionable_spaces[recordVersions[node]][node] = spaceid;
        emit SpaceIDChanged(node, spaceid);
    }

    /**
     * Returns the contenthash associated with an ENS node.
     * @param node The ENS node to query.
     * @return The associated contenthash.
     */
    function spaceId(
        bytes32 node
    ) external view virtual override returns (bytes memory) {
        return versionable_spaces[recordVersions[node]][node];
    }

    function supportsInterface(
        bytes4 interfaceID
    ) public view virtual override returns (bool) {
        return
            interfaceID == type(ISpaceResolver).interfaceId ||
            super.supportsInterface(interfaceID);
    }
}
