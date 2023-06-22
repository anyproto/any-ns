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

# Howtos

Deploying a ENS on a private chain - https://docs.ens.domains/deploying-ens-on-a-private-chain.

Manager or .eth TLD ENS domain - https://app.ens.domains/0x58774Bb8acD458A640aF0B88238369A167546ef2

Example of custom chain deployment - https://github.com/bchdomains/lns-contracts/commit/88ca736baf574b2f85ea43f3c40376979272ebce#diff-cf4ef7c51dc9f81cad1d504da0d1c3a3437ac7b7d1374ee7127886cf1d1a5092

# Resolve through ENS on mainnet

1. Connect DNS domain: anytype.io or any.direct
2. Allow to resolve name through the ENS (on mainnet!):  
   tonykent.anytype.io -> 0x12321312312313
   or
   tonykent.any.direct -> 0x11111111111111

## Example:

```javascript
// resolving from Web2
// see standard: https://eips.ethereum.org/EIPS/eip-1577
// see contract: ContentHashResolver contract
// see https://docs.ens.domains/contract-api-reference/publicresolver
// see https://docs.ens.domains/dapp-developer-guide/ens-l2-offchain#ethersjs

var result = ens.getContenthash('tonykent.any.direct')

// result:
// {
//   "protocolType": "ipfs",
//   "decoded": "QmaEBknbGT4bTQiQoe2VNgBJbRfygQGktnaW5TbuKixjYL"
// }
```
