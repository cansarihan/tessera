import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const TITLES: Array<[RegExp, string]> = [
  [/^\/$/, "Tessera — tickets that can't be faked"],
  [/^\/docs/, 'How it works · Tessera'],
  [/^\/app\/event\//, 'Event · Tessera'],
  [/^\/app\/tickets/, 'My tickets · Tessera'],
  [/^\/app\/market/, 'Resale market · Tessera'],
  [/^\/app\/organize/, 'Organize · Tessera'],
  [/^\/app\/scan/, 'Check-in scanner · Tessera'],
  [/^\/app\/badges/, 'My badges · Tessera'],
  [/^\/app\/analytics/, 'Analytics · Tessera'],
  [/^\/app\/settings/, 'Settings · Tessera'],
  [/^\/app/, 'Browse events · Tessera'],
];

/** Resets scroll and sets the document title on every route change. */
export function RouteEffects() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    const match = TITLES.find(([re]) => re.test(pathname));
    document.title = match ? match[1] : 'Tessera';
  }, [pathname]);
  return null;
}
