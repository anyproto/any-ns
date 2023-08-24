import {
  SimpleSmartContractAccount,
  SmartAccountProvider,
  LocalAccountSigner,
  createPublicErc4337Client,
} from '@alchemy/aa-core'

import { withAlchemyGasManager } from '@alchemy/aa-alchemy'
import { sepolia } from 'viem/chains'

export async function createAlchemyAA(metamaskOwner) {
  // This is an example of using a LOCAL private key instead of MetaMask
  //const owner = LocalAccountSigner.mnemonicToAccountSigner("group position stand sail vehicle miss floor prize slam dress skull alone");

  const rpcUrl = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL
  const simpleAccountFactoryAddress =
    process.env.NEXT_PUBLIC_ALCHEMY_ACCOUNT_FACTORY_ADDR
  const entryPointAddress = process.env.NEXT_PUBLIC_ALCHEMY_ENTRY_POINT_ADDR
  const gasPolicyID = process.env.NEXT_PUBLIC_ALCHEMY_GAS_POLICY_ID

  // nitialize the provider and connect it to the account
  const provider = new SmartAccountProvider(
    rpcUrl,
    // @ts-ignore
    entryPointAddress,
    // @ts-ignore
    sepolia,
  ).connect(
    (rpcClient) =>
      new SimpleSmartContractAccount({
        // @ts-ignore
        entryPointAddress: entryPointAddress,
        chain: sepolia,
        // @ts-ignore
        factoryAddress: simpleAccountFactoryAddress,
        rpcClient: rpcClient,
        owner: metamaskOwner,
      }),
  )

  const smartAccountSigner = withAlchemyGasManager(provider, {
    policyId: gasPolicyID,
    // @ts-ignore
    entryPoint: entryPointAddress,
  })

  // Alchemy's AA will deploy automatically a "smart contract wallet" for each user
  // which is controlled by our own EOA
  //
  // This smart contract will really OWN all names and NFTs
  const smartAccountAddress = await provider.getAddress()
  console.log('My smart account address: ')
  console.log(smartAccountAddress)

  const erc4337client = createPublicErc4337Client({
    // @ts-ignore
    sepolia,
    rpcUrl: rpcUrl,
  })

  return [smartAccountSigner, smartAccountAddress, erc4337client]
}
