//SPDX-License-Identifier: MIT
pragma solidity >=0.8.17 <0.9.0;

import "@openzeppelin/contracts/access/Ownable.sol";

import "../registry/ENS.sol";

import "../resolvers/profiles/ContentHashResolver.sol";
import "../resolvers/profiles/DNSResolver.sol";

import "../resolvers/profiles/NameResolver.sol";
import "../resolvers/profiles/PubkeyResolver.sol";
import "../resolvers/profiles/TextResolver.sol";
import "../resolvers/Multicallable.sol";

// custom Anytype resolver for spaces
import "./SpaceResolver.sol";

import {ReverseClaimer} from "../reverseRegistrar/ReverseClaimer.sol";
import {INameWrapper} from "../wrapper/INameWrapper.sol";

/**
 * This is a copy of PublicResolver contract from ENS repo with the following changes:
 *   - AddrResolver impl. is removed
 *   - ABIResolver impl. is removed
 *   - InterfaceResolver impl. is removed
 *   - SpaceResolver is added
 *
 * Anytype uses CID as a content hash format.
 * If Anytype user buys a single name, he can set a CID as a content hash.
 * Also, Anytype user can attach a space CID to the same name.
 */
contract AnytypeResolver is
    Multicallable,
    ContentHashResolver,
    DNSResolver,
    NameResolver,
    PubkeyResolver,
    TextResolver,
    SpaceResolver,
    ReverseClaimer
{
    ENS immutable ens;
    INameWrapper immutable nameWrapper;
    address immutable trustedETHController1;
    address immutable trustedETHController2;
    address immutable trustedReverseRegistrar;

    /**
     * A mapping of operators. An address that is authorised for an address
     * may make any changes to the name that the owner could, but may not update
     * the set of authorisations.
     * (owner, operator) => approved
     */
    mapping(address => mapping(address => bool)) private _operatorApprovals;

    /**
     * A mapping of delegates. A delegate that is authorised by an owner
     * for a name may make changes to the name's resolver, but may not update
     * the set of token approvals.
     * (owner, name, delegate) => approved
     */
    mapping(address => mapping(bytes32 => mapping(address => bool)))
        private _tokenApprovals;

    // Logged when an operator is added or removed.
    event ApprovalForAll(
        address indexed owner,
        address indexed operator,
        bool approved
    );

    // Logged when a delegate is approved or  an approval is revoked.
    event Approved(
        address owner,
        bytes32 indexed node,
        address indexed delegate,
        bool indexed approved
    );

    constructor(
        ENS _ens,
        INameWrapper wrapperAddress,
        address _trustedETHController1,
        address _trustedETHController2,
        address _trustedReverseRegistrar
    ) ReverseClaimer(_ens, msg.sender) {
        ens = _ens;
        nameWrapper = wrapperAddress;
        trustedETHController1 = _trustedETHController1;
        trustedETHController2 = _trustedETHController2;
        trustedReverseRegistrar = _trustedReverseRegistrar;
    }

    /**
     * @dev See {IERC1155-setApprovalForAll}.
     */
    function setApprovalForAll(address operator, bool approved) external {
        require(
            msg.sender != operator,
            "ERC1155: setting approval status for self"
        );

        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    /**
     * @dev See {IERC1155-isApprovedForAll}.
     */
    function isApprovedForAll(
        address account,
        address operator
    ) public view returns (bool) {
        return _operatorApprovals[account][operator];
    }

    /**
     * @dev Approve a delegate to be able to updated records on a node.
     */
    function approve(bytes32 node, address delegate, bool approved) external {
        require(msg.sender != delegate, "Setting delegate status for self");

        _tokenApprovals[msg.sender][node][delegate] = approved;
        emit Approved(msg.sender, node, delegate, approved);
    }

    /**
     * @dev Check to see if the delegate has been approved by the owner for the node.
     */
    function isApprovedFor(
        address owner,
        bytes32 node,
        address delegate
    ) public view returns (bool) {
        return _tokenApprovals[owner][node][delegate];
    }

    function isAuthorised(bytes32 node) internal view override returns (bool) {
        if (
            msg.sender == trustedETHController1 ||
            msg.sender == trustedETHController2 ||
            msg.sender == trustedReverseRegistrar
        ) {
            return true;
        }
        address owner = ens.owner(node);
        if (owner == address(nameWrapper)) {
            owner = nameWrapper.ownerOf(uint256(node));
        }
        return
            owner == msg.sender ||
            isApprovedForAll(owner, msg.sender) ||
            isApprovedFor(owner, node, msg.sender);
    }

    function supportsInterface(
        bytes4 interfaceID
    )
        public
        view
        override(
            Multicallable,
            ContentHashResolver,
            DNSResolver,
            NameResolver,
            PubkeyResolver,
            TextResolver,
            SpaceResolver
        )
        returns (bool)
    {
        return super.supportsInterface(interfaceID);
    }
}
