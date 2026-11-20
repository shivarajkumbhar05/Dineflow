import { io } from 'socket.io-client';
import { API_URL } from './api';

/** Staff pass their JWT; customers connect anonymously and emit `track:order`. */
export const connectSocket = (token) =>
  io(API_URL, { auth: token ? { token } : {}, transports: ['websocket', 'polling'], reconnectionDelayMax: 5000 });
