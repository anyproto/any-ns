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

  // 1 - deploy fake USDC token contract
  if (network.name === 'sepolia') {
    // (anyone can mint it, so it's not a real USDC)
    await deploy('FakeUSDC', {
      from: deployer,
      args: [],
      log: true,
    })

    // set Fake USDC as a payment option
    const fakeUSDC = await ethers.getContract('FakeUSDC', owner)
    const usdcDecimals = 6 // like in a real USDC token

    const c = await ethers.getContract('AnytypeRegistrarController', deployer)
    const popts = await c.paymentOptionsCount()

    // covert from BigNumber to number
    console.log('Payment options count: ', popts.toNumber())
    if (popts.toNumber() === 0) {
      console.log('Adding FakeUSDC as a payment option...')
      await c.addERC20UsdPaymentOption(fakeUSDC.address, usdcDecimals)
    } else {
      console.log('FakeUSDC is already a payment option')
    }
  } else {
    // TODO: add a real USDC token
    throw new Error('Not implemented')
  }

  // 2 - deploy NameToken
  await deploy('ERC20NameToken', {
    from: deployer,
    args: [],
    log: true,
  })

  const nameToken = await ethers.getContract('ERC20NameToken', owner)
  const c = await ethers.getContract('AnytypeRegistrarController', deployer)

  // 2.2 - transfer ownership of the token to the admin's SmartContractWallet
  // TODO: hardcode!!!
  // 0x61d1eeE7FBF652482DEa98A1Df591C626bA09a60 -> 0x045F756F248799F4413a026100Ae49e5E7F2031E
  const currentOwner = await nameToken.owner()
  console.log('NameToken current owner: ', currentOwner)

  if (currentOwner !== '0x045F756F248799F4413a026100Ae49e5E7F2031E') {
    const adminScw = '0x045F756F248799F4413a026100Ae49e5E7F2031E'
    console.log('Transferring ownership of NameToken to the admin SCW')
    await nameToken.transferOwnership(adminScw)
  } else {
    console.log('NameToken is already owned by SCW. Skip')
  }

  // 2.3 - add as an ERC20 payment option
  const popts = await c.paymentOptionsCount()
  console.log('Payment options count: ', popts.toNumber())

  if (popts.toNumber() === 1) {
    console.log('Adding NameToken as a payment option...')
    const usdcDecimals = 2
    await c.addERC20UsdPaymentOption(nameToken.address, usdcDecimals)
  } else {
    console.log('NameToken is already a payment option')
  }
}

func.id = 'anytype-fake-usdc'
func.tags = ['anytype', 'FakeUSDC']

func.dependencies = ['AnytypeRegistrarController']

export default func
