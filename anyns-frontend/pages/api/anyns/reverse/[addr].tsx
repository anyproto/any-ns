const ethers = require('ethers')
const Web3 = require('web3')

const web3 = new Web3()
web3.setProvider(new Web3.providers.HttpProvider(process.env.INFURA_URL))

import RegistryJson from '../../../../deployments/sepolia/ENSRegistry.json'
import ResolverJson from '../../../../deployments/sepolia/AnytypeResolver.json'

async function getResolverForName(name) {
  const ensContract = new web3.eth.Contract(
    RegistryJson.abi,
    RegistryJson.address,
  )

  try {
    const resolver = await ensContract.methods
      .resolver(ethers.utils.namehash(name))
      .call()
    if (resolver === '0x0000000000000000000000000000000000000000') {
      console.log(`No resolver found for this ENS name: '${name}'`)
      return null
    }

    return resolver
  } catch (error) {
    console.error('Error resolving address:', error)
  }

  return null
}

// to do a reverse lookup:
// 1. concatenate address into something like:
//  7aC8117E529947CC2A9a2895E3D9D4dDd3D35d5e.addr.reverse
// 2. get a resolver for this name
// 3. call a name() method on this resolver (see NameResolver interface)
async function reverseLookup(addr) {
  try {
    const name = addr.substring(2).toLowerCase() + '.addr.reverse'
    console.log(`Getting a resolver for: ${name}`)

    const nameHash = ethers.utils.namehash(name)
    console.log(`Getting a name for: ${nameHash}`)

    /*
    // we should get a resolver for this name
    // but we know for sure that it is AnytypeResolver
    // at our fixed address 
    // 
    // in the future we can get a resolver address dynamically 
    // 
    const resolverAddr = await getResolverForName(name)
    console.log(`Resolver address is: ${resolverAddr}`)
    if(!resolverAddr){
      return null
    }
    */
    const provider = new ethers.providers.JsonRpcProvider(
      process.env.INFURA_URL,
    )
    const resolverContract = new ethers.Contract(
      ResolverJson.address,
      ResolverJson.abi,
      provider,
    )
    const nameOut = await resolverContract.name(nameHash)

    console.log(`Reverse lookup for address ${addr} -> ${nameOut}`)

    return nameOut
  } catch (error) {
    console.error('Error reverse lookup: ', error)
  }

  return null
}

// returns 200 if name is found
// returns 404 if name is not found
// returns 500 if error
export default async function handler(req, res) {
  if (req.method === 'GET') {
    const addr = req.query.addr
    console.log('Trying to find reverse name by: ', addr)

    const name = await reverseLookup(addr)

    if (name === null) {
      res.status(404).json({})
    } else {
      res.status(200).json({
        name: name,
      })
    }
  } else {
    res.status(500).json({})
  }
}
