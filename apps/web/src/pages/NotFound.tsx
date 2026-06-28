import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Logo } from '../components/layout/Logo';

export function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-4 text-center">
      <Logo />
      <p className="font-display text-6xl font-bold holo-text">404</p>
      <p className="text-fg-muted">This page isn’t on the guest list.</p>
      <Link to="/app">
        <Button>Back to events</Button>
      </Link>
    </div>
  );
}
