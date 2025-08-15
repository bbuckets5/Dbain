'use client';

import { UserProvider } from '@/components/UserContext';
import { ModalProvider } from './contexts/ModalContext'; // Corrected path

export function Providers({ children }) {
  return (
    <ModalProvider>
      <UserProvider>
        {children}
      </UserProvider>
    </ModalProvider>
  );
}