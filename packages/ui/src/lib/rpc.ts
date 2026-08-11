import type { RpcMethod, RpcNotification } from "@omp/shared";

type Listener = (notif: RpcNotification) => void;

class RpcClient {
  private ws: WebSocket | null = null;
  private nextId = 1;
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();
  private listeners = new Set<Listener>();
  private reconnectDelay = 800;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closed = false;
  onStatus: (connected: boolean) => void = () => {};

  connect(): void {
    this.closed = false;
    this.open();
  }

  private open(): void {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${proto}//${window.location.host}/ws`);
    this.ws = ws;

    ws.onopen = () => {
      this.reconnectDelay = 800;
      this.onStatus(true);
    };

    ws.onmessage = (ev) => {
      let msg: any;
      try {
        msg = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      if (msg && typeof msg.id === "number" && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id)!;
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message));
        else resolve(msg.result);
        return;
      }
      if (msg && msg.event === "agent_event") {
        const notif = msg as RpcNotification;
        for (const l of this.listeners) {
          try {
            l(notif);
          } catch {
            /* listener errors are isolated */
          }
        }
      }
    };

    ws.onclose = () => {
      this.onStatus(false);
      // Reject anything still pending.
      for (const { reject } of this.pending.values()) reject(new Error("worker disconnected"));
      this.pending.clear();
      if (!this.closed) {
        this.reconnectTimer = setTimeout(() => this.open(), this.reconnectDelay);
        this.reconnectDelay = Math.min(this.reconnectDelay * 1.6, 8000);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }

  disconnect(): void {
    this.closed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  call<T = any>(method: RpcMethod, params: Record<string, unknown> = {}): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error("worker not connected"));
        return;
      }
      const id = this.nextId++;
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  onNotification(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

export const rpc = new RpcClient();
