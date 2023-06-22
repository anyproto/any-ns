# AnyNS

Please see original [ENS README file](ORIGINAL_ENS_README.md)!

AnyNS, short for Anytype Naming Service, is a decentralized domain name system based on ENS and compatible with ENS.

Current repository features "anytype" folders with custom Anytype contracts and code. Original ENS contracts and deployment files were intact. However, some of the Anytype contracts rely and use original ENS contracts: i.e. original ENSRegistry is used, it was not copied. So be careful if they change when you merge/update these contracts and interfaces from master.

Please see "contracts/anytype" folder to see all custom Anytype contracts.
Please see "deploy/anytype" folder to see and understand all dependencies.
Please see "test/anytype" folder to see updated use cases and logics.

## What was changed

- .any TLD is used instead of .eth
- AnytypeRegistrarController - allows ERC20 (USDT, USDC, DAI, etc) stablecoins as payment. Ether is UNsupported as a payment option here
- AnytypeRegistrarControllerPrivate - owner of this contract can register any name without a payment on behalf/for other users
- AnytypeResolver - some unnecessary interfaces were removed, ISpaceResolver is added
- AnytypePriceOracle - very simple price oracle, with basic functionality.

# Howtos and links

- [Deploying a ENS on a private chain](https://docs.ens.domains/deploying-ens-on-a-private-chain).
- [Example of other custom chain deployment (LNS)](https://github.com/bchdomains/lns-contracts/commit/88ca736baf574b2f85ea43f3c40376979272ebce#diff-cf4ef7c51dc9f81cad1d504da0d1c3a3437ac7b7d1374ee7127886cf1d1a5092)

# v2 TODOs

- Gas optimizations:
  - ? Remove the StaticMetadataService
  - ? Remove ERC721 NFTs???
  - ? Remove NameWrapper
  - ? Remove StaticMetadataService

# Gas usage

See table here - https://docs.google.com/spreadsheets/d/1eH4nuLWMvLMakTkcsc6lq6nj_1cR7fc1-L05XWxg0fI/edit?usp=sharing

AnytypeRegistrarControllerPrivate::commit - 46358
AnytypeRegistrarControllerPrivate::register - 305395

Approve USDT/USDC - 46663
AnytypeRegistrarController::commit - 44194
AnytypeRegistrarController::register - 355580
