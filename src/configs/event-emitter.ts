import EventEmitter from 'node:events';
import type { AppEvents } from '../types/events.js';

const emitter = new EventEmitter();

export const eventEmitter = {
  emit<K extends keyof AppEvents>(event: K, payload: AppEvents[K]) {
    emitter.emit(event, payload);
  },

  on<K extends keyof AppEvents>(
    event: K,
    listener: (payload: AppEvents[K]) => void,
  ) {
    emitter.on(event, listener);
  },
};
