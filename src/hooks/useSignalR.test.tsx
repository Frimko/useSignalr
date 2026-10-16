import {
  HubConnectionBuilder,
  HubConnectionState,
  type HubConnection,
} from '@microsoft/signalr';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi, describe } from 'vitest';

import type { UseSignalRProps } from './types';
import useSignalR from './useSignalR';

vi.mock('@microsoft/signalr', async (importOriginal) => {
  const signalR = await importOriginal<typeof import('@microsoft/signalr')>();

  return {
    ...signalR,
    HubConnectionBuilder: vi.fn(),
  };
});

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type EventHandler<T> = (value: T) => void;

class TestHubConnection {
  public state: HubConnectionState = HubConnectionState.Disconnected;

  public startCalls = 0;

  public stopCalls = 0;

  public startOutcomes: Error[] = [];

  public pendingStart: Promise<void> | undefined;

  public pendingEnd: Promise<void> | undefined;

  private closeHandlers: EventHandler<Error | undefined>[] = [];

  private reconnectingHandlers: EventHandler<Error | undefined>[] = [];

  private reconnectedHandlers: EventHandler<string | undefined>[] = [];

  public async start(): Promise<void> {
    this.startCalls += 1;

    if (this.pendingStart) {
      await this.pendingStart;
    }

    const startError = this.startOutcomes.shift();

    if (startError) {
      this.state = HubConnectionState.Disconnected;
      throw startError;
    }

    this.state = HubConnectionState.Connected;
  }

  public async stop(): Promise<void> {
    this.stopCalls += 1;
    this.state = HubConnectionState.Disconnected;

    if (this.pendingEnd) {
      await this.pendingEnd;
    }

    this.emitClose();
  }

  public onclose(handler: EventHandler<Error | undefined>): void {
    this.closeHandlers.push(handler);
  }

  public onreconnecting(handler: EventHandler<Error | undefined>): void {
    this.reconnectingHandlers.push(handler);
  }

  public onreconnected(handler: EventHandler<string | undefined>): void {
    this.reconnectedHandlers.push(handler);
  }

  public emitClose(error?: Error): void {
    this.closeHandlers.forEach((handler) => handler(error));
  }

  public emitReconnecting(error?: Error): void {
    this.state = HubConnectionState.Reconnecting;
    this.reconnectingHandlers.forEach((handler) => handler(error));
  }

  public emitReconnected(connectionId?: string): void {
    this.state = HubConnectionState.Connected;
    this.reconnectedHandlers.forEach((handler) => handler(connectionId));
  }
}

function asHubConnection(connection: TestHubConnection): HubConnection {
  return connection as unknown as HubConnection;
}

function setBuilderConnections(
  connections: TestHubConnection[],
): () => HubConnection {
  let connectionIndex = 0;

  vi.mocked(HubConnectionBuilder).mockImplementation(
    function buildConnection() {
      const connection = connections[connectionIndex];
      connectionIndex += 1;

      return {
        withUrl: () => ({
          build: () => asHubConnection(connection),
        }),
      } as unknown as HubConnectionBuilder;
    },
  );

  return () => new HubConnectionBuilder().withUrl('/hub').build();
}

function createProps(
  onBuild: () => HubConnection,
  overrides: Partial<UseSignalRProps> = {},
): UseSignalRProps {
  return {
    isStart: true,
    onBuild,
    onInit: vi.fn(async () => undefined),
    onConnected: vi.fn(async () => undefined),
    onError: vi.fn(),
    onReconnecting: vi.fn(),
    onReconnected: vi.fn(),
    restartTime: 10,
    maxRetryDelay: 1_000,
    defaultMaxRetryCount: 10,
    ...overrides,
  };
}

