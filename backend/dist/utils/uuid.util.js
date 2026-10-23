"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUuid = isUuid;
exports.toUuid = toUuid;
exports.toUuidOrNull = toUuidOrNull;
const node_crypto_1 = __importDefault(require("node:crypto"));
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isUuid(val) {
    return typeof val === 'string' && UUID_REGEX.test(val);
}
function toUuid(input) {
    if (!input) {
        return node_crypto_1.default.randomUUID();
    }
    if (isUuid(input)) {
        return input;
    }
    const h = node_crypto_1.default.createHash('md5').update(input).digest('hex');
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}
function toUuidOrNull(input) {
    if (!input)
        return null;
    return toUuid(input);
}
