import { useState, useEffect } from 'react'

import { checkNameAvailability, removeTLD } from '../lib/anyns'

import ModalDlg from '../components/modal'
import Layout from '../components/layout'
import AddForm from '../components/addform'

const anynsDesc =
  'AnyNS, short for Anytype Naming Service, is a decentralized domain name system built on the EVM-compatible blockchain'

export default function Home() {
  const [showModal, setShowModal] = useState(false)
  const [modalTitle, setModalTitle] = useState('Name availability')
  const [modalText, setModalText] = useState('Name is available!')

  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)

  const onModalClose = () => {
    setShowModal(false)
  }

  // check if name is available, just like handlerCheck, but don't show modal
  // returns 'true' if name is available
  // returns 'false' if name is not available
  const handlerVerify = async (nameFull) => {
    const name = removeTLD(nameFull)
    if (!name || name.length < 3) {
      return false
    }

    const [isErr, isAvail] = await checkNameAvailability(nameFull)

    if (isErr) {
      console.log('Can not check name availability!')
      return false
    }

    // name is available
    return isAvail
  }

  return (
    <Layout>
      <div>
        <p className="text-center text-xl opacity-60 m-6">{anynsDesc}</p>

        <main className="container max-w-[700px] mx-auto p-2">
          <AddForm handlerVerify={handlerVerify} handlerRegister={null} />
        </main>

        {showModal && (
          <ModalDlg onClose={onModalClose} title={modalTitle}>
            <p>{modalText}</p>
          </ModalDlg>
        )}
      </div>
    </Layout>
  )
}
