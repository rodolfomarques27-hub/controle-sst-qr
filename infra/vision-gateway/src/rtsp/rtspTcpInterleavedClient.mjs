import {
    createHash,
    randomBytes,
} from "node:crypto";

import {
    Socket,
} from "node:net";

import {
    buildRtspUrl,
    describeRtspEndpoint,
} from "./rtspUrl.mjs";

import {
    createH265RtpDepacketizer,
} from "./h265RtpDepacketizer.mjs";

function requireNonEmptyString(
    value,
    name,
) {
    if (
        typeof value !== "string" ||
        !value.trim()
    ) {
        throw new TypeError(
            `${name} deve ser uma string nao vazia.`,
        );
    }

    return value.trim();
}

function requirePositiveInteger(
    value,
    name,
) {
    if (
        !Number.isSafeInteger(value) ||
        value <= 0
    ) {
        throw new TypeError(
            `${name} deve ser inteiro positivo.`,
        );
    }

    return value;
}

function normalizeCredentials(
    credentials,
) {
    return {
        username:
            requireNonEmptyString(
                credentials?.username,
                "credentials.username",
            ),
        password:
            requireNonEmptyString(
                credentials?.password,
                "credentials.password",
            ),
    };
}

function md5(
    value,
) {
    return createHash(
        "md5",
    )
        .update(
            value,
            "utf8",
        )
        .digest(
            "hex",
        );
}

function parseDigestChallenge(
    header,
) {
    const raw =
        requireNonEmptyString(
            header,
            "www-authenticate",
        );

    if (!/^Digest\s+/i.test(raw)) {
        throw new Error(
            "RTSP_DIGEST_SCHEME_UNSUPPORTED",
        );
    }

    const parameters =
        new Map();

    const body =
        raw.replace(
            /^Digest\s+/i,
            "",
        );

    for (
        const match of
        body.matchAll(
            /([A-Za-z0-9_-]+)\s*=\s*(?:"([^"]*)"|([^,\s]+))/g,
        )
    ) {
        parameters.set(
            match[1].toLowerCase(),
            match[2] ?? match[3] ?? "",
        );
    }

    const realm =
        parameters.get(
            "realm",
        );

    const nonce =
        parameters.get(
            "nonce",
        );

    if (!realm || !nonce) {
        throw new Error(
            "RTSP_DIGEST_CHALLENGE_INCOMPLETE",
        );
    }

    const algorithm =
        (
            parameters.get(
                "algorithm",
            ) ?? "MD5"
        ).toUpperCase();

    if (algorithm !== "MD5") {
        throw new Error(
            "RTSP_DIGEST_ALGORITHM_UNSUPPORTED",
        );
    }

    const qopRaw =
        parameters.get(
            "qop",
        );

    let qop =
        null;

    if (qopRaw) {
        const values =
            qopRaw
                .split(
                    ",",
                )
                .map(
                    (
                        value,
                    ) =>
                        value
                            .trim()
                            .toLowerCase(),
                );

        if (!values.includes("auth")) {
            throw new Error(
                "RTSP_DIGEST_QOP_UNSUPPORTED",
            );
        }

        qop =
            "auth";
    }

    return {
        realm,
        nonce,
        opaque:
            parameters.get(
                "opaque",
            ) ?? null,
        qop,
    };
}

function buildDigestAuthorization({
    challenge,
    username,
    password,
    method,
    uri,
}) {
    const ha1 =
        md5(
            `${username}:${challenge.realm}:${password}`,
        );

    const ha2 =
        md5(
            `${method}:${uri}`,
        );

    let response;
    let cnonce =
        null;

    const nc =
        "00000001";

    if (challenge.qop === "auth") {
        cnonce =
            randomBytes(
                16,
            ).toString(
                "hex",
            );

        response =
            md5(
                `${ha1}:${challenge.nonce}:${nc}:${cnonce}:auth:${ha2}`,
            );
    }
    else {
        response =
            md5(
                `${ha1}:${challenge.nonce}:${ha2}`,
            );
    }

    let header =
        "Digest " +
        `username="${username}", ` +
        `realm="${challenge.realm}", ` +
        `nonce="${challenge.nonce}", ` +
        `uri="${uri}", ` +
        `response="${response}", ` +
        "algorithm=MD5";

    if (challenge.qop === "auth") {
        header +=
            `, qop=auth, nc=${nc}, cnonce="${cnonce}"`;
    }

    if (challenge.opaque) {
        header +=
            `, opaque="${challenge.opaque}"`;
    }

    return header;
}

