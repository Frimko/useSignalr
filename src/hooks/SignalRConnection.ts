import { HubConnection, HubConnectionState } from '@microsoft/signalr';
import {
  DEFAULT_MAX_RETRY_COUNT,
  DEFAULT_MAX_RETRY_DELAY,
  DEFAULT_RESTART_TIME,
} from './consts';
import { SignalRConnectionCallbacks, SignalRConnectionParams } from './types';

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

class SignalRConnection {
  private isStopped: boolean = true;

  private isConnecting: boolean = false;

  private isInitialized: boolean = false;

  private retryCount: number = 0;

  private reconnectTimeout: ReturnType<typeof setTimeout> | undefined;

  private restartTime: number;

  private maxRetryDelay: number;

  private maxRetryCount: number;

  private connection: HubConnection;

  private onInit: SignalRConnectionParams['onInit'];

  private onConnected: SignalRConnectionParams['onConnected'];

  private onReconnected: SignalRConnectionParams['onReconnected'];

  private onReconnecting: SignalRConnectionParams['onReconnecting'];

  private onError: SignalRConnectionParams['onError'];

  private onConnectionStateChange: SignalRConnectionParams['onConnectionStateChange'];

  constructor({
    restartTime,
    maxRetryDelay,
    defaultMaxRetryCount,
    connection,
    onInit,
    onConnected,
    onReconnected,
    onReconnecting,
    onError,
    onConnectionStateChange,
  }: SignalRConnectionParams) {
    this.restartTime = Math.max(0, restartTime ?? DEFAULT_RESTART_TIME);
    this.maxRetryDelay = Math.max(0, maxRetryDelay ?? DEFAULT_MAX_RETRY_DELAY);
    this.maxRetryCount = Math.max(
      0,
      defaultMaxRetryCount ?? DEFAULT_MAX_RETRY_COUNT,
    );

    this.connection = connection;
    this.onInit = onInit;
    this.onConnected = onConnected;
    this.onReconnected = onReconnected;
    this.onReconnecting = onReconnecting;
    this.onError = onError;
    this.onConnectionStateChange = onConnectionStateChange;

    this.bindConnectionEvents();
  }

  public updateCallbacks({
    restartTime,
    maxRetryDelay,
    defaultMaxRetryCount,
    onInit,
    onConnected,
    onReconnected,
    onReconnecting,
    onError,
    onConnectionStateChange,
  }: SignalRConnectionCallbacks): void {
    this.restartTime = Math.max(0, restartTime ?? DEFAULT_RESTART_TIME);
    this.maxRetryDelay = Math.max(0, maxRetryDelay ?? DEFAULT_MAX_RETRY_DELAY);
    this.maxRetryCount = Math.max(
      0,
      defaultMaxRetryCount ?? DEFAULT_MAX_RETRY_COUNT,
    );

    this.onInit = onInit;
    this.onConnected = onConnected;
    this.onReconnected = onReconnected;
    this.onReconnecting = onReconnecting;
    this.onError = onError;
    this.onConnectionStateChange = onConnectionStateChange;
  }

  private bindConnectionEvents(): void {
    this.connection.onreconnecting((error) => {
      if (this.isStopped) {
        return;
      }

      this.notifyStateChange(HubConnectionState.Reconnecting);
      this.onReconnecting?.(error);
    });

    this.connection.onreconnected((connectionId) => {
      if (this.isStopped) {
        return;
      }

      this.retryCount = 0;
      this.notifyStateChange(HubConnectionState.Connected);
      this.onReconnected?.(connectionId);
    });

    this.connection.onclose((error) => {
      if (this.isStopped || this.isConnecting) {
        return;
      }

      this.notifyStateChange(HubConnectionState.Disconnected);

      if (error) {
        this.reportError(error);
      }

      this.reconnect();
    });
  }

  private notifyStateChange(state: HubConnectionState): void {
    this.onConnectionStateChange?.(state);
  }

  private getReconnectDelay(): number {
    return this.retryCount < this.maxRetryCount
      ? this.restartTime
      : this.maxRetryDelay;
  }

  private reconnect(): void {
    if (this.isStopped || this.reconnectTimeout !== undefined) {
      return;
    }

    const delay = this.getReconnectDelay();
    this.retryCount += 1;
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = undefined;
      void this.start();
    }, delay);
  }

  private reportError(error: unknown): void {
    this.onError?.(toError(error));
  }

  private async start(): Promise<void> {
    if (this.isStopped || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    this.notifyStateChange(HubConnectionState.Connecting);

    try {
      if (!this.isInitialized) {
        await this.onInit(this.connection);
        this.isInitialized = true;
      }

      if (this.isStopped) {
        return;
      }

      await this.connection.start();

      if (this.isStopped) {
        return;
      }

      this.retryCount = 0;
      this.notifyStateChange(HubConnectionState.Connected);
    } catch (error) {
      if (this.isStopped) {
        return;
      }

      this.notifyStateChange(HubConnectionState.Disconnected);
      this.reportError(error);
      this.reconnect();
      return;
    } finally {
      this.isConnecting = false;
    }

    if (this.isStopped) {
      return;
    }

    try {
      await this.onConnected(this.connection);
    } catch (error) {
      this.reportError(error);
    }
  }

  private async stop(): Promise<void> {
    if (this.isStopped) {
      return;
    }

    this.isStopped = true;
    this.clearReconnectTimeout();

    try {
      await this.connection.stop();
    } catch (error) {
      if (!this.isConnecting) {
        this.reportError(error);
      }
    } finally {
      this.isConnecting = false;
      this.notifyStateChange(HubConnectionState.Disconnected);
    }
  }

  private clearReconnectTimeout(): void {
    if (this.reconnectTimeout === undefined) {
      return;
    }

    clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = undefined;
  }

  public run(): () => void {
    this.isStopped = false;
    this.retryCount = 0;
    void this.start();

    return () => {
      void this.stop();
    };
  }
}

export default SignalRConnection;
