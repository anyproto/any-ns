import { type SignTypedDataParams } from '@alchemy/aa-core'

import { SmartAccountSigner } from '@alchemy/aa-core'

import { useWeb3React } from '@web3-react/core'
import { toHex } from 'viem/utils'

import Web3 from 'web3'
const web3 = new Web3(Web3.givenProvider)

// This is used by Alchemy's SmartAccountProvider to sign messages
// it will open MetaMask and ask for signature
export function useMetaMaskAsSmartAccountOwner(): SmartAccountSigner {
  const { account } = useWeb3React()

  const signerType = 'MetaMask'

  const signMessage: (
    msg: string | Uint8Array,
  ) => Promise<`0x${string}`> = async (msg) => {
    const msgHex = toHex(msg)

    // Only for DEBUG purps. DO NOT USE IN PRODUCTION
    /*
    console.log('signing message')
    console.log(msgHex)

    const out = await web3.eth.personal.sign(msgHex, account, '') 
    console.log('signed message')
    console.log(out)

    // print stack trace
    console.trace();
    */

    // this prepends "\x19Ethereum Signed Message:\n32" to the message
    // for extra safety
    //
    // p.s. empty 3rd parameter won't make any difference, but required for type-checking only
    return web3.eth.personal.sign(msgHex, account, '') as Promise<`0x${string}`>
  }

  const signTypedData = (params: SignTypedDataParams) => {
    // TODO: see aa-core/src/signer/local-account.ts for example
    throw new Error('Not implemented yet')

    return this.owner.signTypedData(params)
  }

  const getAddress: () => Promise<`0x${string}`> = async () => {
    return account as `0x${string}`
  }

  return { signerType, signMessage, getAddress, signTypedData }
}
