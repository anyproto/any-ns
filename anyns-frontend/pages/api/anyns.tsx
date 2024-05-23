const Web3 = require('web3')

const { utils } = require('ethers')

const RegistryJson = require('../../deployments/sepolia/ENSRegistry.json')
const ABIResolver = require('../../deployments/sepolia/AnytypeResolver.json')
const NameWrapperJson = require('../../deployments/sepolia/AnytypeNameWrapper.json')
const RegistrarJson = require('../../deployments/sepolia/AnytypeRegistrarImplementation.json')

const web3 = new Web3()
web3.setProvider(new Web3.providers.HttpProvider(process.env.INFURA_URL))

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

const labelhash = (label) => utils.keccak256(utils.toUtf8Bytes(label))

async function getOwner(name) {
  const ensContract = new web3.eth.Contract(
    RegistryJson.abi,
    RegistryJson.address,
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
    ABIResolver.abi,
    ABIResolver.address,
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
    ABIResolver.abi,
    ABIResolver.address,
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
    NameWrapperJson.abi,
    NameWrapperJson.address,
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

async function getExpDate(name) {
  const registrarContract = new web3.eth.Contract(
    RegistrarJson.abi,
    RegistrarJson.address,
  )

  // split name into label and tld
  const labels = name.split('.')
  const label = labels[0]

  const lh = labelhash(label)

  try {
    const exp = await registrarContract.methods.nameExpires(lh).call()

    // convert to unix timestamp
    let expStr = exp.toString()
    return expStr
  } catch (error) {
    console.error('Error getting exp date: ', error)
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
      const expirationDate = await getExpDate(name)

      res.status(200).json({
        name: name,
        owner: realOwner,
        contentID: contentID,
        spaceID: spaceID,
        expirationDate: expirationDate,
      })
    }
  } else {
    res.status(500).json({})
  }
}
