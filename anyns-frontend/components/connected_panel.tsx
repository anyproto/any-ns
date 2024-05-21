import { useWeb3React } from '@web3-react/core'
import { LoadingButton } from '@mui/lab'
import { useEffect, useState } from 'react'

import { injected } from '../components/connectors'

import { createAlchemyAA } from '../lib/alchemy_aa'
import { useMetaMaskAsSmartAccountOwner } from '../lib/mmsigner'

import Web3 from 'web3'
const web3 = new Web3(Web3.givenProvider)

import WarningPanel from '../components/warning_panel'

//const usdcToken = require('../../deployments/sepolia/FakeUSDC.json')
const nameToken = require('../../deployments/sepolia/ERC20NameToken.json')

export default function ConnectedPanel({ isAdminMode }) {
  const { active, account, activate, chainId } = useWeb3React()
  const [amountUsdc, setAmountUsdc] = useState(0.0)

  const [accountAA, setAccountAA] = useState('')
  const [amountUsdcAA, setAmountUsdcAA] = useState(0.0)
  const [amountNameTokensAA, setAmountNameTokensAA] = useState(0.0)

  const metamaskOwner = useMetaMaskAsSmartAccountOwner()

  useEffect(() => {
    const connectWalletOnPageLoad = async () => {
      try {
        // TODO: remove this line
        // somehow page is not refreshed
        // without this delay
        await new Promise((r) => setTimeout(r, 500))

        await activate(injected)
      } catch (ex) {
        console.log(ex)
      }
    }

    console.log('Try to reconnect...')
    connectWalletOnPageLoad()
  }, [])

  /*
  useEffect(() => {
    const loadTokenBalanceAsync = async (account) => {
      try {
        const erc20Contract = new web3.eth.Contract(
          usdcToken.abi,
          usdcToken.address,
        )

        const balance = await erc20Contract.methods.balanceOf(account).call()
        const balanceFloat = parseFloat(balance) / 10 ** 6

        setAmountUsdc(balanceFloat)

        // load AA
        const [x, smartAccountAddress, y] = await createAlchemyAA(metamaskOwner)
        setAccountAA('' + smartAccountAddress)
      } catch (ex) {
        console.log(ex)
      }
    }

    if (account && typeof account != 'undefined') {
      // normal account
      loadTokenBalanceAsync(account)
    }
  }, [account])
  */

  useEffect(() => {
    /*
    const loadTokenBalanceAsync = async (account) => {
      try {
        const erc20Contract = new web3.eth.Contract(
          usdcToken.abi,
          usdcToken.address,
        )

        const balance = await erc20Contract.methods.balanceOf(account).call()
        const balanceFloat = parseFloat(balance) / 10 ** 6

        setAmountUsdcAA(balanceFloat)
      } catch (ex) {
        console.log(ex)
      }
    }
    */

    // name tokens
    const loadTokenBalance2Async = async (account) => {
      try {
        const erc20Contract = new web3.eth.Contract(
          nameToken.abi,
          nameToken.address,
        )

        const balance = await erc20Contract.methods.balanceOf(account).call()

        console.log('Name token address: ', nameToken.address)
        console.log('Current account: ', account)
        console.log('Name token balance: ', balance)

        const balanceFloat = parseFloat(balance) / 10 ** 6

        setAmountNameTokensAA(balanceFloat)
      } catch (ex) {
        console.log(ex)
      }
    }

    if (accountAA && typeof accountAA != 'undefined' && accountAA != '') {
      //loadTokenBalanceAsync(accountAA)
      loadTokenBalance2Async(accountAA)
    }
  }, [accountAA])

  const isAccountAdmin = (address) => {
    return address === process.env.NEXT_PUBLIC_MAIN_ACCOUNT
  }

  const getAccountStr = (account) => {
    const accountLower = account.toLowerCase()
    const accountMain = process.env.NEXT_PUBLIC_MAIN_ACCOUNT.toLowerCase()

    if (accountLower == accountMain || !isAdminMode) {
      return '' + account
    } else {
      return '' + account + ' (Please switch to Admin account)'
    }
    return '' + account
  }

  const getAccountStrAA = () => {
    return accountAA
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

      {/*
      {active && (
        <div>
          <div>
            <span>
              Chain ID: <strong>{convertChainIDToString(chainId)}</strong>
            </span>
          </div>
        </div>
      )}
      */}

      <br></br>
      {active && !isAdminMode && (
        <div>
          <div>
            <span>
              Current account: <strong>{getAccountStr(account)}</strong>
            </span>
          </div>

          <div>
            <span>
              USDC tokens balance: <strong>{amountUsdc}</strong>
            </span>
          </div>
        </div>
      )}
      <br></br>
      {active && !isAdminMode && (
        <div>
          <div>
            <span>
              Smart Contract Wallet (AA): <strong>{getAccountStrAA()}</strong>
            </span>
          </div>

          <div>
            <span>
              USDC tokens balance: <strong>{amountUsdcAA}</strong>
            </span>
          </div>

          <div>
            <span>
              Name tokens balance: <strong>{amountNameTokensAA}</strong>
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
