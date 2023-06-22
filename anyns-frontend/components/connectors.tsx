import { InjectedConnector } from '@web3-react/injected-connector'

export const injected = new InjectedConnector({
  // 137 - Polygon Mainnet
  // 11155111 - Sepolia
  supportedChainIds: [1, 137, 11155111],
})
