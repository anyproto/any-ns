import { useEffect, useState } from 'react'
import { LoadingButton } from '@mui/lab'

import useDebounce from './debounce'

// Access our wallet inside of our dapp
import Web3 from 'web3'
const web3 = new Web3(Web3.givenProvider)

import { concatenateWithTLD, removeTLD } from '../lib/anyns'

const tld = process.env.NEXT_PUBLIC_TLD_SUFFIX

export default function DataForm({
  // can be null
  account,
  domainNamePreselected,
  handleFetchNameInfo,
  // if null is specified -> do not show "register" button
  handlerRegister,
  fetchRealOwnerOfSmartContractWallet,
}) {
  const [isProcessing, setIsProcessing] = useState(false)

  const [domainName, setDomainName] = useState(domainNamePreselected)
  const debouncedLookup = useDebounce(domainName, 1000)

  // if AA was used to register a domain name -> this is the address of the
  // AA smart wallet
  const [userAddressAA, setUserAddressAA] = useState('')
  // this is end-user address
  const [userAddress, setUserAddress] = useState('')

  const [contentHash, setContentHash] = useState('')
  const [spaceHash, setSpaceHash] = useState('')
  const [expirationDate, setExpirationDate] = useState('')

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

  const isAccountAdmin = (address) => {
    if (!address) {
      return false
    }

    return address === process.env.NEXT_PUBLIC_MAIN_ACCOUNT
  }

  const onRegister = async (e) => {
    e.preventDefault()

    // add .any suffix to the name if it is not there yet
    // @ts-ignore
    let regMe = domainName
    if (!domainName.endsWith(tld)) {
      regMe = domainName + tld
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
    const [isErr, data] = await handleFetchNameInfo(nameFull)
    if (isErr) {
      //setModalTitle('Something went wrong!')
      //setModalText('Can not check your name availability...')
      //setShowModal(true)
      return
    }

    console.log('Data: ', data)

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
      setUserAddress(data.owner)
      // convert unixdate to string
      let date = new Date(data.expirationDate * 1000)
      setExpirationDate(date.toString())

      // check if AA was used to register name
      // can be ''
      const realAaOwner = await tryGetAAOwner(data.owner)
      if (realAaOwner != '') {
        // swap them!
        setUserAddressAA(data.owner)
        setUserAddress(realAaOwner)
      } else {
        setUserAddressAA('')
      }
    } else {
      setNameAvailable(true)
      setUserAddress('')
      setExpirationDate('')
      setUserAddressAA('')
    }
  }

  return (
    <div>
      <form onSubmit={onRegister} className="animate-in fade-in duration-700">
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
              onChange={(e) => setDomainName(e.target.value)}
              //onChange={(e) => dispatch({
              //        type: "SELECTED_NAME",
              //        payload: e.target.value
              //    })}
              placeholder=""
              className={`block w-full input-with-no-button flex-grow${
                isProcessing ? ' rounded-md' : ' rounded-l-md'
              }`}
              disabled={isProcessing}
              autoFocus
              //pattern="/^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/"
              //required
            />
          </div>
        </div>

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
              //onChange={(e) => dispatch({
              //        type: "SELECTED_NAME",
              //        payload: e.target.value
              //    })}
              placeholder=""
              className={`block w-full input-with-no-button flex-grow${
                isProcessing ? ' rounded-md' : ' rounded-l-md'
              }`}
              disabled={true}
              //pattern="/^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/"
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
              onChange={(e) => setUserAddress(e.target.value)}
              //onChange={(e) => dispatch({
              //        type: "SELECTED_NAME",
              //        payload: e.target.value
              //    })}
              placeholder=""
              className={`block w-full input-with-no-button flex-grow${
                isProcessing ? ' rounded-md' : ' rounded-l-md'
              }`}
              disabled={isProcessing || !handlerRegister}
              //pattern="/^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/"
              required
            />
          </div>
        </div>

        <div className="singleDataLine">
          <div className="flex mt-1">
            <p>Anytype identity of Owner:</p>
          </div>

          <div>
            <input
              id="prompt-content-hash"
              type="text"
              name="content-hash"
              value={contentHash}
              onChange={(e) => setContentHash(e.target.value)}
              //onChange={(e) => dispatch({
              //        type: "SELECTED_NAME",
              //        payload: e.target.value
              //    })}
              placeholder=""
              className={`block w-full input-with-no-button flex-grow${
                isProcessing ? ' rounded-md' : ' rounded-l-md'
              }`}
              disabled={isProcessing || !handlerRegister}
              //pattern="/^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/"
              required
            />
          </div>
        </div>

        <div className="singleDataLine">
          <div className="flex mt-1">
            <p>Space hash/CID (optional):</p>
          </div>

          <div>
            <input
              id="prompt-space-hash"
              type="text"
              name="space-hash"
              value={spaceHash}
              onChange={(e) => setSpaceHash(e.target.value)}
              //onChange={(e) => dispatch({
              //        type: "SELECTED_NAME",
              //        payload: e.target.value
              //    })}
              placeholder=""
              className={`block w-full input-with-no-button flex-grow${
                isProcessing ? ' rounded-md' : ' rounded-l-md'
              }`}
              disabled={isProcessing || !handlerRegister}
              //pattern="/^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/"
              //required
            />
          </div>
        </div>

        <div className="singleDataLine">
          <div className="flex mt-1">
            <p>Expiration date:</p>
          </div>

          <div>
            <input
              id="prompt-exp-date"
              type="text"
              name="exp-date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              //onChange={(e) => dispatch({
              //        type: "SELECTED_NAME",
              //        payload: e.target.value
              //    })}
              placeholder=""
              className={`block w-full input-with-no-button flex-grow${
                isProcessing ? ' rounded-md' : ' rounded-l-md'
              }`}
              disabled={true}
              //pattern="/^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/"
              //required
            />
          </div>
        </div>

        {handlerRegister && (
          <div>
            <div className="text-center text-2xl font-bold m-2">
              <LoadingButton
                loading={isProcessing}
                variant="outlined"
                className="text-small my-button"
                type="submit"
                disabled={
                  isProcessing ||
                  !isAccountAdmin(account) ||
                  !isNameValid(domainName) ||
                  !isAddressValid(userAddress) ||
                  !isNameAvailable
                }
              >
                Register on behalf of user
              </LoadingButton>
            </div>

            <div className="text-center text-m m-2">
              <p>Domain will be registered for: 364 days</p>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
