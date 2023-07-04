import Layout from '../components/layout'

export default function ApiPage() {
  return (
    <Layout>
      <div className="mx-auto p-2 text-l">
        <h2>gRPC proto files: </h2>
        <p>
          {' '}
          <a href="https://github.com/anyproto/anyns/blob/master/api-server/proto/anyns_api_server.proto">
            <strong>
              https://github.com/anyproto/anyns/blob/master/api-server/proto/anyns_api_server.proto
            </strong>
          </a>
        </p>
      </div>
    </Layout>
  )
}
