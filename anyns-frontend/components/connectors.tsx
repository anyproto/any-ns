import { MetaMask } from '@web3-react/metamask'
import { initializeConnector } from '@web3-react/core'

export const [metaMask, hooks] = initializeConnector<MetaMask>(
  (actions) => new MetaMask({ actions }),
)
