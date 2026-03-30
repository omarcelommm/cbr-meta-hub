import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center flex-col gap-4">
      <p className="text-white/40 text-lg">Página não encontrada</p>
      <button onClick={() => navigate('/hoje')} className="text-blue-400 text-sm hover:underline">
        ← Ir para Hoje
      </button>
    </div>
  );
}
