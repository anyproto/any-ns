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
const utf8ToHex = require('web3-utils').utf8ToHex

const {
  EMPTY_BYTES32: EMPTY_BYTES,
  EMPTY_ADDRESS: ZERO_ADDRESS,
} = require('../test-utils/constants')
const { assert } = require('console')

const DAY = 24 * 60 * 60
const REGISTRATION_TIME = 28 * DAY
const BUFFERED_REGISTRATION_COST = REGISTRATION_TIME + 3 * DAY
const GRACE_PERIOD = 90 * DAY
const NULL_ADDRESS = ZERO_ADDRESS

contract('AnytypeRegistrarControllerPrivate', function () {
  let ens
  let resolver
  let resolver2 // resolver signed by accounts[1]
  let baseRegistrar
  let controller
  let controller2 // controller signed by accounts[1]
  let priceOracle
  let reverseRegistrar
  let nameWrapper
  let callData

  const secret =
    '0x0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF'
  let ownerAccount // Account that owns the registrar
  let registrantAccount // Account that owns test names
  let accounts = []

  async function registerName(name, txOptions = {}) {
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
      txOptions,
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
      'AnytypeRegistrarControllerPrivate',
      baseRegistrar.address,
      600,
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

  it('should report unused names as available', async () => {
    expect(await controller.available(sha3('available'))).to.equal(true)
  })

  it('should permit new registrations', async () => {
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
        block.timestamp + REGISTRATION_TIME,
      )
  })

  it('should report registered names as unavailable', async () => {
    const name = 'newname'
    await registerName(name)
    expect(await controller.available(name)).to.equal(false)
  })

  it('should permit new registrations with resolver and records', async () => {
    // signer
    var commitment = await controller.makeCommitment(
      'newconfigname',
      registrantAccount,
      REGISTRATION_TIME,
      secret,
      resolver.address,
      callData,
      false,
      0,
    )

    var tx = await controller.commit(commitment)
    expect(await controller.commitments(commitment)).to.equal(
      (await web3.eth.getBlock(tx.blockNumber)).timestamp,
    )

    await evm.advanceTime((await controller.minCommitmentAge()).toNumber())
    var balanceBefore = await web3.eth.getBalance(controller.address)

    var tx = await controller.register(
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
        block.timestamp + REGISTRATION_TIME,
      )

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

  it('should permit new registrations with resolver and spaceid/contenthash', async () => {
    const contentHash = utf8ToHex(
      'QmR6EJCK4z8wJbqWGMbTA33wkvVLeVMkzwhmfe3mKCgYXu',
    )

    const callData2 = [
      resolver.interface.encodeFunctionData('setSpaceId(bytes32,bytes)', [
        namehash('newconfigname.any'),
        '0xebec795c9c8bbd61ffc14a6662944748f299cacf',
      ]),
      resolver.interface.encodeFunctionData('setContenthash', [
        namehash('newconfigname.any'),
        contentHash,
      ]),
    ]

    // signer
    var commitment = await controller.makeCommitment(
      'newconfigname',
      registrantAccount,
      REGISTRATION_TIME,
      secret,
      resolver.address,
      // calldata is passed here
      callData2,
      false,
      0,
    )

    var tx = await controller.commit(commitment)
    expect(await controller.commitments(commitment)).to.equal(
      (await web3.eth.getBlock(tx.blockNumber)).timestamp,
    )

    await evm.advanceTime((await controller.minCommitmentAge()).toNumber())
    var balanceBefore = await web3.eth.getBalance(controller.address)

    var tx = await controller.register(
      'newconfigname',
      registrantAccount,
      REGISTRATION_TIME,
      secret,
      resolver.address,
      callData2,
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
        block.timestamp + REGISTRATION_TIME,
      )

    var nodehash = namehash('newconfigname.any')
    expect(await ens.resolver(nodehash)).to.equal(resolver.address)
    expect(await ens.owner(nodehash)).to.equal(nameWrapper.address)
    expect(await baseRegistrar.ownerOf(sha3('newconfigname'))).to.equal(
      nameWrapper.address,
    )
    expect(await resolver['spaceId(bytes32)'](nodehash)).to.equal(
      '0xebec795c9c8bbd61ffc14a6662944748f299cacf',
    )
    expect(await resolver.contenthash(nodehash)).to.equal(contentHash)

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

  it('should not permit new registrations from wrong address', async () => {
    // signer
    await expect(
      controller.makeCommitment(
        'newconfigname',
        registrantAccount,
        REGISTRATION_TIME,
        secret,
        resolver.address,
        callData,
        false,
        0,
        { from: accounts[1] },
      ),
    ).to.be.reverted
  })

  it('should not permit registration from wrong address', async () => {
    // signer
    var commitment = await controller.makeCommitment(
      'newconfigname',
      registrantAccount,
      REGISTRATION_TIME,
      secret,
      resolver.address,
      callData,
      false,
      0,
    )

    var tx = await controller.commit(commitment)
    expect(await controller.commitments(commitment)).to.equal(
      (await web3.eth.getBlock(tx.blockNumber)).timestamp,
    )

    await evm.advanceTime((await controller.minCommitmentAge()).toNumber())
    var balanceBefore = await web3.eth.getBalance(controller.address)

    await expect(
      controller.register(
        'newconfigname',
        registrantAccount,
        REGISTRATION_TIME,
        secret,
        resolver.address,
        callData,
        false,
        0,
        { from: accounts[1] },
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
    const commitment = await controller.makeCommitment(
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
    const tx = await controller.commit(commitment)
    expect(await controller.commitments(commitment)).to.equal(
      (await web3.eth.getBlock(tx.blockNumber)).timestamp,
    )

    await evm.advanceTime((await controller.minCommitmentAge()).toNumber())

    await expect(
      controller.register(
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
    const commitment = await controller.makeCommitment(
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
    const tx = await controller.commit(commitment)
    expect(await controller.commitments(commitment)).to.equal(
      (await web3.eth.getBlock(tx.blockNumber)).timestamp,
    )

    await evm.advanceTime((await controller.minCommitmentAge()).toNumber())

    await expect(
      controller.register(
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
        block.timestamp + REGISTRATION_TIME,
      )

    const nodehash = namehash('newconfigname2.any')
    expect(await ens.resolver(nodehash)).to.equal(resolver.address)
    expect(await resolver['name(bytes32)'](nodehash)).to.equal('')
  })

  it('should include the owner in the commitment', async () => {
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

  it('should allow to renew a name without changing fuse expiry', async () => {
    await registerName('newname')
    var nodehash = namehash('newname.any')
    var fuseExpiry = (await nameWrapper.getData(nodehash))[2]
    var expires = await baseRegistrar.nameExpires(sha3('newname'))

    const duration = 86400

    await controller.renew('newname', duration)
    var newExpires = await baseRegistrar.nameExpires(sha3('newname'))
    var newFuseExpiry = (await nameWrapper.getData(nodehash))[2]
    expect(newExpires.toNumber() - expires.toNumber()).to.equal(duration)
    expect(newFuseExpiry.toNumber() - fuseExpiry.toNumber()).to.equal(86400)
  })

  it('should allow token owners to renew a name', async () => {
    const CANNOT_UNWRAP = 1
    const PARENT_CANNOT_CONTROL = 64

    await registerName('newname')
    var nodehash = namehash('newname.any')
    const [, fuses, fuseExpiry] = await nameWrapper.getData(nodehash)

    var expires = await baseRegistrar.nameExpires(sha3('newname'))
    const duration = 86400

    await controller.renew('newname', duration)
    var newExpires = await baseRegistrar.nameExpires(sha3('newname'))
    const [, newFuses, newFuseExpiry] = await nameWrapper.getData(nodehash)
    expect(newExpires.toNumber() - expires.toNumber()).to.equal(duration)
    expect(newFuseExpiry.toNumber() - fuseExpiry.toNumber()).to.equal(duration)
    expect(newFuses).to.equal(fuses)
  })

  it('non wrapped names can renew', async () => {
    const label = 'newname'
    const tokenId = sha3(label)
    const nodehash = namehash(`${label}.any`)
    // this is to allow user to register without namewrapped
    await baseRegistrar.addController(ownerAccount)
    await baseRegistrar.register(tokenId, ownerAccount, 84600)

    expect(await nameWrapper.ownerOf(nodehash)).to.equal(ZERO_ADDRESS)
    expect(await baseRegistrar.ownerOf(tokenId)).to.equal(ownerAccount)

    var expires = await baseRegistrar.nameExpires(tokenId)
    const duration = 86400

    await controller.renew(label, duration)

    expect(await baseRegistrar.ownerOf(tokenId)).to.equal(ownerAccount)
    expect(await nameWrapper.ownerOf(nodehash)).to.equal(ZERO_ADDRESS)
    var newExpires = await baseRegistrar.nameExpires(tokenId)
    expect(newExpires.toNumber() - expires.toNumber()).to.equal(duration)
  })

  it('should set the reverse record of the account', async () => {
    const commitment = await controller.makeCommitment(
      'xxx',
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
      'xxx',
      registrantAccount,
      REGISTRATION_TIME,
      secret,
      resolver.address,
      [],
      true,
      0,
    )

    // this should be something like (example) 333333f332a06ECB5D20D35da44ba07986D6E203.addr.reverse
    const reverseName = getReverseNode(registrantAccount)

    expect(await resolver.name(reverseName)).to.equal('xxx.any')
  })

  it('should not set the reverse record of the account when set to false', async () => {
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

    const gasA = await controller.estimateGas.register(
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

    await resolver.setApprovalForAll(controller.address, true)

    const gasB = await controller.estimateGas.register(
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

    const tx = await controller.register(
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

    console.log((await tx.wait()).gasUsed.toString())

    console.log(gasA.toString(), gasB.toString())

    expect(await nameWrapper.ownerOf(node)).to.equal(registrantAccount)
    expect(await ens.owner(namehash(name))).to.equal(nameWrapper.address)
    expect(await baseRegistrar.ownerOf(sha3(label))).to.equal(
      nameWrapper.address,
    )
    expect(await resolver['name(bytes32)'](node)).to.equal('xxx')
  })

  it('should not permit new registrations with non resolver function calls', async () => {
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
