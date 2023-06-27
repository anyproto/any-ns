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

  // deploy fake USDC token contract
  // (anyone can mint it, so it's not a real USDC)
  await deploy('FakeUSDC', {
    from: deployer,
    args: [],
    log: true,
  })
}

func.id = 'anytype-fake-usdc'
func.tags = ['anytype', 'FakeUSDC']

func.dependencies = [
  'ENSRegistry',
  'AnytypeRegistrarImplementation',
  'ReverseRegistrar',
  'AnytypeNameWrapper',
  'AnytypePriceOracle',
]

export default func
