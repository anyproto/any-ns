// this is applied to all pages
import '../styles/global.css'
import '../styles/layout.module.css'

import { AppProps } from 'next/app'
import { Web3ReactProvider } from '@web3-react/core'

import Web3 from 'web3'

function getLibrary(provider) {
  // using Web3 library
  return new Web3(provider)
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Web3ReactProvider getLibrary={getLibrary}>
      <Component {...pageProps} />
    </Web3ReactProvider>
  )
}
