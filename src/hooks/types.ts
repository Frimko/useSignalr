import { HubConnection, HubConnectionState } from '@microsoft/signalr';

export type MaybePromise<T> = T | Promise<T>;

export type UseSignalRProps = {
  onBuild: () => HubConnection;
  onInit: (connection: HubConnection) => MaybePromise<void>;
  onConnected: (connection: HubConnection) => MaybePromise<void>;
  onReconnected?: (connectionId?: string) => void;
  onReconnecting?: (error?: Error) => void;
  onError?: (error: Error) => void;
  isStart?: boolean;
  maxRetryDelay?: number;
  restartTime?: number;
  defaultMaxRetryCount?: number;
};

export type SignalRConnectionCallbacks = Omit<
  UseSignalRProps,
  'isStart' | 'onBuild'
> & {
  onConnectionStateChange?: (state: HubConnectionState) => void;
};

export type SignalRConnectionParams = SignalRConnectionCallbacks & {
  connection: HubConnection;
};
