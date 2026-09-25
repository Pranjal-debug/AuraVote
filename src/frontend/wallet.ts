/**
 * Lace Wallet & Midnight DApp Connector Integration
 * Supports both live Lace extension and simulated Preprod testnet modes
 */

export interface WalletState {
  isConnected: boolean;
  address: string;
  dustBalance: string;
  tnightBalance: string;
  network: 'preprod' | 'preview' | 'mainnet';
  isLaceExtensionDetected: boolean;
}

export class MidnightLaceConnector {
  private state: WalletState = {
    isConnected: false,
    address: 'addr_preprod1qx37k9v0034a7428m9z7x',
    dustBalance: '4,850 DUST',
    tnightBalance: '120.5 tNIGHT',
    network: 'preprod',
    isLaceExtensionDetected: false
  };

  private listeners: ((state: WalletState) => void)[] = [];

  constructor() {
    this.checkExtension();
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('auravote_wallet_connected');
      if (stored === 'true') {
        this.state.isConnected = true;
      }
    }
  }

  public checkExtension(): boolean {
    if (typeof window !== 'undefined') {
      const win = window as any;
      this.state.isLaceExtensionDetected = !!(win.midnight?.mnLace || win.cardano?.lace);
    }
    return this.state.isLaceExtensionDetected;
  }

  public subscribe(listener: (state: WalletState) => void) {
    this.listeners.push(listener);
    listener(this.state);
  }

  private notify() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  public async connect(): Promise<WalletState> {
    const win = typeof window !== 'undefined' ? (window as any) : {};
    if (win.midnight?.mnLace) {
      try {
        const api = await win.midnight.mnLace.enable();
        const accounts = await api.getAccounts?.();
        if (accounts && accounts.length > 0) {
          this.state.address = accounts[0];
        }
      } catch (e) {
        console.warn('Lace connector prompt rejected, using Preprod testnet state:', e);
      }
    }

    this.state.isConnected = true;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('auravote_wallet_connected', 'true');
    }
    this.notify();
    return this.state;
  }

  public disconnect(): WalletState {
    this.state.isConnected = false;
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('auravote_wallet_connected');
    }
    this.notify();
    return this.state;
  }

  public getState(): WalletState {
    return { ...this.state };
  }
}

export const laceConnector = new MidnightLaceConnector();
