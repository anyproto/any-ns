const {
  contracts: { deploy },
} = require('../test-utils')

const AnytypePriceOracle = artifacts.require('./AnytypePriceOracle')

const { expect } = require('chai')

contract('AnytypePriceOracle', function (accounts) {
  let priceOracle

  before(async () => {
    const defaultPrice = 10 * 100 // 10 USD
    priceOracle = await deploy(
      'AnytypePriceOracle',
      // 1 letter, 2 letters, 3 letters, 4 letters, 5+ letters
      // per year
      [defaultPrice, defaultPrice, defaultPrice, defaultPrice, defaultPrice],
    )
  })

  it('should return correct prices', async () => {
    const DAY = 24 * 60 * 60
    const ONE_YEAR = 364 * DAY

    const p = await priceOracle.price('newname', 0, ONE_YEAR)
    expect(p.baseCents).to.equal(1000)

    const TWO_YEARS = 365 * DAY
    const p2 = await priceOracle.price('newname', 0, TWO_YEARS)
    expect(p2.baseCents).to.equal(2000)
  })
})
