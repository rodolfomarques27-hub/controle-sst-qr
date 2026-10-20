import test from "node:test";
import assert from "node:assert/strict";

import {
    EventEmitter,
} from "node:events";

import {
    createH265RtpDepacketizer,
} from "../src/rtsp/h265RtpDepacketizer.mjs";

import {
    createRtspTcpInterleavedClient,
} from "../src/rtsp/rtspTcpInterleavedClient.mjs";

function createRtpPacket({
    sequence,
    payload,
    payloadType = 96,
} = {}) {
    const packet =
        Buffer.alloc(
            12 +
            payload.length,
        );

    packet[0] =
        0x80;

    packet[1] =
        payloadType;

    packet.writeUInt16BE(
        sequence,
        2,
    );

    packet.writeUInt32BE(
        1,
        4,
    );

    packet.writeUInt32BE(
        2,
        8,
    );

    payload.copy(
        packet,
        12,
    );

    return packet;
}

function createInterleaved(
    channel,
    packet,
) {
    const output =
        Buffer.alloc(
            4 +
            packet.length,
        );

    output[0] =
        0x24;

    output[1] =
        channel;

    output.writeUInt16BE(
        packet.length,
        2,
    );

    packet.copy(
        output,
        4,
    );

    return output;
}

function response({
    status = "200 OK",
    cseq,
    headers = {},
    body = "",
}) {
    let text =
        `RTSP/1.0 ${status}\r\n` +
        `CSeq: ${cseq}\r\n`;

    for (
        const [
            name,
            value,
        ] of
        Object.entries(
            headers,
        )
    ) {
        text +=
            `${name}: ${value}\r\n`;
    }

    text +=
        `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n` +
        body;

    return Buffer.from(
        text,
        "utf8",
    );
}

class FakeSocket extends EventEmitter {
    constructor() {
        super();

        this.destroyed =
            false;

        this.writable =
            true;

        this.paused =
            false;

        this.requests =
            [];
    }

    connect() {
        queueMicrotask(
            () => {
                this.emit(
                    "connect",
                );
            },
        );

        return this;
    }

    setNoDelay() {
    }

    write(
        value,
    ) {
        const request =
            String(
                value,
            );

        this.requests.push(
            request,
        );

        const match =
            /^(\w+)\s+[^\s]+\s+RTSP\/1\.0[\s\S]*?\r\nCSeq:\s*(\d+)/.exec(
                request,
            );

        if (match) {
            const method =
                match[1];

            const cseq =
                Number.parseInt(
                    match[2],
                    10,
                );

            queueMicrotask(
                () => {
                    this.respond(
                        method,
                        cseq,
                    );
                },
            );
        }

        return true;
    }

    respond(
        method,
        cseq,
    ) {
        if (
            method === "DESCRIBE" &&
            cseq === 1
        ) {
            this.emit(
                "data",
                response({
                    status:
                        "401 Unauthorized",
                    cseq,
                    headers:
                        {
                            "WWW-Authenticate":
                                'Digest realm="cam", nonce="nonce", algorithm=MD5',
                        },
                }),
            );

            return;
        }

        if (
            method === "DESCRIBE" &&
            cseq === 2
        ) {
            const body =
                "v=0\r\n" +
                "m=video 0 RTP/AVP 96\r\n" +
                "a=rtpmap:96 H265/90000\r\n" +
                "a=fmtp:96 profile-id=1\r\n" +
                "a=control:track1\r\n";

            this.emit(
                "data",
                response({
                    cseq,
                    headers:
                        {
                            "Content-Type":
                                "application/sdp",
                        },
                    body,
                }),
            );

            return;
        }

        if (method === "SETUP") {
            this.emit(
                "data",
                response({
                    cseq,
                    headers:
                        {
                            Session:
                                "S1",
                            Transport:
                                "RTP/AVP/TCP;unicast;interleaved=0-1",
                        },
                }),
            );

            return;
        }

        if (method === "PLAY") {
            const nal =
                Buffer.from([
                    32 << 1,
                    1,
                    0xaa,
                ]);

            const packet =
                createRtpPacket({
                    sequence:
                        1,
                    payload:
                        nal,
                });

            this.emit(
                "data",
                createInterleaved(
                    0,
                    packet,
                ),
            );

            this.emit(
                "data",
                response({
                    cseq,
                }),
            );
        }
    }

    pause() {
        this.paused =
            true;

        return this;
    }

    resume() {
        this.paused =
            false;

        return this;
    }

    end() {
        this.writable =
            false;

        return this;
    }

    destroy() {
        if (!this.destroyed) {
            this.destroyed =
                true;

            queueMicrotask(
                () => {
                    this.emit(
                        "close",
                    );
                },
            );
        }

        return this;
    }
}

