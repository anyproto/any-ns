import {
  SimpleSmartContractAccount,
  SimpleSmartAccountOwner,
  SmartAccountProvider,
  LocalAccountSigner,
  createPublicErc4337Client,
} from '@alchemy/aa-core'

import { withAlchemyGasManager } from '@alchemy/aa-alchemy'

import { type Chain } from 'viem'
import { sepolia } from 'viem/chains'

export async function createAlchemyAA(metamaskOwner: SimpleSmartAccountOwner) {
  // This is an example of using a LOCAL private key instead of MetaMask
  //const owner = LocalAccountSigner.mnemonicToAccountSigner("group position stand sail vehicle miss floor prize slam dress skull alone");

  const rpcUrl = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL as string
  const simpleAccountFactoryAddress = process.env
    .NEXT_PUBLIC_ALCHEMY_ACCOUNT_FACTORY_ADDR as string
  const entryPointAddress = process.env
    .NEXT_PUBLIC_ALCHEMY_ENTRY_POINT_ADDR as string
  const gasPolicyID = process.env.NEXT_PUBLIC_ALCHEMY_GAS_POLICY_ID as string

  // nitialize the provider and connect it to the account
  const provider = new SmartAccountProvider(
    rpcUrl,
    entryPointAddress as `0x${string}`,
    sepolia as Chain,
  ).connect(
    (rpcClient) =>
      new SimpleSmartContractAccount({
        entryPointAddress: entryPointAddress as `0x${string}`,
        chain: sepolia as Chain,
        factoryAddress: simpleAccountFactoryAddress as `0x${string}`,
        rpcClient: rpcClient,
        owner: metamaskOwner,
      }),
  )

  const smartAccountSigner = withAlchemyGasManager(provider, {
    policyId: gasPolicyID,
    entryPoint: entryPointAddress as `0x${string}`,
  })

  // Alchemy's AA will deploy automatically a "smart contract wallet" for each user
  // which is controlled by our own EOA
  //
  // This smart contract will really OWN all names and NFTs
  const smartAccountAddress = await provider.getAddress()
  console.log('My smart account address: ')
  console.log(smartAccountAddress)

  const erc4337client = createPublicErc4337Client({
    chain: sepolia as Chain,
    rpcUrl: rpcUrl,
  })

  return [smartAccountSigner, smartAccountAddress, erc4337client]
}
