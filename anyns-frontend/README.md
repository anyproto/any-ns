# Description

AnyNS, short for Anytype Naming Service, is a decentralized domain name system based on ENS and compatible with ENS.
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
