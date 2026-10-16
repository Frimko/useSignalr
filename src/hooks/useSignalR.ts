import { useEffect, useRef, useState } from 'react';
import { HubConnectionState } from '@microsoft/signalr';

import type { UseSignalRProps } from './types';
import SignalRConnection from './SignalRConnection';

function useSignalR({
  isStart,
  maxRetryDelay,
  restartTime,
  defaultMaxRetryCount,
  onInit,
  onConnected,
  onReconnected,
  onReconnecting,
  onBuild,
  onError,
}: UseSignalRProps): HubConnectionState {
  const [connectionState, setConnectionState] = useState<HubConnectionState>(
    HubConnectionState.Disconnected,
  );

  const signalRConnectionRef = useRef<SignalRConnection | null>(null);
  const onBuildRef = useRef(onBuild);
  onBuildRef.current = onBuild;

  useEffect(() => {
    if (!isStart || signalRConnectionRef.current) {
      return;
    }

    signalRConnectionRef.current = new SignalRConnection({
      maxRetryDelay,
      restartTime,
      defaultMaxRetryCount,
      onInit,
      onConnected,
      onReconnected,
      onReconnecting,
      onError,
      connection: onBuildRef.current(),
      onConnectionStateChange: setConnectionState,
    });
  }, [
    maxRetryDelay,
    restartTime,
    defaultMaxRetryCount,
    onInit,
    onConnected,
    onReconnected,
    onReconnecting,
    onError,
    isStart,
  ]);

  useEffect(() => {
    if (!signalRConnectionRef.current) {
      return;
    }

    signalRConnectionRef.current.updateCallbacks({
      restartTime,
      maxRetryDelay,
      defaultMaxRetryCount,
      onInit,
      onConnected,
      onReconnected,
      onReconnecting,
      onError,
      onConnectionStateChange: setConnectionState,
    });
  }, [
    maxRetryDelay,
    restartTime,
    defaultMaxRetryCount,
    onInit,
    onConnected,
    onReconnected,
    onReconnecting,
    onError,
  ]);

  useEffect(() => {
    if (!isStart) {
      setConnectionState(HubConnectionState.Disconnected);
      return;
    }

    if (!signalRConnectionRef.current) {
      return;
    }

    const stop = signalRConnectionRef.current.run();
    return () => {
      stop();
      signalRConnectionRef.current = null;
    };
  }, [isStart]);

  return connectionState;
}

export default useSignalR;
