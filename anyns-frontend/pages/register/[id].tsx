import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

import { CircularProgress } from '@mui/material'
import ModalDlg from '../../components/modal'
import Layout from '../../components/layout'
import RegisterForm from '../../components/registerform'
import ConnectedPanel from '../../components/connected_panel'

import { fetchNameInfo } from '../../lib/anyns'

export default function RegisterPage() {
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
        <ConnectedPanel isAdminMode={false} />

        <RegisterForm
          domainNamePreselected={router.query.id}
          handleFetchNameInfo={fetchNameInfo}
          handlerRegister={null}
        />

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
