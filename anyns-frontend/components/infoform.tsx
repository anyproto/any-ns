import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { LoadingButton } from '@mui/lab'
import useDebounce from './debounce'

import { concatenateWithTLD, removeTLD } from '../lib/anyns'

const tld = process.env.NEXT_PUBLIC_TLD_SUFFIX

export default function InfoForm({
  anyNamePreselected,
  handlerDomainChanged,
  handlerVerify,
}) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [isNameAvailable, setNameAvailable] = useState(false)
  const [domainName, setDomainName] = useState(anyNamePreselected)
  const debouncedLookup = useDebounce(domainName, 1000)

  const router = useRouter()

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

  const onDomainChanged = (name) => {
    setDomainName(name)
    handlerDomainChanged(name)
  }

  const onShowInfo = async (e) => {
    e.preventDefault()

    let fullName = domainName

    // add .any suffix to the name if it is not there yet
    // @ts-ignore
    if (!domainName.endsWith(tld)) {
      fullName = domainName + tld
    }

    const isRegister = isNameAvailable
    if (isRegister) {
      router.push('/register/' + fullName)
    } else {
      router.push('/info/' + fullName)
    }
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
            onChange={(e) => onDomainChanged(e.target.value)}
            placeholder="Name"
            className="block w-full input-with-no-button flex-grow"
            disabled={isProcessing}
            autoFocus
          />

          <LoadingButton
            loading={isProcessing}
            variant="outlined"
            className="text-small inline-block p-3 flex-none my-button flex items-center justify-center h-[42px] min-w-[80px]"
            type="submit"
            disabled={isProcessing || !debouncedLookup || isNameAvailable}
          >
            {isProcessing ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              'Info'
            )}
          </LoadingButton>
        </div>
      </form>
    </div>
  )
}
