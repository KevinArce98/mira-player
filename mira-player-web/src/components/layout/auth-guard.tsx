import { Navigate } from 'react-router';
import { Loading } from '@/components/ui/empty';
import { useAccount } from '@/hooks/data/use-account';

export function AuthGuard() {
  const { data: account, isLoading } = useAccount();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg">
        <Loading />
      </div>
    );
  }

  return <Navigate to={account ? '/home' : '/setup'} replace />;
}