test(
    "depacketizer converte Single NAL, AP e FU para Annex-B",
    () => {
        const depacketizer =
            createH265RtpDepacketizer({
                payloadType:
                    96,
            });

        const vps =
            Buffer.from([
                32 << 1,
                1,
                0x10,
            ]);

        const single =
            depacketizer.pushRtpPacket(
                createRtpPacket({
                    sequence:
                        1,
                    payload:
                        vps,
                }),
            );

        assert.deepEqual(
            Array.from(
                single[0],
            ),
            [
                0,
                0,
                0,
                1,
                64,
                1,
                16,
            ],
        );

        const sps =
            Buffer.from([
                33 << 1,
                1,
                0x20,
            ]);

        const pps =
            Buffer.from([
                34 << 1,
                1,
                0x30,
            ]);

        const ap =
            Buffer.concat([
                Buffer.from([
                    48 << 1,
                    1,
                    0,
                    sps.length,
                ]),
                sps,
                Buffer.from([
                    0,
                    pps.length,
                ]),
                pps,
            ]);

        const aggregated =
            depacketizer.pushRtpPacket(
                createRtpPacket({
                    sequence:
                        2,
                    payload:
                        ap,
                }),
            );

        assert.equal(
            aggregated.length,
            2,
        );

        const fuIndicator =
            Buffer.from([
                49 << 1,
                1,
            ]);

        const start =
            depacketizer.pushRtpPacket(
                createRtpPacket({
                    sequence:
                        10,
                    payload:
                        Buffer.concat([
                            fuIndicator,
                            Buffer.from([
                                0x80 | 19,
                                1,
                                2,
                            ]),
                        ]),
                }),
            );

        assert.equal(
            (
                start[0][4] >>> 1
            ) & 0x3f,
            19,
        );

        const middle =
            depacketizer.pushRtpPacket(
                createRtpPacket({
                    sequence:
                        11,
                    payload:
                        Buffer.concat([
                            fuIndicator,
                            Buffer.from([
                                19,
                                3,
                            ]),
                        ]),
                }),
            );

        assert.deepEqual(
            Array.from(
                middle[0],
            ),
            [
                3,
            ],
        );

        const end =
            depacketizer.pushRtpPacket(
                createRtpPacket({
                    sequence:
                        12,
                    payload:
                        Buffer.concat([
                            fuIndicator,
                            Buffer.from([
                                0x40 | 19,
                                4,
                            ]),
                        ]),
                }),
            );

        assert.deepEqual(
            Array.from(
                end[0],
            ),
            [
                4,
            ],
        );

        const snapshot =
            depacketizer.snapshot();

        assert.equal(
            snapshot.vps,
            1,
        );

        assert.equal(
            snapshot.sps,
            1,
        );

        assert.equal(
            snapshot.pps,
            1,
        );

        assert.equal(
            snapshot.idr19,
            1,
        );

        assert.equal(
            snapshot.malformed,
            0,
        );
    },
);

test(
    "FU fora de sequencia e descartado sem crash",
    () => {
        const depacketizer =
            createH265RtpDepacketizer({
                payloadType:
                    96,
            });

        const indicator =
            Buffer.from([
                49 << 1,
                1,
            ]);

        depacketizer.pushRtpPacket(
            createRtpPacket({
                sequence:
                    20,
                payload:
                    Buffer.concat([
                        indicator,
                        Buffer.from([
                            0x80 | 19,
                            1,
                        ]),
                    ]),
            }),
        );

        const result =
            depacketizer.pushRtpPacket(
                createRtpPacket({
                    sequence:
                        22,
                    payload:
                        Buffer.concat([
                            indicator,
                            Buffer.from([
                                19,
                                2,
                            ]),
                        ]),
                }),
            );

        assert.deepEqual(
            result,
            [],
        );

        assert.equal(
            depacketizer
                .snapshot()
                .malformed,
            1,
        );
    },
);

test(
    "cliente aceita RTP interleaved antes do PLAY 200",
    async () => {
        const socket =
            new FakeSocket();

        const chunks =
            [];

        const errors =
            [];

        const client =
            createRtspTcpInterleavedClient({
                camera:
                    {
                        id:
                            "camera-test",
                        endpoint:
                            {
                                host:
                                    "127.0.0.1",
                                port:
                                    554,
                                path:
                                    "/onvif1",
                                transport:
                                    "tcp",
                            },
                    },
                credentials:
                    {
                        username:
                            "admin",
                        password:
                            "secret",
                    },
                socketFactory:
                    () => socket,
            });

        const started =
            await client.start({
                onAnnexB(
                    chunk,
                ) {
                    chunks.push(
                        Buffer.from(
                            chunk,
                        ),
                    );
                },
                onError(
                    error,
                ) {
                    errors.push(
                        error,
                    );
                },
            });

        assert.equal(
            started.state,
            "STREAMING",
        );

        await Promise.resolve();
        await Promise.resolve();

        assert.equal(
            chunks.length,
            1,
        );

        assert.deepEqual(
            Array.from(
                chunks[0]
                    .subarray(
                        0,
                        7,
                    ),
            ),
            [
                0,
                0,
                0,
                1,
                64,
                1,
                170,
            ],
        );

        assert.equal(
            client
                .snapshot()
                .playStatusCode,
            200,
        );

        assert.equal(
            errors.length,
            0,
        );

        assert.equal(
            client.pause(),
            true,
        );

        assert.equal(
            socket.paused,
            true,
        );

        assert.equal(
            client.resume(),
            true,
        );

        assert.equal(
            socket.paused,
            false,
        );

        assert.equal(
            await client.stop(),
            true,
        );

        assert.equal(
            socket.requests.some(
                (
                    request,
                ) =>
                    request.startsWith(
                        "TEARDOWN ",
                    ),
            ),
            true,
        );
    },
);
