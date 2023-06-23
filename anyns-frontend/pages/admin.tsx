import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { LoadingButton } from '@mui/lab'
import { useWeb3React } from '@web3-react/core'

import {
  checkNameAvailability,
  removeTLD,
  namehash,
  fetchNameInfo,
} from '../lib/anyns'

import { injected } from '../components/connectors'
import ModalDlg from '../components/modal'
import Layout from '../components/layout'
import DataForm from '../components/dataform'

import Web3 from 'web3'
const ethers = require('ethers')

const resolverAbi = require('../abi/AnytypeResolver.json')
const privateRegistrarAbi = require('../abi/AnytypeRegistrarControllerPrivate.json')

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

  const convertChainIDToString = (chainId) => {
    switch (chainId) {
      case 1:
        return 'Mainnet (please switch to Sepolia)'

      case 11155111:
        return 'Sepolia'
    }

    return 'Unknown network (please switch to Sepolia)'
  }

  useEffect(() => {
    const connectWalletOnPageLoad = async () => {
      //if (localStorage?.getItem('isWalletConnected') === 'true') {
      try {
        await activate(injected)

        //localStorage.setItem('isWalletConnected', true);
      } catch (ex) {
        console.log(ex)
      }
      //}
    }
    connectWalletOnPageLoad()
  }, [])

  const onModalClose = () => {
    setShowModal(false)
  }

  const onConnect = async (e) => {
    e.preventDefault()

    try {
      await activate(injected)
    } catch (ex) {
      console.log(ex)
    }
  }

  /*
  const onDebug = async (e) => {
    e.preventDefault()

    const fullName = 'test8.any'

    // convert string to hex
    const contentHash = web3.utils.utf8ToHex(
      'QmR6EJCK4z8wJbqWGMbTA33wkvVLeVMkzwhmfe3mKCgYXu',
    )
    console.log('Setting content hash: ' + contentHash)

    //const contentHash = "0x0000000000000000000000000000000000000000000000000000000000000001";
    //const contentHash = "bafybeibs62gqtignuckfqlcr7lhhihgzh2vorxtmc5afm6uxh4zdcmuwuu";

    try {
      const contractAddress = process.env.NEXT_PUBLIC_RESOLVER_CONTRACT_ADDRESS
      const resolver = new web3.eth.Contract(resolverAbi.abi, contractAddress)

      const node = namehash(fullName)
      const gas = await resolver.methods
        .setContenthash(node, contentHash)
        .estimateGas({
          from: account,
        })

      setIsProcessing(true)
      const tx = await resolver.methods.setContenthash(node, contentHash).send({
        from: account,
        gas,
      })

      console.log('Transaction: ')
      console.log(tx)
    } catch (err) {
      console.error('Can not set content hash!')
      console.error(err)

      setModalTitle('Something went wrong!')
      setModalText('Can not set content hash...')
      setShowModal(true)

      setIsProcessing(false)
      return
    }

    setIsProcessing(false)
  }
  */

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

  const prepareCallData = async (contentHash, spaceID, nameFull) => {
    const contractAddress = process.env.NEXT_PUBLIC_RESOLVER_CONTRACT_ADDRESS

    // instantiate the contract using Ethers library
    const wallet = null
    const resolver = new ethers.Contract(
      contractAddress,
      resolverAbi.abi,
      wallet,
    )

    const node = namehash(nameFull)
    const callData = []

    if (spaceID) {
      const spaceIDHex = web3.utils.utf8ToHex(spaceID)
      console.log('Adding space ID: ' + spaceIDHex)

      const data = resolver.interface.encodeFunctionData(
        'setSpaceId(bytes32,bytes)',
        [node, spaceIDHex],
      )
      callData.push(data)
    }

    if (contentHash) {
      const contentHashHex = web3.utils.utf8ToHex(contentHash)
      console.log('Adding content hash: ' + contentHashHex)

      const data = resolver.interface.encodeFunctionData('setContenthash', [
        node,
        contentHashHex,
      ])
      callData.push(data)
    }

    return callData
  }

  const getAccountStr = (account) => {
    // lowercase compare account with 0x61d1eeE7FBF652482DEa98A1Df591C626bA09a60
    const accountLower = account.toLowerCase()
    const accountMain = process.env.NEXT_PUBLIC_MAIN_ACCOUNT.toLowerCase()

    if (accountLower == accountMain) {
      return '' + account + ' (main Anytype account)'
    }
    return '' + account
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

    // 2 - get only first part of the name
    // (name should bear no .any suffix)
    const nameFirstPart = removeTLD(nameFull)

    // 1 - now commit
    // Contract address of the deployed smart contract
    const contractAddress = process.env.NEXT_PUBLIC_REGISTRAR_CONTRACT_ADDRESS
    const registrarController = new web3.eth.Contract(
      privateRegistrarAbi.abi,
      contractAddress,
    )

    const DAY = 24 * 60 * 60
    const REGISTRATION_TIME = 365 * DAY

    // randomize secret
    const secret = web3.utils.randomHex(32)
    //const secret = "0x4123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF";

    const resolverAddress = process.env.NEXT_PUBLIC_RESOLVER_CONTRACT_ADDRESS
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
        resolverAddress,
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

      console.log('Transaction: ')
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
    try {
      // Get permission to access user funds to pay for gas fees
      const gas = await registrarController.methods
        .register(
          nameFirstPart,
          registrantAccount,
          REGISTRATION_TIME,
          secret,
          resolverAddress,
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
          resolverAddress,
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
        <form onSubmit={onDebug} className="animate-in fade-in duration-700">
          <div className="text-center text-2xl font-bold m-2">
            <LoadingButton
              //loading={isProcessing}
              variant="outlined"
              className="my-button"
              type="submit"
              disabled={isProcessing || !active}
            >
              Debug: set a content ID
            </LoadingButton>
          </div>
        </form>
        */}

        {!active && (
          <form
            onSubmit={onConnect}
            className="animate-in fade-in duration-700"
          >
            <div className="text-center text-2xl font-bold m-2">
              <LoadingButton
                //loading={isProcessing}
                variant="outlined"
                className="my-button"
                type="submit"
                disabled={isProcessing || active}
              >
                Connect with Metamask
              </LoadingButton>
            </div>
          </form>
        )}

        {active ? (
          <div>
            <div>
              <span>
                Connected with <strong>{getAccountStr(account)}</strong>
              </span>
            </div>

            <div>
              <span>
                Chain ID: <strong>{convertChainIDToString(chainId)}</strong>
              </span>
            </div>
          </div>
        ) : (
          <div>
            <span></span>
          </div>
        )}

        <DataForm
          domainNamePreselected={optionalDomainName}
          handleFetchNameInfo={fetchNameInfo}
          handlerRegister={handlerRegister}
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
