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

  /// TODO: remove it?
  const metadata = await ethers.getContract('StaticMetadataService', owner)

  const deployArgs = {
    from: deployer,
    args: [registry.address, registrar.address, metadata.address],
    log: true,
  }

  const nameWrapper = await deploy('AnytypeNameWrapper', deployArgs)

  if (!nameWrapper.newlyDeployed) return

  if (owner !== deployer) {
    const wrapper = await ethers.getContract('AnytypeNameWrapper', deployer)
    const tx = await wrapper.transferOwnership(owner)
    console.log(
      `Transferring ownership of NameWrapper to ${owner} (tx: ${tx.hash})...`,
    )
    await tx.wait()
  }

  // Only attempt to make controller etc changes directly on testnets
  if (network.name === 'mainnet') return

  const tx2 = await registrar.addController(nameWrapper.address)
  console.log(
    `Adding NameWrapper as controller on registrar (tx: ${tx2.hash})...`,
  )
  await tx2.wait()
}

func.id = 'anytype-name-wrapper'
func.tags = ['anytype', 'AnytypeNameWrapper']

func.dependencies = [
  'AnytypeRegistrarImplementation',
  'StaticMetadataService',
  // somehow without this line NameWrapper can not be deployed :-(
  'ReverseRegistrar',
  'registry',
]

export default func
