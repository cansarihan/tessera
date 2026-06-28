import { Sparkles } from 'lucide-react';
import { PageHeader } from '../layout/PageHeader';
import { EmptyState } from './EmptyState';

export function PagePlaceholder({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <EmptyState icon={<Sparkles />} title="This screen is part of Tessera" description="Wired to the same on-chain contract as the rest of the app." />
    </div>
  );
}
