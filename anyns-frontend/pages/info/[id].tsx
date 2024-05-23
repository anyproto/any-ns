import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

import { CircularProgress } from '@mui/material'
import DataForm from '../../components/dataform'

import { fetchNameInfo } from '../../lib/anyns'
import { fetchRealOwnerOfSmartContractWallet } from '../../lib/anyns'

export default function NameInfoPage() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [domainInfo, setDomainInfo] = useState(null)

  const router = useRouter()
  const { id } = router.query

  // Add initial load effect
  useEffect(() => {
    if (id) {
      setIsProcessing(true)
      fetchNameInfo(id)
        .then(([isErr, data]) => {
          if (!isErr && data) {
            setDomainInfo(data)
          }
        })
        .catch((err) => {
          setError(err)
        })
        .finally(() => {
          setIsProcessing(false)
        })
    }
  }, [id])

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
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
            <span className="block">Domain Information</span>
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            View details about your domain name
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <DataForm
              account={null}
              domainNamePreselected={id}
              handleFetchNameInfo={fetchNameInfo}
              handlerRegister={null}
              fetchRealOwnerOfSmartContractWallet={
                fetchRealOwnerOfSmartContractWallet
              }
            />
          </div>

          {isProcessing && (
            <div className="text-center mt-8">
              <CircularProgress />
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-50 rounded-lg">
              <p className="text-red-600">
                Error loading domain information: {error.message}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
