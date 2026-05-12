import { timePolicy } from '../utils/timePolicy.js';

export class Logger {
  constructor() {
    this.logs = [];
  }

  error(message) {
    this.logs.push({
      loggedAt: timePolicy.getNow().fullDateTimeString,
      level: 'ERROR',
      message
    });
  }

  success(message) {
    this.logs.push({
      loggedAt: timePolicy.getNow().fullDateTimeString,
      level: 'SUCCESS',
      message
    });
  }

  export() {
    return this.logs;
  }
}
