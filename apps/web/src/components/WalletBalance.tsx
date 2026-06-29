import { useQuery } from '@tanstack/react-query';
import { NETWORK } from '../lib/config';

const HORIZON = NETWORK === 'public' ? 'https://horizon.stellar.org' : 'https://horizon-testnet.stellar.org';

interface HorizonBalance {
  asset_type: string;
  balance: string;
}

/** Shows the connected account's native XLM balance (read from Horizon). */
export function WalletBalance({ address }: { address: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['xlm-balance', address],
    refetchInterval: 30_000,
    retry: 1,
    queryFn: async () => {
      const res = await fetch(`${HORIZON}/accounts/${address}`);
      if (!res.ok) return null;
      const json = (await res.json()) as { balances?: HorizonBalance[] };
      const native = (json.balances ?? []).find((b) => b.asset_type === 'native');
      return native ? Number(native.balance) : null;
    },
  });

  if (isLoading) return <span className="text-fg-subtle">…</span>;
  return <span className="tnum text-fg">{data == null ? '—' : `${data.toFixed(2)} XLM`}</span>;
}
