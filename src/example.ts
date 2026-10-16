import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import useSignalR from './hooks';
import {
  DEFAULT_MAX_RETRY_COUNT,
  DEFAULT_MAX_RETRY_DELAY,
  DEFAULT_RESTART_TIME,
} from './hooks/consts';

export const EXPONENTIAL_DELAY_FACTOR = 100;

function exponentialDelay(
  retryCount = 0,
  delayFactor = EXPONENTIAL_DELAY_FACTOR,
) {
  return 2 ** retryCount * delayFactor;
}

useSignalR({
  isStart: true,
  maxRetryDelay: DEFAULT_MAX_RETRY_DELAY,
  restartTime: DEFAULT_RESTART_TIME,
  defaultMaxRetryCount: DEFAULT_MAX_RETRY_COUNT,
  onBuild: () => {
    return (
      new HubConnectionBuilder()
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
    );
  },
  onInit: async () => {
    // connection.on('status', (data: ProjectStatusItem) => {
    //   setStatuses(data);
    // });
  },
  onReconnecting: async () => {
    // const data = await connection.invoke<StatusItem[]>(
    //   EWSMethodNames.dpc,
    // );
    // setStatuses(data);
  },
  onReconnected: async () => {
    // const data = await connection.invoke<StatusItem[]>(
    //   EWSMethodNames.dpc,
    // );
    // setFactoryAvailableStatuses(data);
  },
  onConnected: async () => {
    // const data = await connection.invoke<StatusItem[]>(
    //   EWSMethodNames.dpc,
    // );
    // setStatuses(data);
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onError: (error) => {
    // `Error! ${error}`;
  },
});
