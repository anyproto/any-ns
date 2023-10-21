const {
  evm,
  reverse: { getReverseNode },
  contracts: { deploy },
  ens: { FUSES },
} = require('../test-utils')

const { CANNOT_UNWRAP, PARENT_CANNOT_CONTROL, IS_DOT_ETH } = FUSES

const { expect } = require('chai')

const { ethers } = require('hardhat')
const provider = ethers.provider
const { namehash } = require('../test-utils/ens')
const sha3 = require('web3-utils').sha3
const {
  EMPTY_BYTES32: EMPTY_BYTES,
  EMPTY_ADDRESS: ZERO_ADDRESS,
} = require('../test-utils/constants')
const { BigNumber } = require('ethers')

const DAY = 24 * 60 * 60
const REGISTRATION_TIME = 28 * DAY
const BUFFERED_REGISTRATION_COST = REGISTRATION_TIME + 3 * DAY
const GRACE_PERIOD = 90 * DAY
const NULL_ADDRESS = ZERO_ADDRESS

contract('AnytypeRegistrarController', function () {
  let ens
  let resolver
  let resolver2 // resolver signed by accounts[1]
  let baseRegistrar
  let controller
  let controller2 // controller signed by accounts[1]
  let priceOracle
  let reverseRegistrar
  let nameWrapper
  let nameToken
  let callData

  const secret =
    '0x0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF'
  let ownerAccount // Account that owns the registrar
  let registrantAccount // Account that owns test names
  let accounts = []
  let stable1 = 0

  async function mintAndAllowTokens(account, amount) {
    // mint it
    await stable1.mint(account, amount)

    // check balance
    let wei = BigNumber.from(amount).mul(BigNumber.from(10).pow(18))
    expect(await stable1.balanceOf(account)).to.equal(wei)

    // approve
    await stable1.approveFor(account, controller.address, wei)

    // check allowance
    expect(await stable1.allowance(account, controller.address)).to.equal(wei)
  }

  async function registerName(
    name,
    txOptions = { value: BUFFERED_REGISTRATION_COST },
  ) {
    var commitment = await controller.makeCommitment(
      name,
      registrantAccount,
      REGISTRATION_TIME,
      secret,
      NULL_ADDRESS,
      [],
      false,
      0,
    )
    var tx = await controller.commit(commitment)
    expect(await controller.commitments(commitment)).to.equal(
      (await provider.getBlock(tx.blockNumber)).timestamp,
    )

    await evm.advanceTime((await controller.minCommitmentAge()).toNumber())

    var tx = await controller.register(
      name,
      registrantAccount,
      REGISTRATION_TIME,
      secret,
      NULL_ADDRESS,
      [],
      false,
      0,
    )

    return tx
  }

  before(async () => {
    signers = await ethers.getSigners()
    ownerAccount = await signers[0].getAddress()
    registrantAccount = await signers[1].getAddress()
    accounts = [ownerAccount, registrantAccount, signers[2].getAddress()]

    ens = await deploy('ENSRegistry')

    baseRegistrar = await deploy(
      'AnytypeRegistrarImplementation',
      ens.address,
      namehash('any'),
    )

    reverseRegistrar = await deploy('ReverseRegistrar', ens.address)

    await ens.setSubnodeOwner(EMPTY_BYTES, sha3('reverse'), accounts[0])
    await ens.setSubnodeOwner(
      namehash('reverse'),
      sha3('addr'),
      reverseRegistrar.address,
    )

    nameWrapper = await deploy(
      'AnytypeNameWrapper',
      ens.address,
      baseRegistrar.address,
      ownerAccount,
    )

    await ens.setSubnodeOwner(EMPTY_BYTES, sha3('any'), baseRegistrar.address)

    const defaultPrice = 10 * 100 // 10 USD
    priceOracle = await deploy(
      'AnytypePriceOracle',
      // 1 letter, 2 letters, 3 letters, 4 letters, 5+ letters
      // per year
      [defaultPrice, defaultPrice, defaultPrice, defaultPrice, defaultPrice],
    )
    controller = await deploy(
      'AnytypeRegistrarController',
      baseRegistrar.address,
      priceOracle.address,
      // 10 minutes
      600,
      // 24 hours
      86400,
      reverseRegistrar.address,
      nameWrapper.address,
      ens.address,
    )
    controller2 = controller.connect(signers[1])
    await nameWrapper.setController(controller.address, true)
    await baseRegistrar.addController(nameWrapper.address)
    await reverseRegistrar.setController(controller.address, true)

    resolver = await deploy(
      'AnytypeResolver',
      ens.address,
      nameWrapper.address,
      controller.address,
      // pass the same address just for test
      controller.address,
      reverseRegistrar.address,
    )

    callData = [
      resolver.interface.encodeFunctionData('setName(bytes32,string)', [
        namehash('newconfigname.any'),
        'xxx',
      ]),
      resolver.interface.encodeFunctionData('setText', [
        namehash('newconfigname.any'),
        'url',
        'ethereum.com',
      ]),
    ]

    resolver2 = await resolver.connect(signers[1])

    // deploy ERC20 "stablecoin" stub contract with initial balance of 0 USD tokens
    stable1 = await deploy('ERC20StablecoinStub', 'Token1', 'USDCC', 18, 0)
    nameToken = await deploy('ERC20NameToken')

    // add it as a payment option
    await controller.addERC20UsdPaymentOption(stable1.address, 18)

    // will be added later (see below)
    //await controller.addERC20UsdPaymentOption(nameToken.address, 2)
  })

  beforeEach(async () => {
    result = await ethers.provider.send('evm_snapshot')
  })
  afterEach(async () => {
    await ethers.provider.send('evm_revert', [result])
  })

  const checkLabels = {
    testing: true,
    longname12345678: true,
    sixsix: true,
    five5: true,
    four: true,
    iii: true,
    ii: false,
    i: false,
    '': false,

    // { ni } { hao } { ma } (chinese; simplified)
    你好吗: true,

    // { ta } { ko } (japanese; hiragana)
    たこ: false,

    // { poop } { poop } { poop } (emoji)
    '\ud83d\udca9\ud83d\udca9\ud83d\udca9': true,

    // { poop } { poop } (emoji)
    '\ud83d\udca9\ud83d\udca9': false,
  }

  it('should report label validity', async () => {
    for (const label in checkLabels) {
      expect(await controller.valid(label)).to.equal(checkLabels[label], label)
    }
  })

  it('should not allow to add payment option from wrong addres', async () => {
    await expect(
      controller2.addERC20UsdPaymentOption(stable1.address, 18),
    ).to.be.revertedWith('Ownable: caller is not the owner')
  })

  it('should not allow to add payment option with too little decimals', async () => {
    await expect(
      controller.addERC20UsdPaymentOption(stable1.address, 1),
    ).to.be.revertedWith('Decimals must be >= 2')

    controller.addERC20UsdPaymentOption(stable1.address, 2)
  })

  it('should allow to add 1 payment option', async () => {
    await controller.addERC20UsdPaymentOption(stable1.address, 18)

    const po = await controller.paymentOptions(1)
    expect(po.token).to.equal(stable1.address)
    expect(po.decimals).to.equal(18)
    expect(po.enabled).to.equal(true)
  })

  it('should allow to add 2 another payment options', async () => {
    expect(await controller.paymentOptionsCount()).to.equal(1)
    await controller.addERC20UsdPaymentOption(stable1.address, 18)
    expect(await controller.paymentOptionsCount()).to.equal(2)

    let po = await controller.paymentOptions(1)
    expect(po.token).to.equal(stable1.address)
    expect(po.decimals).to.equal(18)
    expect(po.enabled).to.equal(true)

    // deploy ERC20 "stablecoin" stub contract with initial balance of 0 USD tokens
    let stable2 = await deploy('ERC20StablecoinStub', 'Token2', 'USDCD', 5, 0)
    await controller.addERC20UsdPaymentOption(stable2.address, 5)
    expect(await controller.paymentOptionsCount()).to.equal(3)

    po = await controller.paymentOptions(2)
    expect(po.token).to.equal(stable2.address)
    expect(po.decimals).to.equal(5)
    expect(po.enabled).to.equal(true)
  })

  it('should report unused names as available', async () => {
    expect(await controller.available(sha3('available'))).to.equal(true)
  })

  it('should permit new registrations', async () => {
    await mintAndAllowTokens(registrantAccount, 1000)

    // register
    const name = 'newname'
    const balanceBefore = await web3.eth.getBalance(controller.address)
    const tx = await registerName(name)
    const block = await provider.getBlock(tx.blockNumber)

    await expect(tx)
      .to.emit(controller, 'NameRegistered')
      .withArgs(
        name,
        sha3(name),
        registrantAccount,
        1000, // 10 USD
        block.timestamp + REGISTRATION_TIME,
      )

    const duration = 86400 // 24 hours
    const x = await controller.rentPrice(sha3('newname'), duration)

    // should calculate proper price (10 stablecoins)
    const [price] = await controller.rentPrice(sha3('newname'), duration)
    expect(price).to.equal(1000)

    // should take 10 full tokens
    usd = 990
    wei = BigNumber.from(usd).mul(BigNumber.from(10).pow(18))

    expect(await stable1.balanceOf(registrantAccount)).to.equal(wei)
  })

  it('should revert when 0 tokens are allowed', async () => {
    await expect(registerName('newname')).to.be.revertedWith(
      'InsufficientValue()',
    )
  })

  it('should revert when not enough tokens are allowed', async () => {
    // approve $9
    await mintAndAllowTokens(registrantAccount, 9)

    await expect(registerName('newname')).to.be.revertedWith(
      'InsufficientValue()',
    )
  })

  it('should allow to pay from another stablecoin', async () => {
    const name = 'newname'

    let stable2 = await deploy('ERC20StablecoinStub', 'Token2', 'USDCD', 5, 0)
    await controller.addERC20UsdPaymentOption(stable2.address, 5)
    expect(await controller.paymentOptionsCount()).to.equal(2)

    // mint it
    const amount = 10
    await stable2.mint(registrantAccount, amount)

    // check balances
    let wei = BigNumber.from(amount).mul(BigNumber.from(10).pow(5))
    expect(await stable1.balanceOf(registrantAccount)).to.equal(0)
    expect(await stable2.balanceOf(registrantAccount)).to.equal(wei)

    // approve stable2 for controller
    await stable2.approveFor(registrantAccount, controller.address, wei)

    // now register with stable2
    await registerName(name)
    expect(await controller.available(name)).to.equal(false)

    expect(await stable2.balanceOf(registrantAccount)).to.equal(0)
  })

  it('should allow to pay from NameToken', async () => {
    const name = 'newname'

    const decimals = 6
    await controller.addERC20UsdPaymentOption(nameToken.address, decimals)
    expect(await controller.paymentOptionsCount()).to.equal(2)

    // mint it
    const amount = 10 // 10 "USD" = 1 name
    await nameToken.mint(registrantAccount, amount * 1000000)

    // check balances
    let wei = BigNumber.from(amount).mul(BigNumber.from(10).pow(6))
    expect(await stable1.balanceOf(registrantAccount)).to.equal(0)
    expect(await nameToken.balanceOf(registrantAccount)).to.equal(wei)

    // approve stable2 for controller
    await nameToken.approveFor(registrantAccount, controller.address, wei)

    // now register with stable2
    await registerName(name)
    expect(await controller.available(name)).to.equal(false)

    expect(await nameToken.balanceOf(registrantAccount)).to.equal(0)
  })

  it('should allow to disable payment option #2', async () => {
    const name = 'newname'

    let stable2 = await deploy('ERC20StablecoinStub', 'Token2', 'USDCD', 5, 0)
    await controller.addERC20UsdPaymentOption(stable2.address, 5)
    expect(await controller.paymentOptionsCount()).to.equal(2)

    // mint it
    const amount = 10
    await stable2.mint(registrantAccount, amount)

    // check balances
    let wei = BigNumber.from(amount).mul(BigNumber.from(10).pow(5))
    expect(await stable1.balanceOf(registrantAccount)).to.equal(0)
    expect(await stable2.balanceOf(registrantAccount)).to.equal(wei)

    // approve stable2 for controller
    await stable2.approveFor(registrantAccount, controller.address, wei)

    // disable payment option #2
    await controller.updateERC20UsdPaymentOption(stable2.address, 5, false)

    // now register with stable2
    await expect(registerName(name)).to.be.revertedWith('InsufficientValue()')

    expect(await controller.available(name)).to.equal(true)
    expect(await stable2.balanceOf(registrantAccount)).to.equal(wei)
  })

  it('should report registered names as unavailable', async () => {
    const name = 'newname'

    await mintAndAllowTokens(registrantAccount, 10)
    await registerName(name)
    expect(await controller.available(name)).to.equal(false)
  })

  it('should permit new registrations with resolver and records', async () => {
    await mintAndAllowTokens(registrantAccount, 500)

    var commitment = await controller2.makeCommitment(
      'newconfigname',
      registrantAccount,
      REGISTRATION_TIME,
      secret,
      resolver.address,
      callData,
      false,
      0,
    )
    var tx = await controller2.commit(commitment)
    expect(await controller2.commitments(commitment)).to.equal(
      (await web3.eth.getBlock(tx.blockNumber)).timestamp,
    )

    await evm.advanceTime((await controller2.minCommitmentAge()).toNumber())
    var balanceBefore = await web3.eth.getBalance(controller.address)

    var tx = await controller2.register(
      'newconfigname',
      registrantAccount,
      REGISTRATION_TIME,
      secret,
      resolver.address,
      callData,
      false,
      0,
    )

    const block = await provider.getBlock(tx.blockNumber)

    await expect(tx)
      .to.emit(controller, 'NameRegistered')
      .withArgs(
        'newconfigname',
        sha3('newconfigname'),
        registrantAccount,
        // in cents
        1000,
        block.timestamp + REGISTRATION_TIME,
      )

    // should take 10 full tokens
    const usd = 490
    const wei = BigNumber.from(usd).mul(BigNumber.from(10).pow(18))
    expect(await stable1.balanceOf(registrantAccount)).to.equal(wei)

    var nodehash = namehash('newconfigname.any')
    expect(await ens.resolver(nodehash)).to.equal(resolver.address)
    expect(await ens.owner(nodehash)).to.equal(nameWrapper.address)
    expect(await baseRegistrar.ownerOf(sha3('newconfigname'))).to.equal(
      nameWrapper.address,
    )
    expect(await resolver['name(bytes32)'](nodehash)).to.equal('xxx')
    expect(await resolver['text'](nodehash, 'url')).to.equal('ethereum.com')
    expect(await nameWrapper.ownerOf(nodehash)).to.equal(registrantAccount)
  })

  it('should not permit new registrations with 0 resolver', async () => {
    await expect(
      controller.makeCommitment(
        'newconfigname',
        registrantAccount,
        REGISTRATION_TIME,
        secret,
        NULL_ADDRESS,
        callData,
        false,
        0,
      ),
    ).to.be.revertedWith('ResolverRequiredWhenDataSupplied()')
  })

  it('should not permit new registrations with EoA resolver', async () => {
    const commitment = await controller.makeCommitment(
      'newconfigname',
      registrantAccount,
      REGISTRATION_TIME,
      secret,
      registrantAccount,
      callData,
      false,
      0,
    )

    const tx = await controller.commit(commitment)
    expect(await controller.commitments(commitment)).to.equal(
      (await web3.eth.getBlock(tx.blockNumber)).timestamp,
    )

    await mintAndAllowTokens(registrantAccount, 10)

    await evm.advanceTime((await controller.minCommitmentAge()).toNumber())
    await expect(
      controller.register(
        'newconfigname',
        registrantAccount,
        REGISTRATION_TIME,
        secret,
        registrantAccount,
        callData,
        false,
        0,
      ),
    ).to.be.reverted
  })

  it('should not permit new registrations with an incompatible contract', async () => {
    const commitment = await controller.makeCommitment(
      'newconfigname',
      registrantAccount,
      REGISTRATION_TIME,
      secret,
      controller.address,
      callData,
      false,
      0,
    )

    const tx = await controller.commit(commitment)
    expect(await controller.commitments(commitment)).to.equal(
      (await web3.eth.getBlock(tx.blockNumber)).timestamp,
    )

    await mintAndAllowTokens(registrantAccount, 10)

    await evm.advanceTime((await controller.minCommitmentAge()).toNumber())
    await expect(
      controller.register(
        'newconfigname',
        registrantAccount,
        REGISTRATION_TIME,
        secret,
        controller.address,
        callData,
        false,
        0,
      ),
    ).to.be.revertedWith(
      "Transaction reverted: function selector was not recognized and there's no fallback function",
    )
  })

  it('should not permit new registrations with records updating a different name', async () => {
    await mintAndAllowTokens(registrantAccount, 10)

    const commitment = await controller2.makeCommitment(
      'awesome',
      registrantAccount,
      REGISTRATION_TIME,
      secret,
      resolver.address,
      [
        resolver.interface.encodeFunctionData('setName(bytes32,string)', [
          namehash('othername.any'),
          'xxx',
        ]),
      ],
      false,
      0,
    )
    const tx = await controller2.commit(commitment)
    expect(await controller2.commitments(commitment)).to.equal(
      (await web3.eth.getBlock(tx.blockNumber)).timestamp,
    )

    await evm.advanceTime((await controller2.minCommitmentAge()).toNumber())

    await expect(
      controller2.register(
        'awesome',
        registrantAccount,
        REGISTRATION_TIME,
        secret,
        resolver.address,
        [
          resolver.interface.encodeFunctionData('setName(bytes32,string)', [
            namehash('othername.any'),
            'xxx',
          ]),
        ],
        false,
        0,
      ),
    ).to.be.revertedWith('multicall: All records must have a matching namehash')
  })

  it('should not permit new registrations with any record updating a different name', async () => {
    await mintAndAllowTokens(registrantAccount, 10)

    const commitment = await controller2.makeCommitment(
      'awesome',
      registrantAccount,
      REGISTRATION_TIME,
      secret,
      resolver.address,
      [
        resolver.interface.encodeFunctionData('setName(bytes32,string)', [
          namehash('awesome.any'),
          'xxx',
        ]),
        resolver.interface.encodeFunctionData(
          'setText(bytes32,string,string)',
          [namehash('other.any'), 'url', 'ethereum.com'],
        ),
      ],
      false,
      0,
    )
    const tx = await controller2.commit(commitment)
    expect(await controller2.commitments(commitment)).to.equal(
      (await web3.eth.getBlock(tx.blockNumber)).timestamp,
    )

    await evm.advanceTime((await controller2.minCommitmentAge()).toNumber())

    await expect(
      controller2.register(
        'awesome',
        registrantAccount,
        REGISTRATION_TIME,
        secret,
        resolver.address,
        [
          resolver.interface.encodeFunctionData('setName(bytes32,string)', [
            namehash('awesome.any'),
            'xxx',
          ]),
          resolver.interface.encodeFunctionData(
            'setText(bytes32,string,string)',
            [namehash('other.any'), 'url', 'ethereum.com'],
          ),
        ],
        false,
        0,
      ),
    ).to.be.revertedWith('multicall: All records must have a matching namehash')
  })

  it('should permit a registration with resolver but no records', async () => {
    await mintAndAllowTokens(registrantAccount, 10)

    const commitment = await controller.makeCommitment(
      'newconfigname2',
      registrantAccount,
      REGISTRATION_TIME,
      secret,
      resolver.address,
      [],
      false,
      0,
    )
    let tx = await controller.commit(commitment)
    expect(await controller.commitments(commitment)).to.equal(
      (await web3.eth.getBlock(tx.blockNumber)).timestamp,
    )

    await evm.advanceTime((await controller.minCommitmentAge()).toNumber())

    let tx2 = await controller.register(
      'newconfigname2',
      registrantAccount,
      REGISTRATION_TIME,
      secret,
      resolver.address,
      [],
      false,
      0,
    )

    const block = await provider.getBlock(tx2.blockNumber)

    await expect(tx2)
      .to.emit(controller, 'NameRegistered')
      .withArgs(
        'newconfigname2',
        sha3('newconfigname2'),
        registrantAccount,
        // in cents
        1000,
        block.timestamp + REGISTRATION_TIME,
      )

    const nodehash = namehash('newconfigname2.any')
    expect(await ens.resolver(nodehash)).to.equal(resolver.address)
    expect(await resolver['name(bytes32)'](nodehash)).to.equal('')

    expect(await stable1.balanceOf(registrantAccount)).to.equal(0)
  })

  it('should include the owner in the commitment', async () => {
    await mintAndAllowTokens(registrantAccount, 10)

    await controller.commit(
      await controller.makeCommitment(
        'newname2',
        accounts[2],
        REGISTRATION_TIME,
        secret,
        NULL_ADDRESS,
        [],
        false,
        0,
      ),
    )

    await evm.advanceTime((await controller.minCommitmentAge()).toNumber())
    await expect(
      controller.register(
        'newname2',
        registrantAccount,
        REGISTRATION_TIME,
        secret,
        NULL_ADDRESS,
        [],
        false,
        0,
      ),
    ).to.be.reverted
  })

  it('should reject duplicate registrations', async () => {
    await mintAndAllowTokens(registrantAccount, 10)

    const label = 'newname'
    await registerName(label)
    await controller.commit(
      await controller.makeCommitment(
        label,
        registrantAccount,
        REGISTRATION_TIME,
        secret,
        NULL_ADDRESS,
        [],
        false,
        0,
      ),
    )

    // mint more
    await mintAndAllowTokens(registrantAccount, 10)

    await evm.advanceTime((await controller.minCommitmentAge()).toNumber())
    await expect(
      controller.register(
        label,
        registrantAccount,
        REGISTRATION_TIME,
        secret,
        NULL_ADDRESS,
        [],
        false,
        0,
      ),
    ).to.be.revertedWith(`NameNotAvailable("${label}")`)
  })

  it('should reject for expired commitments', async () => {
    await mintAndAllowTokens(registrantAccount, 10)

    const commitment = await controller.makeCommitment(
      'newname2',
      registrantAccount,
      REGISTRATION_TIME,
      secret,
      NULL_ADDRESS,
      [],
      false,
      0,
    )
    await controller.commit(commitment)

    await evm.advanceTime((await controller.maxCommitmentAge()).toNumber() + 1)
    await expect(
      controller.register(
        'newname2',
        registrantAccount,
        REGISTRATION_TIME,
        secret,
        NULL_ADDRESS,
        [],
        false,
        0,
      ),
    ).to.be.revertedWith(`CommitmentTooOld("${commitment}")`)
  })

  it('should allow anyone to renew a name without changing fuse expiry', async () => {
    await mintAndAllowTokens(registrantAccount, 10)

    await registerName('newname')

    var nodehash = namehash('newname.any')
    var fuseExpiry = (await nameWrapper.getData(nodehash))[2]
    var expires = await baseRegistrar.nameExpires(sha3('newname'))

    const duration = 86400
    const [price] = await controller.rentPrice(sha3('newname'), duration)

    // mint again (but to different account)
    await mintAndAllowTokens(accounts[2], 10)
    await controller.renew('newname', accounts[2], duration)

    var newExpires = await baseRegistrar.nameExpires(sha3('newname'))
    var newFuseExpiry = (await nameWrapper.getData(nodehash))[2]
    expect(newExpires.toNumber() - expires.toNumber()).to.equal(duration)
    expect(newFuseExpiry.toNumber() - fuseExpiry.toNumber()).to.equal(86400)

    expect(await stable1.balanceOf(accounts[2])).to.equal(0)
  })

  it('should allow token owners to renew a name', async () => {
    const CANNOT_UNWRAP = 1
    const PARENT_CANNOT_CONTROL = 64

    await mintAndAllowTokens(registrantAccount, 10)
    await registerName('newname')
    var nodehash = namehash('newname.any')
    const [, fuses, fuseExpiry] = await nameWrapper.getData(nodehash)

    var expires = await baseRegistrar.nameExpires(sha3('newname'))

    const duration = 86400
    const [price] = await controller.rentPrice(sha3('newname'), duration)
    await mintAndAllowTokens(registrantAccount, 10)
    await controller2.renew('newname', registrantAccount, duration)

    var newExpires = await baseRegistrar.nameExpires(sha3('newname'))
    const [, newFuses, newFuseExpiry] = await nameWrapper.getData(nodehash)
    expect(newExpires.toNumber() - expires.toNumber()).to.equal(duration)
    expect(newFuseExpiry.toNumber() - fuseExpiry.toNumber()).to.equal(duration)

    expect(await stable1.balanceOf(registrantAccount)).to.equal(0)
  })

  it('non wrapped names can renew', async () => {
    //await mintAndAllowTokens(ownerAccount, 10)

    const label = 'newname'
    const tokenId = sha3(label)
    const nodehash = namehash(`${label}.any`)
    // this is to allow user to register without namewrapped
    await baseRegistrar.addController(ownerAccount)
    // this is free direct registration from the controller (see line above)
    await baseRegistrar.register(tokenId, ownerAccount, 84600)

    expect(await nameWrapper.ownerOf(nodehash)).to.equal(ZERO_ADDRESS)
    expect(await baseRegistrar.ownerOf(tokenId)).to.equal(ownerAccount)

    // renew
    var expires = await baseRegistrar.nameExpires(tokenId)
    const duration = 86400
    const [price] = await controller.rentPrice(tokenId, duration)

    await mintAndAllowTokens(registrantAccount, 10)
    await controller.renew(label, registrantAccount, duration)
    expect(await stable1.balanceOf(registrantAccount)).to.equal(0)

    expect(await baseRegistrar.ownerOf(tokenId)).to.equal(ownerAccount)
    expect(await nameWrapper.ownerOf(nodehash)).to.equal(ZERO_ADDRESS)
    var newExpires = await baseRegistrar.nameExpires(tokenId)
    expect(newExpires.toNumber() - expires.toNumber()).to.equal(duration)
  })

  it('should require sufficient value for a renewal', async () => {
    await expect(
      controller.renew('name', registrantAccount, 86400),
    ).to.be.revertedWith('InsufficientValue()')
  })

  it('should allow anyone to withdraw funds and transfer to the registrar owner', async () => {
    await controller.withdraw({ from: ownerAccount })
    expect(parseInt(await web3.eth.getBalance(controller.address))).to.equal(0)
  })

  it('should set the reverse record of the account', async () => {
    await mintAndAllowTokens(registrantAccount, 10)

    // yes, you can register name for someone else
    expect(registrantAccount).to.not.be.equal(ownerAccount)

    const commitment = await controller.makeCommitment(
      'reverse',
      registrantAccount,
      REGISTRATION_TIME,
      secret,
      resolver.address,
      [],
      true,
      0,
    )
    await controller.commit(commitment, { from: ownerAccount })

    await evm.advanceTime((await controller.minCommitmentAge()).toNumber())
    await controller.register(
      'reverse',
      registrantAccount,
      REGISTRATION_TIME,
      secret,
      resolver.address,
      [],
      true,
      0,

      { from: ownerAccount },
    )

    // if you register name not for YOUR account (i.e. passing owner != msg.sender)
    // YOUR reverse record will be updated
    // that is because we don't want someone to be able to register a reverse name for someone else!
    expect(await resolver.name(getReverseNode(ownerAccount))).to.equal(
      'reverse.any',
    )

    expect(await resolver.name(getReverseNode(registrantAccount))).to.equal('')
  })

  it('should not set the reverse record of the account when set to false', async () => {
    await mintAndAllowTokens(registrantAccount, 10)

    const commitment = await controller.makeCommitment(
      'noreverse',
      registrantAccount,
      REGISTRATION_TIME,
      secret,
      resolver.address,
      [],
      false,
      0,
    )
    await controller.commit(commitment)

    await evm.advanceTime((await controller.minCommitmentAge()).toNumber())
    await controller.register(
      'noreverse',
      registrantAccount,
      REGISTRATION_TIME,
      secret,
      resolver.address,
      [],
      false,
      0,
    )

    expect(await resolver.name(getReverseNode(ownerAccount))).to.equal('')
  })

  it('should auto wrap the name and set the ERC721 owner to the wrapper', async () => {
    await mintAndAllowTokens(registrantAccount, 10)

    const label = 'wrapper'
    const name = label + '.any'
    const commitment = await controller.makeCommitment(
      label,
      registrantAccount,
      REGISTRATION_TIME,
      secret,
      resolver.address,
      [],
      true,
      0,
    )
    await controller.commit(commitment)

    await evm.advanceTime((await controller.minCommitmentAge()).toNumber())
    await controller.register(
      label,
      registrantAccount,
      REGISTRATION_TIME,
      secret,
      resolver.address,
      [],
      true,
      0,
    )

    expect(await nameWrapper.ownerOf(namehash(name))).to.equal(
      registrantAccount,
    )

    expect(await ens.owner(namehash(name))).to.equal(nameWrapper.address)
    expect(await baseRegistrar.ownerOf(sha3(label))).to.equal(
      nameWrapper.address,
    )
  })

  it('should auto wrap the name and allow fuses and expiry to be set', async () => {
    await mintAndAllowTokens(registrantAccount, 10)

    const MAX_INT_64 = 2n ** 64n - 1n
    const label = 'fuses'
    const name = label + '.any'
    const commitment = await controller.makeCommitment(
      label,
      registrantAccount,
      REGISTRATION_TIME,
      secret,
      resolver.address,
      [],
      true,
      1,
    )
    await controller.commit(commitment)

    await evm.advanceTime((await controller.minCommitmentAge()).toNumber())
    const tx = await controller.register(
      label,
      registrantAccount,
      REGISTRATION_TIME,
      secret,
      resolver.address,
      [],
      true,
      1,
    )

    const block = await provider.getBlock(tx.block)

    const [, fuses, expiry] = await nameWrapper.getData(namehash(name))
    expect(fuses).to.equal(PARENT_CANNOT_CONTROL | CANNOT_UNWRAP | IS_DOT_ETH)
    expect(expiry).to.equal(REGISTRATION_TIME + GRACE_PERIOD + block.timestamp)
  })

  it('approval should reduce gas for registration', async () => {
    await mintAndAllowTokens(registrantAccount, 10)

    const label = 'other'
    const name = label + '.any'
    const node = namehash(name)
    const commitment = await controller.makeCommitment(
      label,
      registrantAccount,
      REGISTRATION_TIME,
      secret,
      resolver.address,
      [
        resolver.interface.encodeFunctionData('setName(bytes32,string)', [
          node,
          'xxx',
        ]),
      ],
      true,
      1,
    )

    await controller.commit(commitment)

    await evm.advanceTime((await controller.minCommitmentAge()).toNumber())

    const gasA = await controller2.estimateGas.register(
      label,
      registrantAccount,
      REGISTRATION_TIME,
      secret,
      resolver.address,
      [
        resolver.interface.encodeFunctionData('setName(bytes32,string)', [
          node,
          'xxx',
        ]),
      ],
      true,
      1,
    )

    await resolver2.setApprovalForAll(controller.address, true)

    const gasB = await controller2.estimateGas.register(
      label,
      registrantAccount,
      REGISTRATION_TIME,
      secret,
      resolver2.address,
      [
        resolver.interface.encodeFunctionData('setName(bytes32,string)', [
          node,
          'xxx',
        ]),
      ],
      true,
      1,
    )

    const tx = await controller2.register(
      label,
      registrantAccount,
      REGISTRATION_TIME,
      secret,
      resolver2.address,
      [
        resolver.interface.encodeFunctionData('setName(bytes32,string)', [
          node,
          'xxx',
        ]),
      ],
      true,
      1,
    )

    console.log((await tx.wait()).gasUsed.toString())

    console.log(gasA.toString(), gasB.toString())

    expect(await nameWrapper.ownerOf(node)).to.equal(registrantAccount)
    expect(await ens.owner(namehash(name))).to.equal(nameWrapper.address)
    expect(await baseRegistrar.ownerOf(sha3(label))).to.equal(
      nameWrapper.address,
    )
    expect(await resolver2['name(bytes32)'](node)).to.equal('xxx')
  })

  it('should not permit new registrations with non resolver function calls', async () => {
    await mintAndAllowTokens(registrantAccount, 10)

    const label = 'newconfigname'
    const name = `${label}.any`
    const node = namehash(name)
    const secondTokenDuration = 788400000 // keep bogus NFT for 25 years;
    const callData = [
      baseRegistrar.interface.encodeFunctionData(
        'register(uint256,address,uint)',
        [node, registrantAccount, secondTokenDuration],
      ),
    ]
    var commitment = await controller.makeCommitment(
      label,
      registrantAccount,
      REGISTRATION_TIME,
      secret,
      baseRegistrar.address,
      callData,
      false,
      0,
    )
    var tx = await controller.commit(commitment)
    expect(await controller.commitments(commitment)).to.equal(
      (await web3.eth.getBlock(tx.blockNumber)).timestamp,
    )
    await evm.advanceTime((await controller.minCommitmentAge()).toNumber())
    await expect(
      controller.register(
        label,
        registrantAccount,
        REGISTRATION_TIME,
        secret,
        baseRegistrar.address,
        callData,
        false,
        0,
      ),
    ).to.be.revertedWith(
      "Transaction reverted: function selector was not recognized and there's no fallback function",
    )
  })
})
