//SPDX-License-Identifier: MIT
pragma solidity ~0.8.17;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {AnytypeRegistrarImplementation} from "./AnytypeRegistrar.sol";
import {StringUtils} from "../ethregistrar/StringUtils.sol";
import {Resolver} from "../resolvers/Resolver.sol";
import {ENS} from "../registry/ENS.sol";
import {ReverseRegistrar} from "../reverseRegistrar/ReverseRegistrar.sol";
import {ReverseClaimer} from "../reverseRegistrar/ReverseClaimer.sol";
import {IAnytypeRegistrarController, IAnytypePriceOracle} from "./IAnytypeRegistrarController.sol";

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {INameWrapper} from "../wrapper/INameWrapper.sol";
import {ERC20Recoverable} from "../utils/ERC20Recoverable.sol";

error CommitmentTooNew(bytes32 commitment);
error CommitmentTooOld(bytes32 commitment);
error NameNotAvailable(string name);
error DurationTooShort(uint256 duration);
error ResolverRequiredWhenDataSupplied();
error UnexpiredCommitmentExists(bytes32 commitment);
error InsufficientValue();

error InsufficientAllowance(
    address token,
    address from,
    uint256 currentBalance
);
error Unauthorised(bytes32 node);
error MaxCommitmentAgeTooLow();
error MaxCommitmentAgeTooHigh();

/**
 * This is a fork/copy of the ENS registrar controller with the following changes:
 *  .any TLD is used instead of .eth
 *  ERC20 (USDT, USDC, DAI, etc) stablecoins are supported as payment options
 *  ETH is UNsupported as payment option
 */
