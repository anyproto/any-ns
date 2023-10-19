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

  console.log('Deploying Name Token contract...')

  await deploy('ERC20NameToken', {
    from: deployer,
    args: [],
    log: true,
  })

  // set it as a payment option
  const nameToken = await ethers.getContract('ERC20NameToken', owner)
  const usdcDecimals = 2

  console.log('Adding NameToken as a payment option...')
  const c = await ethers.getContract('AnytypeRegistrarController', deployer)
  await c.addERC20UsdPaymentOption(nameToken.address, usdcDecimals)
}

func.id = 'anytype-name-token'
func.tags = ['anytype', 'ERC20NameToken']

func.dependencies = ['AnytypeRegistrarController']

export default func
