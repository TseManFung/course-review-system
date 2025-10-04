import './App.css';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes';
import { useEffect } from 'react';
import AppLayout from './components/AppLayout';
import { ThemeModeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';

const App: React.FC = () => {
  useEffect(() => {
    document.title = 'Course Review System';
  }, []);

  return (
    <ThemeModeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppLayout>
            <AppRoutes />
          </AppLayout>
        </BrowserRouter>
      </AuthProvider>
    </ThemeModeProvider>
  );
};

export default App;
