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

  // set it as a payment option
  const nameToken = await ethers.getContract('ERC20NameToken', owner)

  // TODO: hardcode!!!
  // 0x61d1eeE7FBF652482DEa98A1Df591C626bA09a60 -> 0x045F756F248799F4413a026100Ae49e5E7F2031E
  const adminScw = '0x045F756F248799F4413a026100Ae49e5E7F2031E'

  // transfer ownership of the token to the admin's SmartContractWallet
  console.log('Transferring ownership of NameToken to the admin SCW')
  await nameToken.transferOwnership(adminScw)
}

func.id = 'anytype-name-token'
func.tags = ['anytype', 'scw']

func.dependencies = ['ERC20NameToken']

export default func
