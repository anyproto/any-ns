import namehash from 'eth-ens-namehash'
import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { keccak256 } from 'js-sha3'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  console.log('Anytype: deploying AnytypeRegistrarImplementation...')

  const { getNamedAccounts, deployments, network } = hre
  const { deploy, fetchIfDifferent } = deployments
  const { deployer, owner } = await getNamedAccounts()

  if (!network.tags.use_root) {
    return true
  }

  const registry = await ethers.getContract('ENSRegistry')
  const root = await ethers.getContract('Root')

  const deployArgs = {
    from: deployer,
    args: [registry.address, namehash.hash('any')],
    log: true,
  }

  const ari = await deploy('AnytypeRegistrarImplementation', deployArgs)
  if (!ari.newlyDeployed) return

  const registrar = await ethers.getContract('AnytypeRegistrarImplementation')

  console.log('Anytype: Owner is:', owner)
  const tx1 = await registrar.transferOwnership(owner, { from: deployer })
  console.log(
    `Transferring ownership of registrar to owner (tx: ${tx1.hash})...`,
  )
  await tx1.wait()

  const tx2 = await root
    .connect(await ethers.getSigner(owner))
    .setSubnodeOwner('0x' + keccak256('any'), registrar.address)
  console.log(
    `Setting owner of any node to registrar on root (tx: ${tx2.hash})...`,
  )
  await tx2.wait()
}

func.id = 'anytype-registrar'
func.tags = ['anytype', 'AnytypeRegistrarImplementation']
func.dependencies = ['registry', 'root']

export default func
