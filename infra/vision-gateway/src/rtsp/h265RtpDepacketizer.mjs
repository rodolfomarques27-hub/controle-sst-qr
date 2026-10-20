const ANNEX_B_START_CODE =
    Buffer.from([
        0x00,
        0x00,
        0x00,
        0x01,
    ]);

function requirePayloadType(
    value,
) {
    const payloadType =
        Number(value);

    if (
        !Number.isInteger(payloadType) ||
        payloadType < 0 ||
        payloadType > 127
    ) {
        throw new TypeError(
            "payloadType deve estar entre 0 e 127.",
        );
    }

    return payloadType;
}

function toBuffer(
    value,
) {
    if (Buffer.isBuffer(value)) {
        return value;
    }

    if (value instanceof Uint8Array) {
        return Buffer.from(
            value.buffer,
            value.byteOffset,
            value.byteLength,
        );
    }

    throw new TypeError(
        "packet deve ser Buffer ou Uint8Array.",
    );
}

function annexB(
    nalUnit,
) {
    const output =
        Buffer.allocUnsafe(
            ANNEX_B_START_CODE.length +
            nalUnit.length,
        );

    ANNEX_B_START_CODE.copy(
        output,
        0,
    );

    nalUnit.copy(
        output,
        ANNEX_B_START_CODE.length,
    );

    return output;
}

function parseRtpPacket(
    packet,
) {
    if (packet.length < 12) {
        return null;
    }

    const version =
        packet[0] >>> 6;

    if (version !== 2) {
        return null;
    }

    const csrcCount =
        packet[0] & 0x0f;

    const hasExtension =
        Boolean(
            packet[0] & 0x10,
        );

    const hasPadding =
        Boolean(
            packet[0] & 0x20,
        );

    let offset =
        12 +
        csrcCount * 4;

    if (offset > packet.length) {
        return null;
    }

    if (hasExtension) {
        if (
            offset + 4 >
            packet.length
        ) {
            return null;
        }

        const extensionWords =
            packet.readUInt16BE(
                offset + 2,
            );

        offset +=
            4 +
            extensionWords * 4;

        if (offset > packet.length) {
            return null;
        }
    }

    let payloadEnd =
        packet.length;

    if (hasPadding) {
        if (payloadEnd <= offset) {
            return null;
        }

        const paddingBytes =
            packet[
                payloadEnd - 1
            ];

        if (
            paddingBytes <= 0 ||
            paddingBytes >
                payloadEnd - offset
        ) {
            return null;
        }

        payloadEnd -=
            paddingBytes;
    }

    if (payloadEnd <= offset) {
        return null;
    }

    return {
        sequence:
            packet.readUInt16BE(
                2,
            ),
        payloadType:
            packet[1] & 0x7f,
        payload:
            packet.subarray(
                offset,
                payloadEnd,
            ),
    };
}

function nextSequence(
    value,
) {
    return (
        value + 1
    ) & 0xffff;
}

