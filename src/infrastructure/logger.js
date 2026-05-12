import { timePolicy } from '../utils/timePolicy.js';

export class Logger {
  constructor() {
    this.logs = [];
  }

  error(message) {
    this.logs.push({
      timestamp: timePolicy.getNow().shortDateTimeString,
      level: 'ERROR',
      message
    });
  }

  success(message) {
    this.logs.push({
      timestamp: timePolicy.getNow().shortDateTimeString,
      level: 'SUCCESS',
      message
    });
  }

  export() {
    return this.logs;
  }
}
