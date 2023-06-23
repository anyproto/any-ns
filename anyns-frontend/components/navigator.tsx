import Link from 'next/link'
import { useRouter } from 'next/router'

const tld = process.env.NEXT_PUBLIC_TLD_SUFFIX

export default function Navigator({ domainName }) {
  const router = useRouter()

  const onGoToAdmin = async (e) => {
    e.preventDefault()

    let regMe = domainName

    // add .any suffix to the name if it is not there yet
    // @ts-ignore
    if (!domainName.endsWith(tld) && domainName.length > 0) {
      regMe = domainName + tld
    }

    // name available -> pass name to admin page (maybe he want to register it immediately)
    // name not available -> do not pass
    //const isPassName = isNameAvailable;

    // always pass name to admin page
    const isPassName = true

    if (isPassName) {
      router.push('/admin?name=' + regMe)
    } else {
      router.push('/admin')
    }
  }

  return (
    <div className="text-center mt-16 text-l">
      <button onClick={onGoToAdmin}>Admin</button>

      <span> | </span>

      <Link href="/help">
        <button>Help</button>
      </Link>
    </div>
  )
}
