import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

import { CircularProgress } from '@mui/material'

import ModalDlg from '../../components/modal'
import Layout from '../../components/layout'

import 'bootstrap/dist/css/bootstrap.min.css'
import { fetchNameInfo } from '../../lib/anyns'

import Web3 from 'web3'

// Access our wallet inside of our dapp
const web3 = new Web3(Web3.givenProvider)

export default function NameInfoPage() {
  const [showModal, setShowModal] = useState(false)
  const [ownerAddress, setOwnerAddress] = useState('')
  const [contentID, setContentID] = useState('')
  const [spaceID, setSpaceID] = useState('')

  const [modalTitle, setModalTitle] = useState('Name availability')
  const [modalText, setModalText] = useState('Name is available!')

  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)

  const router = useRouter()
  const [domainName, setDomainName] = useState(router.query.id)

  const convertChainIDToString = (chainId) => {
    switch (chainId) {
      case 1:
        return 'Mainnet (please switch to Sepolia)'

      case 11155111:
        return 'Sepolia'
    }

    return 'Unknown network (please switch to Sepolia)'
  }

  const onModalClose = () => {
    setShowModal(false)
  }

  useEffect(() => {
    setDomainName(router.query.id)
  }, [router])

  useEffect(() => {
    const tld = process.env.NEXT_PUBLIC_TLD_SUFFIX

    if (!domainName) {
      return
    }

    // add .any suffix to the name if it is not there yet
    // @ts-ignore
    if (!domainName.endsWith(tld)) {
      setDomainName(domainName + tld)
      getNameInfo(domainName + tld)
      return
    }

    getNameInfo(domainName)
  }, [domainName])

  const getNameInfo = async (nameFull) => {
    const [isErr, data] = await fetchNameInfo(nameFull)
    if (isErr) {
      setModalTitle('Something went wrong!')
      setModalText('Can not check your name availability...')
      setShowModal(true)
      return
    }

    console.log('Data: ', data)

    if (data.contentID) {
      // convert hex data to string
      const contentID = web3.utils.hexToUtf8(data.contentID)
      setContentID(contentID)
    }

    if (data.spaceID) {
      const spaceID = web3.utils.hexToUtf8(data.spaceID)
      setSpaceID(spaceID)
    }

    if (!data.owner) {
      setOwnerAddress('Owner not found. Name is not registered yet...')
    } else {
      setOwnerAddress(data.owner)
    }
  }

  return (
    <Layout>
      <div>
        <div className="singleDataLine">
          <div className="flex mt-1">
            <p>Name:</p>
          </div>

          <div>
            <input
              id="prompt-name"
              type="text"
              name="name"
              value={domainName}
              readOnly
              placeholder=""
              className={`block w-full input-with-no-button flex-grow${
                isProcessing ? ' rounded-md' : ' rounded-l-md'
              }`}
            />
          </div>
        </div>

        <div className="singleDataLine">
          <div className="flex mt-1">
            <p>Owner:</p>
          </div>

          <div>
            <input
              id="prompt-owner"
              type="text"
              name="name"
              value={ownerAddress}
              readOnly
              placeholder=""
              className={`block w-full input-with-no-button flex-grow${
                isProcessing ? ' rounded-md' : ' rounded-l-md'
              }`}
            />
          </div>
        </div>

        <div className="singleDataLine">
          <div className="flex mt-1">
            <p>Content hash/ID:</p>
          </div>

          <div>
            <input
              id="prompt-content-id"
              type="text"
              name="name"
              value={contentID}
              readOnly
              placeholder=""
              className={`block w-full input-with-no-button flex-grow${
                isProcessing ? ' rounded-md' : ' rounded-l-md'
              }`}
            />
          </div>
        </div>

        <div className="singleDataLine">
          <div className="flex mt-1">
            <p>Space hash/ID:</p>
          </div>

          <div>
            <input
              id="prompt-space-id"
              type="text"
              name="name"
              value={spaceID}
              readOnly
              placeholder=""
              className={`block w-full input-with-no-button flex-grow${
                isProcessing ? ' rounded-md' : ' rounded-l-md'
              }`}
            />
          </div>
        </div>

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
