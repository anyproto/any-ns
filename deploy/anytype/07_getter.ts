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
  // 0x61d1eeE7FBF652482DEa98A1Df591C626bA09a60 -> 0x045F756F248799F4413a026100Ae49e5E7F2031E
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
}

func.id = 'anytype-name-token2'
func.tags = ['anytype', 'GETTER']

func.dependencies = ['AnytypeRegistrarController', 'ERC20NameToken']

export default func
