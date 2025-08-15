'use client';

import { createContext, useContext, useState } from 'react';
import Modal from '@/components/modal';

const ModalContext = createContext();

export const ModalProvider = ({ children }) => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    title: '',
    message: '',
  });

  const showCustomAlert = (title, message) => {
    setModalState({
      isOpen: true,
      title,
      message,
    });
  };

  const closeCustomAlert = () => {
    setModalState({
      isOpen: false,
      title: '',
      message: '',
    });
  };

  return (
    <ModalContext.Provider value={{ showCustomAlert }}>
      {children}
      <Modal
        isOpen={modalState.isOpen}
        onClose={closeCustomAlert}
        title={modalState.title}
        message={modalState.message}
      />
    </ModalContext.Provider>
  );
};

export const useModal = () => useContext(ModalContext);