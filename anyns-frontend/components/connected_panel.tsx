import { useWeb3React } from '@web3-react/core'
import { LoadingButton } from '@mui/lab'
import { useEffect, useState } from 'react'

import { injected } from '../components/connectors'

import Web3 from 'web3'
const web3 = new Web3(Web3.givenProvider)

import WarningPanel from '../components/warning_panel'

const erc20Token = require('../../deployments/sepolia/FakeUSDC.json')

export default function ConnectedPanel({ isAdminMode }) {
  const { active, account, activate, chainId } = useWeb3React()
  const [amountUsdc, setAmountUsdc] = useState(0.0)

  // TODO: somehow it doesn't work when page is refreshed
  useEffect(() => {
    const connectWalletOnPageLoad = async () => {
      try {
        await activate(injected)
      } catch (ex) {
        console.log(ex)
      }
    }

    console.log('Try to reconnect...')

    connectWalletOnPageLoad()
  }, [])

  useEffect(() => {
    const loadTokenBalanceAsync = async (account) => {
      const erc20Contract = new web3.eth.Contract(
        erc20Token.abi,
        erc20Token.address,
      )

      const balance = await erc20Contract.methods.balanceOf(account).call()
      const balanceFloat = parseFloat(balance) / 10 ** 6

      setAmountUsdc(balanceFloat)
    }

    if (account && typeof account != 'undefined') {
      loadTokenBalanceAsync(account)
    }
  }, [account])

  const isAccountAdmin = (address) => {
    return address === process.env.NEXT_PUBLIC_MAIN_ACCOUNT
  }

  const getAccountStr = (account) => {
    // lowercase compare account with 0x61d1eeE7FBF652482DEa98A1Df591C626bA09a60
    const accountLower = account.toLowerCase()
    const accountMain = process.env.NEXT_PUBLIC_MAIN_ACCOUNT.toLowerCase()

    if (accountLower == accountMain || !isAdminMode) {
      return '' + account
    } else {
      return '' + account + ' (Please switch to Admin account)'
    }
    return '' + account
  }

  const convertChainIDToString = (chainId) => {
    switch (chainId) {
      case 1:
        return 'Mainnet (please switch to Sepolia)'

      case 11155111:
        return 'Sepolia'
    }

    return 'Unknown network (please switch to Sepolia)'
  }

  const onConnect = async (e) => {
    e.preventDefault()

    try {
      await activate(injected)
    } catch (ex) {
      console.log(ex)
    }
  }

  return (
    <div>
      {!active && (
        <form onSubmit={onConnect} className="animate-in fade-in duration-700">
          <div className="text-center text-2xl font-bold m-2">
            <LoadingButton
              variant="outlined"
              className="my-button"
              type="submit"
            >
              Connect with Metamask
            </LoadingButton>
          </div>
        </form>
      )}

      {active && isAdminMode && isAccountAdmin(account) && (
        <div>
          <div>
            <span>
              Connected with <strong>{getAccountStr(account)}</strong>
            </span>
          </div>

          <div>
            <span>
              Chain ID: <strong>{convertChainIDToString(chainId)}</strong>
            </span>
          </div>
        </div>
      )}

      {active && !isAdminMode && (
        <div>
          <div>
            <span>
              Connected with <strong>{getAccountStr(account)}</strong>
            </span>
          </div>

          <div>
            <span>
              Fake USDC tokens balance: <strong>{amountUsdc}</strong>
            </span>
          </div>
        </div>
      )}

      {isAdminMode && !isAccountAdmin(account) && (
        <WarningPanel>
          <span>🤔 </span>
          <span>
            Please switch to {process.env.NEXT_PUBLIC_MAIN_ACCOUNT}(Admin)
            account
          </span>
        </WarningPanel>
      )}
    </div>
  )
}
