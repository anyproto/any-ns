import { useEffect, useState } from 'react'
import { LoadingButton } from '@mui/lab'
import { useWeb3React } from '@web3-react/core'

import useDebounce from './debounce'

// Access our wallet inside of our dapp
import Web3 from 'web3'
const web3 = new Web3(Web3.givenProvider)

import { concatenateWithTLD, removeTLD } from '../lib/anyns'

const tld = process.env.NEXT_PUBLIC_TLD_SUFFIX

export default function RegisterForm({
  domainNamePreselected,
  handleFetchNameInfo,
  handlerRegister,
  handlerRegisterAA,
  handleMintUsdcs,
  handleMintUsdcsAA,
}) {
  const { account } = useWeb3React()

  const [isProcessing, setIsProcessing] = useState(false)
  const [isProcessingMint, setIsProcessingMint] = useState(false)
  const [isProcessingRegister, setIsProcessingRegister] = useState(false)

  const [domainName, setDomainName] = useState(domainNamePreselected)
  const debouncedLookup = useDebounce(domainName, 1000)

  const [contentHash, setContentHash] = useState('')
  const [spaceHash, setSpaceHash] = useState('')

  const [isNameAvailable, setNameAvailable] = useState(false)

  useEffect(() => {
    document.getElementById('prompt-name').focus()
  }, [])

  useEffect(() => {
    const verifyAsync = async () => {
      if (debouncedLookup) {
        const checkMe = concatenateWithTLD(debouncedLookup)

        if (!isNameValid(checkMe)) {
          setNameAvailable(true)
          return
        }

        setIsProcessing(true)

        let regMe = domainName
        if (!domainName.endsWith(tld)) {
          regMe = domainName + tld
        }

        await getNameInfo(regMe)
        setIsProcessing(false)

        document.getElementById('prompt-name').focus()
      }
    }

    verifyAsync()
  }, [debouncedLookup])

  const isNameValid = (fullName) => {
    const name = removeTLD(fullName)
    return name.length >= 3
  }

  const isAddressValid = (address) => {
    return address.length === 42 && address.startsWith('0x')
  }

  const onMint = async (e) => {
    e.preventDefault()

    // show alert
    alert('Functionality is currently switched off...')

    /*
    setIsProcessingMint(true)
    await handleMintUsdcs()
    setIsProcessingMint(false)
    */
  }

  const onMintAA = async (e) => {
    e.preventDefault()

    // show alert
    alert('Functionality is currently switched off...')

    /*
    setIsProcessingMint(true)
    await handleMintUsdcsAA()
    setIsProcessingMint(false)
    */
  }

  const onRegister = async (e) => {
    e.preventDefault()

    // add .any suffix to the name if it is not there yet
    // @ts-ignore
    let regMe = domainName
    if (!domainName.endsWith(tld)) {
      regMe = domainName + tld
    }

    setIsProcessingRegister(true)
    await handlerRegister(regMe, account, contentHash, spaceHash)
    setIsProcessingRegister(false)
  }

  const onRegisterWithAA = async (e) => {
    e.preventDefault()

    // add .any suffix to the name if it is not there yet
    // @ts-ignore
    let regMe = domainName
    if (!domainName.endsWith(tld)) {
      regMe = domainName + tld
    }

    setIsProcessingRegister(true)
    await handlerRegisterAA(regMe, account, contentHash, spaceHash)
    setIsProcessingRegister(false)
  }

  const getNameInfo = async (nameFull) => {
    const [isErr, data] = await handleFetchNameInfo(nameFull)
    if (isErr) {
      //setModalTitle('Something went wrong!')
      //setModalText('Can not check your name availability...')
      //setShowModal(true)
      return
    }

    if (data.contentID) {
      // convert hex data to string
      const contentID = web3.utils.hexToUtf8(data.contentID)
      setContentHash(contentID)
    } else {
      setContentHash('')
    }

    if (data.spaceID) {
      const spaceID = web3.utils.hexToUtf8(data.spaceID)
      setSpaceHash(spaceID)
    } else {
      setSpaceHash('')
    }

    if (data.owner) {
      setNameAvailable(false)
    } else {
      setNameAvailable(true)
    }
  }

  return (
    <div className="card space-y-6">
      <div className="space-y-4">
        <div>
          <label
            htmlFor="prompt-name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Domain Name
          </label>
          <div className="relative">
            <input
              id="prompt-name"
              type="text"
              name="name"
              value={domainName}
              onChange={(e) => setDomainName(e.target.value)}
              placeholder="Enter your domain name"
              className="input-base"
              disabled={isProcessing}
              autoFocus
            />
            {isProcessing && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
              </div>
            )}
          </div>
          {!isNameValid(domainName) && domainName && (
            <p className="mt-1 text-sm text-red-600">
              Name must be at least 3 characters long
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="prompt-content-hash"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Anytype Identity of Owner
          </label>
          <input
            id="prompt-content-hash"
            type="text"
            name="content-hash"
            value={contentHash}
            onChange={(e) => setContentHash(e.target.value)}
            placeholder="Enter your Anytype identity"
            className="input-base"
            disabled={isProcessing}
          />
        </div>

        <div>
          <label
            htmlFor="prompt-space-hash"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Space Hash/CID (optional)
          </label>
          <input
            id="prompt-space-hash"
            type="text"
            name="space-hash"
            value={spaceHash}
            onChange={(e) => setSpaceHash(e.target.value)}
            placeholder="Enter space hash or CID"
            className="input-base"
            disabled={isProcessing}
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={onRegister}
          disabled={!isNameAvailable || isProcessingRegister}
          className="button-primary flex-1"
        >
          {isProcessingRegister ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Registering...
            </div>
          ) : (
            'Register Domain'
          )}
        </button>

        <button
          onClick={onRegisterWithAA}
          disabled={!isNameAvailable || isProcessingRegister}
          className="button-secondary flex-1"
        >
          {isProcessingRegister ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600 mr-2"></div>
              Registering...
            </div>
          ) : (
            'Register with AA'
          )}
        </button>
      </div>

      {isNameAvailable && domainName && isNameValid(domainName) && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-green-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">
                Domain name is available!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
