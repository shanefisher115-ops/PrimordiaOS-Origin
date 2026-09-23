/**
 * Ambient type declarations for Express and WS
 * Ensures seamless compilation across environments before external typings are fetched.
 */

declare module 'express' {
  import { Server } from 'node:http';

  export interface Request {
    body?: any;
    params?: any;
    query?: any;
    headers?: Record<string, string | string[] | undefined>;
  }

  export interface Response {
    status(code: number): this;
    json(data: any): this;
    send(body: any): this;
    type(contentType: string): this;
  }

  export interface Application {
    (req: any, res: any): void;
    use(...args: any[]): any;
    get(path: string, handler: (req: Request, res: Response) => void): any;
    post(path: string, handler: (req: Request, res: Response) => void): any;
    put(path: string, handler: (req: Request, res: Response) => void): any;
    delete(path: string, handler: (req: Request, res: Response) => void): any;
    listen(port: number, callback?: () => void): Server;
  }

  export type Express = Application;

  function express(): Application;
  namespace express {
    export function json(): any;
    export function urlencoded(options?: any): any;
  }

  export default express;
}

declare module 'ws' {
  import { EventEmitter } from 'node:events';
  import { Server as HttpServer } from 'node:http';

  export namespace WebSocket {
    export type RawData = Buffer | ArrayBuffer | Buffer[];
  }

  export class WebSocket extends EventEmitter {
    static readonly CONNECTING: number;
    static readonly OPEN: number;
    static readonly CLOSING: number;
    static readonly CLOSED: number;

    constructor(address: string, protocols?: any);

    readyState: number;
    send(data: any, cb?: (err?: Error) => void): void;
    close(code?: number, reason?: string): void;
  }

  export class WebSocketServer extends EventEmitter {
    constructor(options?: { server?: HttpServer; port?: number; path?: string });
    clients: Set<WebSocket>;
    close(cb?: (err?: Error) => void): void;
  }

  export default WebSocket;
}
