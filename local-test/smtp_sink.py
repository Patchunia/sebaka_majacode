"""Minimal SMTP sink on 127.0.0.1:1025 for the Spring Boot email-code API.

The API's default SMTP target is localhost:1025. This sink speaks just
enough SMTP (EHLO/HELO, MAIL FROM, RCPT TO, DATA, RSET, QUIT) for
JavaMailSender to believe delivery succeeded, and appends every received
message — headers + body, i.e. the real 6-digit code — to sink_mail.log
next to this script.

Stdlib only (Python 3.12 has no smtpd module, so a tiny raw-socket
server is the portable option).
"""
import socket
import threading
from datetime import datetime
from pathlib import Path

HOST = "127.0.0.1"
PORT = 1025
LOG = Path(__file__).with_name("sink_mail.log")


def handle(conn, addr):
    conn.settimeout(60)
    f = conn.makefile("rb")

    def send(line):
        conn.sendall((line + "\r\n").encode())

    send("220 sink.local ESMTP sink for mail testing")
    in_data = False
    data = []
    while True:
        raw = f.readline()
        if not raw:
            break
        line = raw.decode("utf-8", "replace").rstrip("\r\n")
        if in_data:
            if line == ".":
                in_data = False
                with LOG.open("a", encoding="utf-8") as fh:
                    fh.write("=" * 60 + "\n")
                    fh.write(f"received {datetime.now().isoformat()} from {addr}\n")
                    fh.write("\n".join(data) + "\n")
                send("250 2.0.0 Ok: accepted (local sink)")
            else:
                data.append(line)
            continue
        up = line.upper()
        if up.startswith("EHLO") or up.startswith("HELO"):
            send("250-sink.local")
            send("250-8BITMIME")
            send("250 OK")
        elif up.startswith("MAIL FROM"):
            send("250 2.1.0 Ok")
        elif up.startswith("RCPT TO"):
            send("250 2.1.5 Ok")
        elif up.startswith("DATA"):
            in_data = True
            data = []
            send("354 End data with <CR><LF>.<CR><LF>")
        elif up.startswith("RSET"):
            send("250 2.0.0 Ok")
        elif up.startswith("QUIT"):
            send("221 2.0.0 Bye")
            break
        else:
            send("250 2.0.0 Ok")
    try:
        conn.close()
    except OSError:
        pass


def main():
    srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind((HOST, PORT))
    srv.listen(5)
    print(f"SMTP sink listening on {HOST}:{PORT} (log: {LOG})", flush=True)
    while True:
        conn, addr = srv.accept()
        threading.Thread(target=handle, args=(conn, addr), daemon=True).start()


if __name__ == "__main__":
    main()
