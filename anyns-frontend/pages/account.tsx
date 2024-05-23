import { useState, useEffect } from 'react'
import { useWeb3React } from '@web3-react/core'
import { LoadingButton } from '@mui/lab'

import { getScwAsync, fetchNameInfo, handleReverseLoookup } from '../lib/anyns'

import AccountDataForm from '../components/accountdataform'

import { injected } from '../components/connectors'
import Layout from '../components/layout'

export default function Account() {
  const { account, active, activate } = useWeb3React()

  const [accountScw, setAccountScw] = useState('')

  useEffect(() => {
    const connectWalletOnPageLoad = async () => {
      try {
        await activate(injected)
      } catch (ex) {
        console.log(ex)
      }
    }
    connectWalletOnPageLoad()
  }, [])

  useEffect(() => {
    const f = async () => {
      const scw = await getScwAsync(account)
      setAccountScw(scw)
    }

    f()
  }, [account])

  const onConnect = async (e) => {
    e.preventDefault()

    try {
      await activate(injected)
    } catch (ex) {
      console.log(ex)
    }
  }

  return (
    <Layout>
      {!active && (
        <form onSubmit={onConnect} className="animate-in fade-in duration-700">
          <div className="text-center font-bold m-2">
            <p>
              Use Anytype Key (12-word seed phrase) to initialize your MetaMask
            </p>
          </div>

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

      <div>
        <AccountDataForm
          account={account}
          accountScw={accountScw}
          handleFetchNameInfo={fetchNameInfo}
          handleReverseLoookup={handleReverseLoookup}
        />
      </div>
    </Layout>
  )
}
