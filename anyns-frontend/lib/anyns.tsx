const Web3 = require('web3')
const web3 = new Web3(Web3.givenProvider)

const ethers = require('ethers')

const resolverJson = require('../deployments/sepolia/AnytypeResolver.json')

export async function checkNameAvailability(name) {
  console.log('Checking name availability...: ' + name)

  const response = await fetch('/api/anyns', {
    method: 'POST',
    body: JSON.stringify({ name }),
    headers: {
      'Content-Type': 'application/json',
    },
  })
  const out = await response.json()

  // [error, isAvailable]
  if (response.status === 404) {
    return [false, true]
  } else if (response.status === 200) {
    return [false, false]
  }

  return [true, false]
}

export async function fetchNameInfo(name) {
  console.log('Get name info...: ' + name)

  const response = await fetch('/api/anyns', {
    method: 'POST',
    body: JSON.stringify({ name }),
    headers: {
      'Content-Type': 'application/json',
    },
  })

  const out = await response.json()

  // [error, data]
  if (response.status === 200) {
    return [false, out]
  } else if (response.status === 404) {
    return [false, {}]
  }

  return [true, {}]
}

export function concatenateWithTLD(name) {
  const tld = process.env.NEXT_PUBLIC_TLD_SUFFIX

  // @ts-ignore
  if (!name.endsWith(tld)) {
    return name + tld
  }

  return name
}

export function removeTLD(name) {
  const tld = process.env.NEXT_PUBLIC_TLD_SUFFIX

  if (!name) {
    return ''
  }

  // @ts-ignore
  if (name.endsWith(tld)) {
    return name.slice(0, -tld.length)
  }

  return name
}

export function namehash(name) {
  let node =
    '0x0000000000000000000000000000000000000000000000000000000000000000'
  const labels = name.split('.')
  for (let i = labels.length - 1; i >= 0; i--) {
    const labelHash = web3.utils.sha3(labels[i])
    node = web3.utils.sha3(node + labelHash.slice(2), { encoding: 'hex' })
  }
  return node
}

export async function prepareCallData(contentHash, spaceID, nameFull) {
  // instantiate the contract using Ethers library
  const wallet = null
  const resolver = new ethers.Contract(
    resolverJson.address,
    resolverJson.abi,
    wallet,
  )

  const node = namehash(nameFull)
  const callData = []

  if (spaceID) {
    const spaceIDHex = web3.utils.utf8ToHex(spaceID)
    console.log('Adding space ID: ' + spaceIDHex)

    const data = resolver.interface.encodeFunctionData(
      'setSpaceId(bytes32,bytes)',
      [node, spaceIDHex],
    )
    callData.push(data)
  }

  if (contentHash) {
    const contentHashHex = web3.utils.utf8ToHex(contentHash)
    console.log('Adding content hash: ' + contentHashHex)

    const data = resolver.interface.encodeFunctionData(
      'setContenthash(bytes32, bytes)',
      [node, contentHashHex],
    )
    callData.push(data)
  }

  return callData
}

export async function handleReverseLoookup(addr) {
  if (!addr) {
    return [true, {}]
  }

  console.log('Do reverse lookup...: ' + addr)

  const response = await fetch('/api/anyns/reverse/' + addr, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  })

  try {
    const out = await response.json()

    // [error, data]
    if (response.status === 200) {
      return [false, out]
    } else if (response.status === 404) {
      return [false, {}]
    }
  } catch (err) {
    console.log('Can not do reverse lookup for ' + addr + '. Error: ' + err)
  }

  // error
  return [true, {}]
}

// if AA was used to deploy a smart contract wallet
// then name is really owned by this SCW, but owner of this SCW is
// EOA that was used to sign transaction (in his Metamask probably)
//
// EOA -> SCW -> name
export async function fetchRealOwnerOfSmartContractWallet(addr) {
  const SCW_ABI = {
    abi: [
      {
        constant: true,
        inputs: [],
        name: 'owner',
        outputs: [
          {
            internalType: 'address',
            name: '',
            type: 'address',
          },
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function',
      },
    ],
  }

  const scw = new web3.eth.Contract(SCW_ABI.abi, addr)

  try {
    const owner = await scw.methods.owner().call()
    return owner
  } catch (err) {
    console.log('Error: ' + err)
    return ''
  }
}

export async function getScwAsync(addr) {
  const SCW_ABI = {
    abi: [
      {
        constant: true,
        inputs: [
          {
            internalType: 'address',
            name: 'owner',
            type: 'address',
          },
          {
            internalType: 'uint256',
            name: 'salt',
            type: 'uint256',
          },
        ],
        name: 'getAddress',
        outputs: [
          {
            internalType: 'address',
            name: '',
            type: 'address',
          },
        ],
        stateMutability: 'view',
        type: 'function',
      },
    ],
  }

  const factoryAddr = process.env.NEXT_PUBLIC_ALCHEMY_ACCOUNT_FACTORY_ADDR
  console.log('Factory address: ' + factoryAddr)
  console.log('Address: ' + addr)

  const scw = new web3.eth.Contract(SCW_ABI.abi, factoryAddr)

  try {
    const owner = await scw.methods.getAddress(addr, 0).call()
    return owner
  } catch (err) {
    console.log('Error: ' + err)
    return ''
  }
}
