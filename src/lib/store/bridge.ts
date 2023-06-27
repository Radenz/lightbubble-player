import {
  writable,
  type Subscriber,
  type Unsubscriber,
  type Updater,
  type Writable,
  get
} from 'svelte/store';

export type BridgeKind = 'in' | 'out';
export type BridgeFlow = 'in' | 'out' | 'both' | 'none';
export type BridgeRelativeFlow = 'self' | 'other' | 'both' | 'none';

/**
 * Pipe-like store couple which can be synchronized and desynchronized
 * on demand.
 */
export class Bridge<T> implements Writable<T> {
  private store: Writable<T>;
  public other: Bridge<T>;
  private kind: BridgeKind;
  private flow: BridgeFlow;
  public subscribe: (this: void, run: Subscriber<T>) => Unsubscriber;
  public set: (this: void, value: T) => void;
  public update: (this: void, updater: Updater<T>) => void;

  private constructor(initial: T) {
    this.store = writable(initial);
    this.other = this;
    this.flow = 'both';
    this.kind = 'in';

    this.subscribe = this.store.subscribe;
    this.update = this.store.update;
    this.set = this.store.set;

    this.store.subscribe((value) => {
      this.onChanged(value);
    });
  }

  private static fromOther<T>(other: Bridge<T>): Bridge<T> {
    const newBridge = new Bridge<T>(get(other.store));
    newBridge.flow = other.flow;
    newBridge.kind = other.kind === 'in' ? 'out' : 'in';
    newBridge.other = other;
    other.other = newBridge;
    return newBridge;
  }

  public static create<T>(initial: T): Bridge<T> {
    const bridge = new Bridge<T>(initial);
    Bridge.fromOther(bridge);
    return bridge;
  }

  public setFlow(flow: BridgeFlow) {
    this.flow = flow;
    this.other.flow = flow;
  }

  public setRelativeFlow(flow: BridgeRelativeFlow) {
    let actualFlow: BridgeFlow = 'both';
    if (flow === 'self') {
      actualFlow = this.kind;
    } else if (flow === 'other') {
      actualFlow = this.other.kind;
    } else {
      actualFlow = flow;
    }
    this.setFlow(actualFlow);
  }

  private onChanged(value: T) {
    if (this.flow === 'both' || this.flow === this.other.kind) {
      this.other.store.set(value);
      return;
    }
  }

  get value() {
    return get(this.store);
  }
}

export function bridge<T>(initial: T): Bridge<T> {
  return Bridge.create(initial);
}
