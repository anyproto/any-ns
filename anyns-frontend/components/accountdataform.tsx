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
  handleDisconnect,
}) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [anyName, setAnyName] = useState('')

  const [contentHash, setContentHash] = useState('')
  const [spaceHash, setSpaceHash] = useState('')
  const [expirationDate, setExpirationDate] = useState('')

  const onOpenNFT = async (e) => {
    e.preventDefault()

    let addr = accountScw
    if (!addr || addr.length == 0) {
      addr = account
    }

    // TODO: this is for Sepolia only, rebuild for other networks
    // goto etherscan
    window.open(
      `https://sepolia.etherscan.io/token/${nameWrapper.address}?a=${addr}`,
      '_blank',
    )
  }

  const onTransferNft = async (e) => {
    e.preventDefault()
  }

  const findNameReverse = async (addr) => {
    if (typeof addr == 'undefined' || !addr || addr.length == 0) {
      setAnyName('Not found')
      return
    }

    const [isErr, data] = await handleReverseLoookup(addr)
    if (isErr) {
      setAnyName('Not found')
      return
    }

    if (!data || !data.name) {
      setAnyName('Not found')
    } else {
      setAnyName(data.name)
    }
  }

  const getNameInfo = async (nameFull) => {
    if (!nameFull || nameFull.length == 0 || nameFull == 'Not found') {
      setContentHash('Not found')
      setSpaceHash('Not found')
      setExpirationDate('Not found')
      return
    }

    const [isErr, data] = await handleFetchNameInfo(nameFull)
    if (isErr) {
      setContentHash('Not found')
      setSpaceHash('Not found')
      setExpirationDate('Not found')
      return
    }

    if (data.contentID) {
      // convert hex data to string
      const contentID = web3.utils.hexToUtf8(data.contentID)
      setContentHash(contentID)
    } else {
      setContentHash('Not found')
    }

    if (data.spaceID) {
      const spaceID = web3.utils.hexToUtf8(data.spaceID)
      setSpaceHash(spaceID)
    } else {
      setSpaceHash('Not found')
    }

    if (data.owner) {
      // convert unixdate to string
      let date = new Date(data.expirationDate * 1000)
      setExpirationDate(date.toString())
    } else {
      setExpirationDate('Not found')
    }
  }

  useEffect(() => {
    findNameReverse(accountScw)
  }, [accountScw])

  useEffect(() => {
    console.log('getNameInfo for anyName: ', anyName)

    getNameInfo(anyName)
  }, [anyName])

  const onDisconnect = async () => {
    setIsProcessing(true)
    try {
      await handleDisconnect()
    } catch (ex) {
      console.log(ex)
    } finally {
      setIsProcessing(false)
    }
  }

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
        <div className="flex justify-center m-2">
          <LoadingButton
            loading={isProcessing}
            variant="contained"
            className="flex-none px-6 py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 h-[44px] min-w-[120px] flex items-center justify-center"
            type="submit"
            disabled={!anyName || !anyName.length || anyName === 'Not found'}
          >
            See attached NFT
          </LoadingButton>
        </div>
      </form>

      {/*
      <form
        onSubmit={onTransferNft}
        className="animate-in fade-in duration-700"
      >
        <div className="text-center text-2xl font-bold m-2">
          <LoadingButton
            loading={isProcessing}
            variant="outlined"
            className="text-small my-button"
            type="submit"
            disabled={true}
          >
            Transfer NFT
          </LoadingButton>

          <span className="mx-2"></span>

          <LoadingButton
            loading={isProcessing}
            variant="outlined"
            className="text-small my-button"
            type="submit"
            disabled={true}
          >
            Transfer to different Any ID
          </LoadingButton>

          <span className="mx-2"></span>

          <LoadingButton
            loading={isProcessing}
            variant="outlined"
            className="text-small my-button"
            type="submit"
            disabled={true}
          >
            Renew
          </LoadingButton>
        </div>
      </form>
      */}
    </div>
  )
}