contract AnytypeRegistrarController is
    Ownable,
    IAnytypeRegistrarController,
    IERC165,
    ERC20Recoverable,
    ReverseClaimer
{
    using StringUtils for *;
    using Address for address;

    uint256 public constant MIN_REGISTRATION_DURATION = 28 days;

    // any type namehash
    // use 'namehash' function to get namehash in your JS code
    bytes32 private constant ANY_NODE =
        0xe87ebb796e516beccff9b955bf6c33af4ec312d6e2984185d016feab4d18a463;

    uint64 private constant MAX_EXPIRY = type(uint64).max;
    AnytypeRegistrarImplementation immutable base;
    IAnytypePriceOracle public immutable prices;
    uint256 public immutable minCommitmentAge;
    uint256 public immutable maxCommitmentAge;
    ReverseRegistrar public immutable reverseRegistrar;
    INameWrapper public immutable nameWrapper;

    // array of supported ERC20 tokens as payment options
    // (up to 10)
    // all stablecoins use same price that is returned in USD from the IPriceOracle
    struct ERC20PaymentOption {
        address token;
        uint8 decimals;
        bool enabled;
    }
    ERC20PaymentOption[10] public paymentOptions;
    uint256 public paymentOptionsCount = 0;

    mapping(bytes32 => uint256) public commitments;

    event NameRegistered(
        string name,
        bytes32 indexed label,
        address indexed owner,
        uint256 baseCostCents,
        uint256 expires
    );
    event NameRenewed(
        string name,
        bytes32 indexed label,
        uint256 costCents,
        uint256 expires
    );

    constructor(
        AnytypeRegistrarImplementation _base,
        IAnytypePriceOracle _prices,
        uint256 _minCommitmentAge,
        uint256 _maxCommitmentAge,
        ReverseRegistrar _reverseRegistrar,
        INameWrapper _nameWrapper,
        ENS _ens
    ) ReverseClaimer(_ens, msg.sender) {
        if (_maxCommitmentAge <= _minCommitmentAge) {
            revert MaxCommitmentAgeTooLow();
        }

        if (_maxCommitmentAge > block.timestamp) {
            revert MaxCommitmentAgeTooHigh();
        }

        base = _base;
        prices = _prices;
        minCommitmentAge = _minCommitmentAge;
        maxCommitmentAge = _maxCommitmentAge;
        reverseRegistrar = _reverseRegistrar;
        nameWrapper = _nameWrapper;
    }

    /*
     * Add up to 10 ERC20 USD stablecoin tokens as payment options
     * Each token has its own decimals number
     *
     * Price is calculated by the IPriceOracle in USD cents
     * (same amount for all USD stablecoins!)
     */
    function addERC20UsdPaymentOption(
        address _token,
        uint8 _decimals
    ) external onlyOwner {
        require(paymentOptionsCount < 10, "Too many payment options");

        paymentOptions[paymentOptionsCount].token = _token;
        paymentOptions[paymentOptionsCount].decimals = _decimals;
        paymentOptions[paymentOptionsCount].enabled = true;

        paymentOptionsCount++;
    }

    /*
     * Update ERC20 USD stablecoin token payment option
     */
    function updateERC20UsdPaymentOption(
        address _token,
        uint8 _decimals,
        bool _enabled
    ) external onlyOwner {
        for (uint8 i = 0; i < paymentOptionsCount; i++) {
            if (paymentOptions[i].token == _token) {
                paymentOptions[i].decimals = _decimals;
                paymentOptions[i].enabled = _enabled;
                return;
            }
        }
        revert("Payment option not found");
    }

    function rentPrice(
        string memory name,
        uint256 duration
    ) public view override returns (IAnytypePriceOracle.Price memory price) {
        bytes32 label = keccak256(bytes(name));
        price = prices.price(name, base.nameExpires(uint256(label)), duration);
    }

    function valid(string memory name) public pure returns (bool) {
        return name.strlen() >= 3;
    }

    function available(string memory name) public view override returns (bool) {
        bytes32 label = keccak256(bytes(name));
        return valid(name) && base.available(uint256(label));
    }

    function makeCommitment(
        string memory name,
        address owner,
        uint256 duration,
        bytes32 secret,
        address resolver,
        bytes[] calldata data,
        bool reverseRecord,
        uint16 ownerControlledFuses
    ) public pure override returns (bytes32) {
        bytes32 label = keccak256(bytes(name));
        if (data.length > 0 && resolver == address(0)) {
            revert ResolverRequiredWhenDataSupplied();
        }
        return
            keccak256(
                abi.encode(
                    label,
                    owner,
                    duration,
                    secret,
                    resolver,
                    data,
                    reverseRecord,
                    ownerControlledFuses
                )
            );
    }

    function commit(bytes32 commitment) public override {
        if (commitments[commitment] + maxCommitmentAge >= block.timestamp) {
            revert UnexpiredCommitmentExists(commitment);
        }
        commitments[commitment] = block.timestamp;
    }

    function register(
        string calldata name,
        address owner,
        uint256 duration,
        bytes32 secret,
        address resolver,
        bytes[] calldata data,
        bool reverseRecord,
        uint16 ownerControlledFuses
    ) public override {
        IAnytypePriceOracle.Price memory price = rentPrice(name, duration);
        uint256 centsToPay = price.baseCents;

        _transferStablecoinsFromUser(owner, centsToPay);

        _consumeCommitment(
            name,
            duration,
            makeCommitment(
                name,
                owner,
                duration,
                secret,
                resolver,
                data,
                reverseRecord,
                ownerControlledFuses
            )
        );

        uint256 expires = nameWrapper.registerAndWrapETH2LD(
            name,
            owner,
            duration,
            resolver,
            ownerControlledFuses
        );

        if (data.length > 0) {
            _setRecords(resolver, keccak256(bytes(name)), data);
        }

        if (reverseRecord) {
            _setReverseRecord(name, resolver, msg.sender);
        }

        emit NameRegistered(
            name,
            keccak256(bytes(name)),
            owner,
            price.baseCents,
            expires
        );
    }

    function renew(
        string calldata name,
        address owner,
        uint256 duration
    ) external override {
        bytes32 labelhash = keccak256(bytes(name));
        uint256 tokenId = uint256(labelhash);

        IAnytypePriceOracle.Price memory price = rentPrice(name, duration);
        uint256 centsToPay = price.baseCents;
        _transferStablecoinsFromUser(owner, centsToPay);

        uint256 expires = nameWrapper.renew(tokenId, duration);

        emit NameRenewed(name, labelhash, price.baseCents, expires);
    }

    function withdraw() public {
        payable(owner()).transfer(address(this).balance);
    }

    function supportsInterface(
        bytes4 interfaceID
    ) external pure returns (bool) {
        return
            interfaceID == type(IERC165).interfaceId ||
            interfaceID == type(IAnytypeRegistrarController).interfaceId;
    }

    /* Internal functions */
    function _transferStablecoinsFromUser(
        address owner,
        uint256 centsToPay
    ) internal returns (bool) {
        for (uint256 i = 0; i < paymentOptionsCount; i++) {
            if (paymentOptions[i].enabled) {
                // check if allowance is more than needed
                // TODO: make sure decimals is > 2 (otherwise it will fail)
                uint256 payInTokenUnits = centsToPay *
                    (10 ** (paymentOptions[i].decimals - 2));
                uint256 allowance = IERC20(paymentOptions[i].token).allowance(
                    owner,
                    address(this)
                );

                if (allowance >= payInTokenUnits) {
                    // transfer tokens
                    IERC20(paymentOptions[i].token).transferFrom(
                        owner,
                        address(this),
                        payInTokenUnits
                    );
                    return true;
                }
            }
        }

        // revert if no payment option found
        revert InsufficientValue();
    }

    function _consumeCommitment(
        string memory name,
        uint256 duration,
        bytes32 commitment
    ) internal {
        // Require an old enough commitment.
        if (commitments[commitment] + minCommitmentAge > block.timestamp) {
            revert CommitmentTooNew(commitment);
        }

        // If the commitment is too old, or the name is registered, stop
        if (commitments[commitment] + maxCommitmentAge <= block.timestamp) {
            revert CommitmentTooOld(commitment);
        }
        if (!available(name)) {
            revert NameNotAvailable(name);
        }

        delete (commitments[commitment]);

        if (duration < MIN_REGISTRATION_DURATION) {
            revert DurationTooShort(duration);
        }
    }

    function _setRecords(
        address resolverAddress,
        bytes32 label,
        bytes[] calldata data
    ) internal {
        // use hardcoded .any namehash
        bytes32 nodehash = keccak256(abi.encodePacked(ANY_NODE, label));
        Resolver resolver = Resolver(resolverAddress);
        resolver.multicallWithNodeCheck(nodehash, data);
    }

    function _setReverseRecord(
        string memory name,
        address resolver,
        address owner
    ) internal {
        reverseRegistrar.setNameForAddr(
            msg.sender,
            owner,
            resolver,
            string.concat(name, ".any")
        );
    }
}
