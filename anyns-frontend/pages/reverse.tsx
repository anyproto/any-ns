import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

import { CircularProgress } from '@mui/material'
import ModalDlg from '../components/modal'
import Layout from '../components/layout'
import DataFormReverse from '../components/dataform_reverse'

import { handleReverseLoookup } from '../lib/anyns'

export default function ReversePage() {
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
          <DataFormReverse handleReverseLoookup={handleReverseLoookup} />
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
