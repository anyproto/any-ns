# Any Naming System rationale
Incorporating a collaboration feature necessitates providing users with the means to connect, search, and share their content effectively. To enable efficient content search and referencing, a global naming system must be implemented. This naming system would allow users to refer to one another using names such as _stacy_ or denote their space as _stacy_workspace1_public_.

Given that our project involves the creation of a distributed system, the naming system becomes one of the key modules. Consequently, the design of this naming system should be permissionlessness (i.e.: “unstoppable” or “politically decentralized”), preventing Anytype from censoring users' content and names.

In our pursuit of establishing a permissionless naming system, we have opted to leverage smart contracts built on the EVM chain, compatible with the Ethereum Name Service (ENS). This compatibility facilitates seamless integration with various existing tools and services. It can help others to talk to us.

However, interacting with smart contracts places a notable burden on end users. They are required to (1) create wallets, (2) fund them, (3) authorize each transaction with their signature, and (4) pay for gas. 

Fortunately, a concept known as "Account Abstraction" presents a solution. Through this approach, Anytype can cover the gas fees on behalf of the user. Notably, **users retain full control over all operations** and maintain direct communication with the smart contracts. Anytype's inability to censor or block user actions is a fundamental aspect of this design. Furthermore, users have the flexibility to use their Any names outside the Any ecosystem if they choose. They can interact directly with the smart contract and cover gas costs independently or utilize other Account Abstraction services that provide similar functionality.

**Key outcomes:**
1. References and links to users' data are immune to censorship
2. Users can leverage Anytype's user-friendly Account Abstraction service
3. In the event that Anytype discontinues this service or tries to censor, users can seamlessly transition to an alternative Account Abstraction service or engage directly with smart contracts.

---

## AnyNS repository

This repository contains 2 projects:

- AnyNS smart contracts (**this** top-level folder)
- AnyNS frontend (**anyns-frontend** sub-folder)

---

Please see original [ENS README file](ORIGINAL_ENS_README.md)!

AnyNS, which stands for Any Naming System, is an experimental decentralized domain name system based on ENS (Ethereum Name Service) and compatible with ENS.

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

### Gas price

Please see custom gas setting in the **hardhat.config.ts** file. This should increase the speed of the migration.

### Gas limit

In some cases deployment txs will fail because of low gas limit. There is a "gas" parameter in the **hardhat.config.ts** file, but unfortunately it is not passed when running migrations using **ethers**. For details see [this explanation](https://github.com/NomicFoundation/hardhat/pull/2406).

In such case we recomend you to set gasLimit values directly for EACH transaction in the deployment scripts. Example:

```
  const deployArgs = {
    from: deployer,
    args: [registry.address, registrar.address, metadata.address],
    log: true,
    gasLimit: 3000000
  }

  const nameWrapper = await deploy('AnytypeNameWrapper', deployArgs)
```

## 2 - How to run the frontend

See **anyns-frontend** folder for more details.

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

## Contribution

Thank you for your desire to develop Anytype together!

❤️ This project and everyone involved in it is governed by the [Code of Conduct](https://github.com/anyproto/.github/blob/main/docs/CODE_OF_CONDUCT.md).

🧑‍💻 Check out our [contributing guide](https://github.com/anyproto/.github/blob/main/docs/CONTRIBUTING.md) to learn about asking questions, creating issues, or submitting pull requests.

🫢 For security findings, please email [security@anytype.io](mailto:security@anytype.io) and refer to our [security guide](https://github.com/anyproto/.github/blob/main/docs/SECURITY.md) for more information.

🤝 Follow us on [Github](https://github.com/anyproto) and join the [Contributors Community](https://github.com/orgs/anyproto/discussions).

---

Original files from ENS are licensed under [MIT](./LICENSE.txt).

Additions, made by Any — a Swiss association 🇨🇭, are licensed under MIT (see `LICENSE.md` in `anyns-frontend` and `anytype` sub-folders).
