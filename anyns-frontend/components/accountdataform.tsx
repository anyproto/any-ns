import Link from 'next/link'
import { LoadingButton } from '@mui/lab'
import { useState, useEffect } from 'react'

import Web3 from 'web3'
const web3 = new Web3(Web3.givenProvider)

const nameWrapper = require('../../deployments/sepolia/AnytypeNameWrapper.json')

export default function AccountDataForm({
  // can be null
  account,
  accountScw,
  handleFetchNameInfo,
  handleReverseLoookup,
}) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [anyName, setAnyName] = useState()

  const [contentHash, setContentHash] = useState('')
  const [spaceHash, setSpaceHash] = useState('')
  const [expirationDate, setExpirationDate] = useState('')

  const onOpenNFT = async (e) => {
    e.preventDefault()

    // TODO: this is for Sepolia only, rebuild for other networks
    // goto etherscan
    window.open(
      `https://sepolia.etherscan.io/token/${nameWrapper.address}?a=${accountScw}`,
      '_blank',
    )
  }

  const findNameReverse = async (addr) => {
    const [isErr, data] = await handleReverseLoookup(addr)
    if (isErr) {
      return
    }

    if (isErr) {
      setAnyName('')
      return
    }

    if (!data || !data.name || isErr) {
      setAnyName('')
    } else {
      setAnyName(data.name)
    }
  }

  const getNameInfo = async (nameFull) => {
    const [isErr, data] = await handleFetchNameInfo(nameFull)
    if (isErr) {
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
      // convert unixdate to string
      let date = new Date(data.expirationDate * 1000)
      setExpirationDate(date.toString())
    } else {
      setExpirationDate('')
    }
  }

  useEffect(() => {
    findNameReverse(accountScw)
  }, [accountScw])

  useEffect(() => {
    getNameInfo(anyName)
  }, [anyName])

  return (
    <div>
      <div className="singleDataLine">
        <div className="flex mt-1">
          <p>Current Ethereum address:</p>
        </div>

        <div>
          <input
            id="prompt-address"
            type="text"
            name="address"
            value={account}
            placeholder=""
            className={`block w-full input-with-no-button flex-grow${
              isProcessing ? ' rounded-md' : ' rounded-l-md'
            }`}
            disabled={true}
          />
        </div>
      </div>

      <div className="singleDataLine">
        <div className="flex mt-1">
          <p>Current Ethereum smart contract wallet (SCW):</p>
        </div>

        <div>
          <input
            id="prompt-address-aa"
            type="text"
            name="addressAA"
            value={accountScw}
            placeholder=""
            className={`block w-full input-with-no-button flex-grow${
              isProcessing ? ' rounded-md' : ' rounded-l-md'
            }`}
            disabled={true}
          />
        </div>
      </div>

      <div className="singleDataLine">
        <div className="flex mt-1">
          <p>Any Name:</p>
        </div>

        <div>
          <input
            id="prompt-name"
            type="text"
            name="name"
            value={anyName}
            placeholder=""
            className={`block w-full input-with-no-button flex-grow${
              isProcessing ? ' rounded-md' : ' rounded-l-md'
            }`}
            disabled={true}
          />
        </div>
      </div>

      <div className="singleDataLine">
        <div className="flex mt-1">
          <p>Anytype Identity:</p>
        </div>

        <div>
          <input
            id="prompt-content-hash"
            type="text"
            name="content-hash"
            value={contentHash}
            placeholder=""
            className={`block w-full input-with-no-button flex-grow${
              isProcessing ? ' rounded-md' : ' rounded-l-md'
            }`}
            disabled={true}
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
            placeholder=""
            className={`block w-full input-with-no-button flex-grow${
              isProcessing ? ' rounded-md' : ' rounded-l-md'
            }`}
            disabled={true}
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
            placeholder=""
            className={`block w-full input-with-no-button flex-grow${
              isProcessing ? ' rounded-md' : ' rounded-l-md'
            }`}
            disabled={true}
          />
        </div>
      </div>

      <form onSubmit={onOpenNFT} className="animate-in fade-in duration-700">
        <div className="text-center text-2xl font-bold m-2">
          <LoadingButton
            loading={isProcessing}
            variant="outlined"
            className="text-small my-button"
            type="submit"
            disabled={!anyName || !anyName.length}
          >
            See attached NFT
          </LoadingButton>
        </div>
      </form>

      {/*
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
                !isNameValid(anyName) ||
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
      */}
    </div>
  )
}
