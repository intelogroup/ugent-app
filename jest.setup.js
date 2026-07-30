// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Vitest compat: test files use vi.mock/vi.fn for vitest hoisting alongside
// jest.mock/jest.fn for Jest. vi is a global in vitest (globals:true), but
// not in Jest — shim it so vi.mock doesn't crash (jest.mock does the hoisting).
global.vi = { mock: () => {}, fn: (impl) => jest.fn(impl), spyOn: (o, m) => jest.spyOn(o, m), clearAllMocks: () => jest.clearAllMocks() }

// jsdom has no Web Streams globals; the ai SDK's streaming internals need
// them even when a test never actually streams anything over the network.
const { TransformStream, ReadableStream, WritableStream } = require('stream/web')
if (typeof global.TransformStream === 'undefined') global.TransformStream = TransformStream
if (typeof global.ReadableStream === 'undefined') global.ReadableStream = ReadableStream
if (typeof global.WritableStream === 'undefined') global.WritableStream = WritableStream

const { TextDecoder, TextEncoder } = require('util')
if (typeof global.TextDecoder === 'undefined') global.TextDecoder = TextDecoder
if (typeof global.TextEncoder === 'undefined') global.TextEncoder = TextEncoder
