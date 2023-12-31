const ENS = artifacts.require('./registry/ENSRegistry.sol')
const AnytypeResolver = artifacts.require('AnytypeResolver.sol')
const NameWrapper = artifacts.require('DummyNameWrapper.sol')
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

contract('AnytypeResolver', function (accounts) {
  let node
  let ens, resolver, nameWrapper
  let account
  let signers
  let result

  beforeEach(async () => {
    signers = await ethers.getSigners()
    account = await signers[0].getAddress()
    node = namehash.hash('any')
    ens = await ENS.new()
    nameWrapper = await NameWrapper.new()

    //setup reverse registrar

    const ReverseRegistrar = await deploy('ReverseRegistrar', ens.address)

    await ens.setSubnodeOwner(ROOT_NODE, labelhash('reverse'), account)
    await ens.setSubnodeOwner(
      namehash.hash('reverse'),
      labelhash('addr'),
      ReverseRegistrar.address,
    )

    resolver = await AnytypeResolver.new(
      ens.address,
      nameWrapper.address,
      accounts[9], // trusted contract
      accounts[8], // another trusted contract
      ReverseRegistrar.address, //ReverseRegistrar.address,
    )

    await ReverseRegistrar.setDefaultResolver(resolver.address)

    await ens.setSubnodeOwner('0x0', sha3('any'), accounts[0], {
      from: accounts[0],
    })
  })

  describe('fallback function', async () => {
    it('forbids calls to the fallback function with 0 value', async () => {
      await exceptions.expectFailure(
        web3.eth.sendTransaction({
          from: accounts[0],
          to: resolver.address,
          gas: 3000000,
        }),
      )
    })

    it('forbids calls to the fallback function with 1 value', async () => {
      await exceptions.expectFailure(
        web3.eth.sendTransaction({
          from: accounts[0],
          to: resolver.address,
          gas: 3000000,
          value: 1,
        }),
      )
    })
  })

  describe('supportsInterface function', async () => {
    it('supports known interfaces', async () => {
      assert.equal(await resolver.supportsInterface('0x3b3b57de'), false) // IAddrResolver
      assert.equal(await resolver.supportsInterface('0xf1cb7e06'), false) // IAddressResolver
      assert.equal(await resolver.supportsInterface('0x691f3431'), true) // INameResolver
      assert.equal(await resolver.supportsInterface('0x2203ab56'), false) // IABIResolver
      assert.equal(await resolver.supportsInterface('0xc8690233'), true) // IPubkeyResolver
      assert.equal(await resolver.supportsInterface('0x59d1d43c'), true) // ITextResolver
      assert.equal(await resolver.supportsInterface('0xbc1c58d1'), true) // IContentHashResolver
      assert.equal(await resolver.supportsInterface('0xa8fa5682'), true) // IDNSRecordResolver
      assert.equal(await resolver.supportsInterface('0x5c98042b'), true) // IDNSZoneResolver
      assert.equal(await resolver.supportsInterface('0x01ffc9a7'), true) // IInterfaceResolver

      //assert.equal(await resolver.supportsInterface('0xTODO'), true) // ISpaceResolver
    })

    it('does not support a random interface', async () => {
      assert.equal(await resolver.supportsInterface('0x3b3b57df'), false)
    })
  })

  describe('recordVersion', async () => {
    it('permits clearing records', async () => {
      var tx = await resolver.clearRecords(node, { from: accounts[0] })
      assert.equal(tx.logs.length, 1)
      assert.equal(tx.logs[0].event, 'VersionChanged')
      assert.equal(tx.logs[0].args.node, node)
      assert.equal(tx.logs[0].args.newVersion, 1)
    })
  })

  describe('name', async () => {
    const basicSetName = async () => {
      await resolver.setName(node, 'name1', { from: accounts[0] })
      assert.equal(await resolver.name(node), 'name1')
    }

    it('permits setting name by owner', basicSetName)

    it('permits setting name by controller1', async () => {
      await resolver.setName(node, 'name1', { from: accounts[9] })
      assert.equal(await resolver.name(node), 'name1')

      await resolver.setName(node, 'name2', { from: accounts[8] })
      assert.equal(await resolver.name(node), 'name2')
    })

    it('can overwrite previously set names', async () => {
      await resolver.setName(node, 'name1', { from: accounts[0] })
      assert.equal(await resolver.name(node), 'name1')

      await resolver.setName(node, 'name2', { from: accounts[0] })
      assert.equal(await resolver.name(node), 'name2')
    })

    it('forbids setting name by non-owners', async () => {
      await exceptions.expectFailure(
        resolver.setName(node, 'name2', { from: accounts[1] }),
      )
    })

    it('returns empty when fetching nonexistent name', async () => {
      assert.equal(await resolver.name(node), '')
    })

    it('resets record on version change', async () => {
      await basicSetName()
      await resolver.clearRecords(node)
      assert.equal(await resolver.name(node), '')
    })
  })

  describe('pubkey', async () => {
    const basicSetPubkey = async () => {
      let x =
        '0x1000000000000000000000000000000000000000000000000000000000000000'
      let y =
        '0x2000000000000000000000000000000000000000000000000000000000000000'

      await resolver.setPubkey(node, x, y, { from: accounts[0] })

      let result = await resolver.pubkey(node)
      assert.equal(result[0], x)
      assert.equal(result[1], y)
    }

    it('returns empty when fetching nonexistent values', async () => {
      let result = await resolver.pubkey(node)
      assert.equal(
        result[0],
        '0x0000000000000000000000000000000000000000000000000000000000000000',
      )
      assert.equal(
        result[1],
        '0x0000000000000000000000000000000000000000000000000000000000000000',
      )
    })

    it('permits setting public key by owner', basicSetPubkey)

    it('can overwrite previously set value', async () => {
      await resolver.setPubkey(
        node,
        '0x1000000000000000000000000000000000000000000000000000000000000000',
        '0x2000000000000000000000000000000000000000000000000000000000000000',
        { from: accounts[0] },
      )

      let x =
        '0x3000000000000000000000000000000000000000000000000000000000000000'
      let y =
        '0x4000000000000000000000000000000000000000000000000000000000000000'
      await resolver.setPubkey(node, x, y, { from: accounts[0] })

      let result = await resolver.pubkey(node)
      assert.equal(result[0], x)
      assert.equal(result[1], y)
    })

    it('can overwrite to same value', async () => {
      let x =
        '0x1000000000000000000000000000000000000000000000000000000000000000'
      let y =
        '0x2000000000000000000000000000000000000000000000000000000000000000'

      await resolver.setPubkey(node, x, y, { from: accounts[0] })
      await resolver.setPubkey(node, x, y, { from: accounts[0] })

      let result = await resolver.pubkey(node)
      assert.equal(result[0], x)
      assert.equal(result[1], y)
    })

    it('forbids setting value by non-owners', async () => {
      await exceptions.expectFailure(
        resolver.setPubkey(
          node,
          '0x1000000000000000000000000000000000000000000000000000000000000000',
          '0x2000000000000000000000000000000000000000000000000000000000000000',
          { from: accounts[1] },
        ),
      )
    })

    it('forbids writing same value by non-owners', async () => {
      let x =
        '0x1000000000000000000000000000000000000000000000000000000000000000'
      let y =
        '0x2000000000000000000000000000000000000000000000000000000000000000'

      await resolver.setPubkey(node, x, y, { from: accounts[0] })

      await exceptions.expectFailure(
        resolver.setPubkey(node, x, y, { from: accounts[1] }),
      )
    })

    it('forbids overwriting existing value by non-owners', async () => {
      await resolver.setPubkey(
        node,
        '0x1000000000000000000000000000000000000000000000000000000000000000',
        '0x2000000000000000000000000000000000000000000000000000000000000000',
        { from: accounts[0] },
      )

      await exceptions.expectFailure(
        resolver.setPubkey(
          node,
          '0x3000000000000000000000000000000000000000000000000000000000000000',
          '0x4000000000000000000000000000000000000000000000000000000000000000',
          { from: accounts[1] },
        ),
      )
    })

    it('resets record on version change', async () => {
      await basicSetPubkey()
      await resolver.clearRecords(node)
      result = await resolver.pubkey(node)
      assert.equal(
        result[0],
        '0x0000000000000000000000000000000000000000000000000000000000000000',
      )
      assert.equal(
        result[1],
        '0x0000000000000000000000000000000000000000000000000000000000000000',
      )
    })
  })

  describe('text', async () => {
    var url = 'https://ethereum.org'
    var url2 = 'https://github.com/ethereum'

    const basicSetText = async () => {
      await resolver.setText(node, 'url', url, { from: accounts[0] })
      assert.equal(await resolver.text(node, 'url'), url)
    }

    it('permits setting text by owner', basicSetText)

    it('can overwrite previously set text', async () => {
      await resolver.setText(node, 'url', url, { from: accounts[0] })
      assert.equal(await resolver.text(node, 'url'), url)

      await resolver.setText(node, 'url', url2, { from: accounts[0] })
      assert.equal(await resolver.text(node, 'url'), url2)
    })

    it('can overwrite to same text', async () => {
      await resolver.setText(node, 'url', url, { from: accounts[0] })
      assert.equal(await resolver.text(node, 'url'), url)

      await resolver.setText(node, 'url', url, { from: accounts[0] })
      assert.equal(await resolver.text(node, 'url'), url)
    })

    it('forbids setting new text by non-owners', async () => {
      await exceptions.expectFailure(
        resolver.setText(node, 'url', url, { from: accounts[1] }),
      )
    })

    it('forbids writing same text by non-owners', async () => {
      await resolver.setText(node, 'url', url, { from: accounts[0] })

      await exceptions.expectFailure(
        resolver.setText(node, 'url', url, { from: accounts[1] }),
      )
    })

    it('resets record on version change', async () => {
      await basicSetText()
      await resolver.clearRecords(node)
      assert.equal(await resolver.text(node, 'url'), '')
    })
  })

  describe('contenthash', async () => {
    const basicSetContenthash = async () => {
      await resolver.setContenthash(
        node,
        '0x0000000000000000000000000000000000000000000000000000000000000001',
        { from: accounts[0] },
      )
      assert.equal(
        await resolver.contenthash(node),
        '0x0000000000000000000000000000000000000000000000000000000000000001',
      )
    }

    it('permits setting contenthash by owner', basicSetContenthash)

    it('can overwrite previously set contenthash', async () => {
      await resolver.setContenthash(
        node,
        '0x0000000000000000000000000000000000000000000000000000000000000001',
        { from: accounts[0] },
      )
      assert.equal(
        await resolver.contenthash(node),
        '0x0000000000000000000000000000000000000000000000000000000000000001',
      )

      await resolver.setContenthash(
        node,
        '0x0000000000000000000000000000000000000000000000000000000000000002',
        { from: accounts[0] },
      )
      assert.equal(
        await resolver.contenthash(node),
        '0x0000000000000000000000000000000000000000000000000000000000000002',
      )
    })

    it('can overwrite to same contenthash', async () => {
      await resolver.setContenthash(
        node,
        '0x0000000000000000000000000000000000000000000000000000000000000001',
        { from: accounts[0] },
      )
      assert.equal(
        await resolver.contenthash(node),
        '0x0000000000000000000000000000000000000000000000000000000000000001',
      )

      await resolver.setContenthash(
        node,
        '0x0000000000000000000000000000000000000000000000000000000000000002',
        { from: accounts[0] },
      )
      assert.equal(
        await resolver.contenthash(node),
        '0x0000000000000000000000000000000000000000000000000000000000000002',
      )
    })

    it('forbids setting contenthash by non-owners', async () => {
      await exceptions.expectFailure(
        resolver.setContenthash(
          node,
          '0x0000000000000000000000000000000000000000000000000000000000000001',
          { from: accounts[1] },
        ),
      )
    })

    it('forbids writing same contenthash by non-owners', async () => {
      await resolver.setContenthash(
        node,
        '0x0000000000000000000000000000000000000000000000000000000000000001',
        { from: accounts[0] },
      )

      await exceptions.expectFailure(
        resolver.setContenthash(
          node,
          '0x0000000000000000000000000000000000000000000000000000000000000001',
          { from: accounts[1] },
        ),
      )
    })

    it('returns empty when fetching nonexistent contenthash', async () => {
      assert.equal(await resolver.contenthash(node), null)
    })

    it('resets record on version change', async () => {
      await basicSetContenthash()
      await resolver.clearRecords(node)
      assert.equal(await resolver.contenthash(node), null)
    })
  })

  describe('dns', async () => {
    const basicSetDNSRecords = async () => {
      // a.eth. 3600 IN A 1.2.3.4
      const arec = '016103657468000001000100000e10000401020304'
      // b.eth. 3600 IN A 2.3.4.5
      const b1rec = '016203657468000001000100000e10000402030405'
      // b.eth. 3600 IN A 3.4.5.6
      const b2rec = '016203657468000001000100000e10000403040506'
      // eth. 86400 IN SOA ns1.ethdns.xyz. hostmaster.test.eth. 2018061501 15620 1800 1814400 14400
      const soarec =
        '03657468000006000100015180003a036e733106657468646e730378797a000a686f73746d6173746572057465737431036574680078492cbd00003d0400000708001baf8000003840'
      const rec = '0x' + arec + b1rec + b2rec + soarec

      await resolver.setDNSRecords(node, rec, { from: accounts[0] })

      assert.equal(
        await resolver.dnsRecord(node, sha3(dnsName('a.eth.')), 1),
        '0x016103657468000001000100000e10000401020304',
      )
      assert.equal(
        await resolver.dnsRecord(node, sha3(dnsName('b.eth.')), 1),
        '0x016203657468000001000100000e10000402030405016203657468000001000100000e10000403040506',
      )
      assert.equal(
        await resolver.dnsRecord(node, sha3(dnsName('eth.')), 6),
        '0x03657468000006000100015180003a036e733106657468646e730378797a000a686f73746d6173746572057465737431036574680078492cbd00003d0400000708001baf8000003840',
      )
    }
    it('permits setting name by owner', basicSetDNSRecords)

    it('should update existing records', async () => {
      // a.eth. 3600 IN A 4.5.6.7
      const arec = '016103657468000001000100000e10000404050607'
      // eth. 86400 IN SOA ns1.ethdns.xyz. hostmaster.test.eth. 2018061502 15620 1800 1814400 14400
      const soarec =
        '03657468000006000100015180003a036e733106657468646e730378797a000a686f73746d6173746572057465737431036574680078492cbe00003d0400000708001baf8000003840'
      const rec = '0x' + arec + soarec

      await resolver.setDNSRecords(node, rec, { from: accounts[0] })

      assert.equal(
        await resolver.dnsRecord(node, sha3(dnsName('a.eth.')), 1),
        '0x016103657468000001000100000e10000404050607',
      )
      assert.equal(
        await resolver.dnsRecord(node, sha3(dnsName('eth.')), 6),
        '0x03657468000006000100015180003a036e733106657468646e730378797a000a686f73746d6173746572057465737431036574680078492cbe00003d0400000708001baf8000003840',
      )
    })

    it('should keep track of entries', async () => {
      // c.eth. 3600 IN A 1.2.3.4
      const crec = '016303657468000001000100000e10000401020304'
      const rec = '0x' + crec

      await resolver.setDNSRecords(node, rec, { from: accounts[0] })

      // Initial check
      var hasEntries = await resolver.hasDNSRecords(
        node,
        sha3(dnsName('c.eth.')),
      )
      assert.equal(hasEntries, true)
      hasEntries = await resolver.hasDNSRecords(node, sha3(dnsName('d.eth.')))
      assert.equal(hasEntries, false)

      // Update with no new data makes no difference
      await resolver.setDNSRecords(node, rec, { from: accounts[0] })
      hasEntries = await resolver.hasDNSRecords(node, sha3(dnsName('c.eth.')))
      assert.equal(hasEntries, true)

      // c.eth. 3600 IN A
      const crec2 = '016303657468000001000100000e100000'
      const rec2 = '0x' + crec2

      await resolver.setDNSRecords(node, rec2, { from: accounts[0] })

      // Removal returns to 0
      hasEntries = await resolver.hasDNSRecords(node, sha3(dnsName('c.eth.')))
      assert.equal(hasEntries, false)
    })

    it('should handle single-record updates', async () => {
      // e.eth. 3600 IN A 1.2.3.4
      const erec = '016503657468000001000100000e10000401020304'
      const rec = '0x' + erec

      await resolver.setDNSRecords(node, rec, { from: accounts[0] })

      assert.equal(
        await resolver.dnsRecord(node, sha3(dnsName('e.eth.')), 1),
        '0x016503657468000001000100000e10000401020304',
      )
    })

    it('forbids setting DNS records by non-owners', async () => {
      // f.eth. 3600 IN A 1.2.3.4
      const frec = '016603657468000001000100000e10000401020304'
      const rec = '0x' + frec
      await exceptions.expectFailure(
        resolver.setDNSRecords(node, rec, { from: accounts[1] }),
      )
    })

    const basicSetZonehash = async () => {
      await resolver.setZonehash(
        node,
        '0x0000000000000000000000000000000000000000000000000000000000000001',
        { from: accounts[0] },
      )
      assert.equal(
        await resolver.zonehash(node),
        '0x0000000000000000000000000000000000000000000000000000000000000001',
      )
    }

    it('permits setting zonehash by owner', basicSetZonehash)

    it('can overwrite previously set zonehash', async () => {
      await resolver.setZonehash(
        node,
        '0x0000000000000000000000000000000000000000000000000000000000000001',
        { from: accounts[0] },
      )
      assert.equal(
        await resolver.zonehash(node),
        '0x0000000000000000000000000000000000000000000000000000000000000001',
      )

      await resolver.setZonehash(
        node,
        '0x0000000000000000000000000000000000000000000000000000000000000002',
        { from: accounts[0] },
      )
      assert.equal(
        await resolver.zonehash(node),
        '0x0000000000000000000000000000000000000000000000000000000000000002',
      )
    })

    it('can overwrite to same zonehash', async () => {
      await resolver.setZonehash(
        node,
        '0x0000000000000000000000000000000000000000000000000000000000000001',
        { from: accounts[0] },
      )
      assert.equal(
        await resolver.zonehash(node),
        '0x0000000000000000000000000000000000000000000000000000000000000001',
      )

      await resolver.setZonehash(
        node,
        '0x0000000000000000000000000000000000000000000000000000000000000002',
        { from: accounts[0] },
      )
      assert.equal(
        await resolver.zonehash(node),
        '0x0000000000000000000000000000000000000000000000000000000000000002',
      )
    })

    it('forbids setting zonehash by non-owners', async () => {
      await exceptions.expectFailure(
        resolver.setZonehash(
          node,
          '0x0000000000000000000000000000000000000000000000000000000000000001',
          { from: accounts[1] },
        ),
      )
    })

    it('forbids writing same zonehash by non-owners', async () => {
      await resolver.setZonehash(
        node,
        '0x0000000000000000000000000000000000000000000000000000000000000001',
        { from: accounts[0] },
      )

      await exceptions.expectFailure(
        resolver.setZonehash(
          node,
          '0x0000000000000000000000000000000000000000000000000000000000000001',
          { from: accounts[1] },
        ),
      )
    })

    it('returns empty when fetching nonexistent zonehash', async () => {
      assert.equal(await resolver.zonehash(node), null)
    })

    it('emits the correct event', async () => {
      var tx = await resolver.setZonehash(
        node,
        '0x0000000000000000000000000000000000000000000000000000000000000001',
        { from: accounts[0] },
      )
      assert.equal(tx.logs.length, 1)
      assert.equal(tx.logs[0].event, 'DNSZonehashChanged')
      assert.equal(tx.logs[0].args.node, node)
      assert.equal(tx.logs[0].args.lastzonehash, undefined)
      assert.equal(
        tx.logs[0].args.zonehash,
        '0x0000000000000000000000000000000000000000000000000000000000000001',
      )

      tx = await resolver.setZonehash(
        node,
        '0x0000000000000000000000000000000000000000000000000000000000000002',
        { from: accounts[0] },
      )
      assert.equal(tx.logs.length, 1)
      assert.equal(tx.logs[0].event, 'DNSZonehashChanged')
      assert.equal(tx.logs[0].args.node, node)
      assert.equal(
        tx.logs[0].args.lastzonehash,
        '0x0000000000000000000000000000000000000000000000000000000000000001',
      )
      assert.equal(
        tx.logs[0].args.zonehash,
        '0x0000000000000000000000000000000000000000000000000000000000000002',
      )

      tx = await resolver.setZonehash(
        node,
        '0x0000000000000000000000000000000000000000000000000000000000000000',
        { from: accounts[0] },
      )
      assert.equal(tx.logs.length, 1)
      assert.equal(tx.logs[0].event, 'DNSZonehashChanged')
      assert.equal(tx.logs[0].args.node, node)
      assert.equal(
        tx.logs[0].args.lastzonehash,
        '0x0000000000000000000000000000000000000000000000000000000000000002',
      )
      assert.equal(
        tx.logs[0].args.zonehash,
        '0x0000000000000000000000000000000000000000000000000000000000000000',
      )
    })

    it('resets dnsRecords on version change', async () => {
      await basicSetDNSRecords()
      await resolver.clearRecords(node)
      assert.equal(
        await resolver.dnsRecord(node, sha3(dnsName('a.eth.')), 1),
        null,
      )
      assert.equal(
        await resolver.dnsRecord(node, sha3(dnsName('b.eth.')), 1),
        null,
      )
      assert.equal(
        await resolver.dnsRecord(node, sha3(dnsName('eth.')), 6),
        null,
      )
    })

    it('resets zonehash on version change', async () => {
      await basicSetZonehash()
      await resolver.clearRecords(node)
      assert.equal(await resolver.zonehash(node), null)
    })
  })

  describe('authorisations', async () => {
    it('permits authorisations to be set', async () => {
      await resolver.setApprovalForAll(accounts[1], true, {
        from: accounts[0],
      })
      assert.equal(
        await resolver.isApprovedForAll(accounts[0], accounts[1]),
        true,
      )
    })

    it('permits authorised users to make changes', async () => {
      await resolver.setApprovalForAll(accounts[1], true, {
        from: accounts[0],
      })
      assert.equal(
        await resolver.isApprovedForAll(await ens.owner(node), accounts[1]),
        true,
      )
      await resolver.setName(node, 'name1', { from: accounts[1] })
      assert.equal(await resolver.name(node), 'name1')
    })

    it('permits authorisations to be cleared', async () => {
      await resolver.setApprovalForAll(accounts[1], false, {
        from: accounts[0],
      })
      await exceptions.expectFailure(
        resolver.setName(node, 'name1', { from: accounts[1] }),
      )
    })

    it('permits non-owners to set authorisations', async () => {
      await resolver.setApprovalForAll(accounts[2], true, {
        from: accounts[1],
      })

      // The authorisation should have no effect, because accounts[1] is not the owner.
      await exceptions.expectFailure(
        resolver.setName(node, 'name1', { from: accounts[2] }),
      )
    })

    it('checks the authorisation for the current owner', async () => {
      await resolver.setApprovalForAll(accounts[2], true, {
        from: accounts[1],
      })
      await ens.setOwner(node, accounts[1], { from: accounts[0] })

      await resolver.setName(node, 'name1', { from: accounts[2] })
      assert.equal(await resolver.name(node), 'name1')
    })

    it('trusted contract can bypass authorisation', async () => {
      await resolver.setName(node, 'name2', { from: accounts[9] })
      assert.equal(await resolver.name(node), 'name2')
    })

    it('emits an ApprovalForAll log', async () => {
      var owner = accounts[0]
      var operator = accounts[1]
      var tx = await resolver.setApprovalForAll(operator, true, {
        from: owner,
      })
      assert.equal(tx.logs.length, 1)
      assert.equal(tx.logs[0].event, 'ApprovalForAll')
      assert.equal(tx.logs[0].args.owner, owner)
      assert.equal(tx.logs[0].args.operator, operator)
      assert.equal(tx.logs[0].args.approved, true)
    })

    it('reverts if attempting to approve self as an operator', async () => {
      await expect(
        resolver.setApprovalForAll(accounts[1], true, { from: accounts[1] }),
      ).to.be.revertedWith('ERC1155: setting approval status for self')
    })

    it('permits name wrapper owner to make changes if owner is set to name wrapper address', async () => {
      var owner = await ens.owner(node)
      var operator = accounts[2]
      await exceptions.expectFailure(
        resolver.setName(node, 'name1', { from: operator }),
      )

      await ens.setOwner(node, nameWrapper.address, { from: owner })

      await expect(resolver.setName(node, 'name1', { from: operator }))
    })
  })

  describe('token approvals', async () => {
    it('permits delegate to be approved', async () => {
      await resolver.approve(node, accounts[1], true, {
        from: accounts[0],
      })
      assert.equal(
        await resolver.isApprovedFor(accounts[0], node, accounts[1]),
        true,
      )
    })

    it('permits delegated users to make changes', async () => {
      await resolver.approve(node, accounts[1], true, {
        from: accounts[0],
      })
      assert.equal(
        await resolver.isApprovedFor(await ens.owner(node), node, accounts[1]),
        true,
      )

      await resolver.setName(node, 'name1', { from: accounts[1] })

      assert.equal(await resolver.name(node), 'name1')
    })

    it('permits delegations to be cleared', async () => {
      await resolver.approve(node, accounts[1], false, {
        from: accounts[0],
      })
      await exceptions.expectFailure(
        resolver.setName(node, 'name1', { from: accounts[1] }),
      )
    })

    it('permits non-owners to set delegations', async () => {
      await resolver.approve(node, accounts[2], true, {
        from: accounts[1],
      })

      // The delegation should have no effect, because accounts[1] is not the owner.
      await exceptions.expectFailure(
        resolver.setName(node, 'name1', { from: accounts[2] }),
      )
    })

    it('checks the delegation for the current owner', async () => {
      await resolver.approve(node, accounts[2], true, {
        from: accounts[1],
      })
      await ens.setOwner(node, accounts[1], { from: accounts[0] })

      await resolver.setName(node, 'name7', { from: accounts[2] })

      assert.equal(await resolver.name(node), 'name7')
    })

    it('emits a Approved log', async () => {
      var owner = accounts[0]
      var delegate = accounts[1]
      var tx = await resolver.approve(node, delegate, true, {
        from: owner,
      })
      assert.equal(tx.logs.length, 1)
      assert.equal(tx.logs[0].event, 'Approved')
      assert.equal(tx.logs[0].args.owner, owner)
      assert.equal(tx.logs[0].args.node, node)
      assert.equal(tx.logs[0].args.delegate, delegate)
      assert.equal(tx.logs[0].args.approved, true)
    })

    it('reverts if attempting to delegate self as an delegate', async () => {
      await expect(
        resolver.approve(node, accounts[1], true, { from: accounts[1] }),
      ).to.be.revertedWith('Setting delegate status for self')
    })
  })

  describe('multicall', async () => {
    it('allows setting multiple fields', async () => {
      var addrSet = resolver.contract.methods['setName(bytes32,string)'](
        node,
        'name1',
      ).encodeABI()

      var textSet = resolver.contract.methods
        .setText(node, 'url', 'https://ethereum.org/')
        .encodeABI()

      var tx = await resolver.multicall([addrSet, textSet], {
        from: accounts[0],
      })

      assert.equal(tx.logs.length, 2)
      assert.equal(tx.logs[0].event, 'NameChanged')
      assert.equal(tx.logs[0].args.node, node)
      assert.equal(tx.logs[0].args.name, 'name1')

      assert.equal(tx.logs[1].event, 'TextChanged')
      assert.equal(tx.logs[1].args.node, node)
      assert.equal(tx.logs[1].args.key, 'url')

      assert.equal(await resolver.methods['name(bytes32)'](node), 'name1')
      assert.equal(await resolver.text(node, 'url'), 'https://ethereum.org/')
    })

    it('allows reading multiple fields', async () => {
      await resolver.methods['setName(bytes32,string)'](node, 'name3', {
        from: accounts[0],
      })
      await resolver.setText(node, 'url', 'https://ethereum.org/', {
        from: accounts[0],
      })
      var results = await resolver.multicall.call([
        resolver.contract.methods['name(bytes32)'](node).encodeABI(),
        resolver.contract.methods.text(node, 'url').encodeABI(),
      ])
      assert.equal(
        web3.eth.abi.decodeParameters(['string'], results[0])[0],
        'name3',
      )
      assert.equal(
        web3.eth.abi.decodeParameters(['string'], results[1])[0],
        'https://ethereum.org/',
      )
    })
  })

  describe('spaceid', async () => {
    const basicSetSpace = async () => {
      await resolver.setSpaceId(
        node,
        '0x0000000000000000000000000000000000000000000000000000000000000001',
        { from: accounts[0] },
      )
      assert.equal(
        await resolver.spaceId(node),
        '0x0000000000000000000000000000000000000000000000000000000000000001',
      )
    }

    it('permits setting contenthash by owner', basicSetSpace)

    it('can overwrite previously set spaceId', async () => {
      await resolver.setSpaceId(
        node,
        '0x0000000000000000000000000000000000000000000000000000000000000001',
        { from: accounts[0] },
      )
      assert.equal(
        await resolver.spaceId(node),
        '0x0000000000000000000000000000000000000000000000000000000000000001',
      )

      await resolver.setSpaceId(
        node,
        '0x0000000000000000000000000000000000000000000000000000000000000002',
        { from: accounts[0] },
      )
      assert.equal(
        await resolver.spaceId(node),
        '0x0000000000000000000000000000000000000000000000000000000000000002',
      )
    })

    it('can overwrite to same spaceId', async () => {
      await resolver.setSpaceId(
        node,
        '0x0000000000000000000000000000000000000000000000000000000000000001',
        { from: accounts[0] },
      )
      assert.equal(
        await resolver.spaceId(node),
        '0x0000000000000000000000000000000000000000000000000000000000000001',
      )

      await resolver.setSpaceId(
        node,
        '0x0000000000000000000000000000000000000000000000000000000000000002',
        { from: accounts[0] },
      )
      assert.equal(
        await resolver.spaceId(node),
        '0x0000000000000000000000000000000000000000000000000000000000000002',
      )
    })

    it('forbids setting spaceId by non-owners', async () => {
      await exceptions.expectFailure(
        resolver.setSpaceId(
          node,
          '0x0000000000000000000000000000000000000000000000000000000000000001',
          { from: accounts[1] },
        ),
      )
    })

    it('forbids writing same spaceId by non-owners', async () => {
      await resolver.setSpaceId(
        node,
        '0x0000000000000000000000000000000000000000000000000000000000000001',
        { from: accounts[0] },
      )

      await exceptions.expectFailure(
        resolver.setSpaceId(
          node,
          '0x0000000000000000000000000000000000000000000000000000000000000001',
          { from: accounts[1] },
        ),
      )
    })

    it('returns empty when fetching nonexistent contenthash', async () => {
      assert.equal(await resolver.spaceId(node), null)
    })

    it('resets record on version change', async () => {
      await basicSetSpace()
      await resolver.clearRecords(node)
      assert.equal(await resolver.spaceId(node), null)
    })

    it('does not affect contenthash', async () => {
      await resolver.setSpaceId(
        node,
        '0x0000000000000000000000000000000000000000000000000000000000000001',
        { from: accounts[0] },
      )
      assert.equal(
        await resolver.spaceId(node),
        '0x0000000000000000000000000000000000000000000000000000000000000001',
      )

      assert.equal(await resolver.contenthash(node), null)
    })
  })
})

function dnsName(name) {
  // strip leading and trailing .
  const n = name.replace(/^\.|\.$/gm, '')

  var bufLen = n === '' ? 1 : n.length + 2
  var buf = Buffer.allocUnsafe(bufLen)

  offset = 0
  if (n.length) {
    const list = n.split('.')
    for (let i = 0; i < list.length; i++) {
      const len = buf.write(list[i], offset + 1)
      buf[offset] = len
      offset += len + 1
    }
  }
  buf[offset++] = 0
  return (
    '0x' +
    buf.reduce(
      (output, elem) => output + ('0' + elem.toString(16)).slice(-2),
      '',
    )
  )
}
