type ReadStatus = 'error' | 'pending' | 'success';

export function getMonitoringReadState(status: ReadStatus, sampleCount: number) {
  if (status === 'error') return 'error';
  if (status === 'pending') return 'loading';
  return sampleCount > 0 ? 'ready' : 'empty';
}