function parseRtspHeaderBlock(
    text,
) {
    const lines =
        text.split(
            /\r?\n/,
        );

    const statusLine =
        lines.shift()?.trim() ?? "";

    const statusMatch =
        /^RTSP\/\d+\.\d+\s+(\d{3})\b/.exec(
            statusLine,
        );

    if (!statusMatch) {
        throw new Error(
            "RTSP_RESPONSE_STATUS_INVALID",
        );
    }

    const headers =
        new Map();

    for (
        const line of
        lines
    ) {
        if (!line) {
            continue;
        }

        const separator =
            line.indexOf(
                ":",
            );

        if (separator <= 0) {
            continue;
        }

        const name =
            line
                .slice(
                    0,
                    separator,
                )
                .trim()
                .toLowerCase();

        const value =
            line
                .slice(
                    separator + 1,
                )
                .trim();

        if (headers.has(name)) {
            headers.set(
                name,
                `${headers.get(name)},${value}`,
            );
        }
        else {
            headers.set(
                name,
                value,
            );
        }
    }

    return {
        statusCode:
            Number.parseInt(
                statusMatch[1],
                10,
            ),
        headers,
    };
}

function parseSdpVideo(
    sdp,
    aggregateUri,
) {
    const lines =
        String(
            sdp ?? "",
        )
            .split(
                /\r?\n/,
            )
            .map(
                (
                    value,
                ) =>
                    value.trim(),
            )
            .filter(Boolean);

    let inVideo =
        false;

    let control =
        null;

    let payloadType =
        null;

    const fmtpByPayload =
        new Map();

    for (
        const line of
        lines
    ) {
        if (/^m=/i.test(line)) {
            inVideo =
                /^m=video\s+/i.test(
                    line,
                );

            continue;
        }

        if (!inVideo) {
            continue;
        }

        const rtpmap =
            /^a=rtpmap:(\d+)\s+H265\/90000(?:\s|$)/i.exec(
                line,
            );

        if (rtpmap) {
            const candidate =
                Number.parseInt(
                    rtpmap[1],
                    10,
                );

            if (
                payloadType !== null &&
                payloadType !== candidate
            ) {
                throw new Error(
                    "RTSP_SDP_MULTIPLE_H265_PAYLOADS",
                );
            }

            payloadType =
                candidate;

            continue;
        }

        const controlMatch =
            /^a=control:(.+)$/i.exec(
                line,
            );

        if (controlMatch) {
            control =
                controlMatch[1].trim();

            continue;
        }

        const fmtpMatch =
            /^a=fmtp:(\d+)\s+(.+)$/i.exec(
                line,
            );

        if (fmtpMatch) {
            fmtpByPayload.set(
                Number.parseInt(
                    fmtpMatch[1],
                    10,
                ),
                fmtpMatch[2],
            );
        }
    }

    if (
        payloadType === null ||
        !control ||
        control === "*"
    ) {
        throw new Error(
            "RTSP_SDP_H265_TRACK_INCOMPLETE",
        );
    }

    let trackUri;

    if (/^rtsp:\/\//i.test(control)) {
        trackUri =
            control;
    }
    else if (control.startsWith("/")) {
        const aggregate =
            new URL(
                aggregateUri,
            );

        trackUri =
            `rtsp://${aggregate.host}${control}`;
    }
    else {
        trackUri =
            `${aggregateUri.replace(/\/+$/, "")}/${control.replace(/^\/+/, "")}`;
    }

    let donlExpected =
        false;

    const fmtp =
        fmtpByPayload.get(
            payloadType,
        );

    if (fmtp) {
        const match =
            /(?:^|;)\s*sprop-max-don-diff\s*=\s*(\d+)/i.exec(
                fmtp,
            );

        if (match) {
            donlExpected =
                Number.parseInt(
                    match[1],
                    10,
                ) > 0;
        }
    }

    return {
        payloadType,
        trackUri,
        donlExpected,
    };
}

