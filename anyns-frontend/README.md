# Description

AnyNS, short for Anytype Naming Service, is a decentralized domain name system based on ENS and compatible with ENS.
Please see anyns contracts for description of what was changed.

## Sepolia deployment

```
  // used on backend AND frontend
  NEXT_PUBLIC_MAIN_ACCOUNT = "0x61d1eeE7FBF652482DEa98A1Df591C626bA09a60"
  // used by backend only
  REGISTRY_CONTRACT_ADDRESS="0x0e9d17d5fc9a037A92F1aac52D3Bae04b0e30224"
```

# Name examples

- hello.a.any -> can be only registered by a.any owner or Anytype
- INVALID: aa.any -> can not register domains with less than 3 letters
- INVALID: aa -> can not register TLD domain

# How to build and run locally

1. Create a .env file (see .env-example)
2. Run `npm install`
3. Run `npm run dev`

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
