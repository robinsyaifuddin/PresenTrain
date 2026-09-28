import React from 'react';
import AuthScreen from '@/features/auth/components/AuthScreen';

export default function Register(props) {
  return <AuthScreen isRegisterMode={true} {...props} />;
}
