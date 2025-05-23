import { useEffect, useState } from 'react'
import { LoadingButton } from '@mui/lab'

import useDebounce from './debounce'

// Access our wallet inside of our dapp
import Web3 from 'web3'
const web3 = new Web3(Web3.givenProvider)

import { concatenateWithTLD, removeTLD } from '../lib/anyns'
const nameWrapper = require('../../deployments/sepolia/AnytypeNameWrapper.json')

const tld = process.env.NEXT_PUBLIC_TLD_SUFFIX

export default function DataForm({
  anyNamePreselected,
  handleFetchNameInfo,
  // if null is specified -> do not show "register" button
  handlerRegister,
  fetchRealOwnerOfSmartContractWallet,
}) {
  const [isProcessing, setIsProcessing] = useState(false)

  const [anyName, setAnyName] = useState('')
  const debouncedLookup = useDebounce(anyName, 1000)

  // if AA was used to register a domain name -> this is the address of the
  // AA smart wallet
  const [userAddressAA, setUserAddressAA] = useState('')
  // this is end-user address
  const [userAddress, setUserAddress] = useState('')

  const [contentHash, setContentHash] = useState('')
  const [spaceHash, setSpaceHash] = useState('')
  const [expirationDate, setExpirationDate] = useState('')

  const [isNameAvailable, setNameAvailable] = useState(false)

  const [isLoading, setIsLoading] = useState(false)

  // Set initial name value and fetch info when anyNamePreselected changes
  useEffect(() => {
    if (anyNamePreselected && !isLoading) {
      setAnyName(anyNamePreselected)
      setIsLoading(true)
      getNameInfo(anyNamePreselected).finally(() => {
        setIsLoading(false)
      })
    }
  }, [anyNamePreselected])

  useEffect(() => {
    const verifyAsync = async () => {
      if (
        debouncedLookup &&
        debouncedLookup !== anyNamePreselected &&
        !isLoading
      ) {
        const checkMe = concatenateWithTLD(debouncedLookup)

        if (!isNameValid(checkMe)) {
          setNameAvailable(true)
          return
        }

        setIsLoading(true)

        let regMe = anyName
        if (!anyName.endsWith(tld)) {
          regMe = anyName + tld
        }

        await getNameInfo(regMe)
        setIsLoading(false)
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

  const isAccountAdmin = (address) => {
    if (!address) {
      return false
    }

    return address === process.env.NEXT_PUBLIC_MAIN_ACCOUNT
  }

  const onOpenNFT = async (e) => {
    e.preventDefault()

    let addr = userAddressAA
    if (!addr || addr.length == 0) {
      addr = userAddress
    }

    // TODO: this is for Sepolia only, rebuild for other networks
    // goto etherscan
    window.open(
      `https://sepolia.etherscan.io/token/${nameWrapper.address}?a=${addr}`,
      '_blank',
    )
  }

  const onRegister = async (e) => {
    e.preventDefault()

    // add .any suffix to the name if it is not there yet
    // @ts-ignore
    let regMe = anyName
    if (!anyName.endsWith(tld)) {
      regMe = anyName + tld
    }

    setIsProcessing(true)
    await handlerRegister(regMe, userAddress, contentHash, spaceHash)
    setIsProcessing(false)
  }

  // if AA was used to deploy a smart contract wallet
  // then name is really owned by this SCW, but owner of this SCW is
  // EOA that was used to sign transaction (in his Metamask probably)
  //
  // EOA -> SCW -> name
  const tryGetAAOwner = async (address) => {
    if (!fetchRealOwnerOfSmartContractWallet) {
      return ''
    }

    return await fetchRealOwnerOfSmartContractWallet(address)
  }

  const getNameInfo = async (nameFull) => {
    if (!nameFull || isLoading) return

    const [isErr, data] = await handleFetchNameInfo(nameFull)
    if (isErr) return

    // Only update state if we have new data
    if (data.contentID) {
      const contentID = web3.utils.hexToUtf8(data.contentID)
      if (contentID !== contentHash) {
        setContentHash(contentID)
      }
    } else if (contentHash !== '') {
      setContentHash('')
    }

    if (data.spaceID) {
      const spaceID = web3.utils.hexToUtf8(data.spaceID)
      if (spaceID !== spaceHash) {
        setSpaceHash(spaceID)
      }
    } else if (spaceHash !== '') {
      setSpaceHash('')
    }

    if (data.owner) {
      setNameAvailable(false)
      if (userAddress !== data.owner) {
        setUserAddress(data.owner)
      }

      const date = new Date(data.expirationDate * 1000)
      if (expirationDate !== date.toString()) {
        setExpirationDate(date.toString())
      }

      const realAaOwner = await tryGetAAOwner(data.owner)

      if (realAaOwner !== '') {
        if (userAddressAA !== data.owner) {
          setUserAddressAA(data.owner)
        }
        if (userAddress !== realAaOwner) {
          setUserAddress(realAaOwner)
        }
      } else if (userAddressAA !== '') {
        setUserAddressAA('')
      }
    } else {
      setNameAvailable(true)
      if (userAddress !== '') setUserAddress('')
      if (expirationDate !== '') setExpirationDate('')
      if (userAddressAA !== '') setUserAddressAA('')
    }
  }

  return (
    <div>
      <form onSubmit={onRegister} className="animate-in fade-in duration-700">
        {/*
        <div className="singleDataLine">
          <div className="flex mt-1">
            <p>Name:</p>
          </div>

          <div>
            <input
              id="prompt-name"
              type="text"
              name="name"
              value={anyName}
              onChange={(e) => setAnyName(e.target.value)}
              placeholder=""
              className={`block w-full input-with-no-button flex-grow${
                isProcessing ? ' rounded-md' : ' rounded-l-md'
              }`}
              disabled={isProcessing}
              autoFocus
            />
          </div>
        </div>
        */}

        <div className="singleDataLine">
          <div className="flex mt-1">
            <p>
              Ethereum smart contract wallet (Account Abstraction, optional):
            </p>
          </div>

          <div>
            <input
              id="prompt-address-aa"
              type="text"
              name="addressAA"
              value={userAddressAA}
              placeholder=""
              className={`block w-full input-with-no-button flex-grow${
                isProcessing ? ' rounded-md' : ' rounded-l-md'
              }`}
              disabled={true}
              required
            />
          </div>
        </div>

        <div className="singleDataLine">
          <div className="flex mt-1">
            <p>Ethereum identity of Owner:</p>
          </div>

          <div>
            <input
              id="prompt-address"
              type="text"
              name="address"
              value={userAddress}
              placeholder=""
              className={`block w-full input-with-no-button flex-grow${
                isProcessing ? ' rounded-md' : ' rounded-l-md'
              }`}
              disabled={true}
              required
            />
          </div>
        </div>

        <div className="singleDataLine">
          <div className="flex mt-1">
            <p>Anytype ID:</p>
          </div>

          <div>
            <input
              id="prompt-content"
              type="text"
              name="content"
              value={contentHash}
              placeholder=""
              className={`block w-full input-with-no-button flex-grow${
                isProcessing ? ' rounded-md' : ' rounded-l-md'
              }`}
              disabled={true}
              required
            />
          </div>
        </div>

        <div className="singleDataLine">
          <div className="flex mt-1">
            <p>Space ID:</p>
          </div>

          <div>
            <input
              id="prompt-space"
              type="text"
              name="space"
              value={spaceHash}
              placeholder=""
              className={`block w-full input-with-no-button flex-grow${
                isProcessing ? ' rounded-md' : ' rounded-l-md'
              }`}
              disabled={true}
              required
            />
          </div>
        </div>

        <div className="singleDataLine">
          <div className="flex mt-1">
            <p>Expiration Date:</p>
          </div>

          <div>
            <input
              id="prompt-expiration"
              type="text"
              name="expiration"
              value={expirationDate}
              placeholder=""
              className={`block w-full input-with-no-button flex-grow${
                isProcessing ? ' rounded-md' : ' rounded-l-md'
              }`}
              disabled={true}
              required
            />
          </div>
        </div>

        <div className="singleDataLine">
          <div className="flex mt-1">
            <p>Status:</p>
          </div>

          <div>
            <input
              id="prompt-status"
              type="text"
              name="status"
              value={isNameAvailable ? 'Available' : 'Registered'}
              placeholder=""
              className={`block w-full input-with-no-button flex-grow${
                isProcessing ? ' rounded-md' : ' rounded-l-md'
              }`}
              disabled={true}
              required
            />
          </div>
        </div>

        <div className="singleDataLine">
          <div className="flex justify-center">
            <LoadingButton
              loading={isProcessing}
              variant="contained"
              className="flex-none px-6 py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 h-[50px] min-w-[120px] flex items-center justify-center"
              onClick={onOpenNFT}
              disabled={isProcessing || !userAddress}
            >
              See Attached NFT
            </LoadingButton>
          </div>
        </div>
      </form>
    </div>
  )
}