export function createH265RtpDepacketizer({
    payloadType,
    donlExpected = false,
} = {}) {
    const normalizedPayloadType =
        requirePayloadType(
            payloadType,
        );

    if (
        typeof donlExpected !==
        "boolean"
    ) {
        throw new TypeError(
            "donlExpected deve ser boolean.",
        );
    }

    const stats = {
        packets:
            0,
        emittedChunks:
            0,
        malformed:
            0,
        ignoredPayloadType:
            0,
        unsupportedPacketization:
            0,
        singleNal:
            0,
        ap:
            0,
        fu:
            0,
        vps:
            0,
        sps:
            0,
        pps:
            0,
        idr19:
            0,
        idr20:
            0,
        cra21:
            0,
        otherVcl:
            0,
    };

    let fuActive =
        false;

    let fuNalType =
        null;

    let fuNextSequence =
        null;

    function resetFu() {
        fuActive =
            false;

        fuNalType =
            null;

        fuNextSequence =
            null;
    }

    function markMalformed() {
        stats.malformed +=
            1;

        resetFu();

        return [];
    }

    function recordNalType(
        nalType,
    ) {
        switch (nalType) {
            case 32:
                stats.vps +=
                    1;
                break;

            case 33:
                stats.sps +=
                    1;
                break;

            case 34:
                stats.pps +=
                    1;
                break;

            case 19:
                stats.idr19 +=
                    1;
                break;

            case 20:
                stats.idr20 +=
                    1;
                break;

            case 21:
                stats.cra21 +=
                    1;
                break;

            default:
                if (
                    nalType >= 0 &&
                    nalType <= 31
                ) {
                    stats.otherVcl +=
                        1;
                }
        }
    }

    function emit(
        chunks,
    ) {
        stats.emittedChunks +=
            chunks.length;

        return chunks;
    }

    function handleSingleNal(
        payload,
        nalType,
    ) {
        resetFu();

        stats.singleNal +=
            1;

        recordNalType(
            nalType,
        );

        return emit([
            annexB(
                payload,
            ),
        ]);
    }

    function handleAggregationPacket(
        payload,
    ) {
        resetFu();

        stats.ap +=
            1;

        let offset =
            2;

        if (donlExpected) {
            if (
                offset + 2 >
                payload.length
            ) {
                return markMalformed();
            }

            offset +=
                2;
        }

        const nalUnits =
            [];

        let firstNal =
            true;

        while (
            offset <
            payload.length
        ) {
            if (
                donlExpected &&
                !firstNal
            ) {
                if (
                    offset + 1 >
                    payload.length
                ) {
                    return markMalformed();
                }

                offset +=
                    1;
            }

            if (
                offset + 2 >
                payload.length
            ) {
                return markMalformed();
            }

            const nalSize =
                payload.readUInt16BE(
                    offset,
                );

            offset +=
                2;

            if (
                nalSize < 2 ||
                offset + nalSize >
                    payload.length
            ) {
                return markMalformed();
            }

            nalUnits.push(
                Buffer.from(
                    payload.subarray(
                        offset,
                        offset + nalSize,
                    ),
                ),
            );

            offset +=
                nalSize;

            firstNal =
                false;
        }

        if (nalUnits.length === 0) {
            return markMalformed();
        }

        const chunks =
            [];

        for (
            const nalUnit of
            nalUnits
        ) {
            const nalType =
                (
                    nalUnit[0] >>> 1
                ) & 0x3f;

            recordNalType(
                nalType,
            );

            chunks.push(
                annexB(
                    nalUnit,
                ),
            );
        }

        return emit(
            chunks,
        );
    }

    function handleFragmentationUnit(
        payload,
        sequence,
    ) {
        stats.fu +=
            1;

        let offset =
            3;

        if (
            payload.length <
            offset
        ) {
            return markMalformed();
        }

        const fuHeader =
            payload[2];

        const start =
            Boolean(
                fuHeader & 0x80,
            );

        const end =
            Boolean(
                fuHeader & 0x40,
            );

        const nalType =
            fuHeader & 0x3f;

        if (nalType > 47) {
            return markMalformed();
        }

        if (donlExpected) {
            if (
                offset + 2 >
                payload.length
            ) {
                return markMalformed();
            }

            offset +=
                2;
        }

        if (offset >= payload.length) {
            return markMalformed();
        }

        const fragment =
            payload.subarray(
                offset,
            );

        if (start) {
            fuActive =
                true;

            fuNalType =
                nalType;

            fuNextSequence =
                nextSequence(
                    sequence,
                );

            recordNalType(
                nalType,
            );

            const reconstructedHeader =
                Buffer.from([
                    (
                        payload[0] & 0x81
                    ) |
                    (
                        nalType << 1
                    ),
                    payload[1],
                ]);

            const nalUnit =
                Buffer.allocUnsafe(
                    reconstructedHeader.length +
                    fragment.length,
                );

            reconstructedHeader.copy(
                nalUnit,
                0,
            );

            fragment.copy(
                nalUnit,
                reconstructedHeader.length,
            );

            const output =
                annexB(
                    nalUnit,
                );

            reconstructedHeader.fill(
                0,
            );

            nalUnit.fill(
                0,
            );

            if (end) {
                resetFu();
            }

            return emit([
                output,
            ]);
        }

        if (
            !fuActive ||
            fuNalType !== nalType ||
            fuNextSequence !== sequence
        ) {
            return markMalformed();
        }

        fuNextSequence =
            nextSequence(
                sequence,
            );

        const output =
            Buffer.from(
                fragment,
            );

        if (end) {
            resetFu();
        }

        return emit([
            output,
        ]);
    }

    function pushRtpPacket(
        value,
    ) {
        stats.packets +=
            1;

        const packet =
            toBuffer(
                value,
            );

        const parsed =
            parseRtpPacket(
                packet,
            );

        if (!parsed) {
            return markMalformed();
        }

        if (
            parsed.payloadType !==
            normalizedPayloadType
        ) {
            stats.ignoredPayloadType +=
                1;

            return [];
        }

        const payload =
            parsed.payload;

        if (payload.length < 2) {
            return markMalformed();
        }

        const nalType =
            (
                payload[0] >>> 1
            ) & 0x3f;

        if (
            nalType >= 0 &&
            nalType <= 47
        ) {
            return handleSingleNal(
                payload,
                nalType,
            );
        }

        if (nalType === 48) {
            return handleAggregationPacket(
                payload,
            );
        }

        if (nalType === 49) {
            return handleFragmentationUnit(
                payload,
                parsed.sequence,
            );
        }

        stats.unsupportedPacketization +=
            1;

        resetFu();

        return [];
    }

    function snapshot() {
        return Object.freeze({
            payloadType:
                normalizedPayloadType,
            donlExpected,
            fuActive,
            ...stats,
        });
    }

    function reset() {
        resetFu();
    }

    return Object.freeze({
        pushRtpPacket,
        snapshot,
        reset,
    });
}
