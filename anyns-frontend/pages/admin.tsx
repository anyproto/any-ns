import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useWeb3React } from '@web3-react/core'

import {
  checkNameAvailability,
  removeTLD,
  fetchNameInfo,
  prepareCallData,
} from '../lib/anyns'

import { injected } from '../components/connectors'
import ModalDlg from '../components/modal'
import Layout from '../components/layout'
import DataForm from '../components/dataform'
import ConnectedPanel from '../components/connected_panel'

import Web3 from 'web3'
const ethers = require('ethers')

const resolverJson = require('../deployments/sepolia/AnytypeResolver.json')
const privateRegistrarJson = require('../deployments/sepolia/AnytypeRegistrarControllerPrivate.json')

// Access our wallet inside of our dapp
const web3 = new Web3(Web3.givenProvider)

export default function Admin() {
  const router = useRouter()
  const { active, account, library, connector, activate, deactivate, chainId } =
    useWeb3React()

  const [optionalDomainName, setOptionalDomainName] = useState(
    router.query['name'],
  )

  const [showModal, setShowModal] = useState(false)
  const [modalTitle, setModalTitle] = useState('Name availability')
  const [modalText, setModalText] = useState('Name is available!')

  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const connectWalletOnPageLoad = async () => {
      try {
        await activate(injected)

        //localStorage.setItem('isWalletConnected', true);
      } catch (ex) {
        console.log(ex)
      }
    }
    connectWalletOnPageLoad()
  }, [])

  const onModalClose = () => {
    setShowModal(false)
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

  // the name MUST be concatendted with .any suffix
  const register = async (
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
      privateRegistrarJson.abi,
      privateRegistrarJson.address,
    )

    const DAY = 24 * 60 * 60
    const REGISTRATION_TIME = 365 * DAY

    // randomize secret
    const secret = web3.utils.randomHex(32)
    //const secret = "0x4123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF";

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

  // this is called from the 'DataForm' component
  const handlerRegister = async (
    name,
    registrantAccount,
    contentHash,
    spaceHash,
  ) => {
    // 1 - validate if name has .any suffix
    // @ts-ignore
    if (!name.endsWith('.any')) {
      setModalTitle('Name is invalid!')
      setModalText('Name must end with .any suffix')
      setShowModal(true)
      return
    }

    // 2 - validate if address is valid ETH address
    if (!web3.utils.isAddress(registrantAccount)) {
      setModalTitle('Address is invalid!')
      setModalText('Please provide a valid ETH address')
      setShowModal(true)
      return
    }

    await register(name, registrantAccount, contentHash, spaceHash)
  }

  return (
    <Layout>
      <div>
        {/*
        <DebugPanel 
          id="1" 
          setIsProcessing={setIsProcessing}/>
        */}

        <ConnectedPanel isAdminMode={true} />

        <DataForm
          account={account}
          domainNamePreselected={optionalDomainName}
          handleFetchNameInfo={fetchNameInfo}
          handlerRegister={handlerRegister}
          fetchRealOwnerOfSmartContractWallet={null}
        />

        {/*
          <div className="text-center mx-auto w-full">
            {isProcessing && <CircularProgress />}
          </div>
        */}

        {showModal && (
          <ModalDlg onClose={onModalClose} title={modalTitle}>
            <p>{modalText}</p>
          </ModalDlg>
        )}
      </div>
    </Layout>
  )
}
