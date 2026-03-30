import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import HojePage from './pages/HojePage';
import SemanaPage from './pages/SemanaPage';
import MesPage from './pages/MesPage';
import HistoricoPage from './pages/HistoricoPage';
import AdminPage from './pages/AdminPage';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/hoje" element={<ProtectedRoute adminOnly><HojePage /></ProtectedRoute>} />
              <Route path="/semana" element={<ProtectedRoute adminOnly><SemanaPage /></ProtectedRoute>} />
              <Route path="/mes" element={<ProtectedRoute adminOnly><MesPage /></ProtectedRoute>} />
              <Route path="/historico" element={<ProtectedRoute adminOnly><HistoricoPage /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>} />
              <Route path="/" element={<Navigate to="/hoje" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
