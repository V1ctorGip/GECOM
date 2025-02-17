// src/App.tsx
import React from 'react';
import { Layout } from './components/Layout.js';
import { Dashboard } from './components/Dashboard.js';
import { Organizations } from './components/Organizations.js';
import { Reports } from './components/Reports.js';
import { Login } from './components/Login.js';
import { Employees } from './components/Employees.js';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import 'primereact/resources/themes/lara-light-indigo/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';


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
