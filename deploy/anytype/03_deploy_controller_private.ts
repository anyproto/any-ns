import { Interface } from 'ethers/lib/utils'
import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const { makeInterfaceId } = require('@openzeppelin/test-helpers')

function computeInterfaceId(iface: Interface) {
  return makeInterfaceId.ERC165(
    Object.values(iface.functions).map((frag) => frag.format('sighash')),
  )
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments, network } = hre
  const { deploy } = deployments
  const { deployer, owner } = await getNamedAccounts()

  const registry = await ethers.getContract('ENSRegistry', owner)

  const registrar = await ethers.getContract(
    'AnytypeRegistrarImplementation',
    owner,
  )
  const reverseRegistrar = await ethers.getContract('ReverseRegistrar', owner)
  const nameWrapper = await ethers.getContract('AnytypeNameWrapper', owner)

  const minter = process.env.MINTER
  const minterScw = process.env.MINTER_SCW
  if (!minterScw || minterScw === '') {
    throw new Error('MINTER_SCW is not set')
  }
  console.log('WARNING: private controller minter is set to', minterScw)

  const deployArgs = {
    from: deployer,
    args: [
      registrar.address,
      // standard values
      0, // 0 seconds
      86400, // 24 hours
      reverseRegistrar.address,
      nameWrapper.address,
      registry.address,
      minter,
      minterScw,
    ],
    log: true,
  }
  const controller = await deploy(
    'AnytypeRegistrarControllerPrivate',
    deployArgs,
  )
  if (!controller.newlyDeployed) return

  if (owner !== deployer) {
    const c = await ethers.getContract(
      'AnytypeRegistrarControllerPrivate',
      deployer,
    )
    const tx = await c.transferOwnership(owner)
    console.log(
      `Transferring ownership of AnytypeRegistrarControllerPrivate to ${owner} (tx: ${tx.hash})...`,
    )
    await tx.wait()
  }

  // Only attempt to make controller etc changes directly on testnets
  if (network.name === 'mainnet') return

  // This is currently not used because the control is like this:
  //   AnytypeRegistrarControllerPrivate -> NameWrapper -> AnytypeRegistrarImplementation
  //
  // await registrar.addController(controller.address)

  console.log(
    'WRAPPER OWNER',
    await nameWrapper.owner(),
    await nameWrapper.signer.getAddress(),
  )
  const tx1 = await nameWrapper.setController(controller.address, true)
  console.log(
    `Adding ETHRegistrarController as a controller of NameWrapper (tx: ${tx1.hash})...`,
  )
  await tx1.wait()

  const tx2 = await reverseRegistrar.setController(controller.address, true)
  console.log(
    `Adding ETHRegistrarController as a controller of ReverseRegistrar (tx: ${tx2.hash})...`,
  )
  await tx2.wait()
}

func.id = 'anytype-controller-private'
func.tags = ['anytype', 'AnytypeRegistrarControllerPrivate']

func.dependencies = [
  'ENSRegistry',
  'AnytypeRegistrarImplementation',
  'ReverseRegistrar',
  'AnytypeNameWrapper',
]

export default func
