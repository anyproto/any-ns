import Layout from '../components/layout'

export default function Help() {
  return (
    <Layout>
      <div className="mx-auto p-2 text-l">
        <h2>Valid name examples: </h2>
        <p>
          {' '}
          <strong>hello.any</strong>
        </p>
        <p>
          {' '}
          <strong>hello.space.any</strong> - can be only registered by{' '}
          <strong>space.any</strong> owner or Anytype
        </p>
      </div>

      <div className="mx-auto p-2 text-l">
        <h2>Invalid name examples:</h2>
        <p>
          {' '}
          <strong>aa.any</strong> - can not register domains with less than 3
          letters
        </p>
        <p>
          {' '}
          <strong>aa</strong> - can not register top-level domain
        </p>
      </div>
    </Layout>
  )
}
