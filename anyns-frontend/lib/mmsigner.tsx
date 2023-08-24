import { SimpleSmartAccountOwner } from '@alchemy/aa-core'
import { useCallback } from 'react'
import { useWeb3React } from '@web3-react/core'
import { toHex } from 'viem/utils'

import Web3 from 'web3'
const web3 = new Web3(Web3.givenProvider)

// This is used by Alchemy's SmartAccountProvider to sign messages
// it will open MetaMask and ask for signature
export function useMetaMaskAsSmartAccountOwner(): SimpleSmartAccountOwner {
  const { account } = useWeb3React()

  const signMessage = useCallback(
    async (msg: string | Uint8Array) => {
      const msgHex = toHex(msg)
      // this prepends "\x19Ethereum Signed Message:\n32" to the message
      // for extra safety
      //
      // p.s. empty 3rd parameter won't make any difference, but required for type-checking only
      return await web3.eth.personal.sign(msgHex, account, '')
    },
    [account, web3.eth.personal],
  )

  const getAddress = useCallback(async () => {
    return account
  }, [account])

  // @ts-ignore
  return { signMessage, getAddress }
}
