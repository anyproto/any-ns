import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useWeb3React } from '@web3-react/core'

import ModalDlg from '../../components/modal'
import Layout from '../../components/layout'
import RegisterForm from '../../components/registerform'
import ConnectedPanel from '../../components/connected_panel'

import { encodeFunctionData } from 'viem'

import { createAlchemyAA } from '../../lib/alchemy_aa'
import { useMetaMaskAsSmartAccountOwner } from '../../lib/mmsigner'

import {
  fetchNameInfo,
  checkNameAvailability,
  removeTLD,
  prepareCallData,
} from '../../lib/anyns'

const resolverJson = require('../../deployments/sepolia/AnytypeResolver.json')
const erc20usdcToken = require('../../deployments/sepolia/FakeUSDC.json')
const registrarControllerJson = require('../../deployments/sepolia/AnytypeRegistrarController.json')

// Access our wallet inside of our dapp
import Web3 from 'web3'
import { rpc } from 'viem/utils'
import { create } from 'domain'
const web3 = new Web3(Web3.givenProvider)

export default function RegisterPage() {
  const { active, account, library } = useWeb3React()

  const [isProcessing, setIsProcessing] = useState(false)

  const [showModal, setShowModal] = useState(false)
  const [modalTitle, setModalTitle] = useState('Name availability')
  const [modalText, setModalText] = useState('Name is available!')

  const [error, setError] = useState(null)

  const metamaskOwner = useMetaMaskAsSmartAccountOwner()

  const router = useRouter()

  const onModalClose = () => {
    setShowModal(false)
  }

  const handleMint = async () => {
    const erc20Contract = new web3.eth.Contract(
      erc20usdcToken.abi,
      erc20usdcToken.address,
    )

    const mintUsd = 100

    try {
      // Get permission to access user funds to pay for gas fees
      const gas = await erc20Contract.methods
        .mint(account, mintUsd)
        .estimateGas({
          from: account,
        })

      const tx = await erc20Contract.methods.mint(account, mintUsd).send({
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
        .approve(approveTo, mintUsd * 1000000)
        .estimateGas({
          from: account,
        })

      const tx = await erc20Contract.methods
        .approve(approveTo, mintUsd * 1000000)
        .send({
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
    //router.reload()
  }

  // mint Fake USDC tokens
  const handleMintAA = async () => {
    const erc20Contract = new web3.eth.Contract(
      erc20usdcToken.abi,
      erc20usdcToken.address,
    )

    const mintUsd = 100

    try {
      const [smartAccountSigner, smartAccountAddress, _] =
        await createAlchemyAA(metamaskOwner)

      // to controller
      const mintMe = smartAccountAddress
      const approveTo = registrarControllerJson.address

      const txs = [
        // mint
        {
          from: smartAccountAddress,
          to: erc20usdcToken.address,
          data: encodeFunctionData({
            abi: erc20usdcToken.abi,
            functionName: 'mint',
            args: [mintMe, mintUsd * 1000000],
          }),
        },

        // can also use approve if calling from the same account
        {
          from: smartAccountAddress,
          to: erc20usdcToken.address,
          data: encodeFunctionData({
            abi: erc20usdcToken.abi,
            functionName: 'approveFor',
            args: [mintMe, approveTo, mintUsd * 1000000],
          }),
        },
      ]

      // @ts-ignore
      const res = await smartAccountSigner.sendTransactions(txs)

      console.log('Mint+Approve Transactions: ')
      console.log(res)

      // TODO: handle errors
    } catch (err) {
      console.error('Can not mint + approve!')
      console.error(err)

      setModalTitle('Something went wrong!')
      setModalText('Can not mint  + approve tokens...')
      setShowModal(true)
      return
    }

    // update screen
    //router.reload()
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
    const REGISTRATION_TIME = 364 * DAY

    // randomize secret
    const secret = web3.utils.randomHex(32)
    //const secret = "0x4323456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF";

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

  const handlerRegisterForUsdcsAA = async (
    nameFull,
    _,
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

    const [smartAccountSigner, smartAccountAddress, erc4337client] =
      await createAlchemyAA(metamaskOwner)
    const registrantAccount = smartAccountAddress

    // 2 - commit
    // Contract address of the deployed smart contract
    const registrarController = new web3.eth.Contract(
      registrarControllerJson.abi,
      registrarControllerJson.address,
    )

    // 1 year
    const DAY = 24 * 60 * 60
    const REGISTRATION_TIME = 364 * DAY

    // this secret should be same between calls to "commit" and "register"
    const secret = web3.utils.randomHex(32)
    //const secret = "0x5954445583ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789A11119";

    // this option means we want to register "reverse" record
    // i.e. "0x1234...5678.addr.reverse" name that will resolve using name() method
    // into a domain name like "hello.any"
    const isReverseRecord = true
    const ownerControlledFuses = 0

    // this calldata will set spaceid + contenthash automatically
    const callData = await prepareCallData(contentHash, spaceID, nameFull)

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
        from: smartAccountAddress,
      })

    console.log('Commitment value: ' + commitment)

    console.log("Commiting '" + nameFirstPart + "' to " + registrantAccount)

    //const maxPrioirity: BigNumberish = await erc4337client.getMaxPriorityFeePerGas()
    //console.log("Max priority fee: ", maxPrioirity)

    const txs = [
      // 1 - commit
      {
        from: smartAccountAddress,
        to: registrarControllerJson.address,
        data: encodeFunctionData({
          abi: registrarControllerJson.abi,
          functionName: 'commit',
          args: [commitment],
        }),

        // for Sepolia only: Users should set the maxPriorityFeePerGas parameter
        // in their userOps equal to the outcome of eth_maxPriorityFeePerGas
        //maxPriorityFeePerGas: maxPrioirity,
      },

      // 2 - register
      {
        from: smartAccountAddress,
        to: registrarControllerJson.address,
        data: encodeFunctionData({
          abi: registrarControllerJson.abi,
          functionName: 'register',
          args: [
            nameFirstPart,
            registrantAccount,
            REGISTRATION_TIME,
            secret,
            resolverJson.address,
            callData,
            isReverseRecord,
            ownerControlledFuses,
          ],
        }),
      },
    ]

    // 1 - commit + register
    try {
      // will :
      // 1 - call eth_sendUserOperation()
      // 2 - wait in eth_getUserOperationReceipt()
      // @ts-ignore
      const out = await smartAccountSigner.sendTransactions(txs)

      console.log('Commit+register result: ')
      console.log(out)

      // TODO: process error
      // TODO: process "replacement underpriced" error
      // https://docs.alchemy.com/reference/eth-senduseroperation
      //const txResult = await erc4337client.getTransactionReceipt({ hash: tx })
      //console.log("Commit+register tx result: ", txResult)
    } catch (err) {
      // TODO: "Failed to find transaction for User Operation" in some cases
      // Alchemy's library returns this but the operation is still then mined...
      console.error('Can not commit + register!')
      console.error(err)

      setModalTitle('Something went wrong!')
      setModalText('Can not send transaction...')
      setShowModal(true)

      // do not continue
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
          handlerRegisterAA={handlerRegisterForUsdcsAA}
          handleMintUsdcs={handleMint}
          handleMintUsdcsAA={handleMintAA}
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
