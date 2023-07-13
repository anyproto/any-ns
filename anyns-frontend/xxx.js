const Web3 = require('web3')
const web3 = new Web3()
const ethers = require('ethers')

const resolverJson = require('../deployments/sepolia/AnytypeResolver.json')

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

function prepareCallData(contentHash, spaceID, nameFull) {
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

/////////////
var fullName = 'some.any'
var contentHash = 'QmR6EJCK4z8wJbqWGMbTA33wkvVLeVMkzwhmfe3mKCgYXu'
var spaceId = 'bafybeibs62gqtignuckfqlcr7lhhihgzh2vorxtmc5afm6uxh4zdcmuwuu'

console.log('Start...')

let callData = prepareCallData(contentHash, spaceId, fullName)
console.log('CD: ')
console.log(callData)
