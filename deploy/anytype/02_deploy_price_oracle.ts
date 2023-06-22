import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { getNamedAccounts, deployments, network } = hre
  const { deploy } = deployments
  const { deployer } = await getNamedAccounts()

  const defaultPrice = 10 * 100 // 10 USD
  await deploy('AnytypePriceOracle', {
    from: deployer,
    args: [
      // 1 letter, 2 letters, 3 letters, 4 letters, 5+ letters
      // per year
      [defaultPrice, defaultPrice, defaultPrice, defaultPrice, defaultPrice],
    ],
    log: true,
  })
}

func.id = 'anytype-price-oracle'
func.tags = ['AnytypePriceOracle']
func.dependencies = ['registry']

export default func
