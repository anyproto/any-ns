import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { LoadingButton } from '@mui/lab'
import useDebounce from '../components/debounce'
import {
  concatenateWithTLD,
  removeTLD,
  checkNameAvailability,
  handleReverseLoookup,
} from '../lib/anyns'
import AccountDataForm from '../components/accountdataform'
import { metaMask, hooks } from '../components/connectors'
import { getScwAsync } from '../lib/anyns'
const tld = process.env.NEXT_PUBLIC_TLD_SUFFIX

export default function LandingPage() {
  const router = useRouter()
  const inputRef = useRef(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [isNameAvailable, setNameAvailable] = useState(false)
  const [domainName, setDomainName] = useState('')
  const debouncedLookup = useDebounce(domainName, 1000)
  const { useAccount, useIsActive, useProvider, useChainId } = hooks
  const account = useAccount()
  const active = useIsActive()
  const provider = useProvider()
  const chainId = useChainId()
  const [accountScw, setAccountScw] = useState('')

  useEffect(() => {
    const connectWalletOnPageLoad = async () => {
      try {
        if (metaMask.connectEagerly) {
          await metaMask.connectEagerly()
        }
      } catch (ex) {
        console.log(ex)
      } finally {
        setIsInitializing(false)
      }
    }
    connectWalletOnPageLoad()
  }, [])

  useEffect(() => {
    const f = async () => {
      const scw = await getScwAsync(account)
      setAccountScw(scw)
    }

    f()
  }, [account])

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

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
    return isAvail
  }

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
        setNameAvailable(isNameAvail)
      }
    }

    verifyAsync()
  }, [debouncedLookup])

  const isNameValid = (fullName) => {
    const name = removeTLD(fullName)
    return name.length >= 3
  }

  const onShowInfo = async (e) => {
    e.preventDefault()
    let fullName = domainName

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

  const handleConnect = async () => {
    setIsProcessing(true)
    try {
      await metaMask.activate()
    } catch (ex) {
      console.log(ex)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDisconnect = async () => {
    setIsProcessing(true)
    try {
      await metaMask.resetState()
      window.location.reload()
    } catch (ex) {
      console.log(ex)
    } finally {
      setIsProcessing(false)
    }
  }

  const fetchNameInfo = async () => {
    // Implement the logic to fetch name information
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <a
                href="/"
                className="text-xl font-bold text-gray-900 hover:text-indigo-600"
              >
                any ns
              </a>
            </div>
            <div className="flex items-center space-x-4">
              <nav className="flex space-x-8">
                <a href="/about" className="text-gray-500 hover:text-gray-900">
                  About
                </a>
              </nav>
              <LoadingButton
                loading={isProcessing || isInitializing}
                variant="contained"
                className={`flex-none px-4 py-2 rounded-lg text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 h-[36px] min-w-[120px] flex items-center justify-center ${
                  active
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
                }`}
                onClick={handleConnect}
                disabled={active || isProcessing || isInitializing}
              >
                {active ? 'Connect Wallet' : 'Connect Wallet'}
              </LoadingButton>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center">
          <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
            <span className="block">any naming system,</span>
            <span className="block text-indigo-600">decentralized</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            built for{' '}
            <a
              href="https://anytype.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 hover:text-gray-900"
            >
              Anytype
            </a>
          </p>
        </div>

        {/* Search Section */}
        <div className="mt-12 max-w-lg mx-auto">
          <form
            onSubmit={onShowInfo}
            className="flex flex-col sm:flex-row gap-4"
          >
            <div className="flex-1">
              <input
                ref={inputRef}
                type="text"
                value={domainName}
                onChange={(e) => setDomainName(e.target.value)}
                placeholder=""
                className="block w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                disabled={isProcessing}
              />
              <p className="mt-2 text-sm text-gray-500 pl-4">
                try: anysync.any
              </p>
            </div>
            <LoadingButton
              loading={isProcessing}
              variant="contained"
              className="flex-none px-6 py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 h-[50px] min-w-[120px] flex items-center justify-center"
              type="submit"
              disabled={isProcessing || !debouncedLookup || isNameAvailable}
            >
              Info
            </LoadingButton>
          </form>
        </div>

        {/* Features Section */}
        <div className="mt-24">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="h-12 w-12 rounded-lg bg-indigo-100 flex items-center justify-center">
                <svg
                  className="h-6 w-6 text-indigo-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Permissionless
              </h3>
              <p className="mt-2 text-base text-gray-500">
                Your name belongs only to you. Nobody can censor it.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="h-12 w-12 rounded-lg bg-indigo-100 flex items-center justify-center">
                <svg
                  className="h-6 w-6 text-indigo-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Composable
              </h3>
              <p className="mt-2 text-base text-gray-500">
                Based on Ethereum Name Service (ENS). All ENS-compatible tools
                can be used to manage names.
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="h-12 w-12 rounded-lg bg-indigo-100 flex items-center justify-center">
                <svg
                  className="h-6 w-6 text-indigo-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Trustless
              </h3>
              <p className="mt-2 text-base text-gray-500">
                Control your Any name from Anytype app or directly from MetaMask
                wallet.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-24 text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Create your own piece of the web
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            Import Anytype keyphrase directly to your MetaMask wallet to manage
            your name.
          </p>
          <div className="mt-8">
            {active ? (
              <div className="mt-12 max-w-3xl mx-auto">
                <div className="bg-white rounded-xl shadow-sm p-8">
                  <AccountDataForm
                    account={account}
                    accountScw={accountScw}
                    handleFetchNameInfo={fetchNameInfo}
                    handleReverseLoookup={handleReverseLoookup}
                    handleDisconnect={handleDisconnect}
                  />
                </div>
              </div>
            ) : (
              <div className="flex justify-center">
                <LoadingButton
                  loading={isProcessing || isInitializing}
                  variant="contained"
                  className="flex-none px-6 py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 h-[44px] min-w-[120px] flex items-center justify-center"
                  onClick={handleConnect}
                  disabled={isProcessing || isInitializing}
                >
                  Connect Wallet
                </LoadingButton>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col items-end space-y-4">
            <div className="flex space-x-6">
              <a
                href="https://github.com/anyproto/any-ns"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">GitHub</span>
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
              </a>
              <a
                href="https://x.com/AnytypeLabs"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Twitter</span>
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
              <a
                href="https://t.me/anytype"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-500"
              >
                <span className="sr-only">Telegram</span>
                <svg
                  className="h-6 w-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12a12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.35.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472c-.18 1.898-.962 6.502-1.36 8.627c-.168.9-.499 1.201-.82 1.23c-.696.065-1.225-.46-1.9-.902c-1.056-.693-1.653-1.124-2.678-1.8c-1.185-.78-.417-1.21.258-1.91c.177-.184 3.247-2.977 3.307-3.23c.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345c-.48.33-.913.49-1.302.48c-.428-.008-1.252-.241-1.865-.44c-.752-.245-1.349-.374-1.297-.789c.027-.216.325-.437.893-.663c3.498-1.524 5.83-2.529 6.998-3.014c3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
              </a>
            </div>
            <p className="text-sm text-gray-500">
              Made by Any, a Swiss association
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
