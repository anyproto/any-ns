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

  const nameToken = await ethers.getContract('ERC20NameToken', owner)
  const c = await ethers.getContract('AnytypeRegistrarController', deployer)

  // 2.2 - transfer ownership of the token to the admin's SmartContractWallet
  // TODO: hardcode!!!
  // 0xb87bbe9f9a0866b942b6587d74b06ed98dc1efb9 -> 0x60d728bC91EB32B1B20d0249bF1D000b34975fa3
  const currentOwner = await nameToken.owner()
  console.log('NameToken current owner: ', currentOwner)

  const adminSCW = process.env.ADMIN_SCW

  if (currentOwner !== adminSCW) {
    console.log('ERROR - NameToken is not owned by SCW. PLEASE FIX IT!!!')
  } else {
    console.log('NameToken is already owned by SCW. Skip')
  }

  // 2.3 - add as an ERC20 payment option
  const popts = await c.paymentOptionsCount()
  console.log('Payment options count: ', popts.toNumber())

  // TODO: change to 1 if FakeUSDC was deployed above
  if (popts.toNumber() === 0) {
    console.log('ERRROR - FakeUSDC is not a payment option. PLEASE FIX IT!!!')
  } else {
    console.log('NameToken is already a payment option')
  }

  // 2.4 - check minter acccount of PrivateController
  const cp = await ethers.getContract(
    'AnytypeRegistrarControllerPrivate',
    deployer,
  )
  const minter = await cp.minterAccount()
  console.log('PrivateController minter: ', minter)
}

func.id = 'anytype-name-token2'
func.tags = ['anytype', 'GETTER']

func.dependencies = [
  'AnytypeRegistrarController',
  'AnytypeRegistrarControllerPrivate',
  'ERC20NameToken',
]

export default func
