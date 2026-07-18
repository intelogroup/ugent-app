// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// jsdom has no Web Streams globals; the ai SDK's streaming internals need
// them even when a test never actually streams anything over the network.
const { TransformStream, ReadableStream, WritableStream } = require('stream/web')
if (typeof global.TransformStream === 'undefined') global.TransformStream = TransformStream
if (typeof global.ReadableStream === 'undefined') global.ReadableStream = ReadableStream
if (typeof global.WritableStream === 'undefined') global.WritableStream = WritableStream

const { TextDecoder, TextEncoder } = require('util')
if (typeof global.TextDecoder === 'undefined') global.TextDecoder = TextDecoder
if (typeof global.TextEncoder === 'undefined') global.TextEncoder = TextEncoder
