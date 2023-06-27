import Web3 from 'web3'
import { useWeb3React } from '@web3-react/core'
import { LoadingButton } from '@mui/lab'

// Access our wallet inside of our dapp
const web3 = new Web3(Web3.givenProvider)

const resolverJson = require('../../deployments/sepolia/AnytypeResolver.json')

import { namehash } from '../lib/anyns'

export default function DebugPanel({ id, setIsProcessing }) {
  const { account, active } = useWeb3React()

  const onDebug = async (e) => {
    e.preventDefault()

    const fullName = 'test8.any'

    // convert string to hex
    const contentHash = web3.utils.utf8ToHex(
      'QmR6EJCK4z8wJbqWGMbTA33wkvVLeVMkzwhmfe3mKCgYXu',
    )
    console.log('Setting content hash: ' + contentHash)

    try {
      const contractAddress = resolverJson.address
      const resolver = new web3.eth.Contract(resolverJson.abi, contractAddress)

      const node = namehash(fullName)
      const gas = await resolver.methods
        .setContenthash(node, contentHash)
        .estimateGas({
          from: account,
        })

      setIsProcessing(true)
      const tx = await resolver.methods.setContenthash(node, contentHash).send({
        from: account,
        gas,
      })

      console.log('Transaction: ')
      console.log(tx)
    } catch (err) {
      console.error('Can not set content hash!')
      console.error(err)

      setIsProcessing(false)
      return
    }

    setIsProcessing(false)
  }

  return (
    <form onSubmit={onDebug} className="animate-in fade-in duration-700">
      <div className="text-center text-2xl font-bold m-2">
        <LoadingButton
          //loading={isProcessing}
          variant="outlined"
          className="my-button"
          type="submit"
          disabled={!active}
        >
          Debug: set a content ID
        </LoadingButton>
      </div>
    </form>
  )
}
