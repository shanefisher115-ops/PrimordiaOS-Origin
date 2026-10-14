import unreal
import socket
import base64
import json
import threading
import queue
import time
import random

class PrimordiaWebSocketBridge:
    def __init__(self, host="127.0.0.1", port=9001):
        self.host = host
        self.port = port
        self.running = True
        self.command_queue = queue.Queue()
        self.start_client()
        self.register_tick()

    def start_client(self):
        def run():
            while self.running:
                try:
                    unreal.log(f"[PrimordiaBridge] Connecting WS to {self.host}:{self.port}/?role=unreal...")
                    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    s.connect((self.host, self.port))

                    sec_key = base64.b64encode(bytes(random.getrandbits(8) for _ in range(16))).decode('utf-8')
                    req = (
                        f"GET /?role=unreal HTTP/1.1\r\n"
                        f"Host: {self.host}:{self.port}\r\n"
                        f"Upgrade: websocket\r\n"
                        f"Connection: Upgrade\r\n"
                        f"Sec-WebSocket-Key: {sec_key}\r\n"
                        f"Sec-WebSocket-Version: 13\r\n\r\n"
                    )
                    s.sendall(req.encode('utf-8'))
                    resp = s.recv(1024).decode('utf-8', errors='ignore')

                    if "101" not in resp:
                        unreal.log_warning(f"[PrimordiaBridge] Handshake failed: {resp.splitlines()[0] if resp else 'None'}")
                        s.close()
                        time.sleep(3)
                        continue

                    unreal.log("[PrimordiaBridge] WebSocket Handshake Established on port 9001!")

                    while self.running:
                        header = s.recv(2)
                        if not header or len(header) < 2:
                            break
                        second_byte = header[1]
                        masked = (second_byte & 0x80) != 0
                        payload_len = second_byte & 0x7F
                        
                        if payload_len == 126:
                            payload_len = int.from_bytes(s.recv(2), 'big')
                        elif payload_len == 127:
                            payload_len = int.from_bytes(s.recv(8), 'big')
                        
                        mask_key = s.recv(4) if masked else b''
                        encoded_data = s.recv(payload_len)
                        
                        if not encoded_data:
                            continue

                        if masked:
                            decoded_data = bytes(b ^ mask_key[i % 4] for i, b in enumerate(encoded_data))
                        else:
                            decoded_data = encoded_data

                        msg_str = decoded_data.decode('utf-8', errors='ignore').strip()
                        if msg_str:
                            self.command_queue.put(msg_str)
                except Exception as e:
                    unreal.log_warning(f"[PrimordiaBridge] WS Error: {e}. Retrying...")
                    time.sleep(3)

        threading.Thread(target=run, daemon=True).start()

    def register_tick(self):
        def on_tick(dt):
            while not self.command_queue.empty():
                try:
                    raw = self.command_queue.get_nowait()
                    data = json.loads(raw)
                    unreal.log(f"[PrimordiaBridge] Manifesting action: {data.get('action', data.get('type', 'unknown'))}")
                except Exception as e:
                    pass
        self.tick_handle = unreal.register_slate_post_tick_callback(on_tick)

_bridge_instance = PrimordiaWebSocketBridge()