async function settle(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

function mountHook(props: UseSignalRProps, states?: HubConnectionState[]) {
  return renderHook(() => {
    const state = useSignalR(props);
    states?.push(state);
    return state;
  });
}

describe('useSignalR', () => {
  beforeEach(() => {
    vi.mocked(HubConnectionBuilder).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('useSignalR.starts a connection without errors and returns Disconnected initially', async () => {
    const connection = new TestHubConnection();
    const onBuild = setBuilderConnections([connection]);
    const props = createProps(onBuild);
    const states: HubConnectionState[] = [];

    const mounted = mountHook(props, states);

    await waitFor(() => {
      expect(mounted.result.current).toBe(HubConnectionState.Connected);
    });

    expect(states[0]).toBe(HubConnectionState.Disconnected);
    expect(mounted.result.current).toBe(HubConnectionState.Connected);
    expect(connection.startCalls).toBe(1);
    expect(props.onInit).toHaveBeenCalledOnce();
    expect(props.onConnected).toHaveBeenCalledOnce();
    expect(props.onError).not.toHaveBeenCalled();

    mounted.unmount();
  });

  it('useSignalR.starts, stops, and starts again in StrictMode', async () => {
    const lifecycle: Array<'start' | 'stop'> = [];
    const firstConnection = new TestHubConnection();
    const secondConnection = new TestHubConnection();
    const onBuild = setBuilderConnections([firstConnection, secondConnection]);

    const firstStop = firstConnection.stop.bind(firstConnection);
    vi.spyOn(firstConnection, 'stop').mockImplementation(async () => {
      lifecycle.push('stop');
      await firstStop();
    });
    const props = createProps(onBuild, {
      onInit: vi.fn(async () => {
        // onInit is the first phase of each SignalRConnection.start attempt.
        lifecycle.push('start');
      }),
    });

    const mounted = renderHook(useSignalR, {
      initialProps: props,
      reactStrictMode: true,
    });

    await waitFor(() => {
      expect(mounted.result.current).toBe(HubConnectionState.Connected);
    });

    expect(lifecycle).toEqual(['start', 'stop', 'start']);
    expect(firstConnection.stopCalls).toBe(1);
    expect(secondConnection.startCalls).toBe(1);

    mounted.unmount();
  });

  it('useSignalR.isStart is false and update to true', async () => {
    const connection = new TestHubConnection();
    const onBuild = setBuilderConnections([connection]);
    const props = createProps(onBuild, {
      isStart: false,
    });

    const mounted = renderHook(useSignalR, {
      initialProps: props,
    });

    await waitFor(() => {
      expect(mounted.result.current).toBe(HubConnectionState.Disconnected);
    });

    mounted.rerender({
      ...props,
      isStart: true,
    });

    await waitFor(() => {
      expect(mounted.result.current).toBe(HubConnectionState.Connected);
    });

    expect(mounted.result.current).toBe(HubConnectionState.Connected);
    expect(connection.startCalls).toBe(1);

    mounted.unmount();
  });

  it('useSignalR.stops and starts again when isStart changes', async () => {
    const firstConnection = new TestHubConnection();
    const secondConnection = new TestHubConnection();
    const onBuild = setBuilderConnections([firstConnection, secondConnection]);
    const props = createProps(onBuild);

    const mounted = renderHook(useSignalR, {
      initialProps: props,
    });

    await waitFor(() => {
      expect(mounted.result.current).toBe(HubConnectionState.Connected);
    });

    mounted.rerender({
      ...props,
      isStart: false,
    });

    await waitFor(() => {
      expect(mounted.result.current).toBe(HubConnectionState.Disconnected);
    });

    expect(firstConnection.stopCalls).toBe(1);

    mounted.rerender({
      ...props,
      isStart: true,
    });

    await waitFor(() => {
      expect(mounted.result.current).toBe(HubConnectionState.Connected);
    });

    expect(secondConnection.startCalls).toBe(1);

    mounted.unmount();
  });

  it('useSignalR.registers status handlers once for the active connection after repeated isStart changes', async () => {
    const connections = [
      new TestHubConnection(),
      new TestHubConnection(),
      new TestHubConnection(),
    ];

    const statusHandlers = connections.map(
      () => [] as Array<(data: unknown) => void>,
    );

    connections.forEach((connection, connectionIndex) => {
      Object.assign(connection, {
        on: (eventName: string, handler: (data: unknown) => void): void => {
          if (eventName === 'status') {
            statusHandlers[connectionIndex].push(handler);
          }
        },
      });
    });

    const onBuild = setBuilderConnections(connections);
    const checkData = vi.fn();
    const props = createProps(onBuild, {
      isStart: false,
      onInit: vi.fn(async (connection) => {
        connection.on('status', (data: any) => {
          checkData(data);
        });
      }),
    });

    const mounted = renderHook(useSignalR, {
      initialProps: props,
    });

    try {
      await waitFor(() => {
        expect(mounted.result.current).toBe(HubConnectionState.Disconnected);
      });

      for (const isStart of [true, false, true, false, true]) {
        mounted.rerender({
          ...props,
          isStart,
        });

        await waitFor(() => {
          expect(mounted.result.current).toBe(
            isStart
              ? HubConnectionState.Connected
              : HubConnectionState.Disconnected,
          );
        });
      }

      statusHandlers[2].forEach((handler) => handler('check'));

      expect(props.onInit).toHaveBeenCalledTimes(3);
      expect(checkData).toHaveBeenCalledOnce();
      expect(checkData).toHaveBeenCalledWith('check');
    } finally {
      mounted.unmount();
    }
  });

  describe('useSignalR with fakeTimers', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('useSignalR.reconnects after errors using restartTime and then maxRetryDelay', async () => {
      const firstError = new Error('first start error');
      const secondError = new Error('second start error');
      const thirdError = new Error('third start error');
      const connection = new TestHubConnection();
      connection.startOutcomes = [firstError, secondError, thirdError];
      const onBuild = setBuilderConnections([connection]);
      const props = createProps(onBuild, {
        restartTime: 5,
        defaultMaxRetryCount: 2,
        maxRetryDelay: 40,
      });

      const mounted = await mountHook(props);
      await settle();

      expect(connection.startCalls).toBe(1);
      expect(props.onError).toHaveBeenCalledWith(firstError);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5);
      });
      expect(connection.startCalls).toBe(2);
      expect(props.onError).toHaveBeenCalledWith(secondError);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(5);
      });
      expect(connection.startCalls).toBe(3);
      expect(props.onError).toHaveBeenCalledWith(thirdError);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(39);
      });
      expect(connection.startCalls).toBe(3);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });
      expect(connection.startCalls).toBe(4);
      expect(mounted.result.current).toBe(HubConnectionState.Connected);
      expect(props.onConnected).toHaveBeenCalledOnce();
      expect(props.onInit).toHaveBeenCalledOnce();

      mounted.unmount();
    });

    it('useSignalR.cancels the first start when the hook is unmounted immediately', async () => {
      let resolveFirstStart!: () => void;
      const firstConnection = new TestHubConnection();
      firstConnection.pendingStart = new Promise<void>((resolve) => {
        resolveFirstStart = resolve;
      });
      const secondConnection = new TestHubConnection();
      const onBuild = setBuilderConnections([
        firstConnection,
        secondConnection,
      ]);

      const props = createProps(onBuild);

      const firstMount = await mountHook(props);
      await settle();

      expect(firstMount.result.current).toBe(HubConnectionState.Connecting);
      expect(firstConnection.startCalls).toBe(1);

      firstMount.unmount();
      expect(firstConnection.stopCalls).toBe(1);

      resolveFirstStart();
      await settle();

      expect(props.onConnected).not.toHaveBeenCalled();

      const secondMount = await mountHook(props);
      await settle();

      expect(secondMount.result.current).toBe(HubConnectionState.Connected);
      expect(secondConnection.startCalls).toBe(1);
      expect(props.onConnected).toHaveBeenCalledOnce();

      secondMount.unmount();
    });

    it('useSignalR.forwards reconnecting and reconnected events', async () => {
      const connection = new TestHubConnection();
      const onBuild = setBuilderConnections([connection]);
      const props = createProps(onBuild);
      const reconnectError = new Error('connection lost');
      const states: HubConnectionState[] = [];

      const mounted = mountHook(props, states);
      await settle();

      await act(async () => {
        connection.emitReconnecting(reconnectError);
      });

      await act(async () => {
        connection.emitReconnected('connection-id');
      });

      expect(props.onReconnecting).toHaveBeenCalledWith(reconnectError);
      expect(props.onReconnected).toHaveBeenCalledWith('connection-id');
      expect(states).toContain(HubConnectionState.Reconnecting);
      expect(mounted.result.current).toBe(HubConnectionState.Connected);

      mounted.unmount();
    });

    async function reconnectAfterClose(closeError?: Error): Promise<void> {
      const connection = new TestHubConnection();
      const onBuild = setBuilderConnections([connection]);
      const props = createProps(onBuild, { restartTime: 20 });

      const mounted = mountHook(props);
      await settle();
      const startCallsBeforeClose = connection.startCalls;

      await act(async () => {
        connection.emitClose(closeError);
      });

      expect(mounted.result.current).toBe(HubConnectionState.Disconnected);
      if (closeError) {
        expect(props.onError).toHaveBeenCalledWith(closeError);
      } else {
        expect(props.onError).not.toHaveBeenCalled();
      }

      await act(async () => {
        await vi.advanceTimersByTimeAsync(19);
      });
      expect(connection.startCalls).toBe(startCallsBeforeClose);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });
      expect(connection.startCalls).toBe(startCallsBeforeClose + 1);
      expect(mounted.result.current).toBe(HubConnectionState.Connected);

      mounted.unmount();
    }

    it('useSignalR.reconnects after the connection closes an error', async () => {
      await reconnectAfterClose(new Error('unexpected close'));
    });

    it('useSignalR.reconnects after the connection closes without an error', async () => {
      await reconnectAfterClose();
    });

    it('useSignalR.closes every previous connection when mounted and unmounted repeatedly', async () => {
      const connections = [
        new TestHubConnection(),
        new TestHubConnection(),
        new TestHubConnection(),
      ];

      const onBuild = setBuilderConnections(connections);
      const props = createProps(onBuild);

      for (const connection of connections) {
        const mounted = await mountHook(props);
        await settle();
        expect(mounted.result.current).toBe(HubConnectionState.Connected);

        mounted.unmount();
        await settle();

        expect(connection.stopCalls).toBe(1);
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1_000);
        });
        expect(connection.startCalls).toBe(1);
      }
    });
  });
});
