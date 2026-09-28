import React from 'react';
import PesertaDashboard from '@/features/peserta/components/PesertaDashboard';

export default function MateriPage(props) {
  return <PesertaDashboard activeTab="quizzes" {...props} />;
}
