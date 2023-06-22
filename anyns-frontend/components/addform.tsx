import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { LoadingButton } from '@mui/lab'
import useDebounce from '../components/debounce'

import { concatenateWithTLD, removeTLD } from '../lib/anyns'

const tld = process.env.NEXT_PUBLIC_TLD_SUFFIX

import 'bootstrap/dist/css/bootstrap.min.css'

export default function AddForm({
  handlerVerify,
  // if null is specified -> no registration is possible
  // if not null is specified -> admin mode
  handlerRegister,
}) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [isProcessingRegister, setIsProcessingRegister] = useState(false)

  const [domainName, setDomainName] = useState('')
  const debouncedLookup = useDebounce(domainName, 1000)

  const [userAddress, setUserAddress] = useState('')
  const [contentHash, setContentHash] = useState('')
  const [spaceHash, setSpaceHash] = useState('')

  const [isNameAvailable, setNameAvailable] = useState(false)

  const router = useRouter()

  useEffect(() => {
    document.getElementById('prompt-name').focus()

    const isAdminMode = handlerRegister !== null

    // read router query (if passed)
    const { name } = router.query
    if (name) {
      // @ts-ignore
      setDomainName(name)
    }
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
        const isNameAvail = await handlerVerify(checkMe)
        setIsProcessing(false)

        document.getElementById('prompt-name').focus()
        setNameAvailable(isNameAvail)
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

  const onShowInfo = async (e) => {
    e.preventDefault()

    // add .any suffix to the name if it is not there yet
    // @ts-ignore
    if (!domainName.endsWith(tld)) {
      router.push('/names/' + domainName + tld)
      return
    }

    router.push('/names/' + domainName)
  }

  const onGoToAdmin = async (e) => {
    e.preventDefault()

    let regMe = domainName

    // add .any suffix to the name if it is not there yet
    // @ts-ignore
    if (!domainName.endsWith(tld)) {
      regMe = domainName + tld
    }

    if (isNameAvailable) {
      // name available -> pass name to admin page (maybe he want to register it immediately)
      // name not available -> do not pass
      router.push('/admin?name=' + regMe)
    } else {
      router.push('/admin')
    }
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
    await handlerRegister(regMe, userAddress, contentHash, spaceHash)
    setIsProcessingRegister(false)
  }

  return (
    <div>
      <form onSubmit={onShowInfo} className="animate-in fade-in duration-700">
        <div className="flex mt-8">
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
            placeholder="Name"
            className={`block w-full input-with-no-button flex-grow${
              isProcessing ? ' rounded-md' : ' rounded-l-md'
            }`}
            disabled={isProcessing || isProcessingRegister}
            autoFocus
            //pattern="/^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/"
            //required
          />
        </div>

        <div className="text-center text-2xl font-bold m-2">
          <LoadingButton
            loading={isProcessing}
            variant="outlined"
            className="my-button"
            type="submit"
            disabled={
              isProcessing ||
              isProcessingRegister ||
              !debouncedLookup ||
              isNameAvailable
            }
          >
            Show info
          </LoadingButton>
        </div>
      </form>

      {!handlerRegister && (
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
      )}

      {handlerRegister && (
        <form onSubmit={onRegister} className="animate-in fade-in duration-700">
          <div className="flex mt-8">
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
              placeholder="User address"
              className={`block w-full input-with-no-button flex-grow${
                isProcessing ? ' rounded-md' : ' rounded-l-md'
              }`}
              disabled={isProcessing || isProcessingRegister}
              //pattern="/^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/"
              //required
            />
          </div>

          <div className="flex mt-8">
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
              placeholder="Content hash/CID (optional)"
              className={`block w-full input-with-no-button flex-grow${
                isProcessing ? ' rounded-md' : ' rounded-l-md'
              }`}
              disabled={isProcessing || isProcessingRegister}
              //pattern="/^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/"
              //required
            />
          </div>

          <div className="flex mt-8">
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
              placeholder="Space hash/CID (optional)"
              className={`block w-full input-with-no-button flex-grow${
                isProcessing ? ' rounded-md' : ' rounded-l-md'
              }`}
              disabled={isProcessing || isProcessingRegister}
              //pattern="/^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/"
              //required
            />
          </div>

          <div className="text-center text-2xl font-bold m-2">
            <LoadingButton
              loading={isProcessingRegister}
              variant="outlined"
              className="my-button"
              type="submit"
              disabled={
                isProcessing ||
                !isNameValid(domainName) ||
                !isAddressValid(userAddress) ||
                !isNameAvailable
              }
            >
              Register on behalf of user
            </LoadingButton>
          </div>
        </form>
      )}
    </div>
  )
}
