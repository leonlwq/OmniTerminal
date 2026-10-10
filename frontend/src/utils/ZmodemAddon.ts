// @ts-ignore
import * as Zmodem from 'zmodem.js/src/zmodem_browser';
import { Terminal } from '@xterm/xterm';
import { SaveZmodemFile, OpenZmodemFiles } from '../../wailsjs/go/app/App';

function base64ToBytes(base64: string): Uint8Array {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    const chunkSize = 8192;
    for (let i = 0; i < len; i += chunkSize) {
        binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
    }
    return window.btoa(binary);
}

export class ZmodemAddon {
    private term: Terminal;
    private sendData: (data: Uint8Array) => void;
    private onNormalData: (data: Uint8Array) => void;
    private sentry: any;
    private session: any;

    constructor(options: {
        term: Terminal,
        sendData: (data: Uint8Array) => void,
        onNormalData: (data: Uint8Array) => void
    }) {
        this.term = options.term;
        this.sendData = options.sendData;
        this.onNormalData = options.onNormalData;

        // Create Zmodem Sentry
        this.sentry = new Zmodem.Sentry({
            to_terminal: (octets: number[]) => {
                this.onNormalData(new Uint8Array(octets));
            },
            sender: (octets: number[]) => {
                this.sendData(new Uint8Array(octets));
            },
            on_detect: (detection: any) => {
                const zsession = detection.confirm();
                this.session = zsession;

                if (zsession.type === 'receive') {
                    zsession.on("offer", (xfer: any) => {
                        this.handleOffer(xfer);
                    });
                    const promise = zsession.start();
                    promise.then(() => {
                        this.session = null;
                    }).catch((err: any) => {
                        console.error("ZMODEM Session error", err);
                        this.session = null;
                    });
                } else if (zsession.type === 'send') {
                    // Patch session to ignore stray ZACK headers caused by keepalive race conditions
                    const originalConsumeHeader = (zsession as any)._consume_header;
                    if (originalConsumeHeader) {
                        (zsession as any)._consume_header = function(new_header: any) {
                            if (new_header.NAME === "ZACK" && (!this._next_header_handler || !this._next_header_handler["ZACK"])) {
                                console.warn("[ZMODEM] Ignoring stray ZACK header");
                                return;
                            }
                            return originalConsumeHeader.apply(this, arguments);
                        };
                    }
                    this.triggerUpload();
                }
            },
            on_retract: () => {
                console.log("ZMODEM offer retracted");
            }
        });
    }

    public consume(data: Uint8Array) {
        try {
            this.sentry.consume(data);
        } catch (err) {
            console.error("ZMODEM consume error", err);
            this.term.write("\r\n\x1b[31m[ZMODEM Error] " + err + "\x1b[0m\r\n");
        }
    }

    private handleOffer(xfer: any) {
        const details = xfer.get_details();
        const name = details.name;
        
        const chunks: Uint8Array[] = [];
        
        xfer.on("input", (chunk: Uint8Array) => {
            chunks.push(chunk);
        });

        xfer.accept().then(() => {
            const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
            const merged = new Uint8Array(totalLength);
            let offset = 0;
            for (const c of chunks) {
                merged.set(c, offset);
                offset += c.length;
            }

            const b64Data = bytesToBase64(merged);
            SaveZmodemFile(name, b64Data).then(() => {
                this.term.write(`\r\n\x1b[32m[ZMODEM] 文件下载完成: ${name}\x1b[0m\r\n`);
            }).catch((err: any) => {
                console.error("SaveZmodemFile failed", err);
                this.term.write(`\r\n\x1b[31m[ZMODEM] 保存文件出错: ${err}\x1b[0m\r\n`);
            });
        }).catch((err: any) => {
            console.error("ZMODEM download error", err);
            this.term.write(`\r\n\x1b[31m[ZMODEM] 下载出错: ${err}\x1b[0m\r\n`);
        });
    }

    public triggerUpload() {
        if (!this.session || this.session.type !== 'send') {
            this.term.write("\r\n\x1b[33m[ZMODEM] 未检测到上传会话，请先执行 rz 命令\x1b[0m\r\n");
            return;
        }

        OpenZmodemFiles().then((zfiles) => {
            if (!zfiles || zfiles.length === 0) {
                // User cancelled file selection
                this.session.abort();
                this.session = null;
                return;
            }

            const files = zfiles.map(zf => {
                const bytes = base64ToBytes(zf.content);
                return new File([bytes as any], zf.name);
            });

            Zmodem.Browser.send_files(this.session, files, {
                on_offer_response: (obj: any, xfer: any) => {
                    if (xfer) {
                        this.term.write(`\r\n\x1b[34m[ZMODEM] 正在上传: ${xfer.get_details().name} ...\x1b[0m\r\n`);
                    } else {
                        this.term.write(`\r\n\x1b[33m[ZMODEM] 上传跳过。\x1b[0m\r\n`);
                    }
                },
                on_progress: (obj: any, xfer: any, chunk: any) => {
                    // Progress could be handled here
                },
                on_file_complete: (obj: any, xfer: any) => {
                    this.term.write(`\r\n\x1b[32m[ZMODEM] 上传完成: ${xfer.get_details().name}\x1b[0m\r\n`);
                }
            }).then(() => {
                this.session.close();
                this.session = null;
            }).catch((err: any) => {
                this.term.write(`\r\n\x1b[31m[ZMODEM] 上传失败: ${err}\x1b[0m\r\n`);
                this.session = null;
            });
        }).catch((err) => {
             this.term.write(`\r\n\x1b[31m[ZMODEM] 读取文件失败: ${err}\x1b[0m\r\n`);
             this.session.abort();
             this.session = null;
        });
    }
}
