import { useCallback, useEffect, useRef } from 'react';
import { useBlocker } from 'react-router-dom';
import { UnsavedChangesDialog } from '@/components/common/UnsavedChangesDialog';
import { useNavigationGuardStore } from '@/stores/useNavigationGuardStore';
import { trackUx } from '@/lib/uxMetrics';

interface BlockerAttempt {
  currentLocation: { pathname: string; search: string; hash: string };
  nextLocation: { pathname: string; search: string; hash: string };
  historyAction: string;
}

function routeIdentity(location: { pathname: string; search: string; hash: string }) {
  return `${location.pathname}${location.search}${location.hash}`;
}

/** Único consumidor de useBlocker; protege todos os meios de navegação SPA. */
export function NavigationBlockerBridge() {
  const dirtyScopes = useNavigationGuardStore((state) => state.dirtyScopes);
  const request = useNavigationGuardStore((state) => state.request);
  const beginRequest = useNavigationGuardStore((state) => state.beginRequest);
  const clearRequest = useNavigationGuardStore((state) => state.clearRequest);
  const blockedTransition = useRef<string | null>(null);
  const lastAttempt = useRef<BlockerAttempt | null>(null);
  const hasDirty = Object.keys(dirtyScopes).length > 0;

  const shouldBlock = useCallback((attempt: BlockerAttempt) => {
    lastAttempt.current = attempt;
    return useNavigationGuardStore.getState().hasDirty()
      && routeIdentity(attempt.currentLocation) !== routeIdentity(attempt.nextLocation);
  }, []);
  const blocker = useBlocker(shouldBlock);

  useEffect(() => {
    if (blocker.state !== 'blocked') {
      blockedTransition.current = null;
      return;
    }

    const transitionKey = `${blocker.location.key}:${routeIdentity(blocker.location)}`;
    if (blockedTransition.current === transitionKey) return;
    blockedTransition.current = transitionKey;
    const attempt = lastAttempt.current;
    beginRequest({
      currentPath: attempt ? routeIdentity(attempt.currentLocation) : routeIdentity(window.location),
      nextPath: routeIdentity(blocker.location),
      historyAction: attempt?.historyAction ?? 'UNKNOWN',
    });
    trackUx('guard.shown');
  }, [beginRequest, blocker]);

  useEffect(() => {
    if (hasDirty) return;
    clearRequest();
    if (blocker.state === 'blocked') blocker.proceed();
  }, [blocker, clearRequest, hasDirty]);

  useEffect(() => {
    if (!hasDirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasDirty]);

  useEffect(() => () => clearRequest(), [clearRequest]);

  const confirm = () => {
    if (!request || blocker.state !== 'blocked') return;
    if (useNavigationGuardStore.getState().request?.id !== request.id) return;
    clearRequest(request.id);
    trackUx('guard.confirm');
    blocker.proceed();
  };
  const cancel = () => {
    if (!request || blocker.state !== 'blocked') return;
    if (useNavigationGuardStore.getState().request?.id !== request.id) return;
    clearRequest(request.id);
    trackUx('guard.cancel');
    blocker.reset();
  };

  return (
    <UnsavedChangesDialog
      open={Boolean(request) && blocker.state === 'blocked'}
      message={request?.message}
      onConfirm={confirm}
      onCancel={cancel}
      contentClassName="z-[110]"
    />
  );
}
