# AnyNS

This repository contains 3 projects:

- AnyNS smart contracts (**this** top-level folder)
- AnyNS frontend (**anyns-frontend** sub-folder)
- AnyNS API serveri (**api-server** sub-folder)

---

Please see original [ENS README file](ORIGINAL_ENS_README.md)!

AnyNS, which stands for Anytype Naming Service, is an experimental decentralized domain name system based on ENS (Ethereum Name Service) and compatible with ENS.

The current repository features "anytype" folders containing custom Anytype contracts and code. The original ENS contracts and deployment files remain intact. However, some of the Anytype contracts rely on and use the original ENS contracts. For example, the original ENSRegistry is used without being copied. Therefore, please exercise caution when merging or updating these contracts and interfaces from the master branch, as changes to the original ENS contracts may affect them.

To view all custom Anytype contracts, please refer to the **contracts/anytype** folder. For a comprehensive understanding of all dependencies, please consult the **deploy/anytype** folder. To explore updated use cases and logic, please review the contents of the **test/anytype** folder.

## What was changed

- .any TLD is used instead of .eth
- AnytypeRegistrarController - allows ERC20 (USDT, USDC, DAI, etc) stablecoins as payment. Ether is UNsupported as a payment option here
- AnytypeRegistrarControllerPrivate - owner of this contract can register any name without a payment on behalf/for other users
- AnytypeResolver - some unnecessary interfaces were removed, ISpaceResolver is added
- AnytypePriceOracle - very simple price oracle, with basic functionality
- **[anytype-frontend](anytype-frontend)** - AnyNS NextJS/React frontend.

## Name examples

- hello.a.any - can be only registered by a.any owner or Anytype
- INVALID: aa.any - domains with less than 3 letters can not be registered
- INVALID: aa - Top-Level-Domain (TLD) can not be registered, the only valid is .any

## 0 - How to test contracts

```
# to test all contracts
npm run test

# to test particular contract
npm run test -- --grep "AnytypeRegistrarControllerPrivate"
```

## 1 - How to deploy smart contracts

1. Define a **.env** file with 3 variables:

```
PRIVATE_KEY=XXX
DEPLOYER_KEY=XXX
INFURA_API_KEY=YYY
```

2. (optional) Remove **deployments/sepolia** folder to reset all migrations:
   `rm -rf deployments/sepolia`

3. Run migrations:
   `npx hardhat --network sepolia deploy --tags "anytype"`.

As a result, folder **deployments/sepolia** should be updated with new contract addresses.

p.s. Please see custom gas setting in the **hardhat.config.ts** file. This should increase the speed of the migration.

## 2 - How to run the frontend

See **anyns-frontend** folder for more details.

## 3 - How to runun the API service

See **api-server** folder for more details.

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
