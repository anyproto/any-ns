import Layout from '../components/layout'

export default function ApiPage() {
  return (
    <Layout>
      <div className="mx-auto p-2 text-l">
        <h2 className="font-bold">Any Naming System rationale</h2>

        <p className="mb-4">
          Incorporating a collaboration feature necessitates providing users
          with the means to connect, search, and share their content
          effectively. To enable efficient content search and referencing, a
          global naming system must be implemented. This naming system would
          allow users to refer to one another using names such as stacy or
          denote their space as stacy_workspace1_public.
        </p>

        <p className="mb-4">
          Given that our project involves the creation of a distributed system,
          the naming system becomes one of the key modules. Consequently, the
          design of this naming system should be permissionlessness (i.e.:
          “unstoppable” or “politically decentralized”), preventing Anytype from
          censoring users' content and names.
        </p>

        <p className="mb-4">
          In our pursuit of establishing a permissionless naming system, we have
          opted to leverage smart contracts built on the EVM chain, compatible
          with the Ethereum Name Service (ENS). This compatibility facilitates
          seamless integration with various existing tools and services. It can
          help others to talk to us.
        </p>

        <p className="mb-4">
          However, interacting with smart contracts places a notable burden on
          end users. They are required to (1) create wallets, (2) fund them, (3)
          authorize each transaction with their signature, and (4) pay for gas.
        </p>

        <p className="mb-4">
          Fortunately, a concept known as "Account Abstraction" presents a
          solution. Through this approach, Anytype can cover the gas fees on
          behalf of the user. Notably, users retain full control over all
          operations and maintain direct communication with the smart contracts.
          Anytype's inability to censor or block user actions is a fundamental
          aspect of this design. Furthermore, users have the flexibility to use
          their Any names outside the Any ecosystem if they choose. They can
          interact directly with the smart contract and cover gas costs
          independently or utilize other Account Abstraction services that
          provide similar functionality.
        </p>

        <p className="mb-4">
          <h2 className="font-bold">Key outcomes</h2>
          <ol>
            <li>
              ✅︎ References and links to users' data are immune to censorship.
            </li>
            <li>
              ✅︎ Users can leverage Anytype's user-friendly Account Abstraction
              service.
            </li>
            <li>
              ✅︎ In the event that Anytype discontinues this service or tries
              to censor, users can seamlessly transition to an alternative
              Account Abstraction service or engage directly with smart
              contracts.
            </li>
          </ol>
        </p>
      </div>

      <hr />
      <div>
        <div className="mx-auto p-2 text-l">
          <h2>any-ns contracts:</h2>
          <p>
            <a href="https://github.com/anyproto/any-ns">
              <strong>https://github.com/anyproto/any-ns</strong>
            </a>
          </p>
        </div>

        <div className="mx-auto p-2 text-l">
          <h2>any-ns-node:</h2>
          <p>
            <a href="https://github.com/anyproto/any-ns-node">
              <strong>https://github.com/anyproto/any-ns-node</strong>
            </a>
          </p>
        </div>

        <div className="mx-auto p-2 text-l">
          <h2>gRPC proto files to access any-ns-node:</h2>
          <p>
            <a href="https://github.com/anyproto/any-sync/tree/main/nameservice/nameserviceproto/protos">
              <strong>
                https://github.com/anyproto/any-sync/tree/main/nameservice/nameserviceproto/protos
              </strong>
            </a>
          </p>
        </div>
      </div>
    </Layout>
  )
}
