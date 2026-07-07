import { Redirect } from 'expo-router';

import { Loading } from '@/components/ui/empty';
import { ThemedView } from '@/components/themed-view';
import { useAccount, useReauthPending } from '@/hooks/data/use-account';

export default function Index() {
  const { data: account, isLoading } = useAccount();
  const { data: reauthPending, isLoading: reauthLoading } = useReauthPending();

  if (isLoading || reauthLoading) {
    return (
      <ThemedView style={{ flex: 1 }}>
        <Loading />
      </ThemedView>
    );
  }

  return <Redirect href={account && !reauthPending ? '/(tabs)/home' : '/setup'} />;
}
