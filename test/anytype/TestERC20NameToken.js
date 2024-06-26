const ERC20NameToken = artifacts.require('ERC20NameToken.sol')
const { deploy } = require('../test-utils/contracts')
const { labelhash } = require('../test-utils/ens')

const {
  EMPTY_BYTES32: ROOT_NODE,
  EMPTY_ADDRESS,
} = require('../test-utils/constants')

const { expect } = require('chai')
const namehash = require('eth-ens-namehash')
const sha3 = require('web3-utils').sha3

const { exceptions } = require('../test-utils')

contract('ERC20NameToken', function (accounts) {
  let nameToken
  let account
  let account2
  let signers

  beforeEach(async () => {
    signers = await ethers.getSigners()
    account = await signers[0].getAddress()
    account2 = await signers[1].getAddress()
    minter = await signers[2].getAddress()

    assert.notEqual(account, account2)

    // 1 name token only to the owner
    nameToken = await deploy(
      'ERC20NameToken',
      minter, // minter account
    )

    assert.equal(await nameToken.name(), 'AnyNameToken')
  })

  describe('decimals', async () => {
    it('should return 6', async () => {
      const d = await nameToken.decimals()
      assert.equal(d, 6)
    })
  })

  describe('changeMinter', async () => {
    it('should not permit to change minter if called not from admin', async () => {
      await expect(
        nameToken.changeMinter(signers[4].getAddress(), { from: accounts[1] }),
      ).to.be.reverted
    })

    it('should  permit to change minter if called from admin', async () => {
      const tx = await nameToken.changeMinter(signers[4].getAddress(), {
        from: accounts[0],
      })
      await expect(tx).to.emit(controller, 'MintersChanged')
    })
  })

  describe('mint', async () => {
    it('should not mint X to if not from owner', async () => {
      await expect(nameToken.mint(account2, 15000, { from: account2 })).to.be
        .reverted

      const balance = await nameToken.balanceOf(account2)
      assert.equal(balance, 0)
    })

    it('should mint 150.00 tokens to other account', async () => {
      await nameToken.mint(account2, 15000)
      const balance = await nameToken.balanceOf(account2)
      assert.equal(balance, 15000)
    })
  })

  describe('burn', async () => {
    it('should not allow to burn if not from owner', async () => {
      await nameToken.mint(account2, 15000)
      const balance = await nameToken.balanceOf(account2)
      assert.equal(balance, 15000)

      await expect(nameToken.burn(account2, 10000, { from: account2 })).to.be
        .reverted

      const balance2 = await nameToken.balanceOf(account2)
      assert.equal(balance2, 15000)
    })

    it('should burn 100.00', async () => {
      await nameToken.mint(account2, 15000)
      const balance = await nameToken.balanceOf(account2)
      assert.equal(balance, 15000)

      await nameToken.burn(account2, 10000)

      const balance2 = await nameToken.balanceOf(account2)
      assert.equal(balance2, 5000)
    })
  })

  describe('approveFor', async () => {
    it('should not allow to approveFor if not from owner', async () => {
      await nameToken.mint(account, 15000)
      await expect(
        nameToken.approveFor(account, account2, 10000, { from: account2 }),
      ).to.be.reverted
    })

    it('should allow to approveFor', async () => {
      await nameToken.mint(account, 15000)
      await nameToken.approveFor(account, account2, 10000)

      const allowance = await nameToken.allowance(account, account2)
      assert.equal(allowance, 10000)
    })
  })
})
