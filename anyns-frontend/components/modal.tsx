import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom'

import styled from 'styled-components'

const ModalDlg = ({ onClose, children, title }) => {
  const [isBrowser, setIsBrowser] = useState(false)

  // create ref for the StyledModalWrapper component
  const modalWrapperRef = React.useRef()

  useEffect(() => {
    // check if the user has clickedinside or outside the modal
    const backDropHandler = (e) => {
      // @ts-ignore
      if (!modalWrapperRef?.current?.contains(e.target)) {
        onClose()
      }
    }

    setIsBrowser(true)

    // attach event listener to the whole windor with our handler
    window.addEventListener('click', backDropHandler)

    // remove the event listener when the modal is closed
    return () => window.removeEventListener('click', backDropHandler)
  }, [modalWrapperRef, onClose])

  const handleCloseClick = (e) => {
    e.preventDefault()
    onClose()
  }

  const modalContent = (
    <StyledModalOverlay>
      <StyledModalWrapper ref={modalWrapperRef}>
        <StyledModal>
          <StyledModalHeader>
            {/*
                        <a href="#" onClick={handleCloseClick}>
                            x
                        </a>
                        */}
          </StyledModalHeader>
          {title && <h1>{title}</h1>}

          <StyledModalBody>{children}</StyledModalBody>

          <div className="text-center text-2xl font-bold m-2">
            <a onClick={handleCloseClick}>
              <button className="my-button">Close</button>
            </a>
          </div>
        </StyledModal>
      </StyledModalWrapper>
    </StyledModalOverlay>
  )

  if (isBrowser) {
    window.scrollTo({ top: 0, behavior: 'smooth' })

    return ReactDOM.createPortal(
      modalContent,
      document.getElementById('modal-root'),
    )
  } else {
    return null
  }
}

// TODO: refactor
const StyledModalBody = styled.div`
  padding-top: 10px;
`

const StyledModalHeader = styled.div`
  display: flex;
  justify-content: flex-end;
  font-size: 25px;
`

// the wrapper component
const StyledModalWrapper = styled.div`
  width: 500px;
  height: 600px;
`

const StyledModal = styled.div`
  background: white;

  width: 100%;
  border-radius: 15px;
  padding: 15px;
`

const StyledModalOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.5);
`

export default ModalDlg
