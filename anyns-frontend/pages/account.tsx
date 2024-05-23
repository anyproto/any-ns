import { useState, useEffect } from 'react'
import { useWeb3React } from '@web3-react/core'

import { getScwAsync, fetchNameInfo, handleReverseLoookup } from '../lib/anyns'

import AccountDataForm from '../components/accountdataform'

import { injected } from '../components/connectors'
import Layout from '../components/layout'

export default function Account() {
  const { account, activate } = useWeb3React()

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

  return (
    <Layout>
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
