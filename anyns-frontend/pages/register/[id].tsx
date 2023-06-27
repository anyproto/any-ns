import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useWeb3React } from '@web3-react/core'
import { CircularProgress } from '@mui/material'

import ModalDlg from '../../components/modal'
import Layout from '../../components/layout'
import RegisterForm from '../../components/registerform'
import ConnectedPanel from '../../components/connected_panel'

import { fetchNameInfo } from '../../lib/anyns'

const erc20Token = require('../../deployments/sepolia/FakeUSDC.json')

// Access our wallet inside of our dapp
import Web3 from 'web3'
const web3 = new Web3(Web3.givenProvider)

export default function RegisterPage() {
  const [showModal, setShowModal] = useState(false)
  const [modalTitle, setModalTitle] = useState('Name availability')
  const [modalText, setModalText] = useState('Name is available!')

  const [isProcessingMint, setIsProcessingMint] = useState(false)
  const [error, setError] = useState(null)

  const { account } = useWeb3React()

  const router = useRouter()

  const onModalClose = () => {
    setShowModal(false)
  }

  const handleMint = async (e) => {
    e.preventDefault()

    const erc20Contract = new web3.eth.Contract(
      erc20Token.abi,
      erc20Token.address,
    )

    try {
      // Get permission to access user funds to pay for gas fees
      const gas = await erc20Contract.methods.mint(account, 10).estimateGas({
        from: account,
      })

      setIsProcessingMint(true)
      const tx = await erc20Contract.methods.mint(account, 10).send({
        from: account,
        gas,
      })

      console.log('Mint Transaction: ')
      console.log(tx)
    } catch (err) {
      console.error('Can not mint!')
      console.error(err)

      setModalTitle('Something went wrong!')
      setModalText('Can not mint tokens...')
      setShowModal(true)

      // do not continue
      setIsProcessingMint(false)
      return
    }

    setIsProcessingMint(false)

    // update screen
    router.reload()
  }

  return (
    <Layout>
      <div>
        <ConnectedPanel isAdminMode={false} />

        <RegisterForm
          domainNamePreselected={router.query.id}
          handleFetchNameInfo={fetchNameInfo}
          handlerRegister={null}
          handleMintUsdcs={handleMint}
          isProcessingMint={isProcessingMint}
        />

        {showModal && (
          <ModalDlg onClose={onModalClose} title={modalTitle}>
            <p>{modalText}</p>
          </ModalDlg>
        )}
      </div>
    </Layout>
  )
}
