import { useEffect, useState } from 'react'
import { LoadingButton } from '@mui/lab'

import useDebounce from './debounce'

// Access our wallet inside of our dapp
import Web3 from 'web3'
const web3 = new Web3(Web3.givenProvider)

const tld = process.env.NEXT_PUBLIC_TLD_SUFFIX

export default function DataFormReverse({ handleReverseLoookup }) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [userAddress, setUserAddress] = useState('')
  const debouncedLookup = useDebounce(userAddress, 1000)

  const [domainName, setDomainName] = useState('')

  const isAddressValid = (address) => {
    return address.length === 42 && address.startsWith('0x')
  }

  const findNameReverse = async (addr) => {
    const [isErr, data] = await handleReverseLoookup(addr)
    if (isErr) {
      //setModalTitle('Something went wrong!')
      //setModalText('Can not reverse resolve your name...')
      //setShowModal(true)
      return
    }

    if (isErr) {
      setDomainName('Can not find name')
      return
    }

    if (!data || !data.name || isErr) {
      setDomainName('No name found')
    } else {
      setDomainName(data.name)
    }
  }

  useEffect(() => {
    document.getElementById('prompt-address').focus()
  }, [])

  useEffect(() => {
    const verifyAsync = async () => {
      if (debouncedLookup) {
        const checkMe = '' + debouncedLookup

        if (!isAddressValid(checkMe)) {
          setDomainName('')
          return
        }

        setIsProcessing(true)
        await findNameReverse(checkMe)
        setIsProcessing(false)

        document.getElementById('prompt-address').focus()
      }
    }

    verifyAsync()
  }, [debouncedLookup])

  return (
    <div>
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
            placeholder=""
            className={`block w-full input-with-no-button flex-grow${
              isProcessing ? ' rounded-md' : ' rounded-l-md'
            }`}
            disabled={isProcessing}
            required
          />
        </div>
      </div>

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
            className={`block w-full input-with-no-button flex-grow${
              isProcessing ? ' rounded-md' : ' rounded-l-md'
            }`}
            disabled={true}
          />
        </div>
      </div>
    </div>
  )
}
