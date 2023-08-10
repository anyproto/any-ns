# Description

AnyNS, short for Any Naming Service, is a decentralized domain name system based on ENS and compatible with ENS.
Please see anyns contracts for description of what was changed.

## Sepolia testnet deployment

Current frontend uses contracts that were deployed previously (see top-level folder for details and Hardhat instructions).
All contract addresses are kept in **../deployments/sepolia/** folder. Howerver, NextJS can not usually access the **../** folder, so we have to create a symbolic link.

# How to build and run locally

1. Create a .env file (see .env-example)
2. Create a symlink: `ln -s ../deployments ./deployments`
3. Run `npm install`
4. Run `npm run dev`

# TODOs

## v1 TODOs

- Design
  - Show info -> move button to input box
- Help text
- Test xxx.some.any registration too

## v2 TODOs

- Recently registered list
- Update data by admin
- Register name with tokens
- Modal - handle Enter

## v3 TODOs

- current statistics:
  - number of registered domains
  - treausry balance
- register new name (by User)
- set records - space
- set prices

## Contribution

Thank you for your desire to develop Anytype together!

❤️ This project and everyone involved in it is governed by the [Code of Conduct](https://github.com/anyproto/.github/blob/main/docs/CODE_OF_CONDUCT.md).

🧑‍💻 Check out our [contributing guide](https://github.com/anyproto/.github/blob/main/docs/CONTRIBUTING.md) to learn about asking questions, creating issues, or submitting pull requests.

🫢 For security findings, please email [security@anytype.io](mailto:security@anytype.io) and refer to our [security guide](https://github.com/anyproto/.github/blob/main/docs/SECURITY.md) for more information.

🤝 Follow us on [Github](https://github.com/anyproto) and join the [Contributors Community](https://github.com/orgs/anyproto/discussions).

---

Made by Any — a Swiss association 🇨🇭

Licensed under [MIT](./LICENSE.md).
