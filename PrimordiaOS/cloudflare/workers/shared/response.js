"use strict";
/**
 * Standardized Response Utilities & Helpers for PrimordiaOS Workers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CORS_HEADERS = void 0;
exports.jsonResponse = jsonResponse;
exports.errorResponse = errorResponse;
exports.handleCorsPreflight = handleCorsPreflight;
exports.CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Primordia-Key, X-Bridge-Signature",
    "Access-Control-Max-Age": "86400"
};
function jsonResponse(data, status = 200, headers = {}) {
    return new Response(JSON.stringify(data, null, 2), {
        status,
        headers: {
            "Content-Type": "application/json;charset=UTF-8",
            ...exports.CORS_HEADERS,
            ...headers
        }
    });
}
function errorResponse(message, status = 400, details) {
    return jsonResponse({
        success: false,
        error: message,
        details: details || null,
        timestamp: new Date().toISOString()
    }, status);
}
function handleCorsPreflight() {
    return new Response(null, {
        status: 204,
        headers: exports.CORS_HEADERS
    });
}
