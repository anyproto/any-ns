import { ethers } from 'hardhat'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments } = hre
  const { deploy } = deployments
  const { deployer, owner } = await getNamedAccounts()

  const registry = await ethers.getContract('ENSRegistry', owner)
  const nameWrapper = await ethers.getContract('AnytypeNameWrapper', owner)

  const controller1 = await ethers.getContract(
    'AnytypeRegistrarControllerPrivate',
    owner,
  )
  const controller2 = await ethers.getContract(
    'AnytypeRegistrarController',
    owner,
  )
  const reverseRegistrar = await ethers.getContract('ReverseRegistrar', owner)

  const deployArgs = {
    from: deployer,
    args: [
      registry.address,
      nameWrapper.address,
      controller1.address,
      controller2.address,
      reverseRegistrar.address,
    ],
    log: true,
  }
  const resolver = await deploy('AnytypeResolver', deployArgs)
  if (!resolver.newlyDeployed) return

  const tx = await reverseRegistrar.setDefaultResolver(resolver.address)
  console.log(
    `Setting default resolver on ReverseRegistrar to PublicResolver (tx: ${tx.hash})...`,
  )
  await tx.wait()
}

func.id = 'anytype-resolver'
func.tags = ['anytype', 'AnytypeResolver']

func.dependencies = [
  'registry',
  'AnytypeRegistrarControllerPrivate',
  'AnytypeRegistrarController',
  'AnytypeNameWrapper',
  'ReverseRegistrar',
]

export default func