function parseSessionId(
    header,
) {
    const sessionId =
        requireNonEmptyString(
            header,
            "session",
        )
            .split(
                ";",
                1,
            )[0]
            .trim();

    if (
        !sessionId ||
        sessionId.length > 256 ||
        !/^[A-Za-z0-9._~+/=-]+$/.test(
            sessionId,
        )
    ) {
        throw new Error(
            "RTSP_SESSION_INVALID",
        );
    }

    return sessionId;
}

function parseInterleavedChannels(
    transport,
) {
    const match =
        /(?:^|;)\s*interleaved\s*=\s*(\d+)\s*-\s*(\d+)/i.exec(
            String(
                transport ?? "",
            ),
        );

    if (!match) {
        throw new Error(
            "RTSP_INTERLEAVED_CHANNELS_MISSING",
        );
    }

    const rtpChannel =
        Number.parseInt(
            match[1],
            10,
        );

    const rtcpChannel =
        Number.parseInt(
            match[2],
            10,
        );

    if (
        rtpChannel < 0 ||
        rtpChannel > 255 ||
        rtcpChannel < 0 ||
        rtcpChannel > 255 ||
        rtpChannel === rtcpChannel
    ) {
        throw new Error(
            "RTSP_INTERLEAVED_CHANNELS_INVALID",
        );
    }

    return {
        rtpChannel,
        rtcpChannel,
    };
}

