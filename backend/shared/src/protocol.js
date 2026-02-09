/**
 * Enhanced Protocol Messages for HTTP over WebSocket Tunneling
 * 
 * Supports:
 * - Full HTTP request/response serialization
 * - Streaming for large payloads
 * - Binary data encoding
 * - Concurrent request tracking
 */

// Message Types
const MessageType = {
    // Connection lifecycle
    TUNNEL_REGISTER: 'tunnel:register',
    TUNNEL_REGISTERED: 'tunnel:registered',
    TUNNEL_CLOSE: 'tunnel:close',
    TUNNEL_CLOSED: 'tunnel:closed',

    // HTTP tunneling (enhanced)
    HTTP_REQUEST: 'http:request',
    HTTP_RESPONSE: 'http:response',
    HTTP_RESPONSE_CHUNK: 'http:response:chunk',
    HTTP_RESPONSE_END: 'http:response:end',
    HTTP_ERROR: 'http:error',

    // Heartbeat
    PING: 'ping',
    PONG: 'pong',

    // Error handling
    ERROR: 'error',

    // Inspection (for dashboard)
    INSPECT_REQUEST: 'inspect:request',
    INSPECT_RESPONSE: 'inspect:response',

    // Replay
    REPLAY_REQUEST: 'replay:request',
    REPLAY_RESPONSE: 'replay:response',
};

/**
 * Maximum size for a single message chunk (64KB)
 */
const MAX_CHUNK_SIZE = 64 * 1024;

/**
 * Creates a tunnel registration message
 */
function createTunnelRegisterMessage({ subdomain, localPort, authToken }) {
    return {
        type: MessageType.TUNNEL_REGISTER,
        payload: {
            subdomain,
            localPort,
            authToken,
            timestamp: Date.now(),
        },
    };
}

/**
 * Creates a tunnel registered confirmation
 */
function createTunnelRegisteredMessage({ tunnelId, publicUrl, subdomain }) {
    return {
        type: MessageType.TUNNEL_REGISTERED,
        payload: {
            tunnelId,
            publicUrl,
            subdomain,
            timestamp: Date.now(),
        },
    };
}

/**
 * Creates an HTTP request message for tunneling
 * Serializes full HTTP request for transmission over WebSocket
 */
function createHttpRequestMessage({ requestId, method, path, headers, body, query }) {
    // Encode body as base64 for safe JSON transmission
    let encodedBody = null;
    let bodyEncoding = null;

    if (body) {
        if (Buffer.isBuffer(body)) {
            encodedBody = body.toString('base64');
            bodyEncoding = 'base64';
        } else if (typeof body === 'string') {
            encodedBody = Buffer.from(body).toString('base64');
            bodyEncoding = 'base64';
        }
    }

    return {
        type: MessageType.HTTP_REQUEST,
        payload: {
            requestId,
            method,
            path,
            headers,
            body: encodedBody,
            bodyEncoding,
            query,
            timestamp: Date.now(),
        },
    };
}

/**
 * Creates an HTTP response message
 * For complete responses that fit in one message
 */
function createHttpResponseMessage({ requestId, statusCode, headers, body }) {
    let encodedBody = null;
    let bodyEncoding = null;

    if (body) {
        if (Buffer.isBuffer(body)) {
            encodedBody = body.toString('base64');
            bodyEncoding = 'base64';
        } else if (typeof body === 'string') {
            // Already base64 encoded
            encodedBody = body;
            bodyEncoding = 'base64';
        }
    }

    return {
        type: MessageType.HTTP_RESPONSE,
        payload: {
            requestId,
            statusCode,
            headers,
            body: encodedBody,
            bodyEncoding,
            timestamp: Date.now(),
        },
    };
}

/**
 * Creates a streaming response header message
 * Sent first, followed by chunks, then end
 */
function createHttpResponseHeaderMessage({ requestId, statusCode, headers }) {
    return {
        type: MessageType.HTTP_RESPONSE,
        payload: {
            requestId,
            statusCode,
            headers,
            streaming: true,
            timestamp: Date.now(),
        },
    };
}

/**
 * Creates a response chunk message for streaming
 */
function createHttpResponseChunkMessage({ requestId, chunk, index }) {
    return {
        type: MessageType.HTTP_RESPONSE_CHUNK,
        payload: {
            requestId,
            chunk: Buffer.isBuffer(chunk) ? chunk.toString('base64') : chunk,
            index,
            timestamp: Date.now(),
        },
    };
}

/**
 * Creates response end message
 */
function createHttpResponseEndMessage({ requestId }) {
    return {
        type: MessageType.HTTP_RESPONSE_END,
        payload: {
            requestId,
            timestamp: Date.now(),
        },
    };
}

/**
 * Creates an HTTP error message
 */
function createHttpErrorMessage({ requestId, error, code, statusCode = 502 }) {
    return {
        type: MessageType.HTTP_ERROR,
        payload: {
            requestId,
            error,
            code,
            statusCode,
            timestamp: Date.now(),
        },
    };
}

/**
 * Creates a ping message
 */
function createPingMessage() {
    return {
        type: MessageType.PING,
        payload: { timestamp: Date.now() },
    };
}

/**
 * Creates a pong response
 */
function createPongMessage(pingTimestamp) {
    return {
        type: MessageType.PONG,
        payload: {
            pingTimestamp,
            timestamp: Date.now(),
        },
    };
}

/**
 * Creates an error message
 */
function createErrorMessage(error, code = 'GENERIC_ERROR') {
    return {
        type: MessageType.ERROR,
        payload: {
            error,
            code,
            timestamp: Date.now(),
        },
    };
}

/**
 * Creates a tunnel close message
 */
function createTunnelCloseMessage(tunnelId, reason = 'Client requested close') {
    return {
        type: MessageType.TUNNEL_CLOSE,
        payload: {
            tunnelId,
            reason,
            timestamp: Date.now(),
        },
    };
}

/**
 * Parses a raw message
 */
function parseMessage(data) {
    try {
        const str = Buffer.isBuffer(data) ? data.toString('utf8') : data;
        const parsed = JSON.parse(str);

        if (!parsed.type) {
            return null;
        }

        return parsed;
    } catch (error) {
        return null;
    }
}

/**
 * Serializes a message for transmission
 */
function serializeMessage(message) {
    return JSON.stringify(message);
}

/**
 * Decodes a base64 body to Buffer
 */
function decodeBody(encodedBody, encoding = 'base64') {
    if (!encodedBody) return null;
    if (encoding === 'base64') {
        return Buffer.from(encodedBody, 'base64');
    }
    return Buffer.from(encodedBody);
}

/**
 * Splits a buffer into chunks for streaming
 */
function* chunkBuffer(buffer, chunkSize = MAX_CHUNK_SIZE) {
    let offset = 0;
    let index = 0;
    while (offset < buffer.length) {
        yield {
            chunk: buffer.slice(offset, offset + chunkSize),
            index: index++,
        };
        offset += chunkSize;
    }
}

module.exports = {
    MessageType,
    MAX_CHUNK_SIZE,
    createTunnelRegisterMessage,
    createTunnelRegisteredMessage,
    createHttpRequestMessage,
    createHttpResponseMessage,
    createHttpResponseHeaderMessage,
    createHttpResponseChunkMessage,
    createHttpResponseEndMessage,
    createHttpErrorMessage,
    createPingMessage,
    createPongMessage,
    createErrorMessage,
    createTunnelCloseMessage,
    parseMessage,
    serializeMessage,
    decodeBody,
    chunkBuffer,
};
