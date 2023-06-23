import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

import { CircularProgress } from '@mui/material'
import ModalDlg from '../../components/modal'
import Layout from '../../components/layout'
import DataForm from '../../components/dataform'

import { fetchNameInfo } from '../../lib/anyns'

import Web3 from 'web3'

// Access our wallet inside of our dapp
const web3 = new Web3(Web3.givenProvider)

export default function NameInfoPage() {
  const [showModal, setShowModal] = useState(false)
  const [modalTitle, setModalTitle] = useState('Name availability')
  const [modalText, setModalText] = useState('Name is available!')

  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)

  const router = useRouter()

  const onModalClose = () => {
    setShowModal(false)
  }

  return (
    <Layout>
      <div>
        <main className="container max-w-[700px] mx-auto p-2">
          <DataForm
            domainNamePreselected={router.query.id}
            handleFetchNameInfo={fetchNameInfo}
            handlerRegister={null}
          />
        </main>

        {
          <div className="text-center mx-auto w-full">
            {isProcessing && <CircularProgress />}
          </div>
        }

        {showModal && (
          <ModalDlg onClose={onModalClose} title={modalTitle}>
            <p>{modalText}</p>
          </ModalDlg>
        )}
      </div>
    </Layout>
  )
}
