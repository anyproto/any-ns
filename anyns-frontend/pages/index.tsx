import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { LoadingButton } from '@mui/lab'

import { checkNameAvailability, removeTLD } from '../lib/anyns'

import ModalDlg from '../components/modal'
import Layout from '../components/layout'
import AddForm from '../components/addform'

const tld = process.env.NEXT_PUBLIC_TLD_SUFFIX

const anynsDesc =
  'AnyNS, short for Anytype Naming Service, is a decentralized domain name system built on the EVM-compatible blockchain'

export default function Home() {
  const [showModal, setShowModal] = useState(false)
  const [modalTitle, setModalTitle] = useState('Name availability')
  const [modalText, setModalText] = useState('Name is available!')

  const [domainName, setDomainName] = useState('')

  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)

  const router = useRouter()

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

  const handlerDomainChanged = (name) => {
    setDomainName(name)
  }

  const onGoToAdmin = async (e) => {
    e.preventDefault()

    let regMe = domainName

    // add .any suffix to the name if it is not there yet
    // @ts-ignore
    if (!domainName.endsWith(tld) && domainName.length > 0) {
      regMe = domainName + tld
    }

    // name available -> pass name to admin page (maybe he want to register it immediately)
    // name not available -> do not pass
    //const isPassName = isNameAvailable;

    // always pass name to admin page
    const isPassName = true

    if (isPassName) {
      router.push('/admin?name=' + regMe)
    } else {
      router.push('/admin')
    }
  }

  return (
    <Layout>
      <div>
        <p className="text-center text-xl opacity-60 m-6">{anynsDesc}</p>

        <main className="container max-w-[700px] mx-auto p-2">
          <AddForm
            domainNamePreselected=""
            handlerDomainChanged={handlerDomainChanged}
            handlerVerify={handlerVerify}
          />

          <form
            onSubmit={onGoToAdmin}
            className="animate-in fade-in duration-700"
          >
            <div className="text-center text-2xl font-bold m-2">
              <LoadingButton
                //loading={isProcessing}
                variant="outlined"
                className="my-button"
                type="submit"
                disabled={false}
              >
                Admin panel
              </LoadingButton>
            </div>
          </form>
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