export function createRtspTcpInterleavedClient({
    camera,
    credentials = {},
    logger = null,
    socketFactory =
        () => new Socket(),
    depacketizerFactory =
        createH265RtpDepacketizer,
    requestTimeoutMs = 5000,
} = {}) {
    if (
        !camera ||
        typeof camera !== "object"
    ) {
        throw new TypeError(
            "camera e obrigatoria.",
        );
    }

    if (
        typeof socketFactory !==
        "function"
    ) {
        throw new TypeError(
            "socketFactory deve ser funcao.",
        );
    }

    if (
        typeof depacketizerFactory !==
        "function"
    ) {
        throw new TypeError(
            "depacketizerFactory deve ser funcao.",
        );
    }

    const timeoutMs =
        requirePositiveInteger(
            requestTimeoutMs,
            "requestTimeoutMs",
        );

    const cameraId =
        requireNonEmptyString(
            camera.id,
            "camera.id",
        );

    const endpoint =
        describeRtspEndpoint(
            camera.endpoint,
        );

    const aggregateUri =
        buildRtspUrl({
            endpoint:
                camera.endpoint,
        });

    let {
        username,
        password,
    } =
        normalizeCredentials(
            credentials,
        );

    let socket =
        null;

    let receiveBuffer =
        Buffer.alloc(0);

    let challenge =
        null;

    let sessionId =
        null;

    let depacketizer =
        null;

    let rtpChannel =
        null;

    let rtcpChannel =
        null;

    let state =
        "STOPPED";

    let stopRequested =
        false;

    let paused =
        false;

    let playCSeq =
        null;

    let playStatusCode =
        null;

    let interleavedPackets =
        0;

    let annexBChunks =
        0;

    let onAnnexB =
        null;

    let onError =
        null;

    let onClose =
        null;

    const pendingResponses =
        new Map();

    function snapshot() {
        return Object.freeze({
            cameraId,
            state,
            connected:
                Boolean(
                    socket &&
                    !socket.destroyed,
                ),
            paused,
            playStatusCode,
            interleavedPackets,
            annexBChunks,
            depacketizer:
                depacketizer
                    ?.snapshot?.() ??
                null,
        });
    }

    function notifyError(
        error,
    ) {
        if (stopRequested) {
            return;
        }

        logger?.error?.(
            "rtsp.native.error",
            {
                cameraId,
                code:
                    error?.code ??
                    "RTSP_NATIVE_ERROR",
            },
        );

        try {
            onError?.(
                error,
            );
        }
        catch {
            /* Intentionally ignored: best-effort cleanup. */
        }
    }

    function rejectPending(
        error,
    ) {
        for (
            const [
                cseq,
                pending,
            ] of
            pendingResponses
        ) {
            clearTimeout(
                pending.timer,
            );

            pending.reject(
                error,
            );

            pendingResponses.delete(
                cseq,
            );
        }
    }

    function consumeBytes(
        count,
    ) {
        receiveBuffer =
            count >= receiveBuffer.length
                ? Buffer.alloc(0)
                : Buffer.from(
                    receiveBuffer.subarray(
                        count,
                    ),
                );
    }

    function dispatchResponse({
        statusCode,
        headers,
        body,
    }) {
        const cseq =
            Number.parseInt(
                headers.get(
                    "cseq",
                ) ?? "",
                10,
            );

        if (
            Number.isSafeInteger(cseq) &&
            pendingResponses.has(cseq)
        ) {
            const pending =
                pendingResponses.get(
                    cseq,
                );

            pendingResponses.delete(
                cseq,
            );

            clearTimeout(
                pending.timer,
            );

            pending.resolve({
                statusCode,
                headers,
                body,
            });

            return;
        }

        if (cseq === playCSeq) {
            playStatusCode =
                statusCode;

            if (statusCode >= 400) {
                const error =
                    new Error(
                        "RTSP_PLAY_REJECTED",
                    );

                error.code =
                    "RTSP_PLAY_REJECTED";

                notifyError(
                    error,
                );
            }
        }
    }

    function dispatchInterleaved(
        channel,
        packet,
    ) {
        if (channel === rtcpChannel) {
            return;
        }

        if (
            channel !== rtpChannel ||
            !depacketizer
        ) {
            return;
        }

        interleavedPackets +=
            1;

        let chunks;

        try {
            chunks =
                depacketizer.pushRtpPacket(
                    packet,
                );
        }
        catch (error) {
            notifyError(
                error,
            );

            return;
        }

        for (
            const chunk of
            chunks
        ) {
            annexBChunks +=
                1;

            try {
                onAnnexB?.(
                    chunk,
                );
            }
            catch (error) {
                notifyError(
                    error,
                );

                return;
            }
        }
    }

    function parseReceiveBuffer() {
        while (
            receiveBuffer.length > 0
        ) {
            if (paused) {
                return;
            }

            if (
                receiveBuffer[0] ===
                0x24
            ) {
                if (
                    receiveBuffer.length < 4
                ) {
                    return;
                }

                const channel =
                    receiveBuffer[1];

                const payloadLength =
                    receiveBuffer.readUInt16BE(
                        2,
                    );

                const totalLength =
                    4 +
                    payloadLength;

                if (
                    receiveBuffer.length <
                    totalLength
                ) {
                    return;
                }

                const packet =
                    Buffer.from(
                        receiveBuffer.subarray(
                            4,
                            totalLength,
                        ),
                    );

                consumeBytes(
                    totalLength,
                );

                try {
                    dispatchInterleaved(
                        channel,
                        packet,
                    );
                }
                finally {
                    packet.fill(
                        0,
                    );
                }

                continue;
            }

            const headerEnd =
                receiveBuffer.indexOf(
                    "\r\n\r\n",
                );

            if (headerEnd < 0) {
                if (
                    receiveBuffer.length >
                    65536
                ) {
                    const error =
                        new Error(
                            "RTSP_HEADER_LIMIT_EXCEEDED",
                        );

                    error.code =
                        "RTSP_HEADER_LIMIT_EXCEEDED";

                    notifyError(
                        error,
                    );
                }

                return;
            }

            const headerLength =
                headerEnd + 4;

            const headerText =
                receiveBuffer
                    .subarray(
                        0,
                        headerEnd,
                    )
                    .toString(
                        "ascii",
                    );

            let parsedHeader;

            try {
                parsedHeader =
                    parseRtspHeaderBlock(
                        headerText,
                    );
            }
            catch (error) {
                notifyError(
                    error,
                );

                return;
            }

            const contentLength =
                Number.parseInt(
                    parsedHeader.headers.get(
                        "content-length",
                    ) ?? "0",
                    10,
                );

            if (
                !Number.isSafeInteger(
                    contentLength,
                ) ||
                contentLength < 0 ||
                contentLength > 1048576
            ) {
                const error =
                    new Error(
                        "RTSP_CONTENT_LENGTH_INVALID",
                    );

                error.code =
                    "RTSP_CONTENT_LENGTH_INVALID";

                notifyError(
                    error,
                );

                return;
            }

            const totalLength =
                headerLength +
                contentLength;

            if (
                receiveBuffer.length <
                totalLength
            ) {
                return;
            }

            const body =
                contentLength > 0
                    ? receiveBuffer
                        .subarray(
                            headerLength,
                            totalLength,
                        )
                        .toString(
                            "utf8",
                        )
                    : "";

            consumeBytes(
                totalLength,
            );

            dispatchResponse({
                ...parsedHeader,
                body,
            });
        }
    }

    function handleData(
        chunk,
    ) {
        const incoming =
            Buffer.isBuffer(chunk)
                ? chunk
                : Buffer.from(
                    chunk,
                );

        receiveBuffer =
            receiveBuffer.length === 0
                ? Buffer.from(
                    incoming,
                )
                : Buffer.concat([
                    receiveBuffer,
                    incoming,
                ]);

        if (
            receiveBuffer.length >
            2 * 1024 * 1024
        ) {
            const error =
                new Error(
                    "RTSP_RECEIVE_BUFFER_LIMIT_EXCEEDED",
                );

            error.code =
                "RTSP_RECEIVE_BUFFER_LIMIT_EXCEEDED";

            notifyError(
                error,
            );

            socket?.destroy?.();

            return;
        }

        parseReceiveBuffer();
    }

    function waitForResponse(
        cseq,
    ) {
        return new Promise(
            (
                resolve,
                reject,
            ) => {
                const timer =
                    setTimeout(
                        () => {
                            pendingResponses.delete(
                                cseq,
                            );

                            const error =
                                new Error(
                                    "RTSP_RESPONSE_TIMEOUT",
                                );

                            error.code =
                                "RTSP_RESPONSE_TIMEOUT";

                            reject(
                                error,
                            );
                        },
                        timeoutMs,
                    );

                pendingResponses.set(
                    cseq,
                    {
                        resolve,
                        reject,
                        timer,
                    },
                );
            },
        );
    }

    function writeRequest({
        method,
        uri,
        cseq,
        authorization = null,
        headers = {},
    }) {
        if (
            !socket ||
            socket.destroyed
        ) {
            throw new Error(
                "RTSP_SOCKET_NOT_CONNECTED",
            );
        }

        let request =
            `${method} ${uri} RTSP/1.0\r\n` +
            `CSeq: ${cseq}\r\n` +
            "User-Agent: SafeScan-Vision-Gateway\r\n";

        for (
            const [
                name,
                value,
            ] of
            Object.entries(
                headers,
            )
        ) {
            if (
                value === undefined ||
                value === null ||
                value === ""
            ) {
                continue;
            }

            request +=
                `${name}: ${value}\r\n`;
        }

        if (authorization) {
            request +=
                `Authorization: ${authorization}\r\n`;
        }

        request +=
            "\r\n";

        socket.write(
            request,
            "ascii",
        );

    }

    function request({
        method,
        uri,
        cseq,
        authorization = null,
        headers = {},
    }) {
        const responsePromise =
            waitForResponse(
                cseq,
            );

        try {
            writeRequest({
                method,
                uri,
                cseq,
                authorization,
                headers,
            });
        }
        catch (error) {
            const pending =
                pendingResponses.get(
                    cseq,
                );

            if (pending) {
                clearTimeout(
                    pending.timer,
                );

                pendingResponses.delete(
                    cseq,
                );
            }

            throw error;
        }

        return responsePromise;
    }

    async function connectSocket() {
        socket =
            socketFactory({
                host:
                    endpoint.host,
                port:
                    endpoint.port,
            });

        if (
            !socket ||
            typeof socket.on !== "function" ||
            typeof socket.once !== "function" ||
            typeof socket.write !== "function" ||
            typeof socket.connect !== "function"
        ) {
            throw new TypeError(
                "socketFactory retornou socket invalido.",
            );
        }

        socket.on(
            "data",
            handleData,
        );

        socket.on(
            "error",
            (
                error,
            ) => {
                if (state === "CONNECTING") {
                    return;
                }

                notifyError(
                    error,
                );
            },
        );

        socket.on(
            "close",
            () => {
                if (
                    stopRequested ||
                    state === "STOPPED"
                ) {
                    return;
                }

                state =
                    "STOPPED";

                try {
                    onClose?.();
                }
                catch {
                    /* Intentionally ignored: best-effort cleanup. */
                }
            },
        );

        await new Promise(
            (
                resolve,
                reject,
            ) => {
                const timer =
                    setTimeout(
                        () => {
                            cleanup();

                            const error =
                                new Error(
                                    "RTSP_CONNECT_TIMEOUT",
                                );

                            error.code =
                                "RTSP_CONNECT_TIMEOUT";

                            reject(
                                error,
                            );
                        },
                        timeoutMs,
                    );

                function cleanup() {
                    clearTimeout(
                        timer,
                    );

                    socket.off(
                        "connect",
                        handleConnect,
                    );

                    socket.off(
                        "error",
                        handleError,
                    );
                }

                function handleConnect() {
                    cleanup();
                    resolve();
                }

                function handleError(
                    error,
                ) {
                    cleanup();

                    reject(
                        error,
                    );
                }

                socket.once(
                    "connect",
                    handleConnect,
                );

                socket.once(
                    "error",
                    handleError,
                );

                socket.connect(
                    endpoint.port,
                    endpoint.host,
                );
            },
        );

        socket.setNoDelay?.(
            true,
        );
    }

    function requireStatus(
        response,
        expected,
        code,
    ) {
        if (
            response?.statusCode !==
            expected
        ) {
            const error =
                new Error(
                    code,
                );

            error.code =
                code;

            throw error;
        }
    }

    async function start({
        onAnnexB:
            annexBCallback,
        onError:
            errorCallback,
        onClose:
            closeCallback,
    } = {}) {
        if (state !== "STOPPED") {
            throw new Error(
                "RTSP_NATIVE_CLIENT_ALREADY_STARTED",
            );
        }

        if (
            typeof annexBCallback !==
            "function"
        ) {
            throw new TypeError(
                "onAnnexB deve ser funcao.",
            );
        }

        if (
            errorCallback !== undefined &&
            typeof errorCallback !==
                "function"
        ) {
            throw new TypeError(
                "onError deve ser funcao.",
            );
        }

        if (
            closeCallback !== undefined &&
            typeof closeCallback !==
                "function"
        ) {
            throw new TypeError(
                "onClose deve ser funcao.",
            );
        }

        onAnnexB =
            annexBCallback;

        onError =
            errorCallback ?? null;

        onClose =
            closeCallback ?? null;

        stopRequested =
            false;

        playStatusCode =
            null;

        interleavedPackets =
            0;

        annexBChunks =
            0;

        state =
            "CONNECTING";

        try {
            await connectSocket();

            if (stopRequested) {
                throw new Error(
                    "RTSP_NATIVE_CLIENT_STOPPED",
                );
            }

            state =
                "NEGOTIATING";

            const initialDescribe =
                await request({
                    method:
                        "DESCRIBE",
                    uri:
                        aggregateUri,
                    cseq:
                        1,
                    headers:
                        {
                            Accept:
                                "application/sdp",
                        },
                });

            requireStatus(
                initialDescribe,
                401,
                "RTSP_DESCRIBE_CHALLENGE_EXPECTED",
            );

            challenge =
                parseDigestChallenge(
                    initialDescribe.headers.get(
                        "www-authenticate",
                    ),
                );

            const describeAuthorization =
                buildDigestAuthorization({
                    challenge,
                    username,
                    password,
                    method:
                        "DESCRIBE",
                    uri:
                        aggregateUri,
                });

            const describe =
                await request({
                    method:
                        "DESCRIBE",
                    uri:
                        aggregateUri,
                    cseq:
                        2,
                    authorization:
                        describeAuthorization,
                    headers:
                        {
                            Accept:
                                "application/sdp",
                        },
                });

            requireStatus(
                describe,
                200,
                "RTSP_DESCRIBE_FAILED",
            );

            const video =
                parseSdpVideo(
                    describe.body,
                    aggregateUri,
                );

            depacketizer =
                depacketizerFactory({
                    payloadType:
                        video.payloadType,
                    donlExpected:
                        video.donlExpected,
                });

            if (
                !depacketizer ||
                typeof depacketizer.pushRtpPacket !==
                    "function"
            ) {
                throw new TypeError(
                    "depacketizerFactory retornou objeto invalido.",
                );
            }

            const setupAuthorization =
                buildDigestAuthorization({
                    challenge,
                    username,
                    password,
                    method:
                        "SETUP",
                    uri:
                        video.trackUri,
                });

            const setup =
                await request({
                    method:
                        "SETUP",
                    uri:
                        video.trackUri,
                    cseq:
                        3,
                    authorization:
                        setupAuthorization,
                    headers:
                        {
                            Transport:
                                "RTP/AVP/TCP;unicast;interleaved=0-1",
                        },
                });

            requireStatus(
                setup,
                200,
                "RTSP_SETUP_FAILED",
            );

            sessionId =
                parseSessionId(
                    setup.headers.get(
                        "session",
                    ),
                );

            const channels =
                parseInterleavedChannels(
                    setup.headers.get(
                        "transport",
                    ),
                );

            rtpChannel =
                channels.rtpChannel;

            rtcpChannel =
                channels.rtcpChannel;

            const playAuthorization =
                buildDigestAuthorization({
                    challenge,
                    username,
                    password,
                    method:
                        "PLAY",
                    uri:
                        aggregateUri,
                });

            playCSeq =
                4;

            state =
                "STREAMING";

            writeRequest({
                method:
                    "PLAY",
                uri:
                    aggregateUri,
                cseq:
                    playCSeq,
                authorization:
                    playAuthorization,
                headers:
                    {
                        Session:
                            sessionId,
                    },
            });

            logger?.info?.(
                "rtsp.native.streaming",
                {
                    cameraId,
                },
            );

            return snapshot();
        }
        catch (error) {
            await stop({
                sendTeardown:
                    false,
            });

            throw error;
        }
    }

    function pause() {
        if (
            !socket ||
            socket.destroyed ||
            paused
        ) {
            return false;
        }

        socket.pause?.();

        paused =
            true;

        return true;
    }

    function resume() {
        if (
            !socket ||
            socket.destroyed ||
            !paused
        ) {
            return false;
        }

        paused =
            false;

        socket.resume?.();

        parseReceiveBuffer();

        return true;
    }

    async function stop({
        sendTeardown = true,
    } = {}) {
        if (
            state === "STOPPED" &&
            !socket
        ) {
            return false;
        }

        stopRequested =
            true;

        state =
            "STOPPING";

        if (
            sendTeardown &&
            socket &&
            !socket.destroyed &&
            sessionId &&
            challenge
        ) {
            try {
                const authorization =
                    buildDigestAuthorization({
                        challenge,
                        username,
                        password,
                        method:
                            "TEARDOWN",
                        uri:
                            aggregateUri,
                    });

                writeRequest({
                    method:
                        "TEARDOWN",
                    uri:
                        aggregateUri,
                    cseq:
                        5,
                    authorization,
                    headers:
                        {
                            Session:
                                sessionId,
                        },
                });
            }
            catch {
                /* Intentionally ignored: best-effort cleanup. */
            }
        }

        const stopError =
            new Error(
                "RTSP_NATIVE_CLIENT_STOPPED",
            );

        stopError.code =
            "RTSP_NATIVE_CLIENT_STOPPED";

        rejectPending(
            stopError,
        );

        depacketizer?.reset?.();

        if (receiveBuffer.length > 0) {
            receiveBuffer.fill(
                0,
            );
        }

        receiveBuffer =
            Buffer.alloc(0);

        try {
            socket?.end?.();
        }
        catch {
            /* Intentionally ignored: best-effort cleanup. */
        }

        try {
            socket?.destroy?.();
        }
        catch {
            /* Intentionally ignored: best-effort cleanup. */
        }

        socket =
            null;

        depacketizer =
            null;

        challenge =
            null;

        sessionId =
            null;

        rtpChannel =
            null;

        rtcpChannel =
            null;

        playCSeq =
            null;

        paused =
            false;

        onAnnexB =
            null;

        onError =
            null;

        onClose =
            null;

        username =
            "";

        password =
            "";

        state =
            "STOPPED";

        return true;
    }

    return Object.freeze({
        start,
        stop,
        pause,
        resume,
        snapshot,
    });
}
