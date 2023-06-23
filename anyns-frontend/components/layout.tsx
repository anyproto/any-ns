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
    <div className={styles.container}>
      <Head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="description" content={siteDescription} />
        <meta name="og:title" content={siteTitle} />
      </Head>

      <header className={styles.header}>
        {home ? (
          <>
            <Image
              priority
              src="/images/profile.jpg"
              className={utilStyles.borderCircle}
              height={144}
              width={144}
              alt={name}
            />
            <h1 className={utilStyles.heading2Xl}>{name}</h1>
          </>
        ) : (
          <>
            <Image
              priority
              src="/images/profile.jpg"
              className={utilStyles.borderCircle}
              height={108}
              width={108}
              alt={name}
            />

            <h2 className={utilStyles.headingLg}>{name}</h2>
          </>
        )}
      </header>

      <p className="text-center text-xl opacity-60 m-6">{anynsDesc}</p>

      <main>{children}</main>

      <div id="modal-root"></div>
    </div>
  )
}
