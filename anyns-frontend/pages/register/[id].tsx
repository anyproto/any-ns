import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useWeb3React } from '@web3-react/core'
import { LoadingButton } from '@mui/lab'

import ModalDlg from '../../components/modal'
import Layout from '../../components/layout'
import RegisterForm from '../../components/registerform'
import ConnectedPanel from '../../components/connected_panel'

import {
  fetchNameInfo,
  checkNameAvailability,
  removeTLD,
  prepareCallData,
} from '../../lib/anyns'

const resolverJson = require('../../deployments/sepolia/AnytypeResolver.json')
const erc20TokenJson = require('../../deployments/sepolia/FakeUSDC.json')
const registrarControllerJson = require('../../deployments/sepolia/AnytypeRegistrarController.json')

// Access our wallet inside of our dapp
import Web3 from 'web3'
const web3 = new Web3(Web3.givenProvider)

export default function RegisterPage() {
  const { active, account } = useWeb3React()

  const [isProcessing, setIsProcessing] = useState(false)

  const [showModal, setShowModal] = useState(false)
  const [modalTitle, setModalTitle] = useState('Name availability')
  const [modalText, setModalText] = useState('Name is available!')

  const [error, setError] = useState(null)

  const router = useRouter()

  const onModalClose = () => {
    setShowModal(false)
  }

  const handleMint = async () => {
    const erc20Contract = new web3.eth.Contract(
      erc20TokenJson.abi,
      erc20TokenJson.address,
    )

    try {
      // Get permission to access user funds to pay for gas fees
      const gas = await erc20Contract.methods.mint(account, 1000).estimateGas({
        from: account,
      })

      const tx = await erc20Contract.methods.mint(account, 1000).send({
        from: account,
        gas,
      })

      console.log('Mint Transaction: ')
      console.log(tx)
    } catch (err) {
      console.error('Can not mint!')
      console.error(err)

      setModalTitle('Something went wrong!')
      setModalText('Can not mint tokens...')
      setShowModal(true)
      return
    }

    // 2 - approve
    try {
      // Get permission to access user funds to pay for gas fees
      const approveTo = registrarControllerJson.address
      const gas = await erc20Contract.methods
        .approve(approveTo, 1000)
        .estimateGas({
          from: account,
        })

      const tx = await erc20Contract.methods.approve(approveTo, 1000).send({
        from: account,
        gas,
      })

      console.log('Mint approve transaction: ')
      console.log(tx)
    } catch (err) {
      console.error('Can not approve!')
      console.error(err)

      setModalTitle('Something went wrong!')
      setModalText('Can not approve...')
      setShowModal(true)

      // do not continue
      return
    }

    // update screen
    router.reload()
  }

  const verifyFullName = (nameFull) => {
    // 1 - split domain name and remove last part
    const nameFirstPart = removeTLD(nameFull)

    if (nameFirstPart.length < 3) {
      setModalTitle('Name is too short')
      setModalText('Name must be at least 3 characters long')
      setShowModal(true)
      return false
    }

    // name must have .any suffix
    const tld = process.env.NEXT_PUBLIC_TLD_SUFFIX
    // @ts-ignore
    if (!nameFull.endsWith(tld)) {
      setModalTitle('Name is invalid!')
      setModalText('Name must end with .any suffix')
      setShowModal(true)
      return false
    }

    return true
  }

  const handlerRegisterForUsdcs = async (
    nameFull,
    registrantAccount,
    contentHash,
    spaceID,
  ) => {
    // 0 - check if MM is installed
    if (!active) {
      setModalTitle('Metamask is not connected!')
      setModalText('Please install Metamask and connect it...')
      setShowModal(true)
      return
    }

    // 1 - do a name check first
    if (!verifyFullName(nameFull)) {
      return
    }

    const [isErr, isAvail] = await checkNameAvailability(nameFull)
    if (isErr) {
      setModalTitle('Something went wrong!')
      setModalText('Can not check your name availability...')
      setShowModal(true)
      return
    }

    if (!isAvail) {
      setModalTitle(nameFull + ' is not available!')
      setModalText('Please choose another name...')
      setShowModal(true)
      return
    }

    // get only first part of the name
    // (name should bear no .any suffix)
    const nameFirstPart = removeTLD(nameFull)

    // 2 - now commit
    // Contract address of the deployed smart contract
    const registrarController = new web3.eth.Contract(
      registrarControllerJson.abi,
      registrarControllerJson.address,
    )

    const DAY = 24 * 60 * 60
    const REGISTRATION_TIME = 365 * DAY

    // randomize secret
    const secret = web3.utils.randomHex(32)
    //const secret = "0x7823456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF";

    // TODO: check if this is correct
    const isReverseRecord = true
    const ownerControlledFuses = 0

    // this calldata will set spaceid + contenthash automatically
    const callData = await prepareCallData(contentHash, spaceID, nameFull)
    console.log('Call data: ' + callData)

    // should be only called by owner!
    const commitment = await registrarController.methods
      .makeCommitment(
        nameFirstPart,
        registrantAccount,
        REGISTRATION_TIME,
        secret,
        resolverJson.address,
        callData,
        isReverseRecord,
        ownerControlledFuses,
      )
      .call({
        from: account,
      })

    console.log('Commitment value: ' + commitment)

    try {
      // Get permission to access user funds to pay for gas fees
      const gas = await registrarController.methods
        .commit(commitment)
        .estimateGas({
          from: account,
        })

      setIsProcessing(true)
      const tx = await registrarController.methods.commit(commitment).send({
        from: account,
        gas,
      })

      console.log('Commit Transaction: ')
      console.log(tx)
    } catch (err) {
      console.error('Can not commit!')
      console.error(err)

      setModalTitle('Something went wrong!')
      setModalText('Can not send 1st <commit> transaction...')
      setShowModal(true)

      // do not continue
      setIsProcessing(false)
      return
    }

    // 2 - now register
    console.log("Registering '" + nameFirstPart + "' to " + registrantAccount)

    try {
      // Get permission to access user funds to pay for gas fees
      const gas = await registrarController.methods
        .register(
          nameFirstPart,
          registrantAccount,
          REGISTRATION_TIME,
          secret,
          resolverJson.address,
          callData,
          isReverseRecord,
          ownerControlledFuses,
        )
        .estimateGas({
          from: account,
        })

      console.log('GAS: ' + gas)

      const tx = await registrarController.methods
        .register(
          nameFirstPart,
          registrantAccount,
          REGISTRATION_TIME,
          secret,
          resolverJson.address,
          callData,
          isReverseRecord,
          ownerControlledFuses,
        )
        .send({
          from: account,
          gas,
        })

      console.log('Register Transaction: ')
      console.log(tx)
    } catch (err) {
      console.error('Can not register!')
      console.error(err)

      setModalTitle('Something went wrong!')
      setModalText('Can not send 2nd <register> transaction...')
      setShowModal(true)

      setIsProcessing(false)
      return
    }

    setIsProcessing(false)

    setModalTitle('All is good!')
    setModalText(nameFirstPart + ' is registered!')
    setShowModal(true)

    // update screen
    router.replace(router.asPath)
  }

  return (
    <Layout>
      <div>
        <ConnectedPanel isAdminMode={false} />

        <RegisterForm
          domainNamePreselected={router.query.id}
          handleFetchNameInfo={fetchNameInfo}
          handlerRegister={handlerRegisterForUsdcs}
          handleMintUsdcs={handleMint}
        />

        {showModal && (
          <ModalDlg onClose={onModalClose} title={modalTitle}>
            <p>{modalText}</p>
          </ModalDlg>
        )}
      </div>
    </Layout>
  )
}
