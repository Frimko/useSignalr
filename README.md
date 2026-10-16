# use-signalr
An easy to use React hook for @microsoft/signalr

Please use Microsoft's Documentation and API Reference as guidance.

React hook for creating and maintaining a Microsoft SignalR connection. The
hook starts the connection, reports its state, retries failed starts, and
restarts a connection that was closed unexpectedly.

## Installation

```bash
npm install use-signalr @microsoft/signalr react

yarn add use-signalr @microsoft/signalr react
```

`react` and `@microsoft/signalr` are peer dependencies of this package, so the
application controls their versions.

## Use in your React component

```tsx
import { HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
import useSignalR from 'use-signalr';

function exponentialDelay(
  retryCount = 0,
  delayFactor = 100,
) {
  return 2 ** retryCount * delayFactor;
}

const DEFAULT_RESTART_TIME = 10_000;

const DEFAULT_MAX_RETRY_DELAY = 60 * 60 * 1_000;

const DEFAULT_MAX_RETRY_COUNT = 10;

export function Notifications() {
  const connectionState = useSignalR({
    isStart: true,
    maxRetryDelay: DEFAULT_MAX_RETRY_DELAY,
    restartTime: DEFAULT_RESTART_TIME,
    defaultMaxRetryCount: DEFAULT_MAX_RETRY_COUNT,
    onBuild: () => {
      return new HubConnectionBuilder()
        .withUrl('/hubs/statuses')
        .configureLogging(LogLevel.None)
        // .configureLogging({ log: console.log })
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (context) => {
            if (context.previousRetryCount >= DEFAULT_MAX_RETRY_COUNT) {
              return Math.min(
                exponentialDelay(context.previousRetryCount),
                DEFAULT_MAX_RETRY_DELAY,
              );
            }

            return DEFAULT_RESTART_TIME;
          },
        })
        .build()
    },
    onInit: (connection) => {
      connection.on('NotificationReceived', (notification) => {
        console.log(notification);
      });
    },
    onConnected: (connection) => {
      console.log('Connected', connection.connectionId);
    },
    onReconnecting: (error) => {
      console.warn('Reconnecting', error);
    },
    onReconnected: (connectionId) => {
      console.log('Reconnected', connectionId);
    },
    onError: (error) => {
      console.error('SignalR error', error);
    },
  });

  return <span>{connectionState === HubConnectionState.Connected ? 'Online' : 'Offline'}</span>;
}
```

`onInit` runs once for each connection instance, before its first
`connection.start()`. `onConnected` runs after every successful start. Both
callbacks can be synchronous or return a promise.

## API

`useSignalR(options)` returns a `HubConnectionState` value from `@microsoft/signalr`:
`Disconnected`, `Connecting`, `Connected`, or `Reconnecting`.

The options object is typed as `UseSignalRProps` and can be imported as a type:

```ts
import type { UseSignalRProps } from 'use-signalr';
```

| Option | Required | Description |
| --- | --- | --- |
| `onBuild` | Yes | Creates and returns a `HubConnection`. |
| `onInit` | Yes | Initializes handlers before the first connection start. |
| `onConnected` | Yes | Runs after a successful connection start. |
| `isStart` | No | Starts the connection when `true`; defaults to `undefined`/stopped. |
| `restartTime` | No | Delay between the first retry attempts in milliseconds. Defaults to `10000`. |
| `maxRetryDelay` | No | Delay used after the retry limit is reached. Defaults to `3600000`. |
| `defaultMaxRetryCount` | No | Number of retries using `restartTime`. Defaults to `10`. |
| `onReconnecting` | No | Called when SignalR enters its reconnecting state. |
| `onReconnected` | No | Called when SignalR reconnects successfully. |
| `onError` | No | Called for connection and callback errors. |

Changing `isStart` to `false` stops the current connection. Changing it back
to `true` creates a new `HubConnection` through `onBuild`.
