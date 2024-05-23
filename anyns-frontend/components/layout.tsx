import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/layout.module.css'
import utilStyles from '../styles/utils.module.css'

const name = 'AnyNS'
export const siteTitle = 'Anytype Naming Service'
export const siteDescription = 'Anytype Naming Service frontend'

const anynsDesc =
  'AnyNS, short for Anytype Naming Service, is a decentralized domain name system built on the EVM-compatible blockchain'

export default function Layout({
  children,
  home,
}: {
  children: React.ReactNode
  home?: boolean
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="description" content={siteDescription} />
        <meta name="og:title" content={siteTitle} />
        <link rel="stylesheet" href="https://rsms.me/inter/inter.css" />
      </Head>

      <header className="py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center text-center space-y-3">
            <div className="relative">
              <Image
                priority
                src="/images/profile.jpg"
                className="rounded-full object-cover"
                height={96}
                width={96}
                alt={name}
              />
            </div>
            {home ? (
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
                {name}
              </h1>
            ) : (
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {name}
              </h2>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-base text-gray-600 mb-8">{anynsDesc}</p>

        <main className="space-y-6">{children}</main>
      </div>

      <div id="modal-root"></div>
    </div>
  )
}
