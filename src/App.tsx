// src/App.tsx
import React from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Organizations } from './components/Organizations';
import { Reports } from './components/Reports';
import { Login } from './components/Login';
import { Employees } from './components/Employees';
import { AuthProvider, useAuth } from './context/AuthContext';

function AppContent() {
  const { isAuthenticated } = useAuth();
  const [currentPage, setCurrentPage] = React.useState('employees');

  if (!isAuthenticated) {
    return <Login />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'organizations':
        return <Organizations />;
      case 'positions':
        return <div>Cargos</div>;
      case 'employees':
        return <Employees />;
      case 'reports':
        return <Reports />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
