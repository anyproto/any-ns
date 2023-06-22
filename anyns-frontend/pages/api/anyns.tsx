const Web3 = require('web3')

const AbiRegistry = require('abi/ENSRegistry.json')
const AbiResolver = require('abi/AnytypeResolver.json')
const AbiNameWrapper = require('abi/AnytypeNameWrapper.json')

const web3 = new Web3()
web3.setProvider(new Web3.providers.HttpProvider(process.env.INFURA_URL))

// ENSRegistryWithFallback
const registryContractAddr = process.env.REGISTRY_CONTRACT_ADDRESS
const resolverContractAddress =
  process.env.NEXT_PUBLIC_RESOLVER_CONTRACT_ADDRESS
const namewrapperContractAddress =
  process.env.NEXT_PUBLIC_NAMEWRAPPER_CONTRACT_ADDRESS

function namehash(name) {
  let node =
    '0x0000000000000000000000000000000000000000000000000000000000000000'
  const labels = name.split('.')
  for (let i = labels.length - 1; i >= 0; i--) {
    const labelHash = web3.utils.sha3(labels[i])
    node = web3.utils.sha3(node + labelHash.slice(2), { encoding: 'hex' })
  }
  return node
}

async function getOwner(name) {
  const ensContract = new web3.eth.Contract(
    AbiRegistry.abi,
    registryContractAddr,
  )

  try {
    const owner = await ensContract.methods.owner(namehash(name)).call()

    if (owner === '0x0000000000000000000000000000000000000000') {
      console.log(`AnyNS name '${name}' is available!`)
      return null
    } else {
      console.log(`AnyNS name '${name}' is already owned by ${owner}`)
      return owner
    }
  } catch (error) {
    console.error('Error checking AnyNS name availability:', error)
  }

  return null
}

async function getContentID(name) {
  const resolverContract = new web3.eth.Contract(
    AbiResolver.abi,
    resolverContractAddress,
  )

  try {
    const contentID = await resolverContract.methods
      .contenthash(namehash(name))
      .call()
    return contentID
  } catch (error) {
    console.error('Error getting content ID: ', error)
  }

  return null
}

async function getSpaceID(name) {
  const resolverContract = new web3.eth.Contract(
    AbiResolver.abi,
    resolverContractAddress,
  )

  try {
    const spaceID = await resolverContract.methods
      .spaceId(namehash(name))
      .call()
    return spaceID
  } catch (error) {
    console.error('Error getting space ID: ', error)
  }

  return null
}

// owner of any name is NameWrapper contract
// so we need to get the real owner of the name from NameWrapper
async function getRealOwner(name) {
  const nameWrapperContract = new web3.eth.Contract(
    AbiNameWrapper.abi,
    namewrapperContractAddress,
  )

  try {
    const realOwner = await nameWrapperContract.methods
      .ownerOf(namehash(name))
      .call()
    return realOwner
  } catch (error) {
    console.error('Error getting real owner from NameWrapper: ', error)
  }

  return null
}

// returns 200 if name is found
// returns 404 if name is not found
// returns 500 if error
export default async function handler(req, res) {
  if (req.method === 'POST') {
    // name must be fully qualified
    // e.g. "test.any"
    const name = req.body.name
    console.log('Checking name availability: ', name)

    const owner = await getOwner(name)

    if (owner === null) {
      res.status(404).json({ name: name })
    } else {
      const contentID = await getContentID(name)
      const spaceID = await getSpaceID(name)
      const realOwner = await getRealOwner(name)

      res
        .status(200)
        .json({
          name: name,
          owner: realOwner,
          contentID: contentID,
          spaceID: spaceID,
        })
    }
  } else {
    res.status(500).json({})
  }
}
