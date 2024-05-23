// this is applied to all pages
import '../styles/global.css'
import '../styles/layout.module.css'

import { AppProps } from 'next/app'
import { Web3ReactProvider } from '@web3-react/core'
import { metaMask, hooks } from '../components/connectors'
import type { Connector } from '@web3-react/types'
import type { Web3ReactHooks } from '@web3-react/core'
import { useEffect } from 'react'

const connectors: [Connector, Web3ReactHooks][] = [[metaMask, hooks]]

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Create modal root element if it doesn't exist
    if (!document.getElementById('modal-root')) {
      const modalRoot = document.createElement('div')
      modalRoot.id = 'modal-root'
      document.body.appendChild(modalRoot)
    }
  }, [])

  return (
    <Web3ReactProvider connectors={connectors}>
      <Component {...pageProps} />
    </Web3ReactProvider>
  )
}
