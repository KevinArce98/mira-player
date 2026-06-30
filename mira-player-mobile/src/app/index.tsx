import { Redirect } from 'expo-router';

import { Loading } from '@/components/ui/empty';
import { ThemedView } from '@/components/themed-view';
import { useAccount } from '@/hooks/data/use-account';

export default function Index() {
  const { data: account, isLoading } = useAccount();

  if (isLoading) {
    return (
      <ThemedView style={{ flex: 1 }}>
        <Loading />
      </ThemedView>
    );
  }

  return <Redirect href={account ? '/(tabs)/home' : '/setup'} />;
}
