/** Reconhece o contrato novo de liveness e o antigo status saudável. */
export function isHealthcheckSuccessful(httpOk, status) {
  return httpOk && (status === 'ok' || status === 'healthy');
}

export function createHealthcheckRequestOptions() {
  return {
    method: 'GET',
    headers: { 'User-Agent': 'brindes-sicoob-healthcheck/1.0' },
  };
}
