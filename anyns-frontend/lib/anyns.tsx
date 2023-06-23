const Web3 = require('web3')
const web3 = new Web3()

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
