export type DripSendErrorKind = 'auth' | 'quota' | 'recipient' | 'transient';

export class DripSendError extends Error {
  kind: DripSendErrorKind;
  constructor(kind: DripSendErrorKind, message: string) {
    super(message);
    this.kind = kind;
    this.name = 'DripSendError';
  }
}

export class DripConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DripConfigError';
  }
}
