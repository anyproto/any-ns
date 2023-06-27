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
  console.log('Deploying Fake USDC contract for debugging...')

  // (anyone can mint it, so it's not a real USDC)
  await deploy('FakeUSDC', {
    from: deployer,
    args: [],
    log: true,
  })

  // set Fake USDC as a payment option
  const fakeUSDC = await ethers.getContract('FakeUSDC', owner)
  const usdcDecimals = 6 // like in a real USDC token

  console.log('Adding FakeUSDC as a payment option...')
  const c = await ethers.getContract('AnytypeRegistrarController', deployer)
  await c.addERC20UsdPaymentOption(fakeUSDC.address, usdcDecimals)
}

func.id = 'anytype-fake-usdc'
func.tags = ['anytype', 'FakeUSDC']

func.dependencies = ['AnytypeRegistrarController']

export default func
