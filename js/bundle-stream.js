(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (Buffer){
var parseTorrent = require('parse-torrent')
var path = require('path')
var Peer = require('simple-peer')
var prettyBytes = require('pretty-bytes')
var http = require('stream-http')
var WebTorrent = require('webtorrent')

var util = require('./util')

http.get('https://fastcast.nz/torrents/' + torrentName, function (res) {
  var data = [] // List of Buffer objects

  res.on('data', function (chunk) {
    data.push(chunk) // Append Buffer object
  })

  res.on('end', function () {
    data = Buffer.concat(data) // Make one large Buffer of it

    var torrentParsed = parseTorrent(data) // Parse the Buffer

    var client = new WebTorrent()

    client.add(torrentParsed, onTorrent)

    function onTorrent (torrent) {
      var torrentFileName = path.basename(torrent.name, path.extname(torrent.name)) + '.torrent'

      util.log(
        '<a class="btn btn-primary btn-xs" href="' + torrent.magnetURI + '" role="button"><i class="fa fa-magnet"></i> Magnet URI</a> ' +
        '<a class="btn btn-primary btn-xs" href="' + torrent.torrentFileBlobURL + '" target="_blank" download="' + torrentFileName + '" role="button"><i class="fa fa-download"></i> Download .torrent</a> ' +
        '<a id="downloadButton" class="btn btn-primary btn-xs" role="button"><i class="fa fa-download"></i> Download ' + torrent.name + '</a>'
      )

      function updateSpeed () {
        var progress = (100 * torrent.progress).toFixed(1)
        util.updateSpeed(
          '<b>Peers:</b> ' + torrent.wires.length + ' ' +
          '<b>Progress:</b> ' + progress + '% '
        )
        progressBar.setAttribute('aria-valuenow', progress)
        progressBar.setAttribute('style', 'width: ' + progress + '%')
      }

      updateSpeed()
      setInterval(updateSpeed, 500)

      torrent.files.forEach(function (file) {
        // Create a video element
        file.appendTo('#player')

        downloadButton.addEventListener('click', function () {
          download.classList.remove('hidden')

          // Get a url for each file
          file.getBlobURL(function (err, url) {
            if (err) return util.error(err)

            // Hide download progress
            download.classList.add('hidden')

            // Add a link to the page
            // var a = document.createElement('a')
            // a.download = window.URL.createObjectURL(url)
            // a.click()
            // window.URL.revokeObjectURL(url)

            var logElem = document.querySelector('.log')
            var a = document.createElement('a')
            a.target = '_blank'
            a.download = file.name
            a.href = url
            util.log(a)
            a.click()
            logElem.removeChild(a)
          })
        })
      })
    }
  })
})

}).call(this,require("buffer").Buffer)
},{"./util":2,"buffer":22,"parse-torrent":54,"path":55,"pretty-bytes":57,"simple-peer":91,"stream-http":96,"webtorrent":119}],2:[function(require,module,exports){
var downlaodButton = document.getElementById('downloadButton')
var download = document.getElementById('download')
var logElem = document.querySelector('.log')
var progressBar = document.getElementById('progressBar')
var speed = document.querySelector('.speed')

exports.log = function log (item) {
  if (typeof item === 'string') {
    var p = document.createElement('p')
    p.innerHTML = item
    logElem.appendChild(p)
    return p
  } else {
    logElem.appendChild(item)
    return item
  }
}

// replace the last P in the log
exports.updateSpeed = function updateSpeed (str) {
  speed.innerHTML = str
}

exports.warning = function warning (err) {
  console.error(err.stack || err.message || err)
  exports.log(err.message || err)
}

exports.error = function error (err) {
  console.error(err.stack || err.message || err)
  var p = exports.log(err.message || err)
  p.style.color = '#3d3d62'
  p.style.fontWeight = 'bold'
}

},{}],3:[function(require,module,exports){
const ADDR_RE = /^\[?([^\]]+)\]?:(\d+)$/ // ipv4/ipv6/hostname + port

let cache = {}

// reset cache when it gets to 100,000 elements (~ 600KB of ipv4 addresses)
// so it will not grow to consume all memory in long-running processes
let size = 0

module.exports = function addrToIPPort (addr) {
  if (size === 100000) module.exports.reset()
  if (!cache[addr]) {
    const m = ADDR_RE.exec(addr)
    if (!m) throw new Error(`invalid addr: ${addr}`)
    cache[addr] = [ m[1], Number(m[2]) ]
    size += 1
  }
  return cache[addr]
}

module.exports.reset = function reset () {
  cache = {}
  size = 0
}

},{}],4:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(
      uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)
    ))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],5:[function(require,module,exports){
var Buffer = require('safe-buffer').Buffer

const INTEGER_START = 0x69 // 'i'
const STRING_DELIM = 0x3A // ':'
const DICTIONARY_START = 0x64 // 'd'
const LIST_START = 0x6C // 'l'
const END_OF_TYPE = 0x65 // 'e'

/**
 * replaces parseInt(buffer.toString('ascii', start, end)).
 * For strings with less then ~30 charachters, this is actually a lot faster.
 *
 * @param {Buffer} data
 * @param {Number} start
 * @param {Number} end
 * @return {Number} calculated number
 */
function getIntFromBuffer (buffer, start, end) {
  var sum = 0
  var sign = 1

  for (var i = start; i < end; i++) {
    var num = buffer[i]

    if (num < 58 && num >= 48) {
      sum = sum * 10 + (num - 48)
      continue
    }

    if (i === start && num === 43) { // +
      continue
    }

    if (i === start && num === 45) { // -
      sign = -1
      continue
    }

    if (num === 46) { // .
      // its a float. break here.
      break
    }

    throw new Error('not a number: buffer[' + i + '] = ' + num)
  }

  return sum * sign
}

/**
 * Decodes bencoded data.
 *
 * @param  {Buffer} data
 * @param  {Number} start (optional)
 * @param  {Number} end (optional)
 * @param  {String} encoding (optional)
 * @return {Object|Array|Buffer|String|Number}
 */
function decode (data, start, end, encoding) {
  if (data == null || data.length === 0) {
    return null
  }

  if (typeof start !== 'number' && encoding == null) {
    encoding = start
    start = undefined
  }

  if (typeof end !== 'number' && encoding == null) {
    encoding = end
    end = undefined
  }

  decode.position = 0
  decode.encoding = encoding || null

  decode.data = !(Buffer.isBuffer(data))
    ? Buffer.from(data)
    : data.slice(start, end)

  decode.bytes = decode.data.length

  return decode.next()
}

decode.bytes = 0
decode.position = 0
decode.data = null
decode.encoding = null

decode.next = function () {
  switch (decode.data[decode.position]) {
    case DICTIONARY_START:
      return decode.dictionary()
    case LIST_START:
      return decode.list()
    case INTEGER_START:
      return decode.integer()
    default:
      return decode.buffer()
  }
}

decode.find = function (chr) {
  var i = decode.position
  var c = decode.data.length
  var d = decode.data

  while (i < c) {
    if (d[i] === chr) return i
    i++
  }

  throw new Error(
    'Invalid data: Missing delimiter "' +
    String.fromCharCode(chr) + '" [0x' +
    chr.toString(16) + ']'
  )
}

decode.dictionary = function () {
  decode.position++

  var dict = {}

  while (decode.data[decode.position] !== END_OF_TYPE) {
    dict[decode.buffer()] = decode.next()
  }

  decode.position++

  return dict
}

decode.list = function () {
  decode.position++

  var lst = []

  while (decode.data[decode.position] !== END_OF_TYPE) {
    lst.push(decode.next())
  }

  decode.position++

  return lst
}

decode.integer = function () {
  var end = decode.find(END_OF_TYPE)
  var number = getIntFromBuffer(decode.data, decode.position + 1, end)

  decode.position += end + 1 - decode.position

  return number
}

decode.buffer = function () {
  var sep = decode.find(STRING_DELIM)
  var length = getIntFromBuffer(decode.data, decode.position, sep)
  var end = ++sep + length

  decode.position = end

  return decode.encoding
    ? decode.data.toString(decode.encoding, sep, end)
    : decode.data.slice(sep, end)
}

module.exports = decode

},{"safe-buffer":88}],6:[function(require,module,exports){
var Buffer = require('safe-buffer').Buffer

/**
 * Encodes data in bencode.
 *
 * @param  {Buffer|Array|String|Object|Number|Boolean} data
 * @return {Buffer}
 */
function encode (data, buffer, offset) {
  var buffers = []
  var result = null

  encode._encode(buffers, data)
  result = Buffer.concat(buffers)
  encode.bytes = result.length

  if (Buffer.isBuffer(buffer)) {
    result.copy(buffer, offset)
    return buffer
  }

  return result
}

encode.bytes = -1
encode._floatConversionDetected = false

encode.getType = function (value) {
  if (Buffer.isBuffer(value)) return 'buffer'
  if (Array.isArray(value)) return 'array'
  if (ArrayBuffer.isView(value)) return 'arraybufferview'
  if (value instanceof Number) return 'number'
  if (value instanceof Boolean) return 'boolean'
  if (value instanceof ArrayBuffer) return 'arraybuffer'
  return typeof value
}

encode._encode = function (buffers, data) {
  if (data == null) { return }

  switch (encode.getType(data)) {
    case 'buffer': encode.buffer(buffers, data); break
    case 'object': encode.dict(buffers, data); break
    case 'array': encode.list(buffers, data); break
    case 'string': encode.string(buffers, data); break
    case 'number': encode.number(buffers, data); break
    case 'boolean': encode.number(buffers, data); break
    case 'arraybufferview': encode.buffer(buffers, Buffer.from(data.buffer, data.byteOffset, data.byteLength)); break
    case 'arraybuffer': encode.buffer(buffers, Buffer.from(data)); break
  }
}

var buffE = Buffer.from('e')
var buffD = Buffer.from('d')
var buffL = Buffer.from('l')

encode.buffer = function (buffers, data) {
  buffers.push(Buffer.from(data.length + ':'), data)
}

encode.string = function (buffers, data) {
  buffers.push(Buffer.from(Buffer.byteLength(data) + ':' + data))
}

encode.number = function (buffers, data) {
  var maxLo = 0x80000000
  var hi = (data / maxLo) << 0
  var lo = (data % maxLo) << 0
  var val = hi * maxLo + lo

  buffers.push(Buffer.from('i' + val + 'e'))

  if (val !== data && !encode._floatConversionDetected) {
    encode._floatConversionDetected = true
    console.warn(
      'WARNING: Possible data corruption detected with value "' + data + '":',
      'Bencoding only defines support for integers, value was converted to "' + val + '"'
    )
    console.trace()
  }
}

encode.dict = function (buffers, data) {
  buffers.push(buffD)

  var j = 0
  var k
  // fix for issue #13 - sorted dicts
  var keys = Object.keys(data).sort()
  var kl = keys.length

  for (; j < kl; j++) {
    k = keys[j]
    if (data[k] == null) continue
    encode.string(buffers, k)
    encode._encode(buffers, data[k])
  }

  buffers.push(buffE)
}

encode.list = function (buffers, data) {
  var i = 0
  var c = data.length
  buffers.push(buffL)

  for (; i < c; i++) {
    if (data[i] == null) continue
    encode._encode(buffers, data[i])
  }

  buffers.push(buffE)
}

module.exports = encode

},{"safe-buffer":88}],7:[function(require,module,exports){
var bencode = module.exports

bencode.encode = require('./encode')
bencode.decode = require('./decode')

/**
 * Determines the amount of bytes
 * needed to encode the given value
 * @param  {Object|Array|Buffer|String|Number|Boolean} value
 * @return {Number} byteCount
 */
bencode.byteLength = bencode.encodingLength = function (value) {
  return bencode.encode(value).length
}

},{"./decode":5,"./encode":6}],8:[function(require,module,exports){
module.exports = function(haystack, needle, comparator, low, high) {
  var mid, cmp;

  if(low === undefined)
    low = 0;

  else {
    low = low|0;
    if(low < 0 || low >= haystack.length)
      throw new RangeError("invalid lower bound");
  }

  if(high === undefined)
    high = haystack.length - 1;

  else {
    high = high|0;
    if(high < low || high >= haystack.length)
      throw new RangeError("invalid upper bound");
  }

  while(low <= high) {
    // The naive `low + high >>> 1` could fail for array lengths > 2**31
    // because `>>>` converts its operands to int32. `low + (high - low >>> 1)`
    // works for array lengths <= 2**32-1 which is also Javascript's max array
    // length.
    mid = low + ((high - low) >>> 1);
    cmp = +comparator(haystack[mid], needle, mid, haystack);

    // Too low.
    if(cmp < 0.0)
      low  = mid + 1;

    // Too high.
    else if(cmp > 0.0)
      high = mid - 1;

    // Key found.
    else
      return mid;
  }

  // Key not found.
  return ~low;
}

},{}],9:[function(require,module,exports){
function getByteSize (num) {
  let out = num >> 3
  if (num % 8 !== 0) out++
  return out
}

class BitField {
  constructor (data = 0, opts) {
    const grow = opts != null && opts.grow
    this.grow = (grow && isFinite(grow) && getByteSize(grow)) || grow || 0
    this.buffer = typeof data === 'number' ? new Uint8Array(getByteSize(data)) : data
  }

  get (i) {
    const j = i >> 3
    return (j < this.buffer.length) &&
      !!(this.buffer[j] & (128 >> (i % 8)))
  }

  set (i, b = true) {
    const j = i >> 3
    if (b) {
      if (this.buffer.length < j + 1) {
        const length = Math.max(j + 1, Math.min(2 * this.buffer.length, this.grow))
        if (length <= this.grow) {
          const newBuffer = new Uint8Array(length)
          newBuffer.set(this.buffer)
          this.buffer = newBuffer
        }
      }
      // Set
      this.buffer[j] |= 128 >> (i % 8)
    } else if (j < this.buffer.length) {
      // Clear
      this.buffer[j] &= ~(128 >> (i % 8))
    }
  }
}

if (typeof module !== 'undefined') module.exports = BitField

},{}],10:[function(require,module,exports){
(function (Buffer){
const arrayRemove = require('unordered-array-remove')
const bencode = require('bencode')
const BitField = require('bitfield')
const debug = require('debug')('bittorrent-protocol')
const randombytes = require('randombytes')
const speedometer = require('speedometer')
const stream = require('readable-stream')

const BITFIELD_GROW = 400000
const KEEP_ALIVE_TIMEOUT = 55000

const MESSAGE_PROTOCOL = Buffer.from('\u0013BitTorrent protocol')
const MESSAGE_KEEP_ALIVE = Buffer.from([0x00, 0x00, 0x00, 0x00])
const MESSAGE_CHOKE = Buffer.from([0x00, 0x00, 0x00, 0x01, 0x00])
const MESSAGE_UNCHOKE = Buffer.from([0x00, 0x00, 0x00, 0x01, 0x01])
const MESSAGE_INTERESTED = Buffer.from([0x00, 0x00, 0x00, 0x01, 0x02])
const MESSAGE_UNINTERESTED = Buffer.from([0x00, 0x00, 0x00, 0x01, 0x03])

const MESSAGE_RESERVED = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
const MESSAGE_PORT = [0x00, 0x00, 0x00, 0x03, 0x09, 0x00, 0x00]

class Request {
  constructor (piece, offset, length, callback) {
    this.piece = piece
    this.offset = offset
    this.length = length
    this.callback = callback
  }
}

class Wire extends stream.Duplex {
  constructor () {
    super()

    this._debugId = randombytes(4).toString('hex')
    this._debug('new wire')

    this.peerId = null // remote peer id (hex string)
    this.peerIdBuffer = null // remote peer id (buffer)
    this.type = null // connection type ('webrtc', 'tcpIncoming', 'tcpOutgoing', 'webSeed')

    this.amChoking = true // are we choking the peer?
    this.amInterested = false // are we interested in the peer?

    this.peerChoking = true // is the peer choking us?
    this.peerInterested = false // is the peer interested in us?

    // The largest torrent that I know of (the Geocities archive) is ~641 GB and has
    // ~41,000 pieces. Therefore, cap bitfield to 10x larger (400,000 bits) to support all
    // possible torrents but prevent malicious peers from growing bitfield to fill memory.
    this.peerPieces = new BitField(0, { grow: BITFIELD_GROW })

    this.peerExtensions = {}

    this.requests = [] // outgoing
    this.peerRequests = [] // incoming

    this.extendedMapping = {} // number -> string, ex: 1 -> 'ut_metadata'
    this.peerExtendedMapping = {} // string -> number, ex: 9 -> 'ut_metadata'

    // The extended handshake to send, minus the "m" field, which gets automatically
    // filled from `this.extendedMapping`
    this.extendedHandshake = {}

    this.peerExtendedHandshake = {} // remote peer's extended handshake

    this._ext = {} // string -> function, ex 'ut_metadata' -> ut_metadata()
    this._nextExt = 1

    this.uploaded = 0
    this.downloaded = 0
    this.uploadSpeed = speedometer()
    this.downloadSpeed = speedometer()

    this._keepAliveInterval = null
    this._timeout = null
    this._timeoutMs = 0

    this.destroyed = false // was the wire ended by calling `destroy`?
    this._finished = false

    this._parserSize = 0 // number of needed bytes to parse next message from remote peer
    this._parser = null // function to call once `this._parserSize` bytes are available

    this._buffer = [] // incomplete message data
    this._bufferSize = 0 // cached total length of buffers in `this._buffer`

    this.once('finish', () => this._onFinish())

    this._parseHandshake()
  }

  /**
   * Set whether to send a "keep-alive" ping (sent every 55s)
   * @param {boolean} enable
   */
  setKeepAlive (enable) {
    this._debug('setKeepAlive %s', enable)
    clearInterval(this._keepAliveInterval)
    if (enable === false) return
    this._keepAliveInterval = setInterval(() => {
      this.keepAlive()
    }, KEEP_ALIVE_TIMEOUT)
  }

  /**
   * Set the amount of time to wait before considering a request to be "timed out"
   * @param {number} ms
   * @param {boolean=} unref (should the timer be unref'd? default: false)
   */
  setTimeout (ms, unref) {
    this._debug('setTimeout ms=%d unref=%s', ms, unref)
    this._clearTimeout()
    this._timeoutMs = ms
    this._timeoutUnref = !!unref
    this._updateTimeout()
  }

  destroy () {
    if (this.destroyed) return
    this.destroyed = true
    this._debug('destroy')
    this.emit('close')
    this.end()
  }

  end (...args) {
    this._debug('end')
    this._onUninterested()
    this._onChoke()
    super.end(...args)
  }

  /**
   * Use the specified protocol extension.
   * @param  {function} Extension
   */
  use (Extension) {
    const name = Extension.prototype.name
    if (!name) {
      throw new Error('Extension class requires a "name" property on the prototype')
    }
    this._debug('use extension.name=%s', name)

    const ext = this._nextExt
    const handler = new Extension(this)

    function noop () {}

    if (typeof handler.onHandshake !== 'function') {
      handler.onHandshake = noop
    }
    if (typeof handler.onExtendedHandshake !== 'function') {
      handler.onExtendedHandshake = noop
    }
    if (typeof handler.onMessage !== 'function') {
      handler.onMessage = noop
    }

    this.extendedMapping[ext] = name
    this._ext[name] = handler
    this[name] = handler

    this._nextExt += 1
  }

  //
  // OUTGOING MESSAGES
  //

  /**
   * Message "keep-alive": <len=0000>
   */
  keepAlive () {
    this._debug('keep-alive')
    this._push(MESSAGE_KEEP_ALIVE)
  }

  /**
   * Message: "handshake" <pstrlen><pstr><reserved><info_hash><peer_id>
   * @param  {Buffer|string} infoHash (as Buffer or *hex* string)
   * @param  {Buffer|string} peerId
   * @param  {Object} extensions
   */
  handshake (infoHash, peerId, extensions) {
    let infoHashBuffer
    let peerIdBuffer
    if (typeof infoHash === 'string') {
      infoHash = infoHash.toLowerCase()
      infoHashBuffer = Buffer.from(infoHash, 'hex')
    } else {
      infoHashBuffer = infoHash
      infoHash = infoHashBuffer.toString('hex')
    }
    if (typeof peerId === 'string') {
      peerIdBuffer = Buffer.from(peerId, 'hex')
    } else {
      peerIdBuffer = peerId
      peerId = peerIdBuffer.toString('hex')
    }

    if (infoHashBuffer.length !== 20 || peerIdBuffer.length !== 20) {
      throw new Error('infoHash and peerId MUST have length 20')
    }

    this._debug('handshake i=%s p=%s exts=%o', infoHash, peerId, extensions)

    const reserved = Buffer.from(MESSAGE_RESERVED)

    // enable extended message
    reserved[5] |= 0x10

    if (extensions && extensions.dht) reserved[7] |= 1

    this._push(Buffer.concat([MESSAGE_PROTOCOL, reserved, infoHashBuffer, peerIdBuffer]))
    this._handshakeSent = true

    if (this.peerExtensions.extended && !this._extendedHandshakeSent) {
      // Peer's handshake indicated support already
      // (incoming connection)
      this._sendExtendedHandshake()
    }
  }

  /* Peer supports BEP-0010, send extended handshake.
   *
   * This comes after the 'handshake' event to give the user a chance to populate
   * `this.extendedHandshake` and `this.extendedMapping` before the extended handshake
   * is sent to the remote peer.
   */
  _sendExtendedHandshake () {
    // Create extended message object from registered extensions
    const msg = Object.assign({}, this.extendedHandshake)
    msg.m = {}
    for (const ext in this.extendedMapping) {
      const name = this.extendedMapping[ext]
      msg.m[name] = Number(ext)
    }

    // Send extended handshake
    this.extended(0, bencode.encode(msg))
    this._extendedHandshakeSent = true
  }

  /**
   * Message "choke": <len=0001><id=0>
   */
  choke () {
    if (this.amChoking) return
    this.amChoking = true
    this._debug('choke')
    while (this.peerRequests.length) {
      this.peerRequests.pop()
    }
    this._push(MESSAGE_CHOKE)
  }

  /**
   * Message "unchoke": <len=0001><id=1>
   */
  unchoke () {
    if (!this.amChoking) return
    this.amChoking = false
    this._debug('unchoke')
    this._push(MESSAGE_UNCHOKE)
  }

  /**
   * Message "interested": <len=0001><id=2>
   */
  interested () {
    if (this.amInterested) return
    this.amInterested = true
    this._debug('interested')
    this._push(MESSAGE_INTERESTED)
  }

  /**
   * Message "uninterested": <len=0001><id=3>
   */
  uninterested () {
    if (!this.amInterested) return
    this.amInterested = false
    this._debug('uninterested')
    this._push(MESSAGE_UNINTERESTED)
  }

  /**
   * Message "have": <len=0005><id=4><piece index>
   * @param  {number} index
   */
  have (index) {
    this._debug('have %d', index)
    this._message(4, [index], null)
  }

  /**
   * Message "bitfield": <len=0001+X><id=5><bitfield>
   * @param  {BitField|Buffer} bitfield
   */
  bitfield (bitfield) {
    this._debug('bitfield')
    if (!Buffer.isBuffer(bitfield)) bitfield = bitfield.buffer
    this._message(5, [], bitfield)
  }

  /**
   * Message "request": <len=0013><id=6><index><begin><length>
   * @param  {number}   index
   * @param  {number}   offset
   * @param  {number}   length
   * @param  {function} cb
   */
  request (index, offset, length, cb) {
    if (!cb) cb = () => {}
    if (this._finished) return cb(new Error('wire is closed'))
    if (this.peerChoking) return cb(new Error('peer is choking'))

    this._debug('request index=%d offset=%d length=%d', index, offset, length)

    this.requests.push(new Request(index, offset, length, cb))
    this._updateTimeout()
    this._message(6, [index, offset, length], null)
  }

  /**
   * Message "piece": <len=0009+X><id=7><index><begin><block>
   * @param  {number} index
   * @param  {number} offset
   * @param  {Buffer} buffer
   */
  piece (index, offset, buffer) {
    this._debug('piece index=%d offset=%d', index, offset)
    this.uploaded += buffer.length
    this.uploadSpeed(buffer.length)
    this.emit('upload', buffer.length)
    this._message(7, [index, offset], buffer)
  }

  /**
   * Message "cancel": <len=0013><id=8><index><begin><length>
   * @param  {number} index
   * @param  {number} offset
   * @param  {number} length
   */
  cancel (index, offset, length) {
    this._debug('cancel index=%d offset=%d length=%d', index, offset, length)
    this._callback(
      this._pull(this.requests, index, offset, length),
      new Error('request was cancelled'),
      null
    )
    this._message(8, [index, offset, length], null)
  }

  /**
   * Message: "port" <len=0003><id=9><listen-port>
   * @param {Number} port
   */
  port (port) {
    this._debug('port %d', port)
    const message = Buffer.from(MESSAGE_PORT)
    message.writeUInt16BE(port, 5)
    this._push(message)
  }

  /**
   * Message: "extended" <len=0005+X><id=20><ext-number><payload>
   * @param  {number|string} ext
   * @param  {Object} obj
   */
  extended (ext, obj) {
    this._debug('extended ext=%s', ext)
    if (typeof ext === 'string' && this.peerExtendedMapping[ext]) {
      ext = this.peerExtendedMapping[ext]
    }
    if (typeof ext === 'number') {
      const extId = Buffer.from([ext])
      const buf = Buffer.isBuffer(obj) ? obj : bencode.encode(obj)

      this._message(20, [], Buffer.concat([extId, buf]))
    } else {
      throw new Error(`Unrecognized extension: ${ext}`)
    }
  }

  /**
   * Duplex stream method. Called whenever the remote peer stream wants data. No-op
   * since we'll just push data whenever we get it.
   */
  _read () {}

  /**
   * Send a message to the remote peer.
   */
  _message (id, numbers, data) {
    const dataLength = data ? data.length : 0
    const buffer = Buffer.allocUnsafe(5 + (4 * numbers.length))

    buffer.writeUInt32BE(buffer.length + dataLength - 4, 0)
    buffer[4] = id
    for (let i = 0; i < numbers.length; i++) {
      buffer.writeUInt32BE(numbers[i], 5 + (4 * i))
    }

    this._push(buffer)
    if (data) this._push(data)
  }

  _push (data) {
    if (this._finished) return
    return this.push(data)
  }

  //
  // INCOMING MESSAGES
  //

  _onKeepAlive () {
    this._debug('got keep-alive')
    this.emit('keep-alive')
  }

  _onHandshake (infoHashBuffer, peerIdBuffer, extensions) {
    const infoHash = infoHashBuffer.toString('hex')
    const peerId = peerIdBuffer.toString('hex')

    this._debug('got handshake i=%s p=%s exts=%o', infoHash, peerId, extensions)

    this.peerId = peerId
    this.peerIdBuffer = peerIdBuffer
    this.peerExtensions = extensions

    this.emit('handshake', infoHash, peerId, extensions)

    let name
    for (name in this._ext) {
      this._ext[name].onHandshake(infoHash, peerId, extensions)
    }

    if (extensions.extended && this._handshakeSent &&
        !this._extendedHandshakeSent) {
      // outgoing connection
      this._sendExtendedHandshake()
    }
  }

  _onChoke () {
    this.peerChoking = true
    this._debug('got choke')
    this.emit('choke')
    while (this.requests.length) {
      this._callback(this.requests.pop(), new Error('peer is choking'), null)
    }
  }

  _onUnchoke () {
    this.peerChoking = false
    this._debug('got unchoke')
    this.emit('unchoke')
  }

  _onInterested () {
    this.peerInterested = true
    this._debug('got interested')
    this.emit('interested')
  }

  _onUninterested () {
    this.peerInterested = false
    this._debug('got uninterested')
    this.emit('uninterested')
  }

  _onHave (index) {
    if (this.peerPieces.get(index)) return
    this._debug('got have %d', index)

    this.peerPieces.set(index, true)
    this.emit('have', index)
  }

  _onBitField (buffer) {
    this.peerPieces = new BitField(buffer)
    this._debug('got bitfield')
    this.emit('bitfield', this.peerPieces)
  }

  _onRequest (index, offset, length) {
    if (this.amChoking) return
    this._debug('got request index=%d offset=%d length=%d', index, offset, length)

    const respond = (err, buffer) => {
      if (request !== this._pull(this.peerRequests, index, offset, length)) return
      if (err) return this._debug('error satisfying request index=%d offset=%d length=%d (%s)', index, offset, length, err.message)
      this.piece(index, offset, buffer)
    }

    var request = new Request(index, offset, length, respond)
    this.peerRequests.push(request)
    this.emit('request', index, offset, length, respond)
  }

  _onPiece (index, offset, buffer) {
    this._debug('got piece index=%d offset=%d', index, offset)
    this._callback(this._pull(this.requests, index, offset, buffer.length), null, buffer)
    this.downloaded += buffer.length
    this.downloadSpeed(buffer.length)
    this.emit('download', buffer.length)
    this.emit('piece', index, offset, buffer)
  }

  _onCancel (index, offset, length) {
    this._debug('got cancel index=%d offset=%d length=%d', index, offset, length)
    this._pull(this.peerRequests, index, offset, length)
    this.emit('cancel', index, offset, length)
  }

  _onPort (port) {
    this._debug('got port %d', port)
    this.emit('port', port)
  }

  _onExtended (ext, buf) {
    if (ext === 0) {
      let info
      try {
        info = bencode.decode(buf)
      } catch (err) {
        this._debug('ignoring invalid extended handshake: %s', err.message || err)
      }

      if (!info) return
      this.peerExtendedHandshake = info

      let name
      if (typeof info.m === 'object') {
        for (name in info.m) {
          this.peerExtendedMapping[name] = Number(info.m[name].toString())
        }
      }
      for (name in this._ext) {
        if (this.peerExtendedMapping[name]) {
          this._ext[name].onExtendedHandshake(this.peerExtendedHandshake)
        }
      }
      this._debug('got extended handshake')
      this.emit('extended', 'handshake', this.peerExtendedHandshake)
    } else {
      if (this.extendedMapping[ext]) {
        ext = this.extendedMapping[ext] // friendly name for extension
        if (this._ext[ext]) {
          // there is an registered extension handler, so call it
          this._ext[ext].onMessage(buf)
        }
      }
      this._debug('got extended message ext=%s', ext)
      this.emit('extended', ext, buf)
    }
  }

  _onTimeout () {
    this._debug('request timed out')
    this._callback(this.requests.shift(), new Error('request has timed out'), null)
    this.emit('timeout')
  }

  /**
   * Duplex stream method. Called whenever the remote peer has data for us. Data that the
   * remote peer sends gets buffered (i.e. not actually processed) until the right number
   * of bytes have arrived, determined by the last call to `this._parse(number, callback)`.
   * Once enough bytes have arrived to process the message, the callback function
   * (i.e. `this._parser`) gets called with the full buffer of data.
   * @param  {Buffer} data
   * @param  {string} encoding
   * @param  {function} cb
   */
  _write (data, encoding, cb) {
    this._bufferSize += data.length
    this._buffer.push(data)

    while (this._bufferSize >= this._parserSize) {
      const buffer = (this._buffer.length === 1)
        ? this._buffer[0]
        : Buffer.concat(this._buffer)
      this._bufferSize -= this._parserSize
      this._buffer = this._bufferSize
        ? [buffer.slice(this._parserSize)]
        : []
      this._parser(buffer.slice(0, this._parserSize))
    }

    cb(null) // Signal that we're ready for more data
  }

  _callback (request, err, buffer) {
    if (!request) return

    this._clearTimeout()

    if (!this.peerChoking && !this._finished) this._updateTimeout()
    request.callback(err, buffer)
  }

  _clearTimeout () {
    if (!this._timeout) return

    clearTimeout(this._timeout)
    this._timeout = null
  }

  _updateTimeout () {
    if (!this._timeoutMs || !this.requests.length || this._timeout) return

    this._timeout = setTimeout(() => this._onTimeout(), this._timeoutMs)
    if (this._timeoutUnref && this._timeout.unref) this._timeout.unref()
  }

  /**
   * Takes a number of bytes that the local peer is waiting to receive from the remote peer
   * in order to parse a complete message, and a callback function to be called once enough
   * bytes have arrived.
   * @param  {number} size
   * @param  {function} parser
   */
  _parse (size, parser) {
    this._parserSize = size
    this._parser = parser
  }

  /**
   * Handle the first 4 bytes of a message, to determine the length of bytes that must be
   * waited for in order to have the whole message.
   * @param  {Buffer} buffer
   */
  _onMessageLength (buffer) {
    const length = buffer.readUInt32BE(0)
    if (length > 0) {
      this._parse(length, this._onMessage)
    } else {
      this._onKeepAlive()
      this._parse(4, this._onMessageLength)
    }
  }

  /**
   * Handle a message from the remote peer.
   * @param  {Buffer} buffer
   */
  _onMessage (buffer) {
    this._parse(4, this._onMessageLength)
    switch (buffer[0]) {
      case 0:
        return this._onChoke()
      case 1:
        return this._onUnchoke()
      case 2:
        return this._onInterested()
      case 3:
        return this._onUninterested()
      case 4:
        return this._onHave(buffer.readUInt32BE(1))
      case 5:
        return this._onBitField(buffer.slice(1))
      case 6:
        return this._onRequest(
          buffer.readUInt32BE(1),
          buffer.readUInt32BE(5),
          buffer.readUInt32BE(9)
        )
      case 7:
        return this._onPiece(
          buffer.readUInt32BE(1),
          buffer.readUInt32BE(5),
          buffer.slice(9)
        )
      case 8:
        return this._onCancel(
          buffer.readUInt32BE(1),
          buffer.readUInt32BE(5),
          buffer.readUInt32BE(9)
        )
      case 9:
        return this._onPort(buffer.readUInt16BE(1))
      case 20:
        return this._onExtended(buffer.readUInt8(1), buffer.slice(2))
      default:
        this._debug('got unknown message')
        return this.emit('unknownmessage', buffer)
    }
  }

  _parseHandshake () {
    this._parse(1, buffer => {
      const pstrlen = buffer.readUInt8(0)
      this._parse(pstrlen + 48, handshake => {
        const protocol = handshake.slice(0, pstrlen)
        if (protocol.toString() !== 'BitTorrent protocol') {
          this._debug('Error: wire not speaking BitTorrent protocol (%s)', protocol.toString())
          this.end()
          return
        }
        handshake = handshake.slice(pstrlen)
        this._onHandshake(handshake.slice(8, 28), handshake.slice(28, 48), {
          dht: !!(handshake[7] & 0x01), // see bep_0005
          extended: !!(handshake[5] & 0x10) // see bep_0010
        })
        this._parse(4, this._onMessageLength)
      })
    })
  }

  _onFinish () {
    this._finished = true

    this.push(null) // stream cannot be half open, so signal the end of it
    while (this.read()) {} // consume and discard the rest of the stream data

    clearInterval(this._keepAliveInterval)
    this._parse(Number.MAX_VALUE, () => {})
    while (this.peerRequests.length) {
      this.peerRequests.pop()
    }
    while (this.requests.length) {
      this._callback(this.requests.pop(), new Error('wire was closed'), null)
    }
  }

  _debug (...args) {
    args[0] = `[${this._debugId}] ${args[0]}`
    debug(...args)
  }

  _pull (requests, piece, offset, length) {
    for (let i = 0; i < requests.length; i++) {
      const req = requests[i]
      if (req.piece === piece && req.offset === offset && req.length === length) {
        arrayRemove(requests, i)
        return req
      }
    }
    return null
  }
}

module.exports = Wire

}).call(this,require("buffer").Buffer)
},{"bencode":7,"bitfield":9,"buffer":22,"debug":26,"randombytes":66,"readable-stream":82,"speedometer":95,"unordered-array-remove":112}],11:[function(require,module,exports){
(function (process,Buffer){
const debug = require('debug')('bittorrent-tracker:client')
const EventEmitter = require('events')
const once = require('once')
const parallel = require('run-parallel')
const Peer = require('simple-peer')
const uniq = require('uniq')

const common = require('./lib/common')
const HTTPTracker = require('./lib/client/http-tracker') // empty object in browser
const UDPTracker = require('./lib/client/udp-tracker') // empty object in browser
const WebSocketTracker = require('./lib/client/websocket-tracker')

/**
 * BitTorrent tracker client.
 *
 * Find torrent peers, to help a torrent client participate in a torrent swarm.
 *
 * @param {Object} opts                          options object
 * @param {string|Buffer} opts.infoHash          torrent info hash
 * @param {string|Buffer} opts.peerId            peer id
 * @param {string|Array.<string>} opts.announce  announce
 * @param {number} opts.port                     torrent client listening port
 * @param {function} opts.getAnnounceOpts        callback to provide data to tracker
 * @param {number} opts.rtcConfig                RTCPeerConnection configuration object
 * @param {number} opts.userAgent                User-Agent header for http requests
 * @param {number} opts.wrtc                     custom webrtc impl (useful in node.js)
 */
class Client extends EventEmitter {
  constructor (opts = {}) {
    super()

    if (!opts.peerId) throw new Error('Option `peerId` is required')
    if (!opts.infoHash) throw new Error('Option `infoHash` is required')
    if (!opts.announce) throw new Error('Option `announce` is required')
    if (!process.browser && !opts.port) throw new Error('Option `port` is required')

    this.peerId = typeof opts.peerId === 'string'
      ? opts.peerId
      : opts.peerId.toString('hex')
    this._peerIdBuffer = Buffer.from(this.peerId, 'hex')
    this._peerIdBinary = this._peerIdBuffer.toString('binary')

    this.infoHash = typeof opts.infoHash === 'string'
      ? opts.infoHash.toLowerCase()
      : opts.infoHash.toString('hex')
    this._infoHashBuffer = Buffer.from(this.infoHash, 'hex')
    this._infoHashBinary = this._infoHashBuffer.toString('binary')

    debug('new client %s', this.infoHash)

    this.destroyed = false

    this._port = opts.port
    this._getAnnounceOpts = opts.getAnnounceOpts
    this._rtcConfig = opts.rtcConfig
    this._userAgent = opts.userAgent

    // Support lazy 'wrtc' module initialization
    // See: https://github.com/webtorrent/webtorrent-hybrid/issues/46
    this._wrtc = typeof opts.wrtc === 'function' ? opts.wrtc() : opts.wrtc

    let announce = typeof opts.announce === 'string'
      ? [opts.announce]
      : opts.announce == null ? [] : opts.announce

    // Remove trailing slash from trackers to catch duplicates
    announce = announce.map(announceUrl => {
      announceUrl = announceUrl.toString()
      if (announceUrl[announceUrl.length - 1] === '/') {
        announceUrl = announceUrl.substring(0, announceUrl.length - 1)
      }
      return announceUrl
    })
    announce = uniq(announce)

    const webrtcSupport = this._wrtc !== false && (!!this._wrtc || Peer.WEBRTC_SUPPORT)

    const nextTickWarn = err => {
      process.nextTick(() => {
        this.emit('warning', err)
      })
    }

    this._trackers = announce
      .map(announceUrl => {
        let parsedUrl
        try {
          parsedUrl = new URL(announceUrl)
        } catch (err) {
          nextTickWarn(new Error(`Invalid tracker URL: ${announceUrl}`))
          return null
        }

        const port = parsedUrl.port
        if (port < 0 || port > 65535) {
          nextTickWarn(new Error(`Invalid tracker port: ${announceUrl}`))
          return null
        }

        const protocol = parsedUrl.protocol
        if ((protocol === 'http:' || protocol === 'https:') &&
            typeof HTTPTracker === 'function') {
          return new HTTPTracker(this, announceUrl)
        } else if (protocol === 'udp:' && typeof UDPTracker === 'function') {
          return new UDPTracker(this, announceUrl)
        } else if ((protocol === 'ws:' || protocol === 'wss:') && webrtcSupport) {
          // Skip ws:// trackers on https:// sites because they throw SecurityError
          if (protocol === 'ws:' && typeof window !== 'undefined' &&
              window.location.protocol === 'https:') {
            nextTickWarn(new Error(`Unsupported tracker protocol: ${announceUrl}`))
            return null
          }
          return new WebSocketTracker(this, announceUrl)
        } else {
          nextTickWarn(new Error(`Unsupported tracker protocol: ${announceUrl}`))
          return null
        }
      })
      .filter(Boolean)
  }

  /**
   * Send a `start` announce to the trackers.
   * @param {Object} opts
   * @param {number=} opts.uploaded
   * @param {number=} opts.downloaded
   * @param {number=} opts.left (if not set, calculated automatically)
   */
  start (opts) {
    opts = this._defaultAnnounceOpts(opts)
    opts.event = 'started'
    debug('send `start` %o', opts)
    this._announce(opts)

    // start announcing on intervals
    this._trackers.forEach(tracker => {
      tracker.setInterval()
    })
  }

  /**
   * Send a `stop` announce to the trackers.
   * @param {Object} opts
   * @param {number=} opts.uploaded
   * @param {number=} opts.downloaded
   * @param {number=} opts.numwant
   * @param {number=} opts.left (if not set, calculated automatically)
   */
  stop (opts) {
    opts = this._defaultAnnounceOpts(opts)
    opts.event = 'stopped'
    debug('send `stop` %o', opts)
    this._announce(opts)
  }

  /**
   * Send a `complete` announce to the trackers.
   * @param {Object} opts
   * @param {number=} opts.uploaded
   * @param {number=} opts.downloaded
   * @param {number=} opts.numwant
   * @param {number=} opts.left (if not set, calculated automatically)
   */
  complete (opts) {
    if (!opts) opts = {}
    opts = this._defaultAnnounceOpts(opts)
    opts.event = 'completed'
    debug('send `complete` %o', opts)
    this._announce(opts)
  }

  /**
   * Send a `update` announce to the trackers.
   * @param {Object} opts
   * @param {number=} opts.uploaded
   * @param {number=} opts.downloaded
   * @param {number=} opts.numwant
   * @param {number=} opts.left (if not set, calculated automatically)
   */
  update (opts) {
    opts = this._defaultAnnounceOpts(opts)
    if (opts.event) delete opts.event
    debug('send `update` %o', opts)
    this._announce(opts)
  }

  _announce (opts) {
    this._trackers.forEach(tracker => {
      // tracker should not modify `opts` object, it's passed to all trackers
      tracker.announce(opts)
    })
  }

  /**
   * Send a scrape request to the trackers.
   * @param {Object} opts
   */
  scrape (opts) {
    debug('send `scrape`')
    if (!opts) opts = {}
    this._trackers.forEach(tracker => {
      // tracker should not modify `opts` object, it's passed to all trackers
      tracker.scrape(opts)
    })
  }

  setInterval (intervalMs) {
    debug('setInterval %d', intervalMs)
    this._trackers.forEach(tracker => {
      tracker.setInterval(intervalMs)
    })
  }

  destroy (cb) {
    if (this.destroyed) return
    this.destroyed = true
    debug('destroy')

    const tasks = this._trackers.map(tracker => cb => {
      tracker.destroy(cb)
    })

    parallel(tasks, cb)

    this._trackers = []
    this._getAnnounceOpts = null
  }

  _defaultAnnounceOpts (opts = {}) {
    if (opts.numwant == null) opts.numwant = common.DEFAULT_ANNOUNCE_PEERS

    if (opts.uploaded == null) opts.uploaded = 0
    if (opts.downloaded == null) opts.downloaded = 0

    if (this._getAnnounceOpts) opts = Object.assign({}, opts, this._getAnnounceOpts())

    return opts
  }
}

/**
 * Simple convenience function to scrape a tracker for an info hash without needing to
 * create a Client, pass it a parsed torrent, etc. Support scraping a tracker for multiple
 * torrents at the same time.
 * @params {Object} opts
 * @param  {string|Array.<string>} opts.infoHash
 * @param  {string} opts.announce
 * @param  {function} cb
 */
Client.scrape = (opts, cb) => {
  cb = once(cb)

  if (!opts.infoHash) throw new Error('Option `infoHash` is required')
  if (!opts.announce) throw new Error('Option `announce` is required')

  const clientOpts = Object.assign({}, opts, {
    infoHash: Array.isArray(opts.infoHash) ? opts.infoHash[0] : opts.infoHash,
    peerId: Buffer.from('01234567890123456789'), // dummy value
    port: 6881 // dummy value
  })

  const client = new Client(clientOpts)
  client.once('error', cb)
  client.once('warning', cb)

  let len = Array.isArray(opts.infoHash) ? opts.infoHash.length : 1
  const results = {}
  client.on('scrape', data => {
    len -= 1
    results[data.infoHash] = data
    if (len === 0) {
      client.destroy()
      const keys = Object.keys(results)
      if (keys.length === 1) {
        cb(null, results[keys[0]])
      } else {
        cb(null, results)
      }
    }
  })

  opts.infoHash = Array.isArray(opts.infoHash)
    ? opts.infoHash.map(infoHash => {
      return Buffer.from(infoHash, 'hex')
    })
    : Buffer.from(opts.infoHash, 'hex')
  client.scrape({ infoHash: opts.infoHash })
  return client
}

module.exports = Client

}).call(this,require('_process'),require("buffer").Buffer)
},{"./lib/client/http-tracker":17,"./lib/client/udp-tracker":17,"./lib/client/websocket-tracker":13,"./lib/common":14,"_process":58,"buffer":22,"debug":26,"events":29,"once":52,"run-parallel":86,"simple-peer":91,"uniq":111}],12:[function(require,module,exports){
const EventEmitter = require('events')

class Tracker extends EventEmitter {
  constructor (client, announceUrl) {
    super()

    this.client = client
    this.announceUrl = announceUrl

    this.interval = null
    this.destroyed = false
  }

  setInterval (intervalMs) {
    if (intervalMs == null) intervalMs = this.DEFAULT_ANNOUNCE_INTERVAL

    clearInterval(this.interval)

    if (intervalMs) {
      this.interval = setInterval(() => {
        this.announce(this.client._defaultAnnounceOpts())
      }, intervalMs)
      if (this.interval.unref) this.interval.unref()
    }
  }
}

module.exports = Tracker

},{"events":29}],13:[function(require,module,exports){
const debug = require('debug')('bittorrent-tracker:websocket-tracker')
const Peer = require('simple-peer')
const randombytes = require('randombytes')
const Socket = require('simple-websocket')

const common = require('../common')
const Tracker = require('./tracker')

// Use a socket pool, so tracker clients share WebSocket objects for the same server.
// In practice, WebSockets are pretty slow to establish, so this gives a nice performance
// boost, and saves browser resources.
const socketPool = {}

const RECONNECT_MINIMUM = 10 * 1000
const RECONNECT_MAXIMUM = 30 * 60 * 1000
const RECONNECT_VARIANCE = 2 * 60 * 1000
const OFFER_TIMEOUT = 50 * 1000

class WebSocketTracker extends Tracker {
  constructor (client, announceUrl, opts) {
    super(client, announceUrl)
    debug('new websocket tracker %s', announceUrl)

    this.peers = {} // peers (offer id -> peer)
    this.socket = null

    this.reconnecting = false
    this.retries = 0
    this.reconnectTimer = null

    // Simple boolean flag to track whether the socket has received data from
    // the websocket server since the last time socket.send() was called.
    this.expectingResponse = false

    this._openSocket()
  }

  announce (opts) {
    if (this.destroyed || this.reconnecting) return
    if (!this.socket.connected) {
      this.socket.once('connect', () => {
        this.announce(opts)
      })
      return
    }

    const params = Object.assign({}, opts, {
      action: 'announce',
      info_hash: this.client._infoHashBinary,
      peer_id: this.client._peerIdBinary
    })
    if (this._trackerId) params.trackerid = this._trackerId

    if (opts.event === 'stopped' || opts.event === 'completed') {
      // Don't include offers with 'stopped' or 'completed' event
      this._send(params)
    } else {
      // Limit the number of offers that are generated, since it can be slow
      const numwant = Math.min(opts.numwant, 10)

      this._generateOffers(numwant, offers => {
        params.numwant = numwant
        params.offers = offers
        this._send(params)
      })
    }
  }

  scrape (opts) {
    if (this.destroyed || this.reconnecting) return
    if (!this.socket.connected) {
      this.socket.once('connect', () => {
        this.scrape(opts)
      })
      return
    }

    const infoHashes = (Array.isArray(opts.infoHash) && opts.infoHash.length > 0)
      ? opts.infoHash.map(infoHash => {
        return infoHash.toString('binary')
      })
      : (opts.infoHash && opts.infoHash.toString('binary')) || this.client._infoHashBinary
    const params = {
      action: 'scrape',
      info_hash: infoHashes
    }

    this._send(params)
  }

  destroy (cb = noop) {
    if (this.destroyed) return cb(null)

    this.destroyed = true

    clearInterval(this.interval)
    clearTimeout(this.reconnectTimer)

    // Destroy peers
    for (const peerId in this.peers) {
      const peer = this.peers[peerId]
      clearTimeout(peer.trackerTimeout)
      peer.destroy()
    }
    this.peers = null

    if (this.socket) {
      this.socket.removeListener('connect', this._onSocketConnectBound)
      this.socket.removeListener('data', this._onSocketDataBound)
      this.socket.removeListener('close', this._onSocketCloseBound)
      this.socket.removeListener('error', this._onSocketErrorBound)
      this.socket = null
    }

    this._onSocketConnectBound = null
    this._onSocketErrorBound = null
    this._onSocketDataBound = null
    this._onSocketCloseBound = null

    if (socketPool[this.announceUrl]) {
      socketPool[this.announceUrl].consumers -= 1
    }

    // Other instances are using the socket, so there's nothing left to do here
    if (socketPool[this.announceUrl].consumers > 0) return cb()

    let socket = socketPool[this.announceUrl]
    delete socketPool[this.announceUrl]
    socket.on('error', noop) // ignore all future errors
    socket.once('close', cb)

    // If there is no data response expected, destroy immediately.
    if (!this.expectingResponse) return destroyCleanup()

    // Otherwise, wait a short time for potential responses to come in from the
    // server, then force close the socket.
    var timeout = setTimeout(destroyCleanup, common.DESTROY_TIMEOUT)

    // But, if a response comes from the server before the timeout fires, do cleanup
    // right away.
    socket.once('data', destroyCleanup)

    function destroyCleanup () {
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }
      socket.removeListener('data', destroyCleanup)
      socket.destroy()
      socket = null
    }
  }

  _openSocket () {
    this.destroyed = false

    if (!this.peers) this.peers = {}

    this._onSocketConnectBound = () => {
      this._onSocketConnect()
    }
    this._onSocketErrorBound = err => {
      this._onSocketError(err)
    }
    this._onSocketDataBound = data => {
      this._onSocketData(data)
    }
    this._onSocketCloseBound = () => {
      this._onSocketClose()
    }

    this.socket = socketPool[this.announceUrl]
    if (this.socket) {
      socketPool[this.announceUrl].consumers += 1
      if (this.socket.connected) {
        this._onSocketConnectBound()
      }
    } else {
      this.socket = socketPool[this.announceUrl] = new Socket(this.announceUrl)
      this.socket.consumers = 1
      this.socket.once('connect', this._onSocketConnectBound)
    }

    this.socket.on('data', this._onSocketDataBound)
    this.socket.once('close', this._onSocketCloseBound)
    this.socket.once('error', this._onSocketErrorBound)
  }

  _onSocketConnect () {
    if (this.destroyed) return

    if (this.reconnecting) {
      this.reconnecting = false
      this.retries = 0
      this.announce(this.client._defaultAnnounceOpts())
    }
  }

  _onSocketData (data) {
    if (this.destroyed) return

    this.expectingResponse = false

    try {
      data = JSON.parse(data)
    } catch (err) {
      this.client.emit('warning', new Error('Invalid tracker response'))
      return
    }

    if (data.action === 'announce') {
      this._onAnnounceResponse(data)
    } else if (data.action === 'scrape') {
      this._onScrapeResponse(data)
    } else {
      this._onSocketError(new Error(`invalid action in WS response: ${data.action}`))
    }
  }

  _onAnnounceResponse (data) {
    if (data.info_hash !== this.client._infoHashBinary) {
      debug(
        'ignoring websocket data from %s for %s (looking for %s: reused socket)',
        this.announceUrl, common.binaryToHex(data.info_hash), this.client.infoHash
      )
      return
    }

    if (data.peer_id && data.peer_id === this.client._peerIdBinary) {
      // ignore offers/answers from this client
      return
    }

    debug(
      'received %s from %s for %s',
      JSON.stringify(data), this.announceUrl, this.client.infoHash
    )

    const failure = data['failure reason']
    if (failure) return this.client.emit('warning', new Error(failure))

    const warning = data['warning message']
    if (warning) this.client.emit('warning', new Error(warning))

    const interval = data.interval || data['min interval']
    if (interval) this.setInterval(interval * 1000)

    const trackerId = data['tracker id']
    if (trackerId) {
      // If absent, do not discard previous trackerId value
      this._trackerId = trackerId
    }

    if (data.complete != null) {
      const response = Object.assign({}, data, {
        announce: this.announceUrl,
        infoHash: common.binaryToHex(data.info_hash)
      })
      this.client.emit('update', response)
    }

    let peer
    if (data.offer && data.peer_id) {
      debug('creating peer (from remote offer)')
      peer = this._createPeer()
      peer.id = common.binaryToHex(data.peer_id)
      peer.once('signal', answer => {
        const params = {
          action: 'announce',
          info_hash: this.client._infoHashBinary,
          peer_id: this.client._peerIdBinary,
          to_peer_id: data.peer_id,
          answer,
          offer_id: data.offer_id
        }
        if (this._trackerId) params.trackerid = this._trackerId
        this._send(params)
      })
      peer.signal(data.offer)
      this.client.emit('peer', peer)
    }

    if (data.answer && data.peer_id) {
      const offerId = common.binaryToHex(data.offer_id)
      peer = this.peers[offerId]
      if (peer) {
        peer.id = common.binaryToHex(data.peer_id)
        peer.signal(data.answer)
        this.client.emit('peer', peer)

        clearTimeout(peer.trackerTimeout)
        peer.trackerTimeout = null
        delete this.peers[offerId]
      } else {
        debug(`got unexpected answer: ${JSON.stringify(data.answer)}`)
      }
    }
  }

  _onScrapeResponse (data) {
    data = data.files || {}

    const keys = Object.keys(data)
    if (keys.length === 0) {
      this.client.emit('warning', new Error('invalid scrape response'))
      return
    }

    keys.forEach(infoHash => {
      // TODO: optionally handle data.flags.min_request_interval
      // (separate from announce interval)
      const response = Object.assign(data[infoHash], {
        announce: this.announceUrl,
        infoHash: common.binaryToHex(infoHash)
      })
      this.client.emit('scrape', response)
    })
  }

  _onSocketClose () {
    if (this.destroyed) return
    this.destroy()
    this._startReconnectTimer()
  }

  _onSocketError (err) {
    if (this.destroyed) return
    this.destroy()
    // errors will often happen if a tracker is offline, so don't treat it as fatal
    this.client.emit('warning', err)
    this._startReconnectTimer()
  }

  _startReconnectTimer () {
    const ms = Math.floor(Math.random() * RECONNECT_VARIANCE) + Math.min(Math.pow(2, this.retries) * RECONNECT_MINIMUM, RECONNECT_MAXIMUM)

    this.reconnecting = true
    clearTimeout(this.reconnectTimer)
    this.reconnectTimer = setTimeout(() => {
      this.retries++
      this._openSocket()
    }, ms)
    if (this.reconnectTimer.unref) this.reconnectTimer.unref()

    debug('reconnecting socket in %s ms', ms)
  }

  _send (params) {
    if (this.destroyed) return
    this.expectingResponse = true
    const message = JSON.stringify(params)
    debug('send %s', message)
    this.socket.send(message)
  }

  _generateOffers (numwant, cb) {
    const self = this
    const offers = []
    debug('generating %s offers', numwant)

    for (let i = 0; i < numwant; ++i) {
      generateOffer()
    }
    checkDone()

    function generateOffer () {
      const offerId = randombytes(20).toString('hex')
      debug('creating peer (from _generateOffers)')
      const peer = self.peers[offerId] = self._createPeer({ initiator: true })
      peer.once('signal', offer => {
        offers.push({
          offer,
          offer_id: common.hexToBinary(offerId)
        })
        checkDone()
      })
      peer.trackerTimeout = setTimeout(() => {
        debug('tracker timeout: destroying peer')
        peer.trackerTimeout = null
        delete self.peers[offerId]
        peer.destroy()
      }, OFFER_TIMEOUT)
      if (peer.trackerTimeout.unref) peer.trackerTimeout.unref()
    }

    function checkDone () {
      if (offers.length === numwant) {
        debug('generated %s offers', numwant)
        cb(offers)
      }
    }
  }

  _createPeer (opts) {
    const self = this

    opts = Object.assign({
      trickle: false,
      config: self.client._rtcConfig,
      wrtc: self.client._wrtc
    }, opts)

    const peer = new Peer(opts)

    peer.once('error', onError)
    peer.once('connect', onConnect)

    return peer

    // Handle peer 'error' events that are fired *before* the peer is emitted in
    // a 'peer' event.
    function onError (err) {
      self.client.emit('warning', new Error(`Connection error: ${err.message}`))
      peer.destroy()
    }

    // Once the peer is emitted in a 'peer' event, then it's the consumer's
    // responsibility to listen for errors, so the listeners are removed here.
    function onConnect () {
      peer.removeListener('error', onError)
      peer.removeListener('connect', onConnect)
    }
  }
}

WebSocketTracker.prototype.DEFAULT_ANNOUNCE_INTERVAL = 30 * 1000 // 30 seconds
// Normally this shouldn't be accessed but is occasionally useful
WebSocketTracker._socketPool = socketPool

function noop () {}

module.exports = WebSocketTracker

},{"../common":14,"./tracker":12,"debug":26,"randombytes":66,"simple-peer":91,"simple-websocket":94}],14:[function(require,module,exports){
(function (Buffer){
/**
 * Functions/constants needed by both the client and server.
 */

exports.DEFAULT_ANNOUNCE_PEERS = 50
exports.MAX_ANNOUNCE_PEERS = 82

exports.binaryToHex = function (str) {
  if (typeof str !== 'string') {
    str = String(str)
  }
  return Buffer.from(str, 'binary').toString('hex')
}

exports.hexToBinary = function (str) {
  if (typeof str !== 'string') {
    str = String(str)
  }
  return Buffer.from(str, 'hex').toString('binary')
}

var config = require('./common-node')
Object.assign(exports, config)

}).call(this,require("buffer").Buffer)
},{"./common-node":17,"buffer":22}],15:[function(require,module,exports){
(function (Buffer){
/* global Blob, FileReader */

module.exports = function blobToBuffer (blob, cb) {
  if (typeof Blob === 'undefined' || !(blob instanceof Blob)) {
    throw new Error('first argument must be a Blob')
  }
  if (typeof cb !== 'function') {
    throw new Error('second argument must be a function')
  }

  var reader = new FileReader()

  function onLoadEnd (e) {
    reader.removeEventListener('loadend', onLoadEnd, false)
    if (e.error) cb(e.error)
    else cb(null, Buffer.from(reader.result))
  }

  reader.addEventListener('loadend', onLoadEnd, false)
  reader.readAsArrayBuffer(blob)
}

}).call(this,require("buffer").Buffer)
},{"buffer":22}],16:[function(require,module,exports){
(function (Buffer){
const { Transform } = require('readable-stream')

class Block extends Transform {
  constructor (size, opts = {}) {
    super(opts)

    if (typeof size === 'object') {
      opts = size
      size = opts.size
    }

    this.size = size || 512

    const { nopad, zeroPadding = true } = opts

    if (nopad) this._zeroPadding = false
    else this._zeroPadding = !!zeroPadding

    this._buffered = []
    this._bufferedBytes = 0
  }

  _transform (buf, enc, next) {
    this._bufferedBytes += buf.length
    this._buffered.push(buf)

    while (this._bufferedBytes >= this.size) {
      const b = Buffer.concat(this._buffered)
      this._bufferedBytes -= this.size
      this.push(b.slice(0, this.size))
      this._buffered = [ b.slice(this.size, b.length) ]
    }
    next()
  }

  _flush () {
    if (this._bufferedBytes && this._zeroPadding) {
      const zeroes = Buffer.alloc(this.size - this._bufferedBytes)
      this._buffered.push(zeroes)
      this.push(Buffer.concat(this._buffered))
      this._buffered = null
    } else if (this._bufferedBytes) {
      this.push(Buffer.concat(this._buffered))
      this._buffered = null
    }
    this.push(null)
  }
}

module.exports = Block

}).call(this,require("buffer").Buffer)
},{"buffer":22,"readable-stream":82}],17:[function(require,module,exports){

},{}],18:[function(require,module,exports){
arguments[4][17][0].apply(exports,arguments)
},{"dup":17}],19:[function(require,module,exports){
(function (Buffer){
function allocUnsafe (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number')
  }

  if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }

  if (Buffer.allocUnsafe) {
    return Buffer.allocUnsafe(size)
  } else {
    return new Buffer(size)
  }
}

module.exports = allocUnsafe

}).call(this,require("buffer").Buffer)
},{"buffer":22}],20:[function(require,module,exports){
(function (Buffer){
var bufferFill = require('buffer-fill')
var allocUnsafe = require('buffer-alloc-unsafe')

module.exports = function alloc (size, fill, encoding) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number')
  }

  if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }

  if (Buffer.alloc) {
    return Buffer.alloc(size, fill, encoding)
  }

  var buffer = allocUnsafe(size)

  if (size === 0) {
    return buffer
  }

  if (fill === undefined) {
    return bufferFill(buffer, 0)
  }

  if (typeof encoding !== 'string') {
    encoding = undefined
  }

  return bufferFill(buffer, fill, encoding)
}

}).call(this,require("buffer").Buffer)
},{"buffer":22,"buffer-alloc-unsafe":19,"buffer-fill":21}],21:[function(require,module,exports){
(function (Buffer){
/* Node.js 6.4.0 and up has full support */
var hasFullSupport = (function () {
  try {
    if (!Buffer.isEncoding('latin1')) {
      return false
    }

    var buf = Buffer.alloc ? Buffer.alloc(4) : new Buffer(4)

    buf.fill('ab', 'ucs2')

    return (buf.toString('hex') === '61006200')
  } catch (_) {
    return false
  }
}())

function isSingleByte (val) {
  return (val.length === 1 && val.charCodeAt(0) < 256)
}

function fillWithNumber (buffer, val, start, end) {
  if (start < 0 || end > buffer.length) {
    throw new RangeError('Out of range index')
  }

  start = start >>> 0
  end = end === undefined ? buffer.length : end >>> 0

  if (end > start) {
    buffer.fill(val, start, end)
  }

  return buffer
}

function fillWithBuffer (buffer, val, start, end) {
  if (start < 0 || end > buffer.length) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return buffer
  }

  start = start >>> 0
  end = end === undefined ? buffer.length : end >>> 0

  var pos = start
  var len = val.length
  while (pos <= (end - len)) {
    val.copy(buffer, pos)
    pos += len
  }

  if (pos !== end) {
    val.copy(buffer, pos, 0, end - pos)
  }

  return buffer
}

function fill (buffer, val, start, end, encoding) {
  if (hasFullSupport) {
    return buffer.fill(val, start, end, encoding)
  }

  if (typeof val === 'number') {
    return fillWithNumber(buffer, val, start, end)
  }

  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = buffer.length
    } else if (typeof end === 'string') {
      encoding = end
      end = buffer.length
    }

    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }

    if (encoding === 'latin1') {
      encoding = 'binary'
    }

    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }

    if (val === '') {
      return fillWithNumber(buffer, 0, start, end)
    }

    if (isSingleByte(val)) {
      return fillWithNumber(buffer, val.charCodeAt(0), start, end)
    }

    val = new Buffer(val, encoding)
  }

  if (Buffer.isBuffer(val)) {
    return fillWithBuffer(buffer, val, start, end)
  }

  // Other values (e.g. undefined, boolean, object) results in zero-fill
  return fillWithNumber(buffer, 0, start, end)
}

module.exports = fill

}).call(this,require("buffer").Buffer)
},{"buffer":22}],22:[function(require,module,exports){
(function (Buffer){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')
var customInspectSymbol =
  (typeof Symbol === 'function' && typeof Symbol.for === 'function')
    ? Symbol.for('nodejs.util.inspect.custom')
    : null

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    var proto = { foo: function () { return 42 } }
    Object.setPrototypeOf(proto, Uint8Array.prototype)
    Object.setPrototypeOf(arr, proto)
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  Object.setPrototypeOf(buf, Buffer.prototype)
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw new TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Object.setPrototypeOf(Buffer.prototype, Uint8Array.prototype)
Object.setPrototypeOf(Buffer, Uint8Array)

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  Object.setPrototypeOf(buf, Buffer.prototype)

  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}
if (customInspectSymbol) {
  Buffer.prototype[customInspectSymbol] = Buffer.prototype.inspect
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [val], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += hexSliceLookupTable[buf[i]]
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  Object.setPrototypeOf(newBuf, Buffer.prototype)

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  } else if (typeof val === 'boolean') {
    val = Number(val)
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

// Create lookup table for `toString('hex')`
// See: https://github.com/feross/buffer/issues/219
var hexSliceLookupTable = (function () {
  var alphabet = '0123456789abcdef'
  var table = new Array(256)
  for (var i = 0; i < 16; ++i) {
    var i16 = i * 16
    for (var j = 0; j < 16; ++j) {
      table[i16 + j] = alphabet[i] + alphabet[j]
    }
  }
  return table
})()

}).call(this,require("buffer").Buffer)
},{"base64-js":4,"buffer":22,"ieee754":33}],23:[function(require,module,exports){
module.exports = {
  "100": "Continue",
  "101": "Switching Protocols",
  "102": "Processing",
  "200": "OK",
  "201": "Created",
  "202": "Accepted",
  "203": "Non-Authoritative Information",
  "204": "No Content",
  "205": "Reset Content",
  "206": "Partial Content",
  "207": "Multi-Status",
  "208": "Already Reported",
  "226": "IM Used",
  "300": "Multiple Choices",
  "301": "Moved Permanently",
  "302": "Found",
  "303": "See Other",
  "304": "Not Modified",
  "305": "Use Proxy",
  "307": "Temporary Redirect",
  "308": "Permanent Redirect",
  "400": "Bad Request",
  "401": "Unauthorized",
  "402": "Payment Required",
  "403": "Forbidden",
  "404": "Not Found",
  "405": "Method Not Allowed",
  "406": "Not Acceptable",
  "407": "Proxy Authentication Required",
  "408": "Request Timeout",
  "409": "Conflict",
  "410": "Gone",
  "411": "Length Required",
  "412": "Precondition Failed",
  "413": "Payload Too Large",
  "414": "URI Too Long",
  "415": "Unsupported Media Type",
  "416": "Range Not Satisfiable",
  "417": "Expectation Failed",
  "418": "I'm a teapot",
  "421": "Misdirected Request",
  "422": "Unprocessable Entity",
  "423": "Locked",
  "424": "Failed Dependency",
  "425": "Unordered Collection",
  "426": "Upgrade Required",
  "428": "Precondition Required",
  "429": "Too Many Requests",
  "431": "Request Header Fields Too Large",
  "451": "Unavailable For Legal Reasons",
  "500": "Internal Server Error",
  "501": "Not Implemented",
  "502": "Bad Gateway",
  "503": "Service Unavailable",
  "504": "Gateway Timeout",
  "505": "HTTP Version Not Supported",
  "506": "Variant Also Negotiates",
  "507": "Insufficient Storage",
  "508": "Loop Detected",
  "509": "Bandwidth Limit Exceeded",
  "510": "Not Extended",
  "511": "Network Authentication Required"
}

},{}],24:[function(require,module,exports){
const BlockStream = require('block-stream2')
const stream = require('readable-stream')

class ChunkStoreWriteStream extends stream.Writable {
  constructor (store, chunkLength, opts = {}) {
    super(opts)

    if (!store || !store.put || !store.get) {
      throw new Error('First argument must be an abstract-chunk-store compliant store')
    }
    chunkLength = Number(chunkLength)
    if (!chunkLength) throw new Error('Second argument must be a chunk length')

    this._blockstream = new BlockStream(chunkLength, { zeroPadding: false })
    this._outstandingPuts = 0

    let index = 0
    const onData = chunk => {
      if (this.destroyed) return

      this._outstandingPuts += 1
      store.put(index, chunk, () => {
        this._outstandingPuts -= 1
        if (this._outstandingPuts === 0 && typeof this._finalCb === 'function') {
          this._finalCb(null)
          this._finalCb = null
        }
      })
      index += 1
    }

    this._blockstream
      .on('data', onData)
      .on('error', err => { this.destroy(err) })
  }

  _write (chunk, encoding, callback) {
    this._blockstream.write(chunk, encoding, callback)
  }

  _final (cb) {
    this._blockstream.end()
    this._blockstream.once('end', () => {
      if (this._outstandingPuts === 0) cb(null)
      else this._finalCb = cb
    })
  }

  destroy (err) {
    if (this.destroyed) return
    this.destroyed = true

    if (err) this.emit('error', err)
    this.emit('close')
  }
}

module.exports = ChunkStoreWriteStream

},{"block-stream2":16,"readable-stream":82}],25:[function(require,module,exports){
(function (process,global,Buffer){
const bencode = require('bencode')
const BlockStream = require('block-stream2')
const calcPieceLength = require('piece-length')
const corePath = require('path')
const FileReadStream = require('filestream/read')
const fs = require('fs')
const isFile = require('is-file')
const junk = require('junk')
const MultiStream = require('multistream')
const once = require('once')
const parallel = require('run-parallel')
const sha1 = require('simple-sha1')
const stream = require('readable-stream')

// TODO: When Node 10 support is dropped, replace this with Array.prototype.flat
function flat (arr1) {
  return arr1.reduce(
    (acc, val) => Array.isArray(val)
      ? acc.concat(flat(val))
      : acc.concat(val),
    []
  )
}

const announceList = [
  ['udp://tracker.leechers-paradise.org:6969'],
  ['udp://tracker.coppersurfer.tk:6969'],
  ['udp://tracker.opentrackr.org:1337'],
  ['udp://explodie.org:6969'],
  ['udp://tracker.empire-js.us:1337'],
  ['wss://tracker.btorrent.xyz'],
  ['wss://tracker.openwebtorrent.com'],
  ['wss://tracker.fastcast.nz']
]

/**
 * Create a torrent.
 * @param  {string|File|FileList|Buffer|Stream|Array.<string|File|Buffer|Stream>} input
 * @param  {Object} opts
 * @param  {string=} opts.name
 * @param  {Date=} opts.creationDate
 * @param  {string=} opts.comment
 * @param  {string=} opts.createdBy
 * @param  {boolean|number=} opts.private
 * @param  {number=} opts.pieceLength
 * @param  {Array.<Array.<string>>=} opts.announceList
 * @param  {Array.<string>=} opts.urlList
 * @param  {Object} opts.info
 * @param  {function} cb
 * @return {Buffer} buffer of .torrent file data
 */
function createTorrent (input, opts, cb) {
  if (typeof opts === 'function') [opts, cb] = [cb, opts]
  opts = opts ? Object.assign({}, opts) : {}

  _parseInput(input, opts, (err, files, singleFileTorrent) => {
    if (err) return cb(err)
    opts.singleFileTorrent = singleFileTorrent
    onFiles(files, opts, cb)
  })
}

function parseInput (input, opts, cb) {
  if (typeof opts === 'function') [opts, cb] = [cb, opts]
  opts = opts ? Object.assign({}, opts) : {}
  _parseInput(input, opts, cb)
}

/**
 * Parse input file and return file information.
 */
function _parseInput (input, opts, cb) {
  if (isFileList(input)) input = Array.from(input)
  if (!Array.isArray(input)) input = [input]

  if (input.length === 0) throw new Error('invalid input type')

  input.forEach(item => {
    if (item == null) throw new Error(`invalid input type: ${item}`)
  })

  // In Electron, use the true file path
  input = input.map(item => {
    if (isBlob(item) && typeof item.path === 'string' && typeof fs.stat === 'function') return item.path
    return item
  })

  // If there's just one file, allow the name to be set by `opts.name`
  if (input.length === 1 && typeof input[0] !== 'string' && !input[0].name) input[0].name = opts.name

  let commonPrefix = null
  input.forEach((item, i) => {
    if (typeof item === 'string') {
      return
    }

    let path = item.fullPath || item.name
    if (!path) {
      path = `Unknown File ${i + 1}`
      item.unknownName = true
    }

    item.path = path.split('/')

    // Remove initial slash
    if (!item.path[0]) {
      item.path.shift()
    }

    if (item.path.length < 2) { // No real prefix
      commonPrefix = null
    } else if (i === 0 && input.length > 1) { // The first file has a prefix
      commonPrefix = item.path[0]
    } else if (item.path[0] !== commonPrefix) { // The prefix doesn't match
      commonPrefix = null
    }
  })

  // remove junk files
  input = input.filter(item => {
    if (typeof item === 'string') {
      return true
    }
    const filename = item.path[item.path.length - 1]
    return notHidden(filename) && junk.not(filename)
  })

  if (commonPrefix) {
    input.forEach(item => {
      const pathless = (Buffer.isBuffer(item) || isReadable(item)) && !item.path
      if (typeof item === 'string' || pathless) return
      item.path.shift()
    })
  }

  if (!opts.name && commonPrefix) {
    opts.name = commonPrefix
  }

  if (!opts.name) {
    // use first user-set file name
    input.some(item => {
      if (typeof item === 'string') {
        opts.name = corePath.basename(item)
        return true
      } else if (!item.unknownName) {
        opts.name = item.path[item.path.length - 1]
        return true
      }
    })
  }

  if (!opts.name) {
    opts.name = `Unnamed Torrent ${Date.now()}`
  }

  const numPaths = input.reduce((sum, item) => sum + Number(typeof item === 'string'), 0)

  let isSingleFileTorrent = (input.length === 1)

  if (input.length === 1 && typeof input[0] === 'string') {
    if (typeof fs.stat !== 'function') {
      throw new Error('filesystem paths do not work in the browser')
    }
    // If there's a single path, verify it's a file before deciding this is a single
    // file torrent
    isFile(input[0], (err, pathIsFile) => {
      if (err) return cb(err)
      isSingleFileTorrent = pathIsFile
      processInput()
    })
  } else {
    process.nextTick(() => {
      processInput()
    })
  }

  function processInput () {
    parallel(input.map(item => cb => {
      const file = {}

      if (isBlob(item)) {
        file.getStream = getBlobStream(item)
        file.length = item.size
      } else if (Buffer.isBuffer(item)) {
        file.getStream = getBufferStream(item)
        file.length = item.length
      } else if (isReadable(item)) {
        file.getStream = getStreamStream(item, file)
        file.length = 0
      } else if (typeof item === 'string') {
        if (typeof fs.stat !== 'function') {
          throw new Error('filesystem paths do not work in the browser')
        }
        const keepRoot = numPaths > 1 || isSingleFileTorrent
        getFiles(item, keepRoot, cb)
        return // early return!
      } else {
        throw new Error('invalid input type')
      }
      file.path = item.path
      cb(null, file)
    }), (err, files) => {
      if (err) return cb(err)
      files = flat(files)
      cb(null, files, isSingleFileTorrent)
    })
  }
}

function getFiles (path, keepRoot, cb) {
  traversePath(path, getFileInfo, (err, files) => {
    if (err) return cb(err)

    if (Array.isArray(files)) files = flat(files)
    else files = [files]

    path = corePath.normalize(path)
    if (keepRoot) {
      path = path.slice(0, path.lastIndexOf(corePath.sep) + 1)
    }
    if (path[path.length - 1] !== corePath.sep) path += corePath.sep

    files.forEach(file => {
      file.getStream = getFilePathStream(file.path)
      file.path = file.path.replace(path, '').split(corePath.sep)
    })
    cb(null, files)
  })
}

function getFileInfo (path, cb) {
  cb = once(cb)
  fs.stat(path, (err, stat) => {
    if (err) return cb(err)
    const info = {
      length: stat.size,
      path
    }
    cb(null, info)
  })
}

function traversePath (path, fn, cb) {
  fs.stat(path, (err, stats) => {
    if (err) return cb(err)
    if (stats.isDirectory()) {
      fs.readdir(path, (err, entries) => {
        if (err) return cb(err)
        parallel(entries.filter(notHidden).filter(junk.not).map(entry => cb => {
          traversePath(corePath.join(path, entry), fn, cb)
        }), cb)
      })
    } else if (stats.isFile()) {
      fn(path, cb)
    }
    // Ignore other types (not a file or directory)
  })
}

function notHidden (file) {
  return file[0] !== '.'
}

function getPieceList (files, pieceLength, cb) {
  cb = once(cb)
  const pieces = []
  let length = 0

  const streams = files.map(file => file.getStream)

  let remainingHashes = 0
  let pieceNum = 0
  let ended = false

  const multistream = new MultiStream(streams)
  const blockstream = new BlockStream(pieceLength, { zeroPadding: false })

  multistream.on('error', onError)

  multistream
    .pipe(blockstream)
    .on('data', onData)
    .on('end', onEnd)
    .on('error', onError)

  function onData (chunk) {
    length += chunk.length

    const i = pieceNum
    sha1(chunk, hash => {
      pieces[i] = hash
      remainingHashes -= 1
      maybeDone()
    })
    remainingHashes += 1
    pieceNum += 1
  }

  function onEnd () {
    ended = true
    maybeDone()
  }

  function onError (err) {
    cleanup()
    cb(err)
  }

  function cleanup () {
    multistream.removeListener('error', onError)
    blockstream.removeListener('data', onData)
    blockstream.removeListener('end', onEnd)
    blockstream.removeListener('error', onError)
  }

  function maybeDone () {
    if (ended && remainingHashes === 0) {
      cleanup()
      cb(null, Buffer.from(pieces.join(''), 'hex'), length)
    }
  }
}

function onFiles (files, opts, cb) {
  let announceList = opts.announceList

  if (!announceList) {
    if (typeof opts.announce === 'string') announceList = [[opts.announce]]
    else if (Array.isArray(opts.announce)) {
      announceList = opts.announce.map(u => [u])
    }
  }

  if (!announceList) announceList = []

  if (global.WEBTORRENT_ANNOUNCE) {
    if (typeof global.WEBTORRENT_ANNOUNCE === 'string') {
      announceList.push([[global.WEBTORRENT_ANNOUNCE]])
    } else if (Array.isArray(global.WEBTORRENT_ANNOUNCE)) {
      announceList = announceList.concat(global.WEBTORRENT_ANNOUNCE.map(u => [u]))
    }
  }

  // When no trackers specified, use some reasonable defaults
  if (opts.announce === undefined && opts.announceList === undefined) {
    announceList = announceList.concat(module.exports.announceList)
  }

  if (typeof opts.urlList === 'string') opts.urlList = [opts.urlList]

  const torrent = {
    info: {
      name: opts.name
    },
    'creation date': Math.ceil((Number(opts.creationDate) || Date.now()) / 1000),
    encoding: 'UTF-8'
  }

  if (announceList.length !== 0) {
    torrent.announce = announceList[0][0]
    torrent['announce-list'] = announceList
  }

  if (opts.comment !== undefined) torrent.comment = opts.comment

  if (opts.createdBy !== undefined) torrent['created by'] = opts.createdBy

  if (opts.private !== undefined) torrent.info.private = Number(opts.private)

  if (opts.info !== undefined) Object.assign(torrent.info, opts.info)

  // "ssl-cert" key is for SSL torrents, see:
  //   - http://blog.libtorrent.org/2012/01/bittorrent-over-ssl/
  //   - http://www.libtorrent.org/manual-ref.html#ssl-torrents
  //   - http://www.libtorrent.org/reference-Create_Torrents.html
  if (opts.sslCert !== undefined) torrent.info['ssl-cert'] = opts.sslCert

  if (opts.urlList !== undefined) torrent['url-list'] = opts.urlList

  const pieceLength = opts.pieceLength || calcPieceLength(files.reduce(sumLength, 0))
  torrent.info['piece length'] = pieceLength

  getPieceList(files, pieceLength, (err, pieces, torrentLength) => {
    if (err) return cb(err)
    torrent.info.pieces = pieces

    files.forEach(file => {
      delete file.getStream
    })

    if (opts.singleFileTorrent) {
      torrent.info.length = torrentLength
    } else {
      torrent.info.files = files
    }

    cb(null, bencode.encode(torrent))
  })
}

/**
 * Accumulator to sum file lengths
 * @param  {number} sum
 * @param  {Object} file
 * @return {number}
 */
function sumLength (sum, file) {
  return sum + file.length
}

/**
 * Check if `obj` is a W3C `Blob` object (which `File` inherits from)
 * @param  {*} obj
 * @return {boolean}
 */
function isBlob (obj) {
  return typeof Blob !== 'undefined' && obj instanceof Blob
}

/**
 * Check if `obj` is a W3C `FileList` object
 * @param  {*} obj
 * @return {boolean}
 */
function isFileList (obj) {
  return typeof FileList !== 'undefined' && obj instanceof FileList
}

/**
 * Check if `obj` is a node Readable stream
 * @param  {*} obj
 * @return {boolean}
 */
function isReadable (obj) {
  return typeof obj === 'object' && obj != null && typeof obj.pipe === 'function'
}

/**
 * Convert a `File` to a lazy readable stream.
 * @param  {File|Blob} file
 * @return {function}
 */
function getBlobStream (file) {
  return () => new FileReadStream(file)
}

/**
 * Convert a `Buffer` to a lazy readable stream.
 * @param  {Buffer} buffer
 * @return {function}
 */
function getBufferStream (buffer) {
  return () => {
    const s = new stream.PassThrough()
    s.end(buffer)
    return s
  }
}

/**
 * Convert a file path to a lazy readable stream.
 * @param  {string} path
 * @return {function}
 */
function getFilePathStream (path) {
  return () => fs.createReadStream(path)
}

/**
 * Convert a readable stream to a lazy readable stream. Adds instrumentation to track
 * the number of bytes in the stream and set `file.length`.
 *
 * @param  {Stream} stream
 * @param  {Object} file
 * @return {function}
 */
function getStreamStream (readable, file) {
  return () => {
    const counter = new stream.Transform()
    counter._transform = function (buf, enc, done) {
      file.length += buf.length
      this.push(buf)
      done()
    }
    readable.pipe(counter)
    return counter
  }
}

module.exports = createTorrent
module.exports.parseInput = parseInput
module.exports.announceList = announceList

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer)
},{"_process":58,"bencode":7,"block-stream2":16,"buffer":22,"filestream/read":30,"fs":18,"is-file":37,"junk":39,"multistream":50,"once":52,"path":55,"piece-length":56,"readable-stream":82,"run-parallel":86,"simple-sha1":92}],26:[function(require,module,exports){
(function (process){
/* eslint-env browser */

/**
 * This is the web browser implementation of `debug()`.
 */

exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.storage = localstorage();

/**
 * Colors.
 */

exports.colors = [
	'#0000CC',
	'#0000FF',
	'#0033CC',
	'#0033FF',
	'#0066CC',
	'#0066FF',
	'#0099CC',
	'#0099FF',
	'#00CC00',
	'#00CC33',
	'#00CC66',
	'#00CC99',
	'#00CCCC',
	'#00CCFF',
	'#3300CC',
	'#3300FF',
	'#3333CC',
	'#3333FF',
	'#3366CC',
	'#3366FF',
	'#3399CC',
	'#3399FF',
	'#33CC00',
	'#33CC33',
	'#33CC66',
	'#33CC99',
	'#33CCCC',
	'#33CCFF',
	'#6600CC',
	'#6600FF',
	'#6633CC',
	'#6633FF',
	'#66CC00',
	'#66CC33',
	'#9900CC',
	'#9900FF',
	'#9933CC',
	'#9933FF',
	'#99CC00',
	'#99CC33',
	'#CC0000',
	'#CC0033',
	'#CC0066',
	'#CC0099',
	'#CC00CC',
	'#CC00FF',
	'#CC3300',
	'#CC3333',
	'#CC3366',
	'#CC3399',
	'#CC33CC',
	'#CC33FF',
	'#CC6600',
	'#CC6633',
	'#CC9900',
	'#CC9933',
	'#CCCC00',
	'#CCCC33',
	'#FF0000',
	'#FF0033',
	'#FF0066',
	'#FF0099',
	'#FF00CC',
	'#FF00FF',
	'#FF3300',
	'#FF3333',
	'#FF3366',
	'#FF3399',
	'#FF33CC',
	'#FF33FF',
	'#FF6600',
	'#FF6633',
	'#FF9900',
	'#FF9933',
	'#FFCC00',
	'#FFCC33'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

// eslint-disable-next-line complexity
function useColors() {
	// NB: In an Electron preload script, document will be defined but not fully
	// initialized. Since we know we're in Chrome, we'll just detect this case
	// explicitly
	if (typeof window !== 'undefined' && window.process && (window.process.type === 'renderer' || window.process.__nwjs)) {
		return true;
	}

	// Internet Explorer and Edge do not support colors.
	if (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
		return false;
	}

	// Is webkit? http://stackoverflow.com/a/16459606/376773
	// document is undefined in react-native: https://github.com/facebook/react-native/pull/1632
	return (typeof document !== 'undefined' && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance) ||
		// Is firebug? http://stackoverflow.com/a/398120/376773
		(typeof window !== 'undefined' && window.console && (window.console.firebug || (window.console.exception && window.console.table))) ||
		// Is firefox >= v31?
		// https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
		(typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31) ||
		// Double check webkit in userAgent just in case we are in a worker
		(typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/));
}

/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs(args) {
	args[0] = (this.useColors ? '%c' : '') +
		this.namespace +
		(this.useColors ? ' %c' : ' ') +
		args[0] +
		(this.useColors ? '%c ' : ' ') +
		'+' + module.exports.humanize(this.diff);

	if (!this.useColors) {
		return;
	}

	const c = 'color: ' + this.color;
	args.splice(1, 0, c, 'color: inherit');

	// The final "%c" is somewhat tricky, because there could be other
	// arguments passed either before or after the %c, so we need to
	// figure out the correct index to insert the CSS into
	let index = 0;
	let lastC = 0;
	args[0].replace(/%[a-zA-Z%]/g, match => {
		if (match === '%%') {
			return;
		}
		index++;
		if (match === '%c') {
			// We only are interested in the *last* %c
			// (the user may have provided their own)
			lastC = index;
		}
	});

	args.splice(lastC, 0, c);
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */
function log(...args) {
	// This hackery is required for IE8/9, where
	// the `console.log` function doesn't have 'apply'
	return typeof console === 'object' &&
		console.log &&
		console.log(...args);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */
function save(namespaces) {
	try {
		if (namespaces) {
			exports.storage.setItem('debug', namespaces);
		} else {
			exports.storage.removeItem('debug');
		}
	} catch (error) {
		// Swallow
		// XXX (@Qix-) should we be logging these?
	}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */
function load() {
	let r;
	try {
		r = exports.storage.getItem('debug');
	} catch (error) {
		// Swallow
		// XXX (@Qix-) should we be logging these?
	}

	// If debug isn't set in LS, and we're in Electron, try to load $DEBUG
	if (!r && typeof process !== 'undefined' && 'env' in process) {
		r = process.env.DEBUG;
	}

	return r;
}

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage() {
	try {
		// TVMLKit (Apple TV JS Runtime) does not have a window object, just localStorage in the global context
		// The Browser also has localStorage in the global context.
		return localStorage;
	} catch (error) {
		// Swallow
		// XXX (@Qix-) should we be logging these?
	}
}

module.exports = require('./common')(exports);

const {formatters} = module.exports;

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

formatters.j = function (v) {
	try {
		return JSON.stringify(v);
	} catch (error) {
		return '[UnexpectedJSONParseError]: ' + error.message;
	}
};

}).call(this,require('_process'))
},{"./common":27,"_process":58}],27:[function(require,module,exports){

/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 */

function setup(env) {
	createDebug.debug = createDebug;
	createDebug.default = createDebug;
	createDebug.coerce = coerce;
	createDebug.disable = disable;
	createDebug.enable = enable;
	createDebug.enabled = enabled;
	createDebug.humanize = require('ms');

	Object.keys(env).forEach(key => {
		createDebug[key] = env[key];
	});

	/**
	* Active `debug` instances.
	*/
	createDebug.instances = [];

	/**
	* The currently active debug mode names, and names to skip.
	*/

	createDebug.names = [];
	createDebug.skips = [];

	/**
	* Map of special "%n" handling functions, for the debug "format" argument.
	*
	* Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
	*/
	createDebug.formatters = {};

	/**
	* Selects a color for a debug namespace
	* @param {String} namespace The namespace string for the for the debug instance to be colored
	* @return {Number|String} An ANSI color code for the given namespace
	* @api private
	*/
	function selectColor(namespace) {
		let hash = 0;

		for (let i = 0; i < namespace.length; i++) {
			hash = ((hash << 5) - hash) + namespace.charCodeAt(i);
			hash |= 0; // Convert to 32bit integer
		}

		return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
	}
	createDebug.selectColor = selectColor;

	/**
	* Create a debugger with the given `namespace`.
	*
	* @param {String} namespace
	* @return {Function}
	* @api public
	*/
	function createDebug(namespace) {
		let prevTime;

		function debug(...args) {
			// Disabled?
			if (!debug.enabled) {
				return;
			}

			const self = debug;

			// Set `diff` timestamp
			const curr = Number(new Date());
			const ms = curr - (prevTime || curr);
			self.diff = ms;
			self.prev = prevTime;
			self.curr = curr;
			prevTime = curr;

			args[0] = createDebug.coerce(args[0]);

			if (typeof args[0] !== 'string') {
				// Anything else let's inspect with %O
				args.unshift('%O');
			}

			// Apply any `formatters` transformations
			let index = 0;
			args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
				// If we encounter an escaped % then don't increase the array index
				if (match === '%%') {
					return match;
				}
				index++;
				const formatter = createDebug.formatters[format];
				if (typeof formatter === 'function') {
					const val = args[index];
					match = formatter.call(self, val);

					// Now we need to remove `args[index]` since it's inlined in the `format`
					args.splice(index, 1);
					index--;
				}
				return match;
			});

			// Apply env-specific formatting (colors, etc.)
			createDebug.formatArgs.call(self, args);

			const logFn = self.log || createDebug.log;
			logFn.apply(self, args);
		}

		debug.namespace = namespace;
		debug.enabled = createDebug.enabled(namespace);
		debug.useColors = createDebug.useColors();
		debug.color = selectColor(namespace);
		debug.destroy = destroy;
		debug.extend = extend;
		// Debug.formatArgs = formatArgs;
		// debug.rawLog = rawLog;

		// env-specific initialization logic for debug instances
		if (typeof createDebug.init === 'function') {
			createDebug.init(debug);
		}

		createDebug.instances.push(debug);

		return debug;
	}

	function destroy() {
		const index = createDebug.instances.indexOf(this);
		if (index !== -1) {
			createDebug.instances.splice(index, 1);
			return true;
		}
		return false;
	}

	function extend(namespace, delimiter) {
		const newDebug = createDebug(this.namespace + (typeof delimiter === 'undefined' ? ':' : delimiter) + namespace);
		newDebug.log = this.log;
		return newDebug;
	}

	/**
	* Enables a debug mode by namespaces. This can include modes
	* separated by a colon and wildcards.
	*
	* @param {String} namespaces
	* @api public
	*/
	function enable(namespaces) {
		createDebug.save(namespaces);

		createDebug.names = [];
		createDebug.skips = [];

		let i;
		const split = (typeof namespaces === 'string' ? namespaces : '').split(/[\s,]+/);
		const len = split.length;

		for (i = 0; i < len; i++) {
			if (!split[i]) {
				// ignore empty strings
				continue;
			}

			namespaces = split[i].replace(/\*/g, '.*?');

			if (namespaces[0] === '-') {
				createDebug.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
			} else {
				createDebug.names.push(new RegExp('^' + namespaces + '$'));
			}
		}

		for (i = 0; i < createDebug.instances.length; i++) {
			const instance = createDebug.instances[i];
			instance.enabled = createDebug.enabled(instance.namespace);
		}
	}

	/**
	* Disable debug output.
	*
	* @return {String} namespaces
	* @api public
	*/
	function disable() {
		const namespaces = [
			...createDebug.names.map(toNamespace),
			...createDebug.skips.map(toNamespace).map(namespace => '-' + namespace)
		].join(',');
		createDebug.enable('');
		return namespaces;
	}

	/**
	* Returns true if the given mode name is enabled, false otherwise.
	*
	* @param {String} name
	* @return {Boolean}
	* @api public
	*/
	function enabled(name) {
		if (name[name.length - 1] === '*') {
			return true;
		}

		let i;
		let len;

		for (i = 0, len = createDebug.skips.length; i < len; i++) {
			if (createDebug.skips[i].test(name)) {
				return false;
			}
		}

		for (i = 0, len = createDebug.names.length; i < len; i++) {
			if (createDebug.names[i].test(name)) {
				return true;
			}
		}

		return false;
	}

	/**
	* Convert regexp to namespace
	*
	* @param {RegExp} regxep
	* @return {String} namespace
	* @api private
	*/
	function toNamespace(regexp) {
		return regexp.toString()
			.substring(2, regexp.toString().length - 2)
			.replace(/\.\*\?$/, '*');
	}

	/**
	* Coerce `val`.
	*
	* @param {Mixed} val
	* @return {Mixed}
	* @api private
	*/
	function coerce(val) {
		if (val instanceof Error) {
			return val.stack || val.message;
		}
		return val;
	}

	createDebug.enable(createDebug.load());

	return createDebug;
}

module.exports = setup;

},{"ms":49}],28:[function(require,module,exports){
(function (process){
var once = require('once');

var noop = function() {};

var isRequest = function(stream) {
	return stream.setHeader && typeof stream.abort === 'function';
};

var isChildProcess = function(stream) {
	return stream.stdio && Array.isArray(stream.stdio) && stream.stdio.length === 3
};

var eos = function(stream, opts, callback) {
	if (typeof opts === 'function') return eos(stream, null, opts);
	if (!opts) opts = {};

	callback = once(callback || noop);

	var ws = stream._writableState;
	var rs = stream._readableState;
	var readable = opts.readable || (opts.readable !== false && stream.readable);
	var writable = opts.writable || (opts.writable !== false && stream.writable);
	var cancelled = false;

	var onlegacyfinish = function() {
		if (!stream.writable) onfinish();
	};

	var onfinish = function() {
		writable = false;
		if (!readable) callback.call(stream);
	};

	var onend = function() {
		readable = false;
		if (!writable) callback.call(stream);
	};

	var onexit = function(exitCode) {
		callback.call(stream, exitCode ? new Error('exited with error code: ' + exitCode) : null);
	};

	var onerror = function(err) {
		callback.call(stream, err);
	};

	var onclose = function() {
		process.nextTick(onclosenexttick);
	};

	var onclosenexttick = function() {
		if (cancelled) return;
		if (readable && !(rs && (rs.ended && !rs.destroyed))) return callback.call(stream, new Error('premature close'));
		if (writable && !(ws && (ws.ended && !ws.destroyed))) return callback.call(stream, new Error('premature close'));
	};

	var onrequest = function() {
		stream.req.on('finish', onfinish);
	};

	if (isRequest(stream)) {
		stream.on('complete', onfinish);
		stream.on('abort', onclose);
		if (stream.req) onrequest();
		else stream.on('request', onrequest);
	} else if (writable && !ws) { // legacy streams
		stream.on('end', onlegacyfinish);
		stream.on('close', onlegacyfinish);
	}

	if (isChildProcess(stream)) stream.on('exit', onexit);

	stream.on('end', onend);
	stream.on('finish', onfinish);
	if (opts.error !== false) stream.on('error', onerror);
	stream.on('close', onclose);

	return function() {
		cancelled = true;
		stream.removeListener('complete', onfinish);
		stream.removeListener('abort', onclose);
		stream.removeListener('request', onrequest);
		if (stream.req) stream.req.removeListener('finish', onfinish);
		stream.removeListener('end', onlegacyfinish);
		stream.removeListener('close', onlegacyfinish);
		stream.removeListener('finish', onfinish);
		stream.removeListener('exit', onexit);
		stream.removeListener('end', onend);
		stream.removeListener('error', onerror);
		stream.removeListener('close', onclose);
	};
};

module.exports = eos;

}).call(this,require('_process'))
},{"_process":58,"once":52}],29:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var objectCreate = Object.create || objectCreatePolyfill
var objectKeys = Object.keys || objectKeysPolyfill
var bind = Function.prototype.bind || functionBindPolyfill

function EventEmitter() {
  if (!this._events || !Object.prototype.hasOwnProperty.call(this, '_events')) {
    this._events = objectCreate(null);
    this._eventsCount = 0;
  }

  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
var defaultMaxListeners = 10;

var hasDefineProperty;
try {
  var o = {};
  if (Object.defineProperty) Object.defineProperty(o, 'x', { value: 0 });
  hasDefineProperty = o.x === 0;
} catch (err) { hasDefineProperty = false }
if (hasDefineProperty) {
  Object.defineProperty(EventEmitter, 'defaultMaxListeners', {
    enumerable: true,
    get: function() {
      return defaultMaxListeners;
    },
    set: function(arg) {
      // check whether the input is a positive number (whose value is zero or
      // greater and not a NaN).
      if (typeof arg !== 'number' || arg < 0 || arg !== arg)
        throw new TypeError('"defaultMaxListeners" must be a positive number');
      defaultMaxListeners = arg;
    }
  });
} else {
  EventEmitter.defaultMaxListeners = defaultMaxListeners;
}

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
  if (typeof n !== 'number' || n < 0 || isNaN(n))
    throw new TypeError('"n" argument must be a positive number');
  this._maxListeners = n;
  return this;
};

function $getMaxListeners(that) {
  if (that._maxListeners === undefined)
    return EventEmitter.defaultMaxListeners;
  return that._maxListeners;
}

EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
  return $getMaxListeners(this);
};

// These standalone emit* functions are used to optimize calling of event
// handlers for fast cases because emit() itself often has a variable number of
// arguments and can be deoptimized because of that. These functions always have
// the same number of arguments and thus do not get deoptimized, so the code
// inside them can execute faster.
function emitNone(handler, isFn, self) {
  if (isFn)
    handler.call(self);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self);
  }
}
function emitOne(handler, isFn, self, arg1) {
  if (isFn)
    handler.call(self, arg1);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1);
  }
}
function emitTwo(handler, isFn, self, arg1, arg2) {
  if (isFn)
    handler.call(self, arg1, arg2);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2);
  }
}
function emitThree(handler, isFn, self, arg1, arg2, arg3) {
  if (isFn)
    handler.call(self, arg1, arg2, arg3);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].call(self, arg1, arg2, arg3);
  }
}

function emitMany(handler, isFn, self, args) {
  if (isFn)
    handler.apply(self, args);
  else {
    var len = handler.length;
    var listeners = arrayClone(handler, len);
    for (var i = 0; i < len; ++i)
      listeners[i].apply(self, args);
  }
}

EventEmitter.prototype.emit = function emit(type) {
  var er, handler, len, args, i, events;
  var doError = (type === 'error');

  events = this._events;
  if (events)
    doError = (doError && events.error == null);
  else if (!doError)
    return false;

  // If there is no 'error' event listener then throw.
  if (doError) {
    if (arguments.length > 1)
      er = arguments[1];
    if (er instanceof Error) {
      throw er; // Unhandled 'error' event
    } else {
      // At least give some kind of context to the user
      var err = new Error('Unhandled "error" event. (' + er + ')');
      err.context = er;
      throw err;
    }
    return false;
  }

  handler = events[type];

  if (!handler)
    return false;

  var isFn = typeof handler === 'function';
  len = arguments.length;
  switch (len) {
      // fast cases
    case 1:
      emitNone(handler, isFn, this);
      break;
    case 2:
      emitOne(handler, isFn, this, arguments[1]);
      break;
    case 3:
      emitTwo(handler, isFn, this, arguments[1], arguments[2]);
      break;
    case 4:
      emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3]);
      break;
      // slower
    default:
      args = new Array(len - 1);
      for (i = 1; i < len; i++)
        args[i - 1] = arguments[i];
      emitMany(handler, isFn, this, args);
  }

  return true;
};

function _addListener(target, type, listener, prepend) {
  var m;
  var events;
  var existing;

  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');

  events = target._events;
  if (!events) {
    events = target._events = objectCreate(null);
    target._eventsCount = 0;
  } else {
    // To avoid recursion in the case that type === "newListener"! Before
    // adding it to the listeners, first emit "newListener".
    if (events.newListener) {
      target.emit('newListener', type,
          listener.listener ? listener.listener : listener);

      // Re-assign `events` because a newListener handler could have caused the
      // this._events to be assigned to a new object
      events = target._events;
    }
    existing = events[type];
  }

  if (!existing) {
    // Optimize the case of one listener. Don't need the extra array object.
    existing = events[type] = listener;
    ++target._eventsCount;
  } else {
    if (typeof existing === 'function') {
      // Adding the second element, need to change to array.
      existing = events[type] =
          prepend ? [listener, existing] : [existing, listener];
    } else {
      // If we've already got an array, just append.
      if (prepend) {
        existing.unshift(listener);
      } else {
        existing.push(listener);
      }
    }

    // Check for listener leak
    if (!existing.warned) {
      m = $getMaxListeners(target);
      if (m && m > 0 && existing.length > m) {
        existing.warned = true;
        var w = new Error('Possible EventEmitter memory leak detected. ' +
            existing.length + ' "' + String(type) + '" listeners ' +
            'added. Use emitter.setMaxListeners() to ' +
            'increase limit.');
        w.name = 'MaxListenersExceededWarning';
        w.emitter = target;
        w.type = type;
        w.count = existing.length;
        if (typeof console === 'object' && console.warn) {
          console.warn('%s: %s', w.name, w.message);
        }
      }
    }
  }

  return target;
}

EventEmitter.prototype.addListener = function addListener(type, listener) {
  return _addListener(this, type, listener, false);
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.prependListener =
    function prependListener(type, listener) {
      return _addListener(this, type, listener, true);
    };

function onceWrapper() {
  if (!this.fired) {
    this.target.removeListener(this.type, this.wrapFn);
    this.fired = true;
    switch (arguments.length) {
      case 0:
        return this.listener.call(this.target);
      case 1:
        return this.listener.call(this.target, arguments[0]);
      case 2:
        return this.listener.call(this.target, arguments[0], arguments[1]);
      case 3:
        return this.listener.call(this.target, arguments[0], arguments[1],
            arguments[2]);
      default:
        var args = new Array(arguments.length);
        for (var i = 0; i < args.length; ++i)
          args[i] = arguments[i];
        this.listener.apply(this.target, args);
    }
  }
}

function _onceWrap(target, type, listener) {
  var state = { fired: false, wrapFn: undefined, target: target, type: type, listener: listener };
  var wrapped = bind.call(onceWrapper, state);
  wrapped.listener = listener;
  state.wrapFn = wrapped;
  return wrapped;
}

EventEmitter.prototype.once = function once(type, listener) {
  if (typeof listener !== 'function')
    throw new TypeError('"listener" argument must be a function');
  this.on(type, _onceWrap(this, type, listener));
  return this;
};

EventEmitter.prototype.prependOnceListener =
    function prependOnceListener(type, listener) {
      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');
      this.prependListener(type, _onceWrap(this, type, listener));
      return this;
    };

// Emits a 'removeListener' event if and only if the listener was removed.
EventEmitter.prototype.removeListener =
    function removeListener(type, listener) {
      var list, events, position, i, originalListener;

      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');

      events = this._events;
      if (!events)
        return this;

      list = events[type];
      if (!list)
        return this;

      if (list === listener || list.listener === listener) {
        if (--this._eventsCount === 0)
          this._events = objectCreate(null);
        else {
          delete events[type];
          if (events.removeListener)
            this.emit('removeListener', type, list.listener || listener);
        }
      } else if (typeof list !== 'function') {
        position = -1;

        for (i = list.length - 1; i >= 0; i--) {
          if (list[i] === listener || list[i].listener === listener) {
            originalListener = list[i].listener;
            position = i;
            break;
          }
        }

        if (position < 0)
          return this;

        if (position === 0)
          list.shift();
        else
          spliceOne(list, position);

        if (list.length === 1)
          events[type] = list[0];

        if (events.removeListener)
          this.emit('removeListener', type, originalListener || listener);
      }

      return this;
    };

EventEmitter.prototype.removeAllListeners =
    function removeAllListeners(type) {
      var listeners, events, i;

      events = this._events;
      if (!events)
        return this;

      // not listening for removeListener, no need to emit
      if (!events.removeListener) {
        if (arguments.length === 0) {
          this._events = objectCreate(null);
          this._eventsCount = 0;
        } else if (events[type]) {
          if (--this._eventsCount === 0)
            this._events = objectCreate(null);
          else
            delete events[type];
        }
        return this;
      }

      // emit removeListener for all listeners on all events
      if (arguments.length === 0) {
        var keys = objectKeys(events);
        var key;
        for (i = 0; i < keys.length; ++i) {
          key = keys[i];
          if (key === 'removeListener') continue;
          this.removeAllListeners(key);
        }
        this.removeAllListeners('removeListener');
        this._events = objectCreate(null);
        this._eventsCount = 0;
        return this;
      }

      listeners = events[type];

      if (typeof listeners === 'function') {
        this.removeListener(type, listeners);
      } else if (listeners) {
        // LIFO order
        for (i = listeners.length - 1; i >= 0; i--) {
          this.removeListener(type, listeners[i]);
        }
      }

      return this;
    };

function _listeners(target, type, unwrap) {
  var events = target._events;

  if (!events)
    return [];

  var evlistener = events[type];
  if (!evlistener)
    return [];

  if (typeof evlistener === 'function')
    return unwrap ? [evlistener.listener || evlistener] : [evlistener];

  return unwrap ? unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
}

EventEmitter.prototype.listeners = function listeners(type) {
  return _listeners(this, type, true);
};

EventEmitter.prototype.rawListeners = function rawListeners(type) {
  return _listeners(this, type, false);
};

EventEmitter.listenerCount = function(emitter, type) {
  if (typeof emitter.listenerCount === 'function') {
    return emitter.listenerCount(type);
  } else {
    return listenerCount.call(emitter, type);
  }
};

EventEmitter.prototype.listenerCount = listenerCount;
function listenerCount(type) {
  var events = this._events;

  if (events) {
    var evlistener = events[type];

    if (typeof evlistener === 'function') {
      return 1;
    } else if (evlistener) {
      return evlistener.length;
    }
  }

  return 0;
}

EventEmitter.prototype.eventNames = function eventNames() {
  return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
};

// About 1.5x faster than the two-arg version of Array#splice().
function spliceOne(list, index) {
  for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1)
    list[i] = list[k];
  list.pop();
}

function arrayClone(arr, n) {
  var copy = new Array(n);
  for (var i = 0; i < n; ++i)
    copy[i] = arr[i];
  return copy;
}

function unwrapListeners(arr) {
  var ret = new Array(arr.length);
  for (var i = 0; i < ret.length; ++i) {
    ret[i] = arr[i].listener || arr[i];
  }
  return ret;
}

function objectCreatePolyfill(proto) {
  var F = function() {};
  F.prototype = proto;
  return new F;
}
function objectKeysPolyfill(obj) {
  var keys = [];
  for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) {
    keys.push(k);
  }
  return k;
}
function functionBindPolyfill(context) {
  var fn = this;
  return function () {
    return fn.apply(context, arguments);
  };
}

},{}],30:[function(require,module,exports){
/* global FileReader */

const { Readable } = require('readable-stream')
const toBuffer = require('typedarray-to-buffer')

class FileReadStream extends Readable {
  constructor (file, opts = {}) {
    super(opts)

    // save the read offset
    this._offset = 0
    this._ready = false
    this._file = file
    this._size = file.size
    this._chunkSize = opts.chunkSize || Math.max(this._size / 1000, 200 * 1024)

    // create the reader
    const reader = new FileReader()

    reader.onload = () => {
      // get the data chunk
      this.push(toBuffer(reader.result))
    }
    reader.onerror = () => {
      this.emit('error', reader.error)
    }

    this.reader = reader

    // generate the header blocks that we will send as part of the initial payload
    this._generateHeaderBlocks(file, opts, (err, blocks) => {
      // if we encountered an error, emit it
      if (err) {
        return this.emit('error', err)
      }

      // push the header blocks out to the stream
      if (Array.isArray(blocks)) {
        blocks.forEach(block => this.push(block))
      }

      this._ready = true
      this.emit('_ready')
    })
  }

  _generateHeaderBlocks (file, opts, callback) {
    callback(null, [])
  }

  _read () {
    if (!this._ready) {
      this.once('_ready', this._read.bind(this))
      return
    }

    const startOffset = this._offset
    let endOffset = this._offset + this._chunkSize
    if (endOffset > this._size) endOffset = this._size

    if (startOffset === this._size) {
      this.destroy()
      this.push(null)
      return
    }

    this.reader.readAsArrayBuffer(this._file.slice(startOffset, endOffset))

    // update the stream offset
    this._offset = endOffset
  }

  destroy () {
    this._file = null
    if (this.reader) {
      this.reader.onload = null
      this.reader.onerror = null
      try { this.reader.abort() } catch (e) {};
    }
    this.reader = null
  }
}

module.exports = FileReadStream

},{"readable-stream":82,"typedarray-to-buffer":109}],31:[function(require,module,exports){
// originally pulled out of simple-peer

module.exports = function getBrowserRTC () {
  if (typeof window === 'undefined') return null
  var wrtc = {
    RTCPeerConnection: window.RTCPeerConnection || window.mozRTCPeerConnection ||
      window.webkitRTCPeerConnection,
    RTCSessionDescription: window.RTCSessionDescription ||
      window.mozRTCSessionDescription || window.webkitRTCSessionDescription,
    RTCIceCandidate: window.RTCIceCandidate || window.mozRTCIceCandidate ||
      window.webkitRTCIceCandidate
  }
  if (!wrtc.RTCPeerConnection) return null
  return wrtc
}

},{}],32:[function(require,module,exports){
var http = require('http')
var url = require('url')

var https = module.exports

for (var key in http) {
  if (http.hasOwnProperty(key)) https[key] = http[key]
}

https.request = function (params, cb) {
  params = validateParams(params)
  return http.request.call(this, params, cb)
}

https.get = function (params, cb) {
  params = validateParams(params)
  return http.get.call(this, params, cb)
}

function validateParams (params) {
  if (typeof params === 'string') {
    params = url.parse(params)
  }
  if (!params.protocol) {
    params.protocol = 'https:'
  }
  if (params.protocol !== 'https:') {
    throw new Error('Protocol "' + params.protocol + '" not supported. Expected "https:"')
  }
  return params
}

},{"http":96,"url":113}],33:[function(require,module,exports){
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],34:[function(require,module,exports){
// TODO: remove when window.queueMicrotask() is well supported
const queueMicrotask = require('queue-microtask')

class ImmediateStore {
  constructor (store) {
    this.store = store
    this.chunkLength = store.chunkLength

    if (!this.store || !this.store.get || !this.store.put) {
      throw new Error('First argument must be abstract-chunk-store compliant')
    }

    this.mem = []
  }

  put (index, buf, cb) {
    this.mem[index] = buf
    this.store.put(index, buf, err => {
      this.mem[index] = null
      if (cb) cb(err)
    })
  }

  get (index, opts, cb) {
    if (typeof opts === 'function') return this.get(index, null, opts)

    let memoryBuffer = this.mem[index]

    // if the chunk isn't in the immediate memory cache
    if (!memoryBuffer) {
      return this.store.get(index, opts, cb)
    }

    if (opts) {
      const start = opts.offset || 0
      const end = opts.length ? (start + opts.length) : memoryBuffer.length

      memoryBuffer = memoryBuffer.slice(start, end)
    }

    // queueMicrotask to ensure the function is async
    queueMicrotask(() => {
      if (cb) cb(null, memoryBuffer)
    })
  }

  close (cb) {
    this.store.close(cb)
  }

  destroy (cb) {
    this.store.destroy(cb)
  }
}

module.exports = ImmediateStore

},{"queue-microtask":64}],35:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor
      ctor.prototype = Object.create(superCtor.prototype, {
        constructor: {
          value: ctor,
          enumerable: false,
          writable: true,
          configurable: true
        }
      })
    }
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    if (superCtor) {
      ctor.super_ = superCtor
      var TempCtor = function () {}
      TempCtor.prototype = superCtor.prototype
      ctor.prototype = new TempCtor()
      ctor.prototype.constructor = ctor
    }
  }
}

},{}],36:[function(require,module,exports){
/* (c) 2016 Ari Porad (@ariporad) <http://ariporad.com>. License: ariporad.mit-license.org */

// Partially from http://stackoverflow.com/a/94049/1928484, and from another SO answer, which told me that the highest
// char code that's ascii is 127, but I can't find the link for. Sorry.

var MAX_ASCII_CHAR_CODE = 127;

module.exports = function isAscii(str) {
  for (var i = 0, strLen = str.length; i < strLen; ++i) {
    if (str.charCodeAt(i) > MAX_ASCII_CHAR_CODE) return false;
  }
  return true;
};

},{}],37:[function(require,module,exports){
'use strict';

var fs = require('fs');

module.exports = function isFile(path, cb){
  if(!cb)return isFileSync(path);

  fs.stat(path, function(err, stats){
    if(err)return cb(err);
    return cb(null, stats.isFile());
  });
};

module.exports.sync = isFileSync;

function isFileSync(path){
  return fs.existsSync(path) && fs.statSync(path).isFile();
}

},{"fs":18}],38:[function(require,module,exports){
module.exports      = isTypedArray
isTypedArray.strict = isStrictTypedArray
isTypedArray.loose  = isLooseTypedArray

var toString = Object.prototype.toString
var names = {
    '[object Int8Array]': true
  , '[object Int16Array]': true
  , '[object Int32Array]': true
  , '[object Uint8Array]': true
  , '[object Uint8ClampedArray]': true
  , '[object Uint16Array]': true
  , '[object Uint32Array]': true
  , '[object Float32Array]': true
  , '[object Float64Array]': true
}

function isTypedArray(arr) {
  return (
       isStrictTypedArray(arr)
    || isLooseTypedArray(arr)
  )
}

function isStrictTypedArray(arr) {
  return (
       arr instanceof Int8Array
    || arr instanceof Int16Array
    || arr instanceof Int32Array
    || arr instanceof Uint8Array
    || arr instanceof Uint8ClampedArray
    || arr instanceof Uint16Array
    || arr instanceof Uint32Array
    || arr instanceof Float32Array
    || arr instanceof Float64Array
  )
}

function isLooseTypedArray(arr) {
  return names[toString.call(arr)]
}

},{}],39:[function(require,module,exports){
'use strict';

const blacklist = [
	// # All
	'^npm-debug\\.log$', // Error log for npm
	'^\\..*\\.swp$', // Swap file for vim state

	// # macOS
	'^\\.DS_Store$', // Stores custom folder attributes
	'^\\.AppleDouble$', // Stores additional file resources
	'^\\.LSOverride$', // Contains the absolute path to the app to be used
	'^Icon\\r$', // Custom Finder icon: http://superuser.com/questions/298785/icon-file-on-os-x-desktop
	'^\\._.*', // Thumbnail
	'^\\.Spotlight-V100(?:$|\\/)', // Directory that might appear on external disk
	'\\.Trashes', // File that might appear on external disk
	'^__MACOSX$', // Resource fork

	// # Linux
	'~$', // Backup file

	// # Windows
	'^Thumbs\\.db$', // Image file cache
	'^ehthumbs\\.db$', // Folder config file
	'^Desktop\\.ini$', // Stores custom folder attributes
	'@eaDir$' // Synology Diskstation "hidden" folder where the server stores thumbnails
];

exports.re = () => {
	throw new Error('`junk.re` was renamed to `junk.regex`');
};

exports.regex = new RegExp(blacklist.join('|'));

exports.is = filename => exports.regex.test(filename);

exports.not = filename => !exports.is(filename);

// TODO: Remove this for the next major release
exports.default = module.exports;

},{}],40:[function(require,module,exports){
(function (Buffer){
module.exports = magnetURIDecode
module.exports.decode = magnetURIDecode
module.exports.encode = magnetURIEncode

const base32 = require('thirty-two')
const uniq = require('uniq')

/**
 * Parse a magnet URI and return an object of keys/values
 *
 * @param  {string} uri
 * @return {Object} parsed uri
 */
function magnetURIDecode (uri) {
  const result = {}

  // Support 'magnet:' and 'stream-magnet:' uris
  const data = uri.split('magnet:?')[1]

  const params = (data && data.length >= 0)
    ? data.split('&')
    : []

  params.forEach(param => {
    const keyval = param.split('=')

    // This keyval is invalid, skip it
    if (keyval.length !== 2) return

    const key = keyval[0]
    let val = keyval[1]

    // Clean up torrent name
    if (key === 'dn') val = decodeURIComponent(val).replace(/\+/g, ' ')

    // Address tracker (tr), exact source (xs), and acceptable source (as) are encoded
    // URIs, so decode them
    if (key === 'tr' || key === 'xs' || key === 'as' || key === 'ws') {
      val = decodeURIComponent(val)
    }

    // Return keywords as an array
    if (key === 'kt') val = decodeURIComponent(val).split('+')

    // Cast file index (ix) to a number
    if (key === 'ix') val = Number(val)

    // If there are repeated parameters, return an array of values
    if (result[key]) {
      if (Array.isArray(result[key])) {
        result[key].push(val)
      } else {
        const old = result[key]
        result[key] = [old, val]
      }
    } else {
      result[key] = val
    }
  })

  // Convenience properties for parity with `parse-torrent-file` module
  let m
  if (result.xt) {
    const xts = Array.isArray(result.xt) ? result.xt : [ result.xt ]
    xts.forEach(xt => {
      if ((m = xt.match(/^urn:btih:(.{40})/))) {
        result.infoHash = m[1].toLowerCase()
      } else if ((m = xt.match(/^urn:btih:(.{32})/))) {
        const decodedStr = base32.decode(m[1])
        result.infoHash = Buffer.from(decodedStr, 'binary').toString('hex')
      }
    })
  }
  if (result.infoHash) result.infoHashBuffer = Buffer.from(result.infoHash, 'hex')

  if (result.dn) result.name = result.dn
  if (result.kt) result.keywords = result.kt

  if (typeof result.tr === 'string') result.announce = [ result.tr ]
  else if (Array.isArray(result.tr)) result.announce = result.tr
  else result.announce = []

  result.urlList = []
  if (typeof result.as === 'string' || Array.isArray(result.as)) {
    result.urlList = result.urlList.concat(result.as)
  }
  if (typeof result.ws === 'string' || Array.isArray(result.ws)) {
    result.urlList = result.urlList.concat(result.ws)
  }

  uniq(result.announce)
  uniq(result.urlList)

  return result
}

function magnetURIEncode (obj) {
  obj = Object.assign({}, obj) // clone obj, so we can mutate it

  // support using convenience names, in addition to spec names
  // (example: `infoHash` for `xt`, `name` for `dn`)
  if (obj.infoHashBuffer) obj.xt = `urn:btih:${obj.infoHashBuffer.toString('hex')}`
  if (obj.infoHash) obj.xt = `urn:btih:${obj.infoHash}`
  if (obj.name) obj.dn = obj.name
  if (obj.keywords) obj.kt = obj.keywords
  if (obj.announce) obj.tr = obj.announce
  if (obj.urlList) {
    obj.ws = obj.urlList
    delete obj.as
  }

  let result = 'magnet:?'
  Object.keys(obj)
    .filter(key => key.length === 2)
    .forEach((key, i) => {
      const values = Array.isArray(obj[key]) ? obj[key] : [ obj[key] ]
      values.forEach((val, j) => {
        if ((i > 0 || j > 0) && (key !== 'kt' || j === 0)) result += '&'

        if (key === 'dn') val = encodeURIComponent(val).replace(/%20/g, '+')
        if (key === 'tr' || key === 'xs' || key === 'as' || key === 'ws') {
          val = encodeURIComponent(val)
        }
        if (key === 'kt') val = encodeURIComponent(val)

        if (key === 'kt' && j > 0) result += `+${val}`
        else result += `${key}=${val}`
      })
    })

  return result
}

}).call(this,require("buffer").Buffer)
},{"buffer":22,"thirty-two":104,"uniq":111}],41:[function(require,module,exports){
module.exports = MediaElementWrapper

var inherits = require('inherits')
var stream = require('readable-stream')
var toArrayBuffer = require('to-arraybuffer')

var MediaSource = typeof window !== 'undefined' && window.MediaSource

var DEFAULT_BUFFER_DURATION = 60 // seconds

function MediaElementWrapper (elem, opts) {
  var self = this
  if (!(self instanceof MediaElementWrapper)) return new MediaElementWrapper(elem, opts)

  if (!MediaSource) throw new Error('web browser lacks MediaSource support')

  if (!opts) opts = {}
  self._debug = opts.debug
  self._bufferDuration = opts.bufferDuration || DEFAULT_BUFFER_DURATION
  self._elem = elem
  self._mediaSource = new MediaSource()
  self._streams = []
  self.detailedError = null

  self._errorHandler = function () {
    self._elem.removeEventListener('error', self._errorHandler)
    var streams = self._streams.slice()
    streams.forEach(function (stream) {
      stream.destroy(self._elem.error)
    })
  }
  self._elem.addEventListener('error', self._errorHandler)

  self._elem.src = window.URL.createObjectURL(self._mediaSource)
}

/*
 * `obj` can be a previous value returned by this function
 * or a string
 */
MediaElementWrapper.prototype.createWriteStream = function (obj) {
  var self = this

  return new MediaSourceStream(self, obj)
}

/*
 * Use to trigger an error on the underlying media element
 */
MediaElementWrapper.prototype.error = function (err) {
  var self = this

  // be careful not to overwrite any existing detailedError values
  if (!self.detailedError) {
    self.detailedError = err
  }
  self._dumpDebugData()
  try {
    self._mediaSource.endOfStream('decode')
  } catch (err) {}

  try {
    // Attempt to clean up object URL
    window.URL.revokeObjectURL(self._elem.src)
  } catch (err) {}
}

/*
 * When self._debug is set, dump all data to files
 */
MediaElementWrapper.prototype._dumpDebugData = function () {
  var self = this

  if (self._debug) {
    self._debug = false // prevent multiple dumps on multiple errors
    self._streams.forEach(function (stream, i) {
      downloadBuffers(stream._debugBuffers, 'mediasource-stream-' + i)
    })
  }
}

inherits(MediaSourceStream, stream.Writable)

function MediaSourceStream (wrapper, obj) {
  var self = this
  stream.Writable.call(self)

  self._wrapper = wrapper
  self._elem = wrapper._elem
  self._mediaSource = wrapper._mediaSource
  self._allStreams = wrapper._streams
  self._allStreams.push(self)
  self._bufferDuration = wrapper._bufferDuration
  self._sourceBuffer = null
  self._debugBuffers = []

  self._openHandler = function () {
    self._onSourceOpen()
  }
  self._flowHandler = function () {
    self._flow()
  }
  self._errorHandler = function (err) {
    if (!self.destroyed) {
      self.emit('error', err)
    }
  }

  if (typeof obj === 'string') {
    self._type = obj
    // Need to create a new sourceBuffer
    if (self._mediaSource.readyState === 'open') {
      self._createSourceBuffer()
    } else {
      self._mediaSource.addEventListener('sourceopen', self._openHandler)
    }
  } else if (obj._sourceBuffer === null) {
    obj.destroy()
    self._type = obj._type // The old stream was created but hasn't finished initializing
    self._mediaSource.addEventListener('sourceopen', self._openHandler)
  } else if (obj._sourceBuffer) {
    obj.destroy()
    self._type = obj._type
    self._sourceBuffer = obj._sourceBuffer // Copy over the old sourceBuffer
    self._debugBuffers = obj._debugBuffers // Copy over previous debug data
    self._sourceBuffer.addEventListener('updateend', self._flowHandler)
    self._sourceBuffer.addEventListener('error', self._errorHandler)
  } else {
    throw new Error('The argument to MediaElementWrapper.createWriteStream must be a string or a previous stream returned from that function')
  }

  self._elem.addEventListener('timeupdate', self._flowHandler)

  self.on('error', function (err) {
    self._wrapper.error(err)
  })

  self.on('finish', function () {
    if (self.destroyed) return
    self._finished = true
    if (self._allStreams.every(function (other) { return other._finished })) {
      self._wrapper._dumpDebugData()
      try {
        self._mediaSource.endOfStream()
      } catch (err) {}
    }
  })
}

MediaSourceStream.prototype._onSourceOpen = function () {
  var self = this
  if (self.destroyed) return

  self._mediaSource.removeEventListener('sourceopen', self._openHandler)
  self._createSourceBuffer()
}

MediaSourceStream.prototype.destroy = function (err) {
  var self = this
  if (self.destroyed) return
  self.destroyed = true

  // Remove from allStreams
  self._allStreams.splice(self._allStreams.indexOf(self), 1)

  self._mediaSource.removeEventListener('sourceopen', self._openHandler)
  self._elem.removeEventListener('timeupdate', self._flowHandler)
  if (self._sourceBuffer) {
    self._sourceBuffer.removeEventListener('updateend', self._flowHandler)
    self._sourceBuffer.removeEventListener('error', self._errorHandler)
    if (self._mediaSource.readyState === 'open') {
      self._sourceBuffer.abort()
    }
  }

  if (err) self.emit('error', err)
  self.emit('close')
}

MediaSourceStream.prototype._createSourceBuffer = function () {
  var self = this
  if (self.destroyed) return

  if (MediaSource.isTypeSupported(self._type)) {
    self._sourceBuffer = self._mediaSource.addSourceBuffer(self._type)
    self._sourceBuffer.addEventListener('updateend', self._flowHandler)
    self._sourceBuffer.addEventListener('error', self._errorHandler)
    if (self._cb) {
      var cb = self._cb
      self._cb = null
      cb()
    }
  } else {
    self.destroy(new Error('The provided type is not supported'))
  }
}

MediaSourceStream.prototype._write = function (chunk, encoding, cb) {
  var self = this
  if (self.destroyed) return
  if (!self._sourceBuffer) {
    self._cb = function (err) {
      if (err) return cb(err)
      self._write(chunk, encoding, cb)
    }
    return
  }

  if (self._sourceBuffer.updating) {
    return cb(new Error('Cannot append buffer while source buffer updating'))
  }

  var arr = toArrayBuffer(chunk)
  if (self._wrapper._debug) {
    self._debugBuffers.push(arr)
  }

  try {
    self._sourceBuffer.appendBuffer(arr)
  } catch (err) {
    // appendBuffer can throw for a number of reasons, most notably when the data
    // being appended is invalid or if appendBuffer is called after another error
    // already occurred on the media element. In Chrome, there may be useful debugging
    // info in chrome://media-internals
    self.destroy(err)
    return
  }
  self._cb = cb
}

MediaSourceStream.prototype._flow = function () {
  var self = this

  if (self.destroyed || !self._sourceBuffer || self._sourceBuffer.updating) {
    return
  }

  if (self._mediaSource.readyState === 'open') {
    // check buffer size
    if (self._getBufferDuration() > self._bufferDuration) {
      return
    }
  }

  if (self._cb) {
    var cb = self._cb
    self._cb = null
    cb()
  }
}

// TODO: if zero actually works in all browsers, remove the logic associated with this below
var EPSILON = 0

MediaSourceStream.prototype._getBufferDuration = function () {
  var self = this

  var buffered = self._sourceBuffer.buffered
  var currentTime = self._elem.currentTime
  var bufferEnd = -1 // end of the buffer
  // This is a little over complex because some browsers seem to separate the
  // buffered region into multiple sections with slight gaps.
  for (var i = 0; i < buffered.length; i++) {
    var start = buffered.start(i)
    var end = buffered.end(i) + EPSILON

    if (start > currentTime) {
      // Reached past the joined buffer
      break
    } else if (bufferEnd >= 0 || currentTime <= end) {
      // Found the start/continuation of the joined buffer
      bufferEnd = end
    }
  }

  var bufferedTime = bufferEnd - currentTime
  if (bufferedTime < 0) {
    bufferedTime = 0
  }

  return bufferedTime
}

function downloadBuffers (bufs, name) {
  var a = document.createElement('a')
  a.href = window.URL.createObjectURL(new window.Blob(bufs))
  a.download = name
  a.click()
}

},{"inherits":35,"readable-stream":82,"to-arraybuffer":106}],42:[function(require,module,exports){
(function (process){
module.exports = Storage

function Storage (chunkLength, opts) {
  if (!(this instanceof Storage)) return new Storage(chunkLength, opts)
  if (!opts) opts = {}

  this.chunkLength = Number(chunkLength)
  if (!this.chunkLength) throw new Error('First argument must be a chunk length')

  this.chunks = []
  this.closed = false
  this.length = Number(opts.length) || Infinity

  if (this.length !== Infinity) {
    this.lastChunkLength = (this.length % this.chunkLength) || this.chunkLength
    this.lastChunkIndex = Math.ceil(this.length / this.chunkLength) - 1
  }
}

Storage.prototype.put = function (index, buf, cb) {
  if (this.closed) return nextTick(cb, new Error('Storage is closed'))

  var isLastChunk = (index === this.lastChunkIndex)
  if (isLastChunk && buf.length !== this.lastChunkLength) {
    return nextTick(cb, new Error('Last chunk length must be ' + this.lastChunkLength))
  }
  if (!isLastChunk && buf.length !== this.chunkLength) {
    return nextTick(cb, new Error('Chunk length must be ' + this.chunkLength))
  }
  this.chunks[index] = buf
  nextTick(cb, null)
}

Storage.prototype.get = function (index, opts, cb) {
  if (typeof opts === 'function') return this.get(index, null, opts)
  if (this.closed) return nextTick(cb, new Error('Storage is closed'))
  var buf = this.chunks[index]
  if (!buf) {
    var err = new Error('Chunk not found')
    err.notFound = true
    return nextTick(cb, err)
  }
  if (!opts) return nextTick(cb, null, buf)
  var offset = opts.offset || 0
  var len = opts.length || (buf.length - offset)
  nextTick(cb, null, buf.slice(offset, len + offset))
}

Storage.prototype.close = Storage.prototype.destroy = function (cb) {
  if (this.closed) return nextTick(cb, new Error('Storage is closed'))
  this.closed = true
  this.chunks = null
  nextTick(cb, null)
}

function nextTick (cb, err, val) {
  process.nextTick(function () {
    if (cb) cb(err, val)
  })
}

}).call(this,require('_process'))
},{"_process":58}],43:[function(require,module,exports){
(function (Buffer){
// This is an intentionally recursive require. I don't like it either.
var Box = require('./index')
var Descriptor = require('./descriptor')
var uint64be = require('uint64be')

var TIME_OFFSET = 2082844800000

/*
TODO:
test these
add new box versions
*/

// These have 'version' and 'flags' fields in the headers
exports.fullBoxes = {}
var fullBoxes = [
  'mvhd',
  'tkhd',
  'mdhd',
  'vmhd',
  'smhd',
  'stsd',
  'esds',
  'stsz',
  'stco',
  'co64',
  'stss',
  'stts',
  'ctts',
  'stsc',
  'dref',
  'elst',
  'hdlr',
  'mehd',
  'trex',
  'mfhd',
  'tfhd',
  'tfdt',
  'trun'
]
fullBoxes.forEach(function (type) {
  exports.fullBoxes[type] = true
})

exports.ftyp = {}
exports.ftyp.encode = function (box, buf, offset) {
  buf = buf ? buf.slice(offset) : Buffer.alloc(exports.ftyp.encodingLength(box))
  var brands = box.compatibleBrands || []
  buf.write(box.brand, 0, 4, 'ascii')
  buf.writeUInt32BE(box.brandVersion, 4)
  for (var i = 0; i < brands.length; i++) buf.write(brands[i], 8 + (i * 4), 4, 'ascii')
  exports.ftyp.encode.bytes = 8 + brands.length * 4
  return buf
}
exports.ftyp.decode = function (buf, offset) {
  buf = buf.slice(offset)
  var brand = buf.toString('ascii', 0, 4)
  var version = buf.readUInt32BE(4)
  var compatibleBrands = []
  for (var i = 8; i < buf.length; i += 4) compatibleBrands.push(buf.toString('ascii', i, i + 4))
  return {
    brand: brand,
    brandVersion: version,
    compatibleBrands: compatibleBrands
  }
}
exports.ftyp.encodingLength = function (box) {
  return 8 + (box.compatibleBrands || []).length * 4
}

exports.mvhd = {}
exports.mvhd.encode = function (box, buf, offset) {
  buf = buf ? buf.slice(offset) : Buffer.alloc(96)
  writeDate(box.ctime || new Date(), buf, 0)
  writeDate(box.mtime || new Date(), buf, 4)
  buf.writeUInt32BE(box.timeScale || 0, 8)
  buf.writeUInt32BE(box.duration || 0, 12)
  writeFixed32(box.preferredRate || 0, buf, 16)
  writeFixed16(box.preferredVolume || 0, buf, 20)
  writeReserved(buf, 22, 32)
  writeMatrix(box.matrix, buf, 32)
  buf.writeUInt32BE(box.previewTime || 0, 68)
  buf.writeUInt32BE(box.previewDuration || 0, 72)
  buf.writeUInt32BE(box.posterTime || 0, 76)
  buf.writeUInt32BE(box.selectionTime || 0, 80)
  buf.writeUInt32BE(box.selectionDuration || 0, 84)
  buf.writeUInt32BE(box.currentTime || 0, 88)
  buf.writeUInt32BE(box.nextTrackId || 0, 92)
  exports.mvhd.encode.bytes = 96
  return buf
}
exports.mvhd.decode = function (buf, offset) {
  buf = buf.slice(offset)
  return {
    ctime: readDate(buf, 0),
    mtime: readDate(buf, 4),
    timeScale: buf.readUInt32BE(8),
    duration: buf.readUInt32BE(12),
    preferredRate: readFixed32(buf, 16),
    preferredVolume: readFixed16(buf, 20),
    matrix: readMatrix(buf.slice(32, 68)),
    previewTime: buf.readUInt32BE(68),
    previewDuration: buf.readUInt32BE(72),
    posterTime: buf.readUInt32BE(76),
    selectionTime: buf.readUInt32BE(80),
    selectionDuration: buf.readUInt32BE(84),
    currentTime: buf.readUInt32BE(88),
    nextTrackId: buf.readUInt32BE(92)
  }
}
exports.mvhd.encodingLength = function (box) {
  return 96
}

exports.tkhd = {}
exports.tkhd.encode = function (box, buf, offset) {
  buf = buf ? buf.slice(offset) : Buffer.alloc(80)
  writeDate(box.ctime || new Date(), buf, 0)
  writeDate(box.mtime || new Date(), buf, 4)
  buf.writeUInt32BE(box.trackId || 0, 8)
  writeReserved(buf, 12, 16)
  buf.writeUInt32BE(box.duration || 0, 16)
  writeReserved(buf, 20, 28)
  buf.writeUInt16BE(box.layer || 0, 28)
  buf.writeUInt16BE(box.alternateGroup || 0, 30)
  buf.writeUInt16BE(box.volume || 0, 32)
  writeMatrix(box.matrix, buf, 36)
  buf.writeUInt32BE(box.trackWidth || 0, 72)
  buf.writeUInt32BE(box.trackHeight || 0, 76)
  exports.tkhd.encode.bytes = 80
  return buf
}
exports.tkhd.decode = function (buf, offset) {
  buf = buf.slice(offset)
  return {
    ctime: readDate(buf, 0),
    mtime: readDate(buf, 4),
    trackId: buf.readUInt32BE(8),
    duration: buf.readUInt32BE(16),
    layer: buf.readUInt16BE(28),
    alternateGroup: buf.readUInt16BE(30),
    volume: buf.readUInt16BE(32),
    matrix: readMatrix(buf.slice(36, 72)),
    trackWidth: buf.readUInt32BE(72),
    trackHeight: buf.readUInt32BE(76)
  }
}
exports.tkhd.encodingLength = function (box) {
  return 80
}

exports.mdhd = {}
exports.mdhd.encode = function (box, buf, offset) {
  if (box.version === 1) {
    buf = buf ? buf.slice(offset) : Buffer.alloc(32)
    writeDate64(box.ctime || new Date(), buf, 0)
    writeDate64(box.mtime || new Date(), buf, 8)
    buf.writeUInt32BE(box.timeScale || 0, 16)
    // Node only supports integer <= 48bit. Waiting for BigInt!
    buf.writeUIntBE(box.duration || 0, 20, 6)
    buf.writeUInt16BE(box.language || 0, 28)
    buf.writeUInt16BE(box.quality || 0, 30)
    exports.mdhd.encode.bytes = 32
    return buf
  }

  buf = buf ? buf.slice(offset) : Buffer.alloc(20)
  writeDate(box.ctime || new Date(), buf, 0)
  writeDate(box.mtime || new Date(), buf, 4)
  buf.writeUInt32BE(box.timeScale || 0, 8)
  buf.writeUInt32BE(box.duration || 0, 12)
  buf.writeUInt16BE(box.language || 0, 16)
  buf.writeUInt16BE(box.quality || 0, 18)
  exports.mdhd.encode.bytes = 20
  return buf
}

exports.mdhd.decode = function (buf, offset, end) {
  buf = buf.slice(offset)

  var version1 = (end - offset) !== 20

  // In version 1 creation time and modification time are unsigned long
  if (version1) {
    return {
      ctime: readDate64(buf, 0),
      mtime: readDate64(buf, 8),
      timeScale: buf.readUInt32BE(16),
      // Node only supports integer <= 48bit. Waiting for BigInt!
      duration: buf.readUIntBE(20, 6),
      language: buf.readUInt16BE(28),
      quality: buf.readUInt16BE(30)
    }
  }

  return {
    ctime: readDate(buf, 0),
    mtime: readDate(buf, 4),
    timeScale: buf.readUInt32BE(8),
    duration: buf.readUInt32BE(12),
    language: buf.readUInt16BE(16),
    quality: buf.readUInt16BE(18)
  }
}
exports.mdhd.encodingLength = function (box) {
  if (box.version === 1) return 32

  return 20
}

exports.vmhd = {}
exports.vmhd.encode = function (box, buf, offset) {
  buf = buf ? buf.slice(offset) : Buffer.alloc(8)
  buf.writeUInt16BE(box.graphicsMode || 0, 0)
  var opcolor = box.opcolor || [0, 0, 0]
  buf.writeUInt16BE(opcolor[0], 2)
  buf.writeUInt16BE(opcolor[1], 4)
  buf.writeUInt16BE(opcolor[2], 6)
  exports.vmhd.encode.bytes = 8
  return buf
}
exports.vmhd.decode = function (buf, offset) {
  buf = buf.slice(offset)
  return {
    graphicsMode: buf.readUInt16BE(0),
    opcolor: [buf.readUInt16BE(2), buf.readUInt16BE(4), buf.readUInt16BE(6)]
  }
}
exports.vmhd.encodingLength = function (box) {
  return 8
}

exports.smhd = {}
exports.smhd.encode = function (box, buf, offset) {
  buf = buf ? buf.slice(offset) : Buffer.alloc(4)
  buf.writeUInt16BE(box.balance || 0, 0)
  writeReserved(buf, 2, 4)
  exports.smhd.encode.bytes = 4
  return buf
}
exports.smhd.decode = function (buf, offset) {
  buf = buf.slice(offset)
  return {
    balance: buf.readUInt16BE(0)
  }
}
exports.smhd.encodingLength = function (box) {
  return 4
}

exports.stsd = {}
exports.stsd.encode = function (box, buf, offset) {
  buf = buf ? buf.slice(offset) : Buffer.alloc(exports.stsd.encodingLength(box))
  var entries = box.entries || []

  buf.writeUInt32BE(entries.length, 0)

  var ptr = 4
  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i]
    Box.encode(entry, buf, ptr)
    ptr += Box.encode.bytes
  }

  exports.stsd.encode.bytes = ptr
  return buf
}
exports.stsd.decode = function (buf, offset, end) {
  buf = buf.slice(offset)
  var num = buf.readUInt32BE(0)
  var entries = new Array(num)
  var ptr = 4

  for (var i = 0; i < num; i++) {
    var entry = Box.decode(buf, ptr, end)
    entries[i] = entry
    ptr += entry.length
  }

  return {
    entries: entries
  }
}
exports.stsd.encodingLength = function (box) {
  var totalSize = 4
  if (!box.entries) return totalSize
  for (var i = 0; i < box.entries.length; i++) {
    totalSize += Box.encodingLength(box.entries[i])
  }
  return totalSize
}

exports.avc1 = exports.VisualSampleEntry = {}
exports.VisualSampleEntry.encode = function (box, buf, offset) {
  buf = buf ? buf.slice(offset) : Buffer.alloc(exports.VisualSampleEntry.encodingLength(box))

  writeReserved(buf, 0, 6)
  buf.writeUInt16BE(box.dataReferenceIndex || 0, 6)
  writeReserved(buf, 8, 24)
  buf.writeUInt16BE(box.width || 0, 24)
  buf.writeUInt16BE(box.height || 0, 26)
  buf.writeUInt32BE(box.hResolution || 0x480000, 28)
  buf.writeUInt32BE(box.vResolution || 0x480000, 32)
  writeReserved(buf, 36, 40)
  buf.writeUInt16BE(box.frameCount || 1, 40)
  var compressorName = box.compressorName || ''
  var nameLen = Math.min(compressorName.length, 31)
  buf.writeUInt8(nameLen, 42)
  buf.write(compressorName, 43, nameLen, 'utf8')
  buf.writeUInt16BE(box.depth || 0x18, 74)
  buf.writeInt16BE(-1, 76)

  var ptr = 78
  var children = box.children || []
  children.forEach(function (child) {
    Box.encode(child, buf, ptr)
    ptr += Box.encode.bytes
  })
  exports.VisualSampleEntry.encode.bytes = ptr
}
exports.VisualSampleEntry.decode = function (buf, offset, end) {
  buf = buf.slice(offset)
  var length = end - offset
  var nameLen = Math.min(buf.readUInt8(42), 31)
  var box = {
    dataReferenceIndex: buf.readUInt16BE(6),
    width: buf.readUInt16BE(24),
    height: buf.readUInt16BE(26),
    hResolution: buf.readUInt32BE(28),
    vResolution: buf.readUInt32BE(32),
    frameCount: buf.readUInt16BE(40),
    compressorName: buf.toString('utf8', 43, 43 + nameLen),
    depth: buf.readUInt16BE(74),
    children: []
  }

  var ptr = 78
  while (length - ptr >= 8) {
    var child = Box.decode(buf, ptr, length)
    box.children.push(child)
    box[child.type] = child
    ptr += child.length
  }

  return box
}
exports.VisualSampleEntry.encodingLength = function (box) {
  var len = 78
  var children = box.children || []
  children.forEach(function (child) {
    len += Box.encodingLength(child)
  })
  return len
}

exports.avcC = {}
exports.avcC.encode = function (box, buf, offset) {
  buf = buf ? buf.slice(offset) : Buffer.alloc(box.buffer.length)

  box.buffer.copy(buf)
  exports.avcC.encode.bytes = box.buffer.length
}
exports.avcC.decode = function (buf, offset, end) {
  buf = buf.slice(offset, end)

  return {
    mimeCodec: buf.toString('hex', 1, 4),
    buffer: Buffer.from(buf)
  }
}
exports.avcC.encodingLength = function (box) {
  return box.buffer.length
}

exports.mp4a = exports.AudioSampleEntry = {}
exports.AudioSampleEntry.encode = function (box, buf, offset) {
  buf = buf ? buf.slice(offset) : Buffer.alloc(exports.AudioSampleEntry.encodingLength(box))

  writeReserved(buf, 0, 6)
  buf.writeUInt16BE(box.dataReferenceIndex || 0, 6)
  writeReserved(buf, 8, 16)
  buf.writeUInt16BE(box.channelCount || 2, 16)
  buf.writeUInt16BE(box.sampleSize || 16, 18)
  writeReserved(buf, 20, 24)
  buf.writeUInt32BE(box.sampleRate || 0, 24)

  var ptr = 28
  var children = box.children || []
  children.forEach(function (child) {
    Box.encode(child, buf, ptr)
    ptr += Box.encode.bytes
  })
  exports.AudioSampleEntry.encode.bytes = ptr
}
exports.AudioSampleEntry.decode = function (buf, offset, end) {
  buf = buf.slice(offset, end)
  var length = end - offset
  var box = {
    dataReferenceIndex: buf.readUInt16BE(6),
    channelCount: buf.readUInt16BE(16),
    sampleSize: buf.readUInt16BE(18),
    sampleRate: buf.readUInt32BE(24),
    children: []
  }

  var ptr = 28
  while (length - ptr >= 8) {
    var child = Box.decode(buf, ptr, length)
    box.children.push(child)
    box[child.type] = child
    ptr += child.length
  }

  return box
}
exports.AudioSampleEntry.encodingLength = function (box) {
  var len = 28
  var children = box.children || []
  children.forEach(function (child) {
    len += Box.encodingLength(child)
  })
  return len
}

exports.esds = {}
exports.esds.encode = function (box, buf, offset) {
  buf = buf ? buf.slice(offset) : Buffer.alloc(box.buffer.length)

  box.buffer.copy(buf, 0)
  exports.esds.encode.bytes = box.buffer.length
}
exports.esds.decode = function (buf, offset, end) {
  buf = buf.slice(offset, end)

  var desc = Descriptor.Descriptor.decode(buf, 0, buf.length)
  var esd = (desc.tagName === 'ESDescriptor') ? desc : {}
  var dcd = esd.DecoderConfigDescriptor || {}
  var oti = dcd.oti || 0
  var dsi = dcd.DecoderSpecificInfo
  var audioConfig = dsi ? (dsi.buffer.readUInt8(0) & 0xf8) >> 3 : 0

  var mimeCodec = null
  if (oti) {
    mimeCodec = oti.toString(16)
    if (audioConfig) {
      mimeCodec += '.' + audioConfig
    }
  }

  return {
    mimeCodec: mimeCodec,
    buffer: Buffer.from(buf.slice(0))
  }
}
exports.esds.encodingLength = function (box) {
  return box.buffer.length
}

// TODO: integrate the two versions in a saner way
exports.stsz = {}
exports.stsz.encode = function (box, buf, offset) {
  var entries = box.entries || []
  buf = buf ? buf.slice(offset) : Buffer.alloc(exports.stsz.encodingLength(box))

  buf.writeUInt32BE(0, 0)
  buf.writeUInt32BE(entries.length, 4)

  for (var i = 0; i < entries.length; i++) {
    buf.writeUInt32BE(entries[i], i * 4 + 8)
  }

  exports.stsz.encode.bytes = 8 + entries.length * 4
  return buf
}
exports.stsz.decode = function (buf, offset) {
  buf = buf.slice(offset)
  var size = buf.readUInt32BE(0)
  var num = buf.readUInt32BE(4)
  var entries = new Array(num)

  for (var i = 0; i < num; i++) {
    if (size === 0) {
      entries[i] = buf.readUInt32BE(i * 4 + 8)
    } else {
      entries[i] = size
    }
  }

  return {
    entries: entries
  }
}
exports.stsz.encodingLength = function (box) {
  return 8 + box.entries.length * 4
}

exports.stss =
exports.stco = {}
exports.stco.encode = function (box, buf, offset) {
  var entries = box.entries || []
  buf = buf ? buf.slice(offset) : Buffer.alloc(exports.stco.encodingLength(box))

  buf.writeUInt32BE(entries.length, 0)

  for (var i = 0; i < entries.length; i++) {
    buf.writeUInt32BE(entries[i], i * 4 + 4)
  }

  exports.stco.encode.bytes = 4 + entries.length * 4
  return buf
}
exports.stco.decode = function (buf, offset) {
  buf = buf.slice(offset)
  var num = buf.readUInt32BE(0)
  var entries = new Array(num)

  for (var i = 0; i < num; i++) {
    entries[i] = buf.readUInt32BE(i * 4 + 4)
  }

  return {
    entries: entries
  }
}
exports.stco.encodingLength = function (box) {
  return 4 + box.entries.length * 4
}

exports.co64 = {}
exports.co64.encode = function (box, buf, offset) {
  var entries = box.entries || []
  buf = buf ? buf.slice(offset) : Buffer.alloc(exports.co64.encodingLength(box))

  buf.writeUInt32BE(entries.length, 0)

  for (var i = 0; i < entries.length; i++) {
    uint64be.encode(entries[i], buf, i * 8 + 4)
  }

  exports.co64.encode.bytes = 4 + entries.length * 8
  return buf
}
exports.co64.decode = function (buf, offset) {
  buf = buf.slice(offset)
  var num = buf.readUInt32BE(0)
  var entries = new Array(num)

  for (var i = 0; i < num; i++) {
    entries[i] = uint64be.decode(buf, i * 8 + 4)
  }

  return {
    entries: entries
  }
}
exports.co64.encodingLength = function (box) {
  return 4 + box.entries.length * 8
}

exports.stts = {}
exports.stts.encode = function (box, buf, offset) {
  var entries = box.entries || []
  buf = buf ? buf.slice(offset) : Buffer.alloc(exports.stts.encodingLength(box))

  buf.writeUInt32BE(entries.length, 0)

  for (var i = 0; i < entries.length; i++) {
    var ptr = i * 8 + 4
    buf.writeUInt32BE(entries[i].count || 0, ptr)
    buf.writeUInt32BE(entries[i].duration || 0, ptr + 4)
  }

  exports.stts.encode.bytes = 4 + box.entries.length * 8
  return buf
}
exports.stts.decode = function (buf, offset) {
  buf = buf.slice(offset)
  var num = buf.readUInt32BE(0)
  var entries = new Array(num)

  for (var i = 0; i < num; i++) {
    var ptr = i * 8 + 4
    entries[i] = {
      count: buf.readUInt32BE(ptr),
      duration: buf.readUInt32BE(ptr + 4)
    }
  }

  return {
    entries: entries
  }
}
exports.stts.encodingLength = function (box) {
  return 4 + box.entries.length * 8
}

exports.ctts = {}
exports.ctts.encode = function (box, buf, offset) {
  var entries = box.entries || []
  buf = buf ? buf.slice(offset) : Buffer.alloc(exports.ctts.encodingLength(box))

  buf.writeUInt32BE(entries.length, 0)

  for (var i = 0; i < entries.length; i++) {
    var ptr = i * 8 + 4
    buf.writeUInt32BE(entries[i].count || 0, ptr)
    buf.writeUInt32BE(entries[i].compositionOffset || 0, ptr + 4)
  }

  exports.ctts.encode.bytes = 4 + entries.length * 8
  return buf
}
exports.ctts.decode = function (buf, offset) {
  buf = buf.slice(offset)
  var num = buf.readUInt32BE(0)
  var entries = new Array(num)

  for (var i = 0; i < num; i++) {
    var ptr = i * 8 + 4
    entries[i] = {
      count: buf.readUInt32BE(ptr),
      compositionOffset: buf.readInt32BE(ptr + 4)
    }
  }

  return {
    entries: entries
  }
}
exports.ctts.encodingLength = function (box) {
  return 4 + box.entries.length * 8
}

exports.stsc = {}
exports.stsc.encode = function (box, buf, offset) {
  var entries = box.entries || []
  buf = buf ? buf.slice(offset) : Buffer.alloc(exports.stsc.encodingLength(box))

  buf.writeUInt32BE(entries.length, 0)

  for (var i = 0; i < entries.length; i++) {
    var ptr = i * 12 + 4
    buf.writeUInt32BE(entries[i].firstChunk || 0, ptr)
    buf.writeUInt32BE(entries[i].samplesPerChunk || 0, ptr + 4)
    buf.writeUInt32BE(entries[i].sampleDescriptionId || 0, ptr + 8)
  }

  exports.stsc.encode.bytes = 4 + entries.length * 12
  return buf
}
exports.stsc.decode = function (buf, offset) {
  buf = buf.slice(offset)
  var num = buf.readUInt32BE(0)
  var entries = new Array(num)

  for (var i = 0; i < num; i++) {
    var ptr = i * 12 + 4
    entries[i] = {
      firstChunk: buf.readUInt32BE(ptr),
      samplesPerChunk: buf.readUInt32BE(ptr + 4),
      sampleDescriptionId: buf.readUInt32BE(ptr + 8)
    }
  }

  return {
    entries: entries
  }
}
exports.stsc.encodingLength = function (box) {
  return 4 + box.entries.length * 12
}

exports.dref = {}
exports.dref.encode = function (box, buf, offset) {
  buf = buf ? buf.slice(offset) : Buffer.alloc(exports.dref.encodingLength(box))
  var entries = box.entries || []

  buf.writeUInt32BE(entries.length, 0)

  var ptr = 4
  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i]
    var size = (entry.buf ? entry.buf.length : 0) + 4 + 4

    buf.writeUInt32BE(size, ptr)
    ptr += 4

    buf.write(entry.type, ptr, 4, 'ascii')
    ptr += 4

    if (entry.buf) {
      entry.buf.copy(buf, ptr)
      ptr += entry.buf.length
    }
  }

  exports.dref.encode.bytes = ptr
  return buf
}
exports.dref.decode = function (buf, offset) {
  buf = buf.slice(offset)
  var num = buf.readUInt32BE(0)
  var entries = new Array(num)
  var ptr = 4

  for (var i = 0; i < num; i++) {
    var size = buf.readUInt32BE(ptr)
    var type = buf.toString('ascii', ptr + 4, ptr + 8)
    var tmp = buf.slice(ptr + 8, ptr + size)
    ptr += size

    entries[i] = {
      type: type,
      buf: tmp
    }
  }

  return {
    entries: entries
  }
}
exports.dref.encodingLength = function (box) {
  var totalSize = 4
  if (!box.entries) return totalSize
  for (var i = 0; i < box.entries.length; i++) {
    var buf = box.entries[i].buf
    totalSize += (buf ? buf.length : 0) + 4 + 4
  }
  return totalSize
}

exports.elst = {}
exports.elst.encode = function (box, buf, offset) {
  var entries = box.entries || []
  buf = buf ? buf.slice(offset) : Buffer.alloc(exports.elst.encodingLength(box))

  buf.writeUInt32BE(entries.length, 0)

  for (var i = 0; i < entries.length; i++) {
    var ptr = i * 12 + 4
    buf.writeUInt32BE(entries[i].trackDuration || 0, ptr)
    buf.writeUInt32BE(entries[i].mediaTime || 0, ptr + 4)
    writeFixed32(entries[i].mediaRate || 0, buf, ptr + 8)
  }

  exports.elst.encode.bytes = 4 + entries.length * 12
  return buf
}
exports.elst.decode = function (buf, offset) {
  buf = buf.slice(offset)
  var num = buf.readUInt32BE(0)
  var entries = new Array(num)

  for (var i = 0; i < num; i++) {
    var ptr = i * 12 + 4
    entries[i] = {
      trackDuration: buf.readUInt32BE(ptr),
      mediaTime: buf.readInt32BE(ptr + 4),
      mediaRate: readFixed32(buf, ptr + 8)
    }
  }

  return {
    entries: entries
  }
}
exports.elst.encodingLength = function (box) {
  return 4 + box.entries.length * 12
}

exports.hdlr = {}
exports.hdlr.encode = function (box, buf, offset) {
  buf = buf ? buf.slice(offset) : Buffer.alloc(exports.hdlr.encodingLength(box))

  var len = 21 + (box.name || '').length
  buf.fill(0, 0, len)

  buf.write(box.handlerType || '', 4, 4, 'ascii')
  writeString(box.name || '', buf, 20)

  exports.hdlr.encode.bytes = len
  return buf
}
exports.hdlr.decode = function (buf, offset, end) {
  buf = buf.slice(offset)
  return {
    handlerType: buf.toString('ascii', 4, 8),
    name: readString(buf, 20, end)
  }
}
exports.hdlr.encodingLength = function (box) {
  return 21 + (box.name || '').length
}

exports.mehd = {}
exports.mehd.encode = function (box, buf, offset) {
  buf = buf ? buf.slice(offset) : Buffer.alloc(4)

  buf.writeUInt32BE(box.fragmentDuration || 0, 0)
  exports.mehd.encode.bytes = 4
  return buf
}
exports.mehd.decode = function (buf, offset) {
  buf = buf.slice(offset)
  return {
    fragmentDuration: buf.readUInt32BE(0)
  }
}
exports.mehd.encodingLength = function (box) {
  return 4
}

exports.trex = {}
exports.trex.encode = function (box, buf, offset) {
  buf = buf ? buf.slice(offset) : Buffer.alloc(20)

  buf.writeUInt32BE(box.trackId || 0, 0)
  buf.writeUInt32BE(box.defaultSampleDescriptionIndex || 0, 4)
  buf.writeUInt32BE(box.defaultSampleDuration || 0, 8)
  buf.writeUInt32BE(box.defaultSampleSize || 0, 12)
  buf.writeUInt32BE(box.defaultSampleFlags || 0, 16)
  exports.trex.encode.bytes = 20
  return buf
}
exports.trex.decode = function (buf, offset) {
  buf = buf.slice(offset)
  return {
    trackId: buf.readUInt32BE(0),
    defaultSampleDescriptionIndex: buf.readUInt32BE(4),
    defaultSampleDuration: buf.readUInt32BE(8),
    defaultSampleSize: buf.readUInt32BE(12),
    defaultSampleFlags: buf.readUInt32BE(16)
  }
}
exports.trex.encodingLength = function (box) {
  return 20
}

exports.mfhd = {}
exports.mfhd.encode = function (box, buf, offset) {
  buf = buf ? buf.slice(offset) : Buffer.alloc(4)

  buf.writeUInt32BE(box.sequenceNumber || 0, 0)
  exports.mfhd.encode.bytes = 4
  return buf
}
exports.mfhd.decode = function (buf, offset) {
  return {
    sequenceNumber: buf.readUInt32BE(0)
  }
}
exports.mfhd.encodingLength = function (box) {
  return 4
}

exports.tfhd = {}
exports.tfhd.encode = function (box, buf, offset) {
  buf = buf ? buf.slice(offset) : Buffer.alloc(4)
  buf.writeUInt32BE(box.trackId, 0)
  exports.tfhd.encode.bytes = 4
  return buf
}
exports.tfhd.decode = function (buf, offset) {
  // TODO: this
}
exports.tfhd.encodingLength = function (box) {
  // TODO: this is wrong!
  return 4
}

exports.tfdt = {}
exports.tfdt.encode = function (box, buf, offset) {
  buf = buf ? buf.slice(offset) : Buffer.alloc(4)

  buf.writeUInt32BE(box.baseMediaDecodeTime || 0, 0)
  exports.tfdt.encode.bytes = 4
  return buf
}
exports.tfdt.decode = function (buf, offset) {
  // TODO: this
}
exports.tfdt.encodingLength = function (box) {
  return 4
}

exports.trun = {}
exports.trun.encode = function (box, buf, offset) {
  buf = buf ? buf.slice(offset) : Buffer.alloc(8 + box.entries.length * 16)

  // TODO: this is wrong
  buf.writeUInt32BE(box.entries.length, 0)
  buf.writeInt32BE(box.dataOffset, 4)
  var ptr = 8
  for (var i = 0; i < box.entries.length; i++) {
    var entry = box.entries[i]
    buf.writeUInt32BE(entry.sampleDuration, ptr)
    ptr += 4

    buf.writeUInt32BE(entry.sampleSize, ptr)
    ptr += 4

    buf.writeUInt32BE(entry.sampleFlags, ptr)
    ptr += 4

    if ((box.version || 0) === 0) {
      buf.writeUInt32BE(entry.sampleCompositionTimeOffset, ptr)
    } else {
      buf.writeInt32BE(entry.sampleCompositionTimeOffset, ptr)
    }
    ptr += 4
  }
  exports.trun.encode.bytes = ptr
}
exports.trun.decode = function (buf, offset) {
  // TODO: this
}
exports.trun.encodingLength = function (box) {
  // TODO: this is wrong
  return 8 + box.entries.length * 16
}

exports.mdat = {}
exports.mdat.encode = function (box, buf, offset) {
  if (box.buffer) {
    box.buffer.copy(buf, offset)
    exports.mdat.encode.bytes = box.buffer.length
  } else {
    exports.mdat.encode.bytes = exports.mdat.encodingLength(box)
  }
}
exports.mdat.decode = function (buf, start, end) {
  return {
    buffer: Buffer.from(buf.slice(start, end))
  }
}
exports.mdat.encodingLength = function (box) {
  return box.buffer ? box.buffer.length : box.contentLength
}

function writeReserved (buf, offset, end) {
  for (var i = offset; i < end; i++) buf[i] = 0
}

function writeDate (date, buf, offset) {
  buf.writeUInt32BE(Math.floor((date.getTime() + TIME_OFFSET) / 1000), offset)
}

function writeDate64 (date, buf, offset) {
  // Node only supports integer <= 48bit. Waiting for BigInt!
  buf.writeUIntBE(Math.floor((date.getTime() + TIME_OFFSET) / 1000), offset, 6)
}

// TODO: think something is wrong here
function writeFixed32 (num, buf, offset) {
  buf.writeUInt16BE(Math.floor(num) % (256 * 256), offset)
  buf.writeUInt16BE(Math.floor(num * 256 * 256) % (256 * 256), offset + 2)
}

function writeFixed16 (num, buf, offset) {
  buf[offset] = Math.floor(num) % 256
  buf[offset + 1] = Math.floor(num * 256) % 256
}

function writeMatrix (list, buf, offset) {
  if (!list) list = [0, 0, 0, 0, 0, 0, 0, 0, 0]
  for (var i = 0; i < list.length; i++) {
    writeFixed32(list[i], buf, offset + i * 4)
  }
}

function writeString (str, buf, offset) {
  var strBuffer = Buffer.from(str, 'utf8')
  strBuffer.copy(buf, offset)
  buf[offset + strBuffer.length] = 0
}

function readMatrix (buf) {
  var list = new Array(buf.length / 4)
  for (var i = 0; i < list.length; i++) list[i] = readFixed32(buf, i * 4)
  return list
}

function readDate64 (buf, offset) {
  // Node only supports integer <= 48bit. Waiting for BigInt!
  return new Date(buf.readUIntBE(offset, 6) * 1000 - TIME_OFFSET)
}

function readDate (buf, offset) {
  return new Date(buf.readUInt32BE(offset) * 1000 - TIME_OFFSET)
}

function readFixed32 (buf, offset) {
  return buf.readUInt16BE(offset) + buf.readUInt16BE(offset + 2) / (256 * 256)
}

function readFixed16 (buf, offset) {
  return buf[offset] + buf[offset + 1] / 256
}

function readString (buf, offset, length) {
  var i
  for (i = 0; i < length; i++) {
    if (buf[offset + i] === 0) {
      break
    }
  }
  return buf.toString('utf8', offset, offset + i)
}

}).call(this,require("buffer").Buffer)
},{"./descriptor":44,"./index":45,"buffer":22,"uint64be":110}],44:[function(require,module,exports){
(function (Buffer){
var tagToName = {
  0x03: 'ESDescriptor',
  0x04: 'DecoderConfigDescriptor',
  0x05: 'DecoderSpecificInfo',
  0x06: 'SLConfigDescriptor'
}

exports.Descriptor = {}
exports.Descriptor.decode = function (buf, start, end) {
  var tag = buf.readUInt8(start)
  var ptr = start + 1
  var lenByte
  var len = 0
  do {
    lenByte = buf.readUInt8(ptr++)
    len = (len << 7) | (lenByte & 0x7f)
  } while (lenByte & 0x80)

  var obj
  var tagName = tagToName[tag] // May be undefined; that's ok
  if (exports[tagName]) {
    obj = exports[tagName].decode(buf, ptr, end)
  } else {
    obj = {
      buffer: Buffer.from(buf.slice(ptr, ptr + len))
    }
  }

  obj.tag = tag
  obj.tagName = tagName
  obj.length = (ptr - start) + len
  obj.contentsLen = len
  return obj
}

exports.DescriptorArray = {}
exports.DescriptorArray.decode = function (buf, start, end) {
  var ptr = start
  var obj = {}
  while (ptr + 2 <= end) {
    var descriptor = exports.Descriptor.decode(buf, ptr, end)
    ptr += descriptor.length
    var tagName = tagToName[descriptor.tag] || ('Descriptor' + descriptor.tag)
    obj[tagName] = descriptor
  }
  return obj
}

exports.ESDescriptor = {}
exports.ESDescriptor.decode = function (buf, start, end) {
  var flags = buf.readUInt8(start + 2)
  var ptr = start + 3
  if (flags & 0x80) {
    ptr += 2
  }
  if (flags & 0x40) {
    var len = buf.readUInt8(ptr)
    ptr += len + 1
  }
  if (flags & 0x20) {
    ptr += 2
  }
  return exports.DescriptorArray.decode(buf, ptr, end)
}

exports.DecoderConfigDescriptor = {}
exports.DecoderConfigDescriptor.decode = function (buf, start, end) {
  var oti = buf.readUInt8(start)
  var obj = exports.DescriptorArray.decode(buf, start + 13, end)
  obj.oti = oti
  return obj
}

}).call(this,require("buffer").Buffer)
},{"buffer":22}],45:[function(require,module,exports){
(function (Buffer){
// var assert = require('assert')
var uint64be = require('uint64be')

var boxes = require('./boxes')

var UINT32_MAX = 4294967295

var Box = exports

/*
 * Lists the proper order for boxes inside containers.
 * Five-character names ending in 's' indicate arrays instead of single elements.
 */
var containers = exports.containers = {
  'moov': ['mvhd', 'meta', 'traks', 'mvex'],
  'trak': ['tkhd', 'tref', 'trgr', 'edts', 'meta', 'mdia', 'udta'],
  'edts': ['elst'],
  'mdia': ['mdhd', 'hdlr', 'elng', 'minf'],
  'minf': ['vmhd', 'smhd', 'hmhd', 'sthd', 'nmhd', 'dinf', 'stbl'],
  'dinf': ['dref'],
  'stbl': ['stsd', 'stts', 'ctts', 'cslg', 'stsc', 'stsz', 'stz2', 'stco', 'co64', 'stss', 'stsh', 'padb', 'stdp', 'sdtp', 'sbgps', 'sgpds', 'subss', 'saizs', 'saios'],
  'mvex': ['mehd', 'trexs', 'leva'],
  'moof': ['mfhd', 'meta', 'trafs'],
  'traf': ['tfhd', 'tfdt', 'trun', 'sbgps', 'sgpds', 'subss', 'saizs', 'saios', 'meta']
}

Box.encode = function (obj, buffer, offset) {
  Box.encodingLength(obj) // sets every level appropriately
  offset = offset || 0
  buffer = buffer || Buffer.alloc(obj.length)
  return Box._encode(obj, buffer, offset)
}

Box._encode = function (obj, buffer, offset) {
  var type = obj.type
  var len = obj.length
  if (len > UINT32_MAX) {
    len = 1
  }
  buffer.writeUInt32BE(len, offset)
  buffer.write(obj.type, offset + 4, 4, 'ascii')
  var ptr = offset + 8
  if (len === 1) {
    uint64be.encode(obj.length, buffer, ptr)
    ptr += 8
  }
  if (boxes.fullBoxes[type]) {
    buffer.writeUInt32BE(obj.flags || 0, ptr)
    buffer.writeUInt8(obj.version || 0, ptr)
    ptr += 4
  }

  if (containers[type]) {
    var contents = containers[type]
    contents.forEach(function (childType) {
      if (childType.length === 5) {
        var entry = obj[childType] || []
        childType = childType.substr(0, 4)
        entry.forEach(function (child) {
          Box._encode(child, buffer, ptr)
          ptr += Box.encode.bytes
        })
      } else if (obj[childType]) {
        Box._encode(obj[childType], buffer, ptr)
        ptr += Box.encode.bytes
      }
    })
    if (obj.otherBoxes) {
      obj.otherBoxes.forEach(function (child) {
        Box._encode(child, buffer, ptr)
        ptr += Box.encode.bytes
      })
    }
  } else if (boxes[type]) {
    var encode = boxes[type].encode
    encode(obj, buffer, ptr)
    ptr += encode.bytes
  } else if (obj.buffer) {
    var buf = obj.buffer
    buf.copy(buffer, ptr)
    ptr += obj.buffer.length
  } else {
    throw new Error('Either `type` must be set to a known type (not\'' + type + '\') or `buffer` must be set')
  }

  Box.encode.bytes = ptr - offset
  // assert.equal(ptr - offset, obj.length, 'Error encoding \'' + type + '\': wrote ' + ptr - offset + ' bytes, expecting ' + obj.length)
  return buffer
}

/*
 * Returns an object with `type` and `size` fields,
 * or if there isn't enough data, returns the total
 * number of bytes needed to read the headers
 */
Box.readHeaders = function (buffer, start, end) {
  start = start || 0
  end = end || buffer.length
  if (end - start < 8) {
    return 8
  }

  var len = buffer.readUInt32BE(start)
  var type = buffer.toString('ascii', start + 4, start + 8)
  var ptr = start + 8

  if (len === 1) {
    if (end - start < 16) {
      return 16
    }

    len = uint64be.decode(buffer, ptr)
    ptr += 8
  }

  var version
  var flags
  if (boxes.fullBoxes[type]) {
    version = buffer.readUInt8(ptr)
    flags = buffer.readUInt32BE(ptr) & 0xffffff
    ptr += 4
  }

  return {
    length: len,
    headersLen: ptr - start,
    contentLen: len - (ptr - start),
    type: type,
    version: version,
    flags: flags
  }
}

Box.decode = function (buffer, start, end) {
  start = start || 0
  end = end || buffer.length
  var headers = Box.readHeaders(buffer, start, end)
  if (!headers || headers.length > end - start) {
    throw new Error('Data too short')
  }

  return Box.decodeWithoutHeaders(headers, buffer, start + headers.headersLen, start + headers.length)
}

Box.decodeWithoutHeaders = function (headers, buffer, start, end) {
  start = start || 0
  end = end || buffer.length
  var type = headers.type
  var obj = {}
  if (containers[type]) {
    obj.otherBoxes = []
    var contents = containers[type]
    var ptr = start
    while (end - ptr >= 8) {
      var child = Box.decode(buffer, ptr, end)
      ptr += child.length
      if (contents.indexOf(child.type) >= 0) {
        obj[child.type] = child
      } else if (contents.indexOf(child.type + 's') >= 0) {
        var childType = child.type + 's'
        var entry = obj[childType] = obj[childType] || []
        entry.push(child)
      } else {
        obj.otherBoxes.push(child)
      }
    }
  } else if (boxes[type]) {
    var decode = boxes[type].decode
    obj = decode(buffer, start, end)
  } else {
    obj.buffer = Buffer.from(buffer.slice(start, end))
  }

  obj.length = headers.length
  obj.contentLen = headers.contentLen
  obj.type = headers.type
  obj.version = headers.version
  obj.flags = headers.flags
  return obj
}

Box.encodingLength = function (obj) {
  var type = obj.type

  var len = 8
  if (boxes.fullBoxes[type]) {
    len += 4
  }

  if (containers[type]) {
    var contents = containers[type]
    contents.forEach(function (childType) {
      if (childType.length === 5) {
        var entry = obj[childType] || []
        childType = childType.substr(0, 4)
        entry.forEach(function (child) {
          child.type = childType
          len += Box.encodingLength(child)
        })
      } else if (obj[childType]) {
        var child = obj[childType]
        child.type = childType
        len += Box.encodingLength(child)
      }
    })
    if (obj.otherBoxes) {
      obj.otherBoxes.forEach(function (child) {
        len += Box.encodingLength(child)
      })
    }
  } else if (boxes[type]) {
    len += boxes[type].encodingLength(obj)
  } else if (obj.buffer) {
    len += obj.buffer.length
  } else {
    throw new Error('Either `type` must be set to a known type (not\'' + type + '\') or `buffer` must be set')
  }

  if (len > UINT32_MAX) {
    len += 8
  }

  obj.length = len
  return len
}

}).call(this,require("buffer").Buffer)
},{"./boxes":43,"buffer":22,"uint64be":110}],46:[function(require,module,exports){
(function (Buffer){
var stream = require('readable-stream')
var nextEvent = require('next-event')
var Box = require('mp4-box-encoding')

var EMPTY = Buffer.alloc(0)

class Decoder extends stream.Writable {
  constructor (opts) {
    super(opts)

    this.destroyed = false

    this._pending = 0
    this._missing = 0
    this._ignoreEmpty = false
    this._buf = null
    this._str = null
    this._cb = null
    this._ondrain = null
    this._writeBuffer = null
    this._writeCb = null

    this._ondrain = null
    this._kick()
  }

  destroy (err) {
    if (this.destroyed) return
    this.destroyed = true
    if (err) this.emit('error', err)
    this.emit('close')
  }

  _write (data, enc, next) {
    if (this.destroyed) return
    var drained = !this._str || !this._str._writableState.needDrain

    while (data.length && !this.destroyed) {
      if (!this._missing && !this._ignoreEmpty) {
        this._writeBuffer = data
        this._writeCb = next
        return
      }

      var consumed = data.length < this._missing ? data.length : this._missing
      if (this._buf) data.copy(this._buf, this._buf.length - this._missing)
      else if (this._str) drained = this._str.write(consumed === data.length ? data : data.slice(0, consumed))

      this._missing -= consumed

      if (!this._missing) {
        var buf = this._buf
        var cb = this._cb
        var stream = this._str

        this._buf = this._cb = this._str = this._ondrain = null
        drained = true

        this._ignoreEmpty = false
        if (stream) stream.end()
        if (cb) cb(buf)
      }

      data = consumed === data.length ? EMPTY : data.slice(consumed)
    }

    if (this._pending && !this._missing) {
      this._writeBuffer = data
      this._writeCb = next
      return
    }

    if (drained) next()
    else this._ondrain(next)
  }

  _buffer (size, cb) {
    this._missing = size
    this._buf = Buffer.alloc(size)
    this._cb = cb
  }

  _stream (size, cb) {
    this._missing = size
    this._str = new MediaData(this)
    this._ondrain = nextEvent(this._str, 'drain')
    this._pending++
    this._str.on('end', () => {
      this._pending--
      this._kick()
    })
    this._cb = cb
    return this._str
  }

  _readBox () {
    const bufferHeaders = (len, buf) => {
      this._buffer(len, additionalBuf => {
        if (buf) {
          buf = Buffer.concat([buf, additionalBuf])
        } else {
          buf = additionalBuf
        }
        var headers = Box.readHeaders(buf)
        if (typeof headers === 'number') {
          bufferHeaders(headers - buf.length, buf)
        } else {
          this._pending++
          this._headers = headers
          this.emit('box', headers)
        }
      })
    }

    bufferHeaders(8)
  }

  stream () {
    if (!this._headers) throw new Error('this function can only be called once after \'box\' is emitted')
    var headers = this._headers
    this._headers = null

    return this._stream(headers.contentLen, null)
  }

  decode (cb) {
    if (!this._headers) throw new Error('this function can only be called once after \'box\' is emitted')
    var headers = this._headers
    this._headers = null

    this._buffer(headers.contentLen, buf => {
      var box = Box.decodeWithoutHeaders(headers, buf)
      cb(box)
      this._pending--
      this._kick()
    })
  }

  ignore () {
    if (!this._headers) throw new Error('this function can only be called once after \'box\' is emitted')
    var headers = this._headers
    this._headers = null

    this._missing = headers.contentLen
    if (this._missing === 0) {
      this._ignoreEmpty = true
    }
    this._cb = () => {
      this._pending--
      this._kick()
    }
  }

  _kick () {
    if (this._pending) return
    if (!this._buf && !this._str) this._readBox()
    if (this._writeBuffer) {
      var next = this._writeCb
      var buffer = this._writeBuffer
      this._writeBuffer = null
      this._writeCb = null
      this._write(buffer, null, next)
    }
  }
}

class MediaData extends stream.PassThrough {
  constructor (parent) {
    super()
    this._parent = parent
    this.destroyed = false
  }

  destroy (err) {
    if (this.destroyed) return
    this.destroyed = true
    this._parent.destroy(err)
    if (err) this.emit('error', err)
    this.emit('close')
  }
}

module.exports = Decoder

}).call(this,require("buffer").Buffer)
},{"buffer":22,"mp4-box-encoding":45,"next-event":51,"readable-stream":82}],47:[function(require,module,exports){
(function (process,Buffer){
var stream = require('readable-stream')
var Box = require('mp4-box-encoding')

function noop () {}

class Encoder extends stream.Readable {
  constructor (opts) {
    super(opts)

    this.destroyed = false

    this._finalized = false
    this._reading = false
    this._stream = null
    this._drain = null
    this._want = false

    this._onreadable = () => {
      if (!this._want) return
      this._want = false
      this._read()
    }

    this._onend = () => {
      this._stream = null
    }
  }

  mdat (size, cb) {
    this.mediaData(size, cb)
  }

  mediaData (size, cb) {
    var stream = new MediaData(this)
    this.box({ type: 'mdat', contentLength: size, encodeBufferLen: 8, stream: stream }, cb)
    return stream
  }

  box (box, cb) {
    if (!cb) cb = noop
    if (this.destroyed) return cb(new Error('Encoder is destroyed'))

    var buf
    if (box.encodeBufferLen) {
      buf = Buffer.alloc(box.encodeBufferLen)
    }
    if (box.stream) {
      box.buffer = null
      buf = Box.encode(box, buf)
      this.push(buf)
      this._stream = box.stream
      this._stream.on('readable', this._onreadable)
      this._stream.on('end', this._onend)
      this._stream.on('end', cb)
      this._forward()
    } else {
      buf = Box.encode(box, buf)
      var drained = this.push(buf)
      if (drained) return process.nextTick(cb)
      this._drain = cb
    }
  }

  destroy (err) {
    if (this.destroyed) return
    this.destroyed = true
    if (this._stream && this._stream.destroy) this._stream.destroy()
    this._stream = null
    if (this._drain) {
      var cb = this._drain
      this._drain = null
      cb(err)
    }
    if (err) this.emit('error', err)
    this.emit('close')
  }

  finalize () {
    this._finalized = true
    if (!this._stream && !this._drain) {
      this.push(null)
    }
  }

  _forward () {
    if (!this._stream) return

    while (!this.destroyed) {
      var buf = this._stream.read()

      if (!buf) {
        this._want = !!this._stream
        return
      }

      if (!this.push(buf)) return
    }
  }

  _read () {
    if (this._reading || this.destroyed) return
    this._reading = true

    if (this._stream) this._forward()
    if (this._drain) {
      var drain = this._drain
      this._drain = null
      drain()
    }

    this._reading = false
    if (this._finalized) {
      this.push(null)
    }
  }
}

class MediaData extends stream.PassThrough {
  constructor (parent) {
    super()
    this._parent = parent
    this.destroyed = false
  }

  destroy (err) {
    if (this.destroyed) return
    this.destroyed = true
    this._parent.destroy(err)
    if (err) this.emit('error', err)
    this.emit('close')
  }
}

module.exports = Encoder

}).call(this,require('_process'),require("buffer").Buffer)
},{"_process":58,"buffer":22,"mp4-box-encoding":45,"readable-stream":82}],48:[function(require,module,exports){
const Decoder = require('./decode')
const Encoder = require('./encode')

exports.decode = opts => new Decoder(opts)
exports.encode = opts => new Encoder(opts)

},{"./decode":46,"./encode":47}],49:[function(require,module,exports){
/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var w = d * 7;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} [options]
 * @throws {Error} throw an error if val is not a non-empty string or a number
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options) {
  options = options || {};
  var type = typeof val;
  if (type === 'string' && val.length > 0) {
    return parse(val);
  } else if (type === 'number' && isFinite(val)) {
    return options.long ? fmtLong(val) : fmtShort(val);
  }
  throw new Error(
    'val is not a non-empty string or a valid number. val=' +
      JSON.stringify(val)
  );
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  str = String(str);
  if (str.length > 100) {
    return;
  }
  var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
    str
  );
  if (!match) {
    return;
  }
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'weeks':
    case 'week':
    case 'w':
      return n * w;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
    default:
      return undefined;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtShort(ms) {
  var msAbs = Math.abs(ms);
  if (msAbs >= d) {
    return Math.round(ms / d) + 'd';
  }
  if (msAbs >= h) {
    return Math.round(ms / h) + 'h';
  }
  if (msAbs >= m) {
    return Math.round(ms / m) + 'm';
  }
  if (msAbs >= s) {
    return Math.round(ms / s) + 's';
  }
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtLong(ms) {
  var msAbs = Math.abs(ms);
  if (msAbs >= d) {
    return plural(ms, msAbs, d, 'day');
  }
  if (msAbs >= h) {
    return plural(ms, msAbs, h, 'hour');
  }
  if (msAbs >= m) {
    return plural(ms, msAbs, m, 'minute');
  }
  if (msAbs >= s) {
    return plural(ms, msAbs, s, 'second');
  }
  return ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, msAbs, n, name) {
  var isPlural = msAbs >= n * 1.5;
  return Math.round(ms / n) + ' ' + name + (isPlural ? 's' : '');
}

},{}],50:[function(require,module,exports){
var stream = require('readable-stream')

function toStreams2Obj (s) {
  return toStreams2(s, { objectMode: true, highWaterMark: 16 })
}

function toStreams2Buf (s) {
  return toStreams2(s)
}

function toStreams2 (s, opts) {
  if (!s || typeof s === 'function' || s._readableState) return s

  var wrap = new stream.Readable(opts).wrap(s)
  if (s.destroy) {
    wrap.destroy = s.destroy.bind(s)
  }
  return wrap
}

class MultiStream extends stream.Readable {
  constructor (streams, opts) {
    super(opts)

    this.destroyed = false

    this._drained = false
    this._forwarding = false
    this._current = null
    this._toStreams2 = (opts && opts.objectMode) ? toStreams2Obj : toStreams2Buf

    if (typeof streams === 'function') {
      this._queue = streams
    } else {
      this._queue = streams.map(this._toStreams2)
      this._queue.forEach(stream => {
        if (typeof stream !== 'function') this._attachErrorListener(stream)
      })
    }

    this._next()
  }

  _read () {
    this._drained = true
    this._forward()
  }

  _forward () {
    if (this._forwarding || !this._drained || !this._current) return
    this._forwarding = true

    var chunk
    while ((chunk = this._current.read()) !== null && this._drained) {
      this._drained = this.push(chunk)
    }

    this._forwarding = false
  }

  destroy (err) {
    if (this.destroyed) return
    this.destroyed = true

    if (this._current && this._current.destroy) this._current.destroy()
    if (typeof this._queue !== 'function') {
      this._queue.forEach(stream => {
        if (stream.destroy) stream.destroy()
      })
    }

    if (err) this.emit('error', err)
    this.emit('close')
  }

  _next () {
    this._current = null

    if (typeof this._queue === 'function') {
      this._queue((err, stream) => {
        if (err) return this.destroy(err)
        stream = this._toStreams2(stream)
        this._attachErrorListener(stream)
        this._gotNextStream(stream)
      })
    } else {
      var stream = this._queue.shift()
      if (typeof stream === 'function') {
        stream = this._toStreams2(stream())
        this._attachErrorListener(stream)
      }
      this._gotNextStream(stream)
    }
  }

  _gotNextStream (stream) {
    if (!stream) {
      this.push(null)
      this.destroy()
      return
    }

    this._current = stream
    this._forward()

    const onReadable = () => {
      this._forward()
    }

    const onClose = () => {
      if (!stream._readableState.ended) {
        this.destroy()
      }
    }

    const onEnd = () => {
      this._current = null
      stream.removeListener('readable', onReadable)
      stream.removeListener('end', onEnd)
      stream.removeListener('close', onClose)
      this._next()
    }

    stream.on('readable', onReadable)
    stream.once('end', onEnd)
    stream.once('close', onClose)
  }

  _attachErrorListener (stream) {
    if (!stream) return

    const onError = (err) => {
      stream.removeListener('error', onError)
      this.destroy(err)
    }

    stream.once('error', onError)
  }
}

MultiStream.obj = streams => (
  new MultiStream(streams, { objectMode: true, highWaterMark: 16 })
)

module.exports = MultiStream

},{"readable-stream":82}],51:[function(require,module,exports){
module.exports = nextEvent

function nextEvent (emitter, name) {
  var next = null
  emitter.on(name, function (data) {
    if (!next) return
    var fn = next
    next = null
    fn(data)
  })

  return function (once) {
    next = once
  }
}

},{}],52:[function(require,module,exports){
var wrappy = require('wrappy')
module.exports = wrappy(once)
module.exports.strict = wrappy(onceStrict)

once.proto = once(function () {
  Object.defineProperty(Function.prototype, 'once', {
    value: function () {
      return once(this)
    },
    configurable: true
  })

  Object.defineProperty(Function.prototype, 'onceStrict', {
    value: function () {
      return onceStrict(this)
    },
    configurable: true
  })
})

function once (fn) {
  var f = function () {
    if (f.called) return f.value
    f.called = true
    return f.value = fn.apply(this, arguments)
  }
  f.called = false
  return f
}

function onceStrict (fn) {
  var f = function () {
    if (f.called)
      throw new Error(f.onceError)
    f.called = true
    return f.value = fn.apply(this, arguments)
  }
  var name = fn.name || 'Function wrapped with `once`'
  f.onceError = name + " shouldn't be called more than once"
  f.called = false
  return f
}

},{"wrappy":127}],53:[function(require,module,exports){
function parsePart(str) {
  // just a number
  if(/^-?\d+$/.test(str)) {
    return parseInt(str, 10);
  }
  var m;
  // 1-5 or 1..5 (equivilant) or 1...5 (doesn't include 5)
  if((m = str.match(/^(-?\d+)(-|\.\.\.?|\u2025|\u2026|\u22EF)(-?\d+)$/))) {
    var lhs = m[1];
    var sep = m[2];
    var rhs = m[3];
    if(lhs && rhs) {
      lhs = parseInt(lhs);
      rhs = parseInt(rhs);
      var res = [];
      var incr = lhs < rhs ? 1 : -1;

      // Make it inclusive by moving the right 'stop-point' away by one.
      if(sep == '-' || sep == '..' || sep == '\u2025') {
        rhs += incr;
      }

      for(var i=lhs; i != rhs; i += incr) res.push(i);
      return res;
    }
  }
  return [];
}

module.exports.parse = function(str) {
  var parts = str.split(',');

  var toFlatten = parts.map(function(el) {
    return parsePart(el);
  });

  // reduce can't handle single element arrays
  if(toFlatten.length === 0) return [];
  if(toFlatten.length === 1) {
    if(Array.isArray(toFlatten[0]))
      return toFlatten[0];
    return toFlatten;
  }

  return toFlatten.reduce(function(lhs, rhs) {
    if(!Array.isArray(lhs)) lhs = [lhs];
    if(!Array.isArray(rhs)) rhs = [rhs];
    return lhs.concat(rhs);
  });
};

},{}],54:[function(require,module,exports){
(function (process,Buffer){
/* global Blob */

const bencode = require('bencode')
const blobToBuffer = require('blob-to-buffer')
const fs = require('fs') // browser exclude
const get = require('simple-get')
const magnet = require('magnet-uri')
const path = require('path')
const sha1 = require('simple-sha1')
const uniq = require('uniq')

module.exports = parseTorrent
module.exports.remote = parseTorrentRemote

module.exports.toMagnetURI = magnet.encode
module.exports.toTorrentFile = encodeTorrentFile

/**
 * Parse a torrent identifier (magnet uri, .torrent file, info hash)
 * @param  {string|Buffer|Object} torrentId
 * @return {Object}
 */
function parseTorrent (torrentId) {
  if (typeof torrentId === 'string' && /^(stream-)?magnet:/.test(torrentId)) {
    // magnet uri (string)
    return magnet(torrentId)
  } else if (typeof torrentId === 'string' && (/^[a-f0-9]{40}$/i.test(torrentId) || /^[a-z2-7]{32}$/i.test(torrentId))) {
    // info hash (hex/base-32 string)
    return magnet(`magnet:?xt=urn:btih:${torrentId}`)
  } else if (Buffer.isBuffer(torrentId) && torrentId.length === 20) {
    // info hash (buffer)
    return magnet(`magnet:?xt=urn:btih:${torrentId.toString('hex')}`)
  } else if (Buffer.isBuffer(torrentId)) {
    // .torrent file (buffer)
    return decodeTorrentFile(torrentId) // might throw
  } else if (torrentId && torrentId.infoHash) {
    // parsed torrent (from `parse-torrent` or `magnet-uri`)
    torrentId.infoHash = torrentId.infoHash.toLowerCase()
    if (!torrentId.announce) torrentId.announce = []
    if (typeof torrentId.announce === 'string') {
      torrentId.announce = [torrentId.announce]
    }
    if (!torrentId.urlList) torrentId.urlList = []
    return torrentId
  } else {
    throw new Error('Invalid torrent identifier')
  }
}

function parseTorrentRemote (torrentId, cb) {
  let parsedTorrent
  if (typeof cb !== 'function') throw new Error('second argument must be a Function')

  try {
    parsedTorrent = parseTorrent(torrentId)
  } catch (err) {
    // If torrent fails to parse, it could be a Blob, http/https URL or
    // filesystem path, so don't consider it an error yet.
  }

  if (parsedTorrent && parsedTorrent.infoHash) {
    process.nextTick(() => {
      cb(null, parsedTorrent)
    })
  } else if (isBlob(torrentId)) {
    blobToBuffer(torrentId, (err, torrentBuf) => {
      if (err) return cb(new Error(`Error converting Blob: ${err.message}`))
      parseOrThrow(torrentBuf)
    })
  } else if (typeof get === 'function' && /^https?:/.test(torrentId)) {
    // http, or https url to torrent file
    get.concat({
      url: torrentId,
      timeout: 30 * 1000,
      headers: { 'user-agent': 'WebTorrent (https://webtorrent.io)' }
    }, (err, res, torrentBuf) => {
      if (err) return cb(new Error(`Error downloading torrent: ${err.message}`))
      parseOrThrow(torrentBuf)
    })
  } else if (typeof fs.readFile === 'function' && typeof torrentId === 'string') {
    // assume it's a filesystem path
    fs.readFile(torrentId, (err, torrentBuf) => {
      if (err) return cb(new Error('Invalid torrent identifier'))
      parseOrThrow(torrentBuf)
    })
  } else {
    process.nextTick(() => {
      cb(new Error('Invalid torrent identifier'))
    })
  }

  function parseOrThrow (torrentBuf) {
    try {
      parsedTorrent = parseTorrent(torrentBuf)
    } catch (err) {
      return cb(err)
    }
    if (parsedTorrent && parsedTorrent.infoHash) cb(null, parsedTorrent)
    else cb(new Error('Invalid torrent identifier'))
  }
}

/**
 * Parse a torrent. Throws an exception if the torrent is missing required fields.
 * @param  {Buffer|Object} torrent
 * @return {Object}        parsed torrent
 */
function decodeTorrentFile (torrent) {
  if (Buffer.isBuffer(torrent)) {
    torrent = bencode.decode(torrent)
  }

  // sanity check
  ensure(torrent.info, 'info')
  ensure(torrent.info['name.utf-8'] || torrent.info.name, 'info.name')
  ensure(torrent.info['piece length'], 'info[\'piece length\']')
  ensure(torrent.info.pieces, 'info.pieces')

  if (torrent.info.files) {
    torrent.info.files.forEach(file => {
      ensure(typeof file.length === 'number', 'info.files[0].length')
      ensure(file['path.utf-8'] || file.path, 'info.files[0].path')
    })
  } else {
    ensure(typeof torrent.info.length === 'number', 'info.length')
  }

  const result = {
    info: torrent.info,
    infoBuffer: bencode.encode(torrent.info),
    name: (torrent.info['name.utf-8'] || torrent.info.name).toString(),
    announce: []
  }

  result.infoHash = sha1.sync(result.infoBuffer)
  result.infoHashBuffer = Buffer.from(result.infoHash, 'hex')

  if (torrent.info.private !== undefined) result.private = !!torrent.info.private

  if (torrent['creation date']) result.created = new Date(torrent['creation date'] * 1000)
  if (torrent['created by']) result.createdBy = torrent['created by'].toString()

  if (Buffer.isBuffer(torrent.comment)) result.comment = torrent.comment.toString()

  // announce and announce-list will be missing if metadata fetched via ut_metadata
  if (Array.isArray(torrent['announce-list']) && torrent['announce-list'].length > 0) {
    torrent['announce-list'].forEach(urls => {
      urls.forEach(url => {
        result.announce.push(url.toString())
      })
    })
  } else if (torrent.announce) {
    result.announce.push(torrent.announce.toString())
  }

  // handle url-list (BEP19 / web seeding)
  if (Buffer.isBuffer(torrent['url-list'])) {
    // some clients set url-list to empty string
    torrent['url-list'] = torrent['url-list'].length > 0
      ? [torrent['url-list']]
      : []
  }
  result.urlList = (torrent['url-list'] || []).map(url => url.toString())

  uniq(result.announce)
  uniq(result.urlList)

  const files = torrent.info.files || [torrent.info]
  result.files = files.map((file, i) => {
    const parts = [].concat(result.name, file['path.utf-8'] || file.path || []).map(p => p.toString())
    return {
      path: path.join.apply(null, [path.sep].concat(parts)).slice(1),
      name: parts[parts.length - 1],
      length: file.length,
      offset: files.slice(0, i).reduce(sumLength, 0)
    }
  })

  result.length = files.reduce(sumLength, 0)

  const lastFile = result.files[result.files.length - 1]

  result.pieceLength = torrent.info['piece length']
  result.lastPieceLength = ((lastFile.offset + lastFile.length) % result.pieceLength) || result.pieceLength
  result.pieces = splitPieces(torrent.info.pieces)

  return result
}

/**
 * Convert a parsed torrent object back into a .torrent file buffer.
 * @param  {Object} parsed parsed torrent
 * @return {Buffer}
 */
function encodeTorrentFile (parsed) {
  const torrent = {
    info: parsed.info
  }

  torrent['announce-list'] = (parsed.announce || []).map(url => {
    if (!torrent.announce) torrent.announce = url
    url = Buffer.from(url, 'utf8')
    return [url]
  })

  torrent['url-list'] = parsed.urlList || []

  if (parsed.private !== undefined) {
    torrent.private = Number(parsed.private)
  }

  if (parsed.created) {
    torrent['creation date'] = (parsed.created.getTime() / 1000) | 0
  }

  if (parsed.createdBy) {
    torrent['created by'] = parsed.createdBy
  }

  if (parsed.comment) {
    torrent.comment = parsed.comment
  }

  return bencode.encode(torrent)
}

/**
 * Check if `obj` is a W3C `Blob` or `File` object
 * @param  {*} obj
 * @return {boolean}
 */
function isBlob (obj) {
  return typeof Blob !== 'undefined' && obj instanceof Blob
}

function sumLength (sum, file) {
  return sum + file.length
}

function splitPieces (buf) {
  const pieces = []
  for (let i = 0; i < buf.length; i += 20) {
    pieces.push(buf.slice(i, i + 20).toString('hex'))
  }
  return pieces
}

function ensure (bool, fieldName) {
  if (!bool) throw new Error(`Torrent is missing required field: ${fieldName}`)
}

// Workaround Browserify v13 bug
// https://github.com/substack/node-browserify/issues/1483
;((() => { Buffer.alloc(0) }))()

}).call(this,require('_process'),require("buffer").Buffer)
},{"_process":58,"bencode":7,"blob-to-buffer":15,"buffer":22,"fs":18,"magnet-uri":40,"path":55,"simple-get":90,"simple-sha1":92,"uniq":111}],55:[function(require,module,exports){
(function (process){
// .dirname, .basename, and .extname methods are extracted from Node.js v8.11.1,
// backported and transplited with Babel, with backwards-compat fixes

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
  var resolvedPath = '',
      resolvedAbsolute = false;

  for (var i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    var path = (i >= 0) ? arguments[i] : process.cwd();

    // Skip empty and invalid entries
    if (typeof path !== 'string') {
      throw new TypeError('Arguments to path.resolve must be strings');
    } else if (!path) {
      continue;
    }

    resolvedPath = path + '/' + resolvedPath;
    resolvedAbsolute = path.charAt(0) === '/';
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
  var isAbsolute = exports.isAbsolute(path),
      trailingSlash = substr(path, -1) === '/';

  // Normalize the path
  path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }

  return (isAbsolute ? '/' : '') + path;
};

// posix version
exports.isAbsolute = function(path) {
  return path.charAt(0) === '/';
};

// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    if (typeof p !== 'string') {
      throw new TypeError('Arguments to path.join must be strings');
    }
    return p;
  }).join('/'));
};


// path.relative(from, to)
// posix version
exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

exports.sep = '/';
exports.delimiter = ':';

exports.dirname = function (path) {
  if (typeof path !== 'string') path = path + '';
  if (path.length === 0) return '.';
  var code = path.charCodeAt(0);
  var hasRoot = code === 47 /*/*/;
  var end = -1;
  var matchedSlash = true;
  for (var i = path.length - 1; i >= 1; --i) {
    code = path.charCodeAt(i);
    if (code === 47 /*/*/) {
        if (!matchedSlash) {
          end = i;
          break;
        }
      } else {
      // We saw the first non-path separator
      matchedSlash = false;
    }
  }

  if (end === -1) return hasRoot ? '/' : '.';
  if (hasRoot && end === 1) {
    // return '//';
    // Backwards-compat fix:
    return '/';
  }
  return path.slice(0, end);
};

function basename(path) {
  if (typeof path !== 'string') path = path + '';

  var start = 0;
  var end = -1;
  var matchedSlash = true;
  var i;

  for (i = path.length - 1; i >= 0; --i) {
    if (path.charCodeAt(i) === 47 /*/*/) {
        // If we reached a path separator that was not part of a set of path
        // separators at the end of the string, stop now
        if (!matchedSlash) {
          start = i + 1;
          break;
        }
      } else if (end === -1) {
      // We saw the first non-path separator, mark this as the end of our
      // path component
      matchedSlash = false;
      end = i + 1;
    }
  }

  if (end === -1) return '';
  return path.slice(start, end);
}

// Uses a mixed approach for backwards-compatibility, as ext behavior changed
// in new Node.js versions, so only basename() above is backported here
exports.basename = function (path, ext) {
  var f = basename(path);
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};

exports.extname = function (path) {
  if (typeof path !== 'string') path = path + '';
  var startDot = -1;
  var startPart = 0;
  var end = -1;
  var matchedSlash = true;
  // Track the state of characters (if any) we see before our first dot and
  // after any path separator we find
  var preDotState = 0;
  for (var i = path.length - 1; i >= 0; --i) {
    var code = path.charCodeAt(i);
    if (code === 47 /*/*/) {
        // If we reached a path separator that was not part of a set of path
        // separators at the end of the string, stop now
        if (!matchedSlash) {
          startPart = i + 1;
          break;
        }
        continue;
      }
    if (end === -1) {
      // We saw the first non-path separator, mark this as the end of our
      // extension
      matchedSlash = false;
      end = i + 1;
    }
    if (code === 46 /*.*/) {
        // If this is our first dot, mark it as the start of our extension
        if (startDot === -1)
          startDot = i;
        else if (preDotState !== 1)
          preDotState = 1;
    } else if (startDot !== -1) {
      // We saw a non-dot and non-path separator before our dot, so we should
      // have a good chance at having a non-empty extension
      preDotState = -1;
    }
  }

  if (startDot === -1 || end === -1 ||
      // We saw a non-dot character immediately before the dot
      preDotState === 0 ||
      // The (right-most) trimmed path component is exactly '..'
      preDotState === 1 && startDot === end - 1 && startDot === startPart + 1) {
    return '';
  }
  return path.slice(startDot, end);
};

function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// String.prototype.substr - negative index don't work in IE8
var substr = 'ab'.substr(-1) === 'b'
    ? function (str, start, len) { return str.substr(start, len) }
    : function (str, start, len) {
        if (start < 0) start = str.length + start;
        return str.substr(start, len);
    }
;

}).call(this,require('_process'))
},{"_process":58}],56:[function(require,module,exports){
module.exports = length

function length (bytes) {
  return Math.max(16384, 1 << Math.log2(bytes < 1024 ? 1 : bytes / 1024) + 0.5 | 0)
}

},{}],57:[function(require,module,exports){
'use strict';

const BYTE_UNITS = [
	'B',
	'kB',
	'MB',
	'GB',
	'TB',
	'PB',
	'EB',
	'ZB',
	'YB'
];

const BIT_UNITS = [
	'b',
	'kbit',
	'Mbit',
	'Gbit',
	'Tbit',
	'Pbit',
	'Ebit',
	'Zbit',
	'Ybit'
];

/*
Formats the given number using `Number#toLocaleString`.
- If locale is a string, the value is expected to be a locale-key (for example: `de`).
- If locale is true, the system default locale is used for translation.
- If no value for locale is specified, the number is returned unmodified.
*/
const toLocaleString = (number, locale) => {
	let result = number;
	if (typeof locale === 'string') {
		result = number.toLocaleString(locale);
	} else if (locale === true) {
		result = number.toLocaleString();
	}

	return result;
};

module.exports = (number, options) => {
	if (!Number.isFinite(number)) {
		throw new TypeError(`Expected a finite number, got ${typeof number}: ${number}`);
	}

	options = Object.assign({bits: false}, options);
	const UNITS = options.bits ? BIT_UNITS : BYTE_UNITS;

	if (options.signed && number === 0) {
		return ' 0 ' + UNITS[0];
	}

	const isNegative = number < 0;
	const prefix = isNegative ? '-' : (options.signed ? '+' : '');

	if (isNegative) {
		number = -number;
	}

	if (number < 1) {
		const numberString = toLocaleString(number, options.locale);
		return prefix + numberString + ' ' + UNITS[0];
	}

	const exponent = Math.min(Math.floor(Math.log10(number) / 3), UNITS.length - 1);
	// eslint-disable-next-line unicorn/prefer-exponentiation-operator
	number = Number((number / Math.pow(1000, exponent)).toPrecision(3));
	const numberString = toLocaleString(number, options.locale);

	const unit = UNITS[exponent];

	return prefix + numberString + ' ' + unit;
};

},{}],58:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],59:[function(require,module,exports){
(function (process){
var once = require('once')
var eos = require('end-of-stream')
var fs = require('fs') // we only need fs to get the ReadStream and WriteStream prototypes

var noop = function () {}
var ancient = /^v?\.0/.test(process.version)

var isFn = function (fn) {
  return typeof fn === 'function'
}

var isFS = function (stream) {
  if (!ancient) return false // newer node version do not need to care about fs is a special way
  if (!fs) return false // browser
  return (stream instanceof (fs.ReadStream || noop) || stream instanceof (fs.WriteStream || noop)) && isFn(stream.close)
}

var isRequest = function (stream) {
  return stream.setHeader && isFn(stream.abort)
}

var destroyer = function (stream, reading, writing, callback) {
  callback = once(callback)

  var closed = false
  stream.on('close', function () {
    closed = true
  })

  eos(stream, {readable: reading, writable: writing}, function (err) {
    if (err) return callback(err)
    closed = true
    callback()
  })

  var destroyed = false
  return function (err) {
    if (closed) return
    if (destroyed) return
    destroyed = true

    if (isFS(stream)) return stream.close(noop) // use close for fs streams to avoid fd leaks
    if (isRequest(stream)) return stream.abort() // request.destroy just do .end - .abort is what we want

    if (isFn(stream.destroy)) return stream.destroy()

    callback(err || new Error('stream was destroyed'))
  }
}

var call = function (fn) {
  fn()
}

var pipe = function (from, to) {
  return from.pipe(to)
}

var pump = function () {
  var streams = Array.prototype.slice.call(arguments)
  var callback = isFn(streams[streams.length - 1] || noop) && streams.pop() || noop

  if (Array.isArray(streams[0])) streams = streams[0]
  if (streams.length < 2) throw new Error('pump requires two streams per minimum')

  var error
  var destroys = streams.map(function (stream, i) {
    var reading = i < streams.length - 1
    var writing = i > 0
    return destroyer(stream, reading, writing, function (err) {
      if (!error) error = err
      if (err) destroys.forEach(call)
      if (reading) return
      destroys.forEach(call)
      callback(error)
    })
  })

  return streams.reduce(pipe)
}

module.exports = pump

}).call(this,require('_process'))
},{"_process":58,"end-of-stream":28,"fs":17,"once":52}],60:[function(require,module,exports){
(function (global){
/*! https://mths.be/punycode v1.4.1 by @mathias */
;(function(root) {

	/** Detect free variables */
	var freeExports = typeof exports == 'object' && exports &&
		!exports.nodeType && exports;
	var freeModule = typeof module == 'object' && module &&
		!module.nodeType && module;
	var freeGlobal = typeof global == 'object' && global;
	if (
		freeGlobal.global === freeGlobal ||
		freeGlobal.window === freeGlobal ||
		freeGlobal.self === freeGlobal
	) {
		root = freeGlobal;
	}

	/**
	 * The `punycode` object.
	 * @name punycode
	 * @type Object
	 */
	var punycode,

	/** Highest positive signed 32-bit float value */
	maxInt = 2147483647, // aka. 0x7FFFFFFF or 2^31-1

	/** Bootstring parameters */
	base = 36,
	tMin = 1,
	tMax = 26,
	skew = 38,
	damp = 700,
	initialBias = 72,
	initialN = 128, // 0x80
	delimiter = '-', // '\x2D'

	/** Regular expressions */
	regexPunycode = /^xn--/,
	regexNonASCII = /[^\x20-\x7E]/, // unprintable ASCII chars + non-ASCII chars
	regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g, // RFC 3490 separators

	/** Error messages */
	errors = {
		'overflow': 'Overflow: input needs wider integers to process',
		'not-basic': 'Illegal input >= 0x80 (not a basic code point)',
		'invalid-input': 'Invalid input'
	},

	/** Convenience shortcuts */
	baseMinusTMin = base - tMin,
	floor = Math.floor,
	stringFromCharCode = String.fromCharCode,

	/** Temporary variable */
	key;

	/*--------------------------------------------------------------------------*/

	/**
	 * A generic error utility function.
	 * @private
	 * @param {String} type The error type.
	 * @returns {Error} Throws a `RangeError` with the applicable error message.
	 */
	function error(type) {
		throw new RangeError(errors[type]);
	}

	/**
	 * A generic `Array#map` utility function.
	 * @private
	 * @param {Array} array The array to iterate over.
	 * @param {Function} callback The function that gets called for every array
	 * item.
	 * @returns {Array} A new array of values returned by the callback function.
	 */
	function map(array, fn) {
		var length = array.length;
		var result = [];
		while (length--) {
			result[length] = fn(array[length]);
		}
		return result;
	}

	/**
	 * A simple `Array#map`-like wrapper to work with domain name strings or email
	 * addresses.
	 * @private
	 * @param {String} domain The domain name or email address.
	 * @param {Function} callback The function that gets called for every
	 * character.
	 * @returns {Array} A new string of characters returned by the callback
	 * function.
	 */
	function mapDomain(string, fn) {
		var parts = string.split('@');
		var result = '';
		if (parts.length > 1) {
			// In email addresses, only the domain name should be punycoded. Leave
			// the local part (i.e. everything up to `@`) intact.
			result = parts[0] + '@';
			string = parts[1];
		}
		// Avoid `split(regex)` for IE8 compatibility. See #17.
		string = string.replace(regexSeparators, '\x2E');
		var labels = string.split('.');
		var encoded = map(labels, fn).join('.');
		return result + encoded;
	}

	/**
	 * Creates an array containing the numeric code points of each Unicode
	 * character in the string. While JavaScript uses UCS-2 internally,
	 * this function will convert a pair of surrogate halves (each of which
	 * UCS-2 exposes as separate characters) into a single code point,
	 * matching UTF-16.
	 * @see `punycode.ucs2.encode`
	 * @see <https://mathiasbynens.be/notes/javascript-encoding>
	 * @memberOf punycode.ucs2
	 * @name decode
	 * @param {String} string The Unicode input string (UCS-2).
	 * @returns {Array} The new array of code points.
	 */
	function ucs2decode(string) {
		var output = [],
		    counter = 0,
		    length = string.length,
		    value,
		    extra;
		while (counter < length) {
			value = string.charCodeAt(counter++);
			if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
				// high surrogate, and there is a next character
				extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) { // low surrogate
					output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
				} else {
					// unmatched surrogate; only append this code unit, in case the next
					// code unit is the high surrogate of a surrogate pair
					output.push(value);
					counter--;
				}
			} else {
				output.push(value);
			}
		}
		return output;
	}

	/**
	 * Creates a string based on an array of numeric code points.
	 * @see `punycode.ucs2.decode`
	 * @memberOf punycode.ucs2
	 * @name encode
	 * @param {Array} codePoints The array of numeric code points.
	 * @returns {String} The new Unicode string (UCS-2).
	 */
	function ucs2encode(array) {
		return map(array, function(value) {
			var output = '';
			if (value > 0xFFFF) {
				value -= 0x10000;
				output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
				value = 0xDC00 | value & 0x3FF;
			}
			output += stringFromCharCode(value);
			return output;
		}).join('');
	}

	/**
	 * Converts a basic code point into a digit/integer.
	 * @see `digitToBasic()`
	 * @private
	 * @param {Number} codePoint The basic numeric code point value.
	 * @returns {Number} The numeric value of a basic code point (for use in
	 * representing integers) in the range `0` to `base - 1`, or `base` if
	 * the code point does not represent a value.
	 */
	function basicToDigit(codePoint) {
		if (codePoint - 48 < 10) {
			return codePoint - 22;
		}
		if (codePoint - 65 < 26) {
			return codePoint - 65;
		}
		if (codePoint - 97 < 26) {
			return codePoint - 97;
		}
		return base;
	}

	/**
	 * Converts a digit/integer into a basic code point.
	 * @see `basicToDigit()`
	 * @private
	 * @param {Number} digit The numeric value of a basic code point.
	 * @returns {Number} The basic code point whose value (when used for
	 * representing integers) is `digit`, which needs to be in the range
	 * `0` to `base - 1`. If `flag` is non-zero, the uppercase form is
	 * used; else, the lowercase form is used. The behavior is undefined
	 * if `flag` is non-zero and `digit` has no uppercase form.
	 */
	function digitToBasic(digit, flag) {
		//  0..25 map to ASCII a..z or A..Z
		// 26..35 map to ASCII 0..9
		return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
	}

	/**
	 * Bias adaptation function as per section 3.4 of RFC 3492.
	 * https://tools.ietf.org/html/rfc3492#section-3.4
	 * @private
	 */
	function adapt(delta, numPoints, firstTime) {
		var k = 0;
		delta = firstTime ? floor(delta / damp) : delta >> 1;
		delta += floor(delta / numPoints);
		for (/* no initialization */; delta > baseMinusTMin * tMax >> 1; k += base) {
			delta = floor(delta / baseMinusTMin);
		}
		return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
	}

	/**
	 * Converts a Punycode string of ASCII-only symbols to a string of Unicode
	 * symbols.
	 * @memberOf punycode
	 * @param {String} input The Punycode string of ASCII-only symbols.
	 * @returns {String} The resulting string of Unicode symbols.
	 */
	function decode(input) {
		// Don't use UCS-2
		var output = [],
		    inputLength = input.length,
		    out,
		    i = 0,
		    n = initialN,
		    bias = initialBias,
		    basic,
		    j,
		    index,
		    oldi,
		    w,
		    k,
		    digit,
		    t,
		    /** Cached calculation results */
		    baseMinusT;

		// Handle the basic code points: let `basic` be the number of input code
		// points before the last delimiter, or `0` if there is none, then copy
		// the first basic code points to the output.

		basic = input.lastIndexOf(delimiter);
		if (basic < 0) {
			basic = 0;
		}

		for (j = 0; j < basic; ++j) {
			// if it's not a basic code point
			if (input.charCodeAt(j) >= 0x80) {
				error('not-basic');
			}
			output.push(input.charCodeAt(j));
		}

		// Main decoding loop: start just after the last delimiter if any basic code
		// points were copied; start at the beginning otherwise.

		for (index = basic > 0 ? basic + 1 : 0; index < inputLength; /* no final expression */) {

			// `index` is the index of the next character to be consumed.
			// Decode a generalized variable-length integer into `delta`,
			// which gets added to `i`. The overflow checking is easier
			// if we increase `i` as we go, then subtract off its starting
			// value at the end to obtain `delta`.
			for (oldi = i, w = 1, k = base; /* no condition */; k += base) {

				if (index >= inputLength) {
					error('invalid-input');
				}

				digit = basicToDigit(input.charCodeAt(index++));

				if (digit >= base || digit > floor((maxInt - i) / w)) {
					error('overflow');
				}

				i += digit * w;
				t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);

				if (digit < t) {
					break;
				}

				baseMinusT = base - t;
				if (w > floor(maxInt / baseMinusT)) {
					error('overflow');
				}

				w *= baseMinusT;

			}

			out = output.length + 1;
			bias = adapt(i - oldi, out, oldi == 0);

			// `i` was supposed to wrap around from `out` to `0`,
			// incrementing `n` each time, so we'll fix that now:
			if (floor(i / out) > maxInt - n) {
				error('overflow');
			}

			n += floor(i / out);
			i %= out;

			// Insert `n` at position `i` of the output
			output.splice(i++, 0, n);

		}

		return ucs2encode(output);
	}

	/**
	 * Converts a string of Unicode symbols (e.g. a domain name label) to a
	 * Punycode string of ASCII-only symbols.
	 * @memberOf punycode
	 * @param {String} input The string of Unicode symbols.
	 * @returns {String} The resulting Punycode string of ASCII-only symbols.
	 */
	function encode(input) {
		var n,
		    delta,
		    handledCPCount,
		    basicLength,
		    bias,
		    j,
		    m,
		    q,
		    k,
		    t,
		    currentValue,
		    output = [],
		    /** `inputLength` will hold the number of code points in `input`. */
		    inputLength,
		    /** Cached calculation results */
		    handledCPCountPlusOne,
		    baseMinusT,
		    qMinusT;

		// Convert the input in UCS-2 to Unicode
		input = ucs2decode(input);

		// Cache the length
		inputLength = input.length;

		// Initialize the state
		n = initialN;
		delta = 0;
		bias = initialBias;

		// Handle the basic code points
		for (j = 0; j < inputLength; ++j) {
			currentValue = input[j];
			if (currentValue < 0x80) {
				output.push(stringFromCharCode(currentValue));
			}
		}

		handledCPCount = basicLength = output.length;

		// `handledCPCount` is the number of code points that have been handled;
		// `basicLength` is the number of basic code points.

		// Finish the basic string - if it is not empty - with a delimiter
		if (basicLength) {
			output.push(delimiter);
		}

		// Main encoding loop:
		while (handledCPCount < inputLength) {

			// All non-basic code points < n have been handled already. Find the next
			// larger one:
			for (m = maxInt, j = 0; j < inputLength; ++j) {
				currentValue = input[j];
				if (currentValue >= n && currentValue < m) {
					m = currentValue;
				}
			}

			// Increase `delta` enough to advance the decoder's <n,i> state to <m,0>,
			// but guard against overflow
			handledCPCountPlusOne = handledCPCount + 1;
			if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
				error('overflow');
			}

			delta += (m - n) * handledCPCountPlusOne;
			n = m;

			for (j = 0; j < inputLength; ++j) {
				currentValue = input[j];

				if (currentValue < n && ++delta > maxInt) {
					error('overflow');
				}

				if (currentValue == n) {
					// Represent delta as a generalized variable-length integer
					for (q = delta, k = base; /* no condition */; k += base) {
						t = k <= bias ? tMin : (k >= bias + tMax ? tMax : k - bias);
						if (q < t) {
							break;
						}
						qMinusT = q - t;
						baseMinusT = base - t;
						output.push(
							stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
						);
						q = floor(qMinusT / baseMinusT);
					}

					output.push(stringFromCharCode(digitToBasic(q, 0)));
					bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
					delta = 0;
					++handledCPCount;
				}
			}

			++delta;
			++n;

		}
		return output.join('');
	}

	/**
	 * Converts a Punycode string representing a domain name or an email address
	 * to Unicode. Only the Punycoded parts of the input will be converted, i.e.
	 * it doesn't matter if you call it on a string that has already been
	 * converted to Unicode.
	 * @memberOf punycode
	 * @param {String} input The Punycoded domain name or email address to
	 * convert to Unicode.
	 * @returns {String} The Unicode representation of the given Punycode
	 * string.
	 */
	function toUnicode(input) {
		return mapDomain(input, function(string) {
			return regexPunycode.test(string)
				? decode(string.slice(4).toLowerCase())
				: string;
		});
	}

	/**
	 * Converts a Unicode string representing a domain name or an email address to
	 * Punycode. Only the non-ASCII parts of the domain name will be converted,
	 * i.e. it doesn't matter if you call it with a domain that's already in
	 * ASCII.
	 * @memberOf punycode
	 * @param {String} input The domain name or email address to convert, as a
	 * Unicode string.
	 * @returns {String} The Punycode representation of the given domain name or
	 * email address.
	 */
	function toASCII(input) {
		return mapDomain(input, function(string) {
			return regexNonASCII.test(string)
				? 'xn--' + encode(string)
				: string;
		});
	}

	/*--------------------------------------------------------------------------*/

	/** Define the public API */
	punycode = {
		/**
		 * A string representing the current Punycode.js version number.
		 * @memberOf punycode
		 * @type String
		 */
		'version': '1.4.1',
		/**
		 * An object of methods to convert from JavaScript's internal character
		 * representation (UCS-2) to Unicode code points, and back.
		 * @see <https://mathiasbynens.be/notes/javascript-encoding>
		 * @memberOf punycode
		 * @type Object
		 */
		'ucs2': {
			'decode': ucs2decode,
			'encode': ucs2encode
		},
		'decode': decode,
		'encode': encode,
		'toASCII': toASCII,
		'toUnicode': toUnicode
	};

	/** Expose `punycode` */
	// Some AMD build optimizers, like r.js, check for specific condition patterns
	// like the following:
	if (
		typeof define == 'function' &&
		typeof define.amd == 'object' &&
		define.amd
	) {
		define('punycode', function() {
			return punycode;
		});
	} else if (freeExports && freeModule) {
		if (module.exports == freeExports) {
			// in Node.js, io.js, or RingoJS v0.8.0+
			freeModule.exports = punycode;
		} else {
			// in Narwhal or RingoJS v0.7.0-
			for (key in punycode) {
				punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
			}
		}
	} else {
		// in Rhino or a web browser
		root.punycode = punycode;
	}

}(this));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],61:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

// If obj.hasOwnProperty has been overridden, then calling
// obj.hasOwnProperty(prop) will break.
// See: https://github.com/joyent/node/issues/1707
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

module.exports = function(qs, sep, eq, options) {
  sep = sep || '&';
  eq = eq || '=';
  var obj = {};

  if (typeof qs !== 'string' || qs.length === 0) {
    return obj;
  }

  var regexp = /\+/g;
  qs = qs.split(sep);

  var maxKeys = 1000;
  if (options && typeof options.maxKeys === 'number') {
    maxKeys = options.maxKeys;
  }

  var len = qs.length;
  // maxKeys <= 0 means that we should not limit keys count
  if (maxKeys > 0 && len > maxKeys) {
    len = maxKeys;
  }

  for (var i = 0; i < len; ++i) {
    var x = qs[i].replace(regexp, '%20'),
        idx = x.indexOf(eq),
        kstr, vstr, k, v;

    if (idx >= 0) {
      kstr = x.substr(0, idx);
      vstr = x.substr(idx + 1);
    } else {
      kstr = x;
      vstr = '';
    }

    k = decodeURIComponent(kstr);
    v = decodeURIComponent(vstr);

    if (!hasOwnProperty(obj, k)) {
      obj[k] = v;
    } else if (isArray(obj[k])) {
      obj[k].push(v);
    } else {
      obj[k] = [obj[k], v];
    }
  }

  return obj;
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

},{}],62:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var stringifyPrimitive = function(v) {
  switch (typeof v) {
    case 'string':
      return v;

    case 'boolean':
      return v ? 'true' : 'false';

    case 'number':
      return isFinite(v) ? v : '';

    default:
      return '';
  }
};

module.exports = function(obj, sep, eq, name) {
  sep = sep || '&';
  eq = eq || '=';
  if (obj === null) {
    obj = undefined;
  }

  if (typeof obj === 'object') {
    return map(objectKeys(obj), function(k) {
      var ks = encodeURIComponent(stringifyPrimitive(k)) + eq;
      if (isArray(obj[k])) {
        return map(obj[k], function(v) {
          return ks + encodeURIComponent(stringifyPrimitive(v));
        }).join(sep);
      } else {
        return ks + encodeURIComponent(stringifyPrimitive(obj[k]));
      }
    }).join(sep);

  }

  if (!name) return '';
  return encodeURIComponent(stringifyPrimitive(name)) + eq +
         encodeURIComponent(stringifyPrimitive(obj));
};

var isArray = Array.isArray || function (xs) {
  return Object.prototype.toString.call(xs) === '[object Array]';
};

function map (xs, f) {
  if (xs.map) return xs.map(f);
  var res = [];
  for (var i = 0; i < xs.length; i++) {
    res.push(f(xs[i], i));
  }
  return res;
}

var objectKeys = Object.keys || function (obj) {
  var res = [];
  for (var key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) res.push(key);
  }
  return res;
};

},{}],63:[function(require,module,exports){
'use strict';

exports.decode = exports.parse = require('./decode');
exports.encode = exports.stringify = require('./encode');

},{"./decode":61,"./encode":62}],64:[function(require,module,exports){
let promise

module.exports = typeof queueMicrotask === 'function'
  ? queueMicrotask
  // reuse resolved promise, and allocate it lazily
  : cb => (promise || (promise = Promise.resolve()))
    .then(cb)
    .catch(err => setTimeout(() => { throw err }, 0))

},{}],65:[function(require,module,exports){
var iterate = function (list) {
  var offset = 0
  return function () {
    if (offset === list.length) return null

    var len = list.length - offset
    var i = (Math.random() * len) | 0
    var el = list[offset + i]

    var tmp = list[offset]
    list[offset] = el
    list[offset + i] = tmp
    offset++

    return el
  }
}

module.exports = iterate

},{}],66:[function(require,module,exports){
(function (process,global){
'use strict'

// limit of Crypto.getRandomValues()
// https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues
var MAX_BYTES = 65536

// Node supports requesting up to this number of bytes
// https://github.com/nodejs/node/blob/master/lib/internal/crypto/random.js#L48
var MAX_UINT32 = 4294967295

function oldBrowser () {
  throw new Error('Secure random number generation is not supported by this browser.\nUse Chrome, Firefox or Internet Explorer 11')
}

var Buffer = require('safe-buffer').Buffer
var crypto = global.crypto || global.msCrypto

if (crypto && crypto.getRandomValues) {
  module.exports = randomBytes
} else {
  module.exports = oldBrowser
}

function randomBytes (size, cb) {
  // phantomjs needs to throw
  if (size > MAX_UINT32) throw new RangeError('requested too many random bytes')

  var bytes = Buffer.allocUnsafe(size)

  if (size > 0) {  // getRandomValues fails on IE if size == 0
    if (size > MAX_BYTES) { // this is the max bytes crypto.getRandomValues
      // can do at once see https://developer.mozilla.org/en-US/docs/Web/API/window.crypto.getRandomValues
      for (var generated = 0; generated < size; generated += MAX_BYTES) {
        // buffer.slice automatically checks if the end is past the end of
        // the buffer so we don't have to here
        crypto.getRandomValues(bytes.slice(generated, generated + MAX_BYTES))
      }
    } else {
      crypto.getRandomValues(bytes)
    }
  }

  if (typeof cb === 'function') {
    return process.nextTick(function () {
      cb(null, bytes)
    })
  }

  return bytes
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"_process":58,"safe-buffer":88}],67:[function(require,module,exports){
/*
Instance of writable stream.

call .get(length) or .discard(length) to get a stream (relative to the last end)

emits 'stalled' once everything is written

*/
const { Writable, PassThrough } = require('readable-stream')

class RangeSliceStream extends Writable {
  constructor (offset, opts = {}) {
    super(opts)

    this.destroyed = false
    this._queue = []
    this._position = offset || 0
    this._cb = null
    this._buffer = null
    this._out = null
  }

  _write (chunk, encoding, cb) {
    let drained = true

    while (true) {
      if (this.destroyed) {
        return
      }

      // Wait for more queue entries
      if (this._queue.length === 0) {
        this._buffer = chunk
        this._cb = cb
        return
      }

      this._buffer = null
      var currRange = this._queue[0]
      // Relative to the start of chunk, what data do we need?
      const writeStart = Math.max(currRange.start - this._position, 0)
      const writeEnd = currRange.end - this._position

      // Check if we need to throw it all away
      if (writeStart >= chunk.length) {
        this._position += chunk.length
        return cb(null)
      }

      // Check if we need to use it all
      let toWrite
      if (writeEnd > chunk.length) {
        this._position += chunk.length
        if (writeStart === 0) {
          toWrite = chunk
        } else {
          toWrite = chunk.slice(writeStart)
        }
        drained = currRange.stream.write(toWrite) && drained
        break
      }

      this._position += writeEnd

      toWrite = (writeStart === 0 && writeEnd === chunk.length)
        ? chunk
        : chunk.slice(writeStart, writeEnd)

      drained = currRange.stream.write(toWrite) && drained
      if (currRange.last) {
        currRange.stream.end()
      }
      chunk = chunk.slice(writeEnd)
      this._queue.shift()
    }

    if (drained) {
      cb(null)
    } else {
      currRange.stream.once('drain', cb.bind(null, null))
    }
  }

  slice (ranges) {
    if (this.destroyed) return null

    if (!Array.isArray(ranges)) ranges = [ranges]

    const str = new PassThrough()

    ranges.forEach((range, i) => {
      this._queue.push({
        start: range.start,
        end: range.end,
        stream: str,
        last: i === ranges.length - 1
      })
    })

    if (this._buffer) {
      this._write(this._buffer, null, this._cb)
    }

    return str
  }

  destroy (err) {
    if (this.destroyed) return
    this.destroyed = true

    if (err) this.emit('error', err)
  }
}

module.exports = RangeSliceStream

},{"readable-stream":82}],68:[function(require,module,exports){
'use strict';

function _inheritsLoose(subClass, superClass) { subClass.prototype = Object.create(superClass.prototype); subClass.prototype.constructor = subClass; subClass.__proto__ = superClass; }

var codes = {};

function createErrorType(code, message, Base) {
  if (!Base) {
    Base = Error;
  }

  function getMessage(arg1, arg2, arg3) {
    if (typeof message === 'string') {
      return message;
    } else {
      return message(arg1, arg2, arg3);
    }
  }

  var NodeError =
  /*#__PURE__*/
  function (_Base) {
    _inheritsLoose(NodeError, _Base);

    function NodeError(arg1, arg2, arg3) {
      return _Base.call(this, getMessage(arg1, arg2, arg3)) || this;
    }

    return NodeError;
  }(Base);

  NodeError.prototype.name = Base.name;
  NodeError.prototype.code = code;
  codes[code] = NodeError;
} // https://github.com/nodejs/node/blob/v10.8.0/lib/internal/errors.js


function oneOf(expected, thing) {
  if (Array.isArray(expected)) {
    var len = expected.length;
    expected = expected.map(function (i) {
      return String(i);
    });

    if (len > 2) {
      return "one of ".concat(thing, " ").concat(expected.slice(0, len - 1).join(', '), ", or ") + expected[len - 1];
    } else if (len === 2) {
      return "one of ".concat(thing, " ").concat(expected[0], " or ").concat(expected[1]);
    } else {
      return "of ".concat(thing, " ").concat(expected[0]);
    }
  } else {
    return "of ".concat(thing, " ").concat(String(expected));
  }
} // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/startsWith


function startsWith(str, search, pos) {
  return str.substr(!pos || pos < 0 ? 0 : +pos, search.length) === search;
} // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/endsWith


function endsWith(str, search, this_len) {
  if (this_len === undefined || this_len > str.length) {
    this_len = str.length;
  }

  return str.substring(this_len - search.length, this_len) === search;
} // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/includes


function includes(str, search, start) {
  if (typeof start !== 'number') {
    start = 0;
  }

  if (start + search.length > str.length) {
    return false;
  } else {
    return str.indexOf(search, start) !== -1;
  }
}

createErrorType('ERR_INVALID_OPT_VALUE', function (name, value) {
  return 'The value "' + value + '" is invalid for option "' + name + '"';
}, TypeError);
createErrorType('ERR_INVALID_ARG_TYPE', function (name, expected, actual) {
  // determiner: 'must be' or 'must not be'
  var determiner;

  if (typeof expected === 'string' && startsWith(expected, 'not ')) {
    determiner = 'must not be';
    expected = expected.replace(/^not /, '');
  } else {
    determiner = 'must be';
  }

  var msg;

  if (endsWith(name, ' argument')) {
    // For cases like 'first argument'
    msg = "The ".concat(name, " ").concat(determiner, " ").concat(oneOf(expected, 'type'));
  } else {
    var type = includes(name, '.') ? 'property' : 'argument';
    msg = "The \"".concat(name, "\" ").concat(type, " ").concat(determiner, " ").concat(oneOf(expected, 'type'));
  }

  msg += ". Received type ".concat(typeof actual);
  return msg;
}, TypeError);
createErrorType('ERR_STREAM_PUSH_AFTER_EOF', 'stream.push() after EOF');
createErrorType('ERR_METHOD_NOT_IMPLEMENTED', function (name) {
  return 'The ' + name + ' method is not implemented';
});
createErrorType('ERR_STREAM_PREMATURE_CLOSE', 'Premature close');
createErrorType('ERR_STREAM_DESTROYED', function (name) {
  return 'Cannot call ' + name + ' after a stream was destroyed';
});
createErrorType('ERR_MULTIPLE_CALLBACK', 'Callback called multiple times');
createErrorType('ERR_STREAM_CANNOT_PIPE', 'Cannot pipe, not readable');
createErrorType('ERR_STREAM_WRITE_AFTER_END', 'write after end');
createErrorType('ERR_STREAM_NULL_VALUES', 'May not write null values to stream', TypeError);
createErrorType('ERR_UNKNOWN_ENCODING', function (arg) {
  return 'Unknown encoding: ' + arg;
}, TypeError);
createErrorType('ERR_STREAM_UNSHIFT_AFTER_END_EVENT', 'stream.unshift() after end event');
module.exports.codes = codes;

},{}],69:[function(require,module,exports){
(function (process){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.
// a duplex stream is just a stream that is both readable and writable.
// Since JS doesn't have multiple prototypal inheritance, this class
// prototypally inherits from Readable, and then parasitically from
// Writable.
'use strict';
/*<replacement>*/

var objectKeys = Object.keys || function (obj) {
  var keys = [];

  for (var key in obj) {
    keys.push(key);
  }

  return keys;
};
/*</replacement>*/


module.exports = Duplex;

var Readable = require('./_stream_readable');

var Writable = require('./_stream_writable');

require('inherits')(Duplex, Readable);

{
  // Allow the keys array to be GC'ed.
  var keys = objectKeys(Writable.prototype);

  for (var v = 0; v < keys.length; v++) {
    var method = keys[v];
    if (!Duplex.prototype[method]) Duplex.prototype[method] = Writable.prototype[method];
  }
}

function Duplex(options) {
  if (!(this instanceof Duplex)) return new Duplex(options);
  Readable.call(this, options);
  Writable.call(this, options);
  this.allowHalfOpen = true;

  if (options) {
    if (options.readable === false) this.readable = false;
    if (options.writable === false) this.writable = false;

    if (options.allowHalfOpen === false) {
      this.allowHalfOpen = false;
      this.once('end', onend);
    }
  }
}

Object.defineProperty(Duplex.prototype, 'writableHighWaterMark', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState.highWaterMark;
  }
});
Object.defineProperty(Duplex.prototype, 'writableBuffer', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState && this._writableState.getBuffer();
  }
});
Object.defineProperty(Duplex.prototype, 'writableLength', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState.length;
  }
}); // the no-half-open enforcer

function onend() {
  // If the writable side ended, then we're ok.
  if (this._writableState.ended) return; // no more data can be written.
  // But allow more writes to happen in this tick.

  process.nextTick(onEndNT, this);
}

function onEndNT(self) {
  self.end();
}

Object.defineProperty(Duplex.prototype, 'destroyed', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    if (this._readableState === undefined || this._writableState === undefined) {
      return false;
    }

    return this._readableState.destroyed && this._writableState.destroyed;
  },
  set: function set(value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (this._readableState === undefined || this._writableState === undefined) {
      return;
    } // backward compatibility, the user is explicitly
    // managing destroyed


    this._readableState.destroyed = value;
    this._writableState.destroyed = value;
  }
});
}).call(this,require('_process'))
},{"./_stream_readable":71,"./_stream_writable":73,"_process":58,"inherits":35}],70:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.
// a passthrough stream.
// basically just the most minimal sort of Transform stream.
// Every written chunk gets output as-is.
'use strict';

module.exports = PassThrough;

var Transform = require('./_stream_transform');

require('inherits')(PassThrough, Transform);

function PassThrough(options) {
  if (!(this instanceof PassThrough)) return new PassThrough(options);
  Transform.call(this, options);
}

PassThrough.prototype._transform = function (chunk, encoding, cb) {
  cb(null, chunk);
};
},{"./_stream_transform":72,"inherits":35}],71:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.
'use strict';

module.exports = Readable;
/*<replacement>*/

var Duplex;
/*</replacement>*/

Readable.ReadableState = ReadableState;
/*<replacement>*/

var EE = require('events').EventEmitter;

var EElistenerCount = function EElistenerCount(emitter, type) {
  return emitter.listeners(type).length;
};
/*</replacement>*/

/*<replacement>*/


var Stream = require('./internal/streams/stream');
/*</replacement>*/


var Buffer = require('buffer').Buffer;

var OurUint8Array = global.Uint8Array || function () {};

function _uint8ArrayToBuffer(chunk) {
  return Buffer.from(chunk);
}

function _isUint8Array(obj) {
  return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
}
/*<replacement>*/


var debugUtil = require('util');

var debug;

if (debugUtil && debugUtil.debuglog) {
  debug = debugUtil.debuglog('stream');
} else {
  debug = function debug() {};
}
/*</replacement>*/


var BufferList = require('./internal/streams/buffer_list');

var destroyImpl = require('./internal/streams/destroy');

var _require = require('./internal/streams/state'),
    getHighWaterMark = _require.getHighWaterMark;

var _require$codes = require('../errors').codes,
    ERR_INVALID_ARG_TYPE = _require$codes.ERR_INVALID_ARG_TYPE,
    ERR_STREAM_PUSH_AFTER_EOF = _require$codes.ERR_STREAM_PUSH_AFTER_EOF,
    ERR_METHOD_NOT_IMPLEMENTED = _require$codes.ERR_METHOD_NOT_IMPLEMENTED,
    ERR_STREAM_UNSHIFT_AFTER_END_EVENT = _require$codes.ERR_STREAM_UNSHIFT_AFTER_END_EVENT; // Lazy loaded to improve the startup performance.


var StringDecoder;
var createReadableStreamAsyncIterator;
var from;

require('inherits')(Readable, Stream);

var errorOrDestroy = destroyImpl.errorOrDestroy;
var kProxyEvents = ['error', 'close', 'destroy', 'pause', 'resume'];

function prependListener(emitter, event, fn) {
  // Sadly this is not cacheable as some libraries bundle their own
  // event emitter implementation with them.
  if (typeof emitter.prependListener === 'function') return emitter.prependListener(event, fn); // This is a hack to make sure that our error handler is attached before any
  // userland ones.  NEVER DO THIS. This is here only because this code needs
  // to continue to work with older versions of Node.js that do not include
  // the prependListener() method. The goal is to eventually remove this hack.

  if (!emitter._events || !emitter._events[event]) emitter.on(event, fn);else if (Array.isArray(emitter._events[event])) emitter._events[event].unshift(fn);else emitter._events[event] = [fn, emitter._events[event]];
}

function ReadableState(options, stream, isDuplex) {
  Duplex = Duplex || require('./_stream_duplex');
  options = options || {}; // Duplex streams are both readable and writable, but share
  // the same options object.
  // However, some cases require setting options to different
  // values for the readable and the writable sides of the duplex stream.
  // These options can be provided separately as readableXXX and writableXXX.

  if (typeof isDuplex !== 'boolean') isDuplex = stream instanceof Duplex; // object stream flag. Used to make read(n) ignore n and to
  // make all the buffer merging and length checks go away

  this.objectMode = !!options.objectMode;
  if (isDuplex) this.objectMode = this.objectMode || !!options.readableObjectMode; // the point at which it stops calling _read() to fill the buffer
  // Note: 0 is a valid value, means "don't call _read preemptively ever"

  this.highWaterMark = getHighWaterMark(this, options, 'readableHighWaterMark', isDuplex); // A linked list is used to store data chunks instead of an array because the
  // linked list can remove elements from the beginning faster than
  // array.shift()

  this.buffer = new BufferList();
  this.length = 0;
  this.pipes = null;
  this.pipesCount = 0;
  this.flowing = null;
  this.ended = false;
  this.endEmitted = false;
  this.reading = false; // a flag to be able to tell if the event 'readable'/'data' is emitted
  // immediately, or on a later tick.  We set this to true at first, because
  // any actions that shouldn't happen until "later" should generally also
  // not happen before the first read call.

  this.sync = true; // whenever we return null, then we set a flag to say
  // that we're awaiting a 'readable' event emission.

  this.needReadable = false;
  this.emittedReadable = false;
  this.readableListening = false;
  this.resumeScheduled = false;
  this.paused = true; // Should close be emitted on destroy. Defaults to true.

  this.emitClose = options.emitClose !== false; // Should .destroy() be called after 'end' (and potentially 'finish')

  this.autoDestroy = !!options.autoDestroy; // has it been destroyed

  this.destroyed = false; // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.

  this.defaultEncoding = options.defaultEncoding || 'utf8'; // the number of writers that are awaiting a drain event in .pipe()s

  this.awaitDrain = 0; // if true, a maybeReadMore has been scheduled

  this.readingMore = false;
  this.decoder = null;
  this.encoding = null;

  if (options.encoding) {
    if (!StringDecoder) StringDecoder = require('string_decoder/').StringDecoder;
    this.decoder = new StringDecoder(options.encoding);
    this.encoding = options.encoding;
  }
}

function Readable(options) {
  Duplex = Duplex || require('./_stream_duplex');
  if (!(this instanceof Readable)) return new Readable(options); // Checking for a Stream.Duplex instance is faster here instead of inside
  // the ReadableState constructor, at least with V8 6.5

  var isDuplex = this instanceof Duplex;
  this._readableState = new ReadableState(options, this, isDuplex); // legacy

  this.readable = true;

  if (options) {
    if (typeof options.read === 'function') this._read = options.read;
    if (typeof options.destroy === 'function') this._destroy = options.destroy;
  }

  Stream.call(this);
}

Object.defineProperty(Readable.prototype, 'destroyed', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    if (this._readableState === undefined) {
      return false;
    }

    return this._readableState.destroyed;
  },
  set: function set(value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (!this._readableState) {
      return;
    } // backward compatibility, the user is explicitly
    // managing destroyed


    this._readableState.destroyed = value;
  }
});
Readable.prototype.destroy = destroyImpl.destroy;
Readable.prototype._undestroy = destroyImpl.undestroy;

Readable.prototype._destroy = function (err, cb) {
  cb(err);
}; // Manually shove something into the read() buffer.
// This returns true if the highWaterMark has not been hit yet,
// similar to how Writable.write() returns true if you should
// write() some more.


Readable.prototype.push = function (chunk, encoding) {
  var state = this._readableState;
  var skipChunkCheck;

  if (!state.objectMode) {
    if (typeof chunk === 'string') {
      encoding = encoding || state.defaultEncoding;

      if (encoding !== state.encoding) {
        chunk = Buffer.from(chunk, encoding);
        encoding = '';
      }

      skipChunkCheck = true;
    }
  } else {
    skipChunkCheck = true;
  }

  return readableAddChunk(this, chunk, encoding, false, skipChunkCheck);
}; // Unshift should *always* be something directly out of read()


Readable.prototype.unshift = function (chunk) {
  return readableAddChunk(this, chunk, null, true, false);
};

function readableAddChunk(stream, chunk, encoding, addToFront, skipChunkCheck) {
  debug('readableAddChunk', chunk);
  var state = stream._readableState;

  if (chunk === null) {
    state.reading = false;
    onEofChunk(stream, state);
  } else {
    var er;
    if (!skipChunkCheck) er = chunkInvalid(state, chunk);

    if (er) {
      errorOrDestroy(stream, er);
    } else if (state.objectMode || chunk && chunk.length > 0) {
      if (typeof chunk !== 'string' && !state.objectMode && Object.getPrototypeOf(chunk) !== Buffer.prototype) {
        chunk = _uint8ArrayToBuffer(chunk);
      }

      if (addToFront) {
        if (state.endEmitted) errorOrDestroy(stream, new ERR_STREAM_UNSHIFT_AFTER_END_EVENT());else addChunk(stream, state, chunk, true);
      } else if (state.ended) {
        errorOrDestroy(stream, new ERR_STREAM_PUSH_AFTER_EOF());
      } else if (state.destroyed) {
        return false;
      } else {
        state.reading = false;

        if (state.decoder && !encoding) {
          chunk = state.decoder.write(chunk);
          if (state.objectMode || chunk.length !== 0) addChunk(stream, state, chunk, false);else maybeReadMore(stream, state);
        } else {
          addChunk(stream, state, chunk, false);
        }
      }
    } else if (!addToFront) {
      state.reading = false;
      maybeReadMore(stream, state);
    }
  } // We can push more data if we are below the highWaterMark.
  // Also, if we have no data yet, we can stand some more bytes.
  // This is to work around cases where hwm=0, such as the repl.


  return !state.ended && (state.length < state.highWaterMark || state.length === 0);
}

function addChunk(stream, state, chunk, addToFront) {
  if (state.flowing && state.length === 0 && !state.sync) {
    state.awaitDrain = 0;
    stream.emit('data', chunk);
  } else {
    // update the buffer info.
    state.length += state.objectMode ? 1 : chunk.length;
    if (addToFront) state.buffer.unshift(chunk);else state.buffer.push(chunk);
    if (state.needReadable) emitReadable(stream);
  }

  maybeReadMore(stream, state);
}

function chunkInvalid(state, chunk) {
  var er;

  if (!_isUint8Array(chunk) && typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
    er = new ERR_INVALID_ARG_TYPE('chunk', ['string', 'Buffer', 'Uint8Array'], chunk);
  }

  return er;
}

Readable.prototype.isPaused = function () {
  return this._readableState.flowing === false;
}; // backwards compatibility.


Readable.prototype.setEncoding = function (enc) {
  if (!StringDecoder) StringDecoder = require('string_decoder/').StringDecoder;
  var decoder = new StringDecoder(enc);
  this._readableState.decoder = decoder; // If setEncoding(null), decoder.encoding equals utf8

  this._readableState.encoding = this._readableState.decoder.encoding; // Iterate over current buffer to convert already stored Buffers:

  var p = this._readableState.buffer.head;
  var content = '';

  while (p !== null) {
    content += decoder.write(p.data);
    p = p.next;
  }

  this._readableState.buffer.clear();

  if (content !== '') this._readableState.buffer.push(content);
  this._readableState.length = content.length;
  return this;
}; // Don't raise the hwm > 1GB


var MAX_HWM = 0x40000000;

function computeNewHighWaterMark(n) {
  if (n >= MAX_HWM) {
    // TODO(ronag): Throw ERR_VALUE_OUT_OF_RANGE.
    n = MAX_HWM;
  } else {
    // Get the next highest power of 2 to prevent increasing hwm excessively in
    // tiny amounts
    n--;
    n |= n >>> 1;
    n |= n >>> 2;
    n |= n >>> 4;
    n |= n >>> 8;
    n |= n >>> 16;
    n++;
  }

  return n;
} // This function is designed to be inlinable, so please take care when making
// changes to the function body.


function howMuchToRead(n, state) {
  if (n <= 0 || state.length === 0 && state.ended) return 0;
  if (state.objectMode) return 1;

  if (n !== n) {
    // Only flow one buffer at a time
    if (state.flowing && state.length) return state.buffer.head.data.length;else return state.length;
  } // If we're asking for more than the current hwm, then raise the hwm.


  if (n > state.highWaterMark) state.highWaterMark = computeNewHighWaterMark(n);
  if (n <= state.length) return n; // Don't have enough

  if (!state.ended) {
    state.needReadable = true;
    return 0;
  }

  return state.length;
} // you can override either this method, or the async _read(n) below.


Readable.prototype.read = function (n) {
  debug('read', n);
  n = parseInt(n, 10);
  var state = this._readableState;
  var nOrig = n;
  if (n !== 0) state.emittedReadable = false; // if we're doing read(0) to trigger a readable event, but we
  // already have a bunch of data in the buffer, then just trigger
  // the 'readable' event and move on.

  if (n === 0 && state.needReadable && ((state.highWaterMark !== 0 ? state.length >= state.highWaterMark : state.length > 0) || state.ended)) {
    debug('read: emitReadable', state.length, state.ended);
    if (state.length === 0 && state.ended) endReadable(this);else emitReadable(this);
    return null;
  }

  n = howMuchToRead(n, state); // if we've ended, and we're now clear, then finish it up.

  if (n === 0 && state.ended) {
    if (state.length === 0) endReadable(this);
    return null;
  } // All the actual chunk generation logic needs to be
  // *below* the call to _read.  The reason is that in certain
  // synthetic stream cases, such as passthrough streams, _read
  // may be a completely synchronous operation which may change
  // the state of the read buffer, providing enough data when
  // before there was *not* enough.
  //
  // So, the steps are:
  // 1. Figure out what the state of things will be after we do
  // a read from the buffer.
  //
  // 2. If that resulting state will trigger a _read, then call _read.
  // Note that this may be asynchronous, or synchronous.  Yes, it is
  // deeply ugly to write APIs this way, but that still doesn't mean
  // that the Readable class should behave improperly, as streams are
  // designed to be sync/async agnostic.
  // Take note if the _read call is sync or async (ie, if the read call
  // has returned yet), so that we know whether or not it's safe to emit
  // 'readable' etc.
  //
  // 3. Actually pull the requested chunks out of the buffer and return.
  // if we need a readable event, then we need to do some reading.


  var doRead = state.needReadable;
  debug('need readable', doRead); // if we currently have less than the highWaterMark, then also read some

  if (state.length === 0 || state.length - n < state.highWaterMark) {
    doRead = true;
    debug('length less than watermark', doRead);
  } // however, if we've ended, then there's no point, and if we're already
  // reading, then it's unnecessary.


  if (state.ended || state.reading) {
    doRead = false;
    debug('reading or ended', doRead);
  } else if (doRead) {
    debug('do read');
    state.reading = true;
    state.sync = true; // if the length is currently zero, then we *need* a readable event.

    if (state.length === 0) state.needReadable = true; // call internal read method

    this._read(state.highWaterMark);

    state.sync = false; // If _read pushed data synchronously, then `reading` will be false,
    // and we need to re-evaluate how much data we can return to the user.

    if (!state.reading) n = howMuchToRead(nOrig, state);
  }

  var ret;
  if (n > 0) ret = fromList(n, state);else ret = null;

  if (ret === null) {
    state.needReadable = state.length <= state.highWaterMark;
    n = 0;
  } else {
    state.length -= n;
    state.awaitDrain = 0;
  }

  if (state.length === 0) {
    // If we have nothing in the buffer, then we want to know
    // as soon as we *do* get something into the buffer.
    if (!state.ended) state.needReadable = true; // If we tried to read() past the EOF, then emit end on the next tick.

    if (nOrig !== n && state.ended) endReadable(this);
  }

  if (ret !== null) this.emit('data', ret);
  return ret;
};

function onEofChunk(stream, state) {
  debug('onEofChunk');
  if (state.ended) return;

  if (state.decoder) {
    var chunk = state.decoder.end();

    if (chunk && chunk.length) {
      state.buffer.push(chunk);
      state.length += state.objectMode ? 1 : chunk.length;
    }
  }

  state.ended = true;

  if (state.sync) {
    // if we are sync, wait until next tick to emit the data.
    // Otherwise we risk emitting data in the flow()
    // the readable code triggers during a read() call
    emitReadable(stream);
  } else {
    // emit 'readable' now to make sure it gets picked up.
    state.needReadable = false;

    if (!state.emittedReadable) {
      state.emittedReadable = true;
      emitReadable_(stream);
    }
  }
} // Don't emit readable right away in sync mode, because this can trigger
// another read() call => stack overflow.  This way, it might trigger
// a nextTick recursion warning, but that's not so bad.


function emitReadable(stream) {
  var state = stream._readableState;
  debug('emitReadable', state.needReadable, state.emittedReadable);
  state.needReadable = false;

  if (!state.emittedReadable) {
    debug('emitReadable', state.flowing);
    state.emittedReadable = true;
    process.nextTick(emitReadable_, stream);
  }
}

function emitReadable_(stream) {
  var state = stream._readableState;
  debug('emitReadable_', state.destroyed, state.length, state.ended);

  if (!state.destroyed && (state.length || state.ended)) {
    stream.emit('readable');
    state.emittedReadable = false;
  } // The stream needs another readable event if
  // 1. It is not flowing, as the flow mechanism will take
  //    care of it.
  // 2. It is not ended.
  // 3. It is below the highWaterMark, so we can schedule
  //    another readable later.


  state.needReadable = !state.flowing && !state.ended && state.length <= state.highWaterMark;
  flow(stream);
} // at this point, the user has presumably seen the 'readable' event,
// and called read() to consume some data.  that may have triggered
// in turn another _read(n) call, in which case reading = true if
// it's in progress.
// However, if we're not ended, or reading, and the length < hwm,
// then go ahead and try to read some more preemptively.


function maybeReadMore(stream, state) {
  if (!state.readingMore) {
    state.readingMore = true;
    process.nextTick(maybeReadMore_, stream, state);
  }
}

function maybeReadMore_(stream, state) {
  // Attempt to read more data if we should.
  //
  // The conditions for reading more data are (one of):
  // - Not enough data buffered (state.length < state.highWaterMark). The loop
  //   is responsible for filling the buffer with enough data if such data
  //   is available. If highWaterMark is 0 and we are not in the flowing mode
  //   we should _not_ attempt to buffer any extra data. We'll get more data
  //   when the stream consumer calls read() instead.
  // - No data in the buffer, and the stream is in flowing mode. In this mode
  //   the loop below is responsible for ensuring read() is called. Failing to
  //   call read here would abort the flow and there's no other mechanism for
  //   continuing the flow if the stream consumer has just subscribed to the
  //   'data' event.
  //
  // In addition to the above conditions to keep reading data, the following
  // conditions prevent the data from being read:
  // - The stream has ended (state.ended).
  // - There is already a pending 'read' operation (state.reading). This is a
  //   case where the the stream has called the implementation defined _read()
  //   method, but they are processing the call asynchronously and have _not_
  //   called push() with new data. In this case we skip performing more
  //   read()s. The execution ends in this method again after the _read() ends
  //   up calling push() with more data.
  while (!state.reading && !state.ended && (state.length < state.highWaterMark || state.flowing && state.length === 0)) {
    var len = state.length;
    debug('maybeReadMore read 0');
    stream.read(0);
    if (len === state.length) // didn't get any data, stop spinning.
      break;
  }

  state.readingMore = false;
} // abstract method.  to be overridden in specific implementation classes.
// call cb(er, data) where data is <= n in length.
// for virtual (non-string, non-buffer) streams, "length" is somewhat
// arbitrary, and perhaps not very meaningful.


Readable.prototype._read = function (n) {
  errorOrDestroy(this, new ERR_METHOD_NOT_IMPLEMENTED('_read()'));
};

Readable.prototype.pipe = function (dest, pipeOpts) {
  var src = this;
  var state = this._readableState;

  switch (state.pipesCount) {
    case 0:
      state.pipes = dest;
      break;

    case 1:
      state.pipes = [state.pipes, dest];
      break;

    default:
      state.pipes.push(dest);
      break;
  }

  state.pipesCount += 1;
  debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);
  var doEnd = (!pipeOpts || pipeOpts.end !== false) && dest !== process.stdout && dest !== process.stderr;
  var endFn = doEnd ? onend : unpipe;
  if (state.endEmitted) process.nextTick(endFn);else src.once('end', endFn);
  dest.on('unpipe', onunpipe);

  function onunpipe(readable, unpipeInfo) {
    debug('onunpipe');

    if (readable === src) {
      if (unpipeInfo && unpipeInfo.hasUnpiped === false) {
        unpipeInfo.hasUnpiped = true;
        cleanup();
      }
    }
  }

  function onend() {
    debug('onend');
    dest.end();
  } // when the dest drains, it reduces the awaitDrain counter
  // on the source.  This would be more elegant with a .once()
  // handler in flow(), but adding and removing repeatedly is
  // too slow.


  var ondrain = pipeOnDrain(src);
  dest.on('drain', ondrain);
  var cleanedUp = false;

  function cleanup() {
    debug('cleanup'); // cleanup event handlers once the pipe is broken

    dest.removeListener('close', onclose);
    dest.removeListener('finish', onfinish);
    dest.removeListener('drain', ondrain);
    dest.removeListener('error', onerror);
    dest.removeListener('unpipe', onunpipe);
    src.removeListener('end', onend);
    src.removeListener('end', unpipe);
    src.removeListener('data', ondata);
    cleanedUp = true; // if the reader is waiting for a drain event from this
    // specific writer, then it would cause it to never start
    // flowing again.
    // So, if this is awaiting a drain, then we just call it now.
    // If we don't know, then assume that we are waiting for one.

    if (state.awaitDrain && (!dest._writableState || dest._writableState.needDrain)) ondrain();
  }

  src.on('data', ondata);

  function ondata(chunk) {
    debug('ondata');
    var ret = dest.write(chunk);
    debug('dest.write', ret);

    if (ret === false) {
      // If the user unpiped during `dest.write()`, it is possible
      // to get stuck in a permanently paused state if that write
      // also returned false.
      // => Check whether `dest` is still a piping destination.
      if ((state.pipesCount === 1 && state.pipes === dest || state.pipesCount > 1 && indexOf(state.pipes, dest) !== -1) && !cleanedUp) {
        debug('false write response, pause', state.awaitDrain);
        state.awaitDrain++;
      }

      src.pause();
    }
  } // if the dest has an error, then stop piping into it.
  // however, don't suppress the throwing behavior for this.


  function onerror(er) {
    debug('onerror', er);
    unpipe();
    dest.removeListener('error', onerror);
    if (EElistenerCount(dest, 'error') === 0) errorOrDestroy(dest, er);
  } // Make sure our error handler is attached before userland ones.


  prependListener(dest, 'error', onerror); // Both close and finish should trigger unpipe, but only once.

  function onclose() {
    dest.removeListener('finish', onfinish);
    unpipe();
  }

  dest.once('close', onclose);

  function onfinish() {
    debug('onfinish');
    dest.removeListener('close', onclose);
    unpipe();
  }

  dest.once('finish', onfinish);

  function unpipe() {
    debug('unpipe');
    src.unpipe(dest);
  } // tell the dest that it's being piped to


  dest.emit('pipe', src); // start the flow if it hasn't been started already.

  if (!state.flowing) {
    debug('pipe resume');
    src.resume();
  }

  return dest;
};

function pipeOnDrain(src) {
  return function pipeOnDrainFunctionResult() {
    var state = src._readableState;
    debug('pipeOnDrain', state.awaitDrain);
    if (state.awaitDrain) state.awaitDrain--;

    if (state.awaitDrain === 0 && EElistenerCount(src, 'data')) {
      state.flowing = true;
      flow(src);
    }
  };
}

Readable.prototype.unpipe = function (dest) {
  var state = this._readableState;
  var unpipeInfo = {
    hasUnpiped: false
  }; // if we're not piping anywhere, then do nothing.

  if (state.pipesCount === 0) return this; // just one destination.  most common case.

  if (state.pipesCount === 1) {
    // passed in one, but it's not the right one.
    if (dest && dest !== state.pipes) return this;
    if (!dest) dest = state.pipes; // got a match.

    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;
    if (dest) dest.emit('unpipe', this, unpipeInfo);
    return this;
  } // slow case. multiple pipe destinations.


  if (!dest) {
    // remove all.
    var dests = state.pipes;
    var len = state.pipesCount;
    state.pipes = null;
    state.pipesCount = 0;
    state.flowing = false;

    for (var i = 0; i < len; i++) {
      dests[i].emit('unpipe', this, {
        hasUnpiped: false
      });
    }

    return this;
  } // try to find the right one.


  var index = indexOf(state.pipes, dest);
  if (index === -1) return this;
  state.pipes.splice(index, 1);
  state.pipesCount -= 1;
  if (state.pipesCount === 1) state.pipes = state.pipes[0];
  dest.emit('unpipe', this, unpipeInfo);
  return this;
}; // set up data events if they are asked for
// Ensure readable listeners eventually get something


Readable.prototype.on = function (ev, fn) {
  var res = Stream.prototype.on.call(this, ev, fn);
  var state = this._readableState;

  if (ev === 'data') {
    // update readableListening so that resume() may be a no-op
    // a few lines down. This is needed to support once('readable').
    state.readableListening = this.listenerCount('readable') > 0; // Try start flowing on next tick if stream isn't explicitly paused

    if (state.flowing !== false) this.resume();
  } else if (ev === 'readable') {
    if (!state.endEmitted && !state.readableListening) {
      state.readableListening = state.needReadable = true;
      state.flowing = false;
      state.emittedReadable = false;
      debug('on readable', state.length, state.reading);

      if (state.length) {
        emitReadable(this);
      } else if (!state.reading) {
        process.nextTick(nReadingNextTick, this);
      }
    }
  }

  return res;
};

Readable.prototype.addListener = Readable.prototype.on;

Readable.prototype.removeListener = function (ev, fn) {
  var res = Stream.prototype.removeListener.call(this, ev, fn);

  if (ev === 'readable') {
    // We need to check if there is someone still listening to
    // readable and reset the state. However this needs to happen
    // after readable has been emitted but before I/O (nextTick) to
    // support once('readable', fn) cycles. This means that calling
    // resume within the same tick will have no
    // effect.
    process.nextTick(updateReadableListening, this);
  }

  return res;
};

Readable.prototype.removeAllListeners = function (ev) {
  var res = Stream.prototype.removeAllListeners.apply(this, arguments);

  if (ev === 'readable' || ev === undefined) {
    // We need to check if there is someone still listening to
    // readable and reset the state. However this needs to happen
    // after readable has been emitted but before I/O (nextTick) to
    // support once('readable', fn) cycles. This means that calling
    // resume within the same tick will have no
    // effect.
    process.nextTick(updateReadableListening, this);
  }

  return res;
};

function updateReadableListening(self) {
  var state = self._readableState;
  state.readableListening = self.listenerCount('readable') > 0;

  if (state.resumeScheduled && !state.paused) {
    // flowing needs to be set to true now, otherwise
    // the upcoming resume will not flow.
    state.flowing = true; // crude way to check if we should resume
  } else if (self.listenerCount('data') > 0) {
    self.resume();
  }
}

function nReadingNextTick(self) {
  debug('readable nexttick read 0');
  self.read(0);
} // pause() and resume() are remnants of the legacy readable stream API
// If the user uses them, then switch into old mode.


Readable.prototype.resume = function () {
  var state = this._readableState;

  if (!state.flowing) {
    debug('resume'); // we flow only if there is no one listening
    // for readable, but we still have to call
    // resume()

    state.flowing = !state.readableListening;
    resume(this, state);
  }

  state.paused = false;
  return this;
};

function resume(stream, state) {
  if (!state.resumeScheduled) {
    state.resumeScheduled = true;
    process.nextTick(resume_, stream, state);
  }
}

function resume_(stream, state) {
  debug('resume', state.reading);

  if (!state.reading) {
    stream.read(0);
  }

  state.resumeScheduled = false;
  stream.emit('resume');
  flow(stream);
  if (state.flowing && !state.reading) stream.read(0);
}

Readable.prototype.pause = function () {
  debug('call pause flowing=%j', this._readableState.flowing);

  if (this._readableState.flowing !== false) {
    debug('pause');
    this._readableState.flowing = false;
    this.emit('pause');
  }

  this._readableState.paused = true;
  return this;
};

function flow(stream) {
  var state = stream._readableState;
  debug('flow', state.flowing);

  while (state.flowing && stream.read() !== null) {
    ;
  }
} // wrap an old-style stream as the async data source.
// This is *not* part of the readable stream interface.
// It is an ugly unfortunate mess of history.


Readable.prototype.wrap = function (stream) {
  var _this = this;

  var state = this._readableState;
  var paused = false;
  stream.on('end', function () {
    debug('wrapped end');

    if (state.decoder && !state.ended) {
      var chunk = state.decoder.end();
      if (chunk && chunk.length) _this.push(chunk);
    }

    _this.push(null);
  });
  stream.on('data', function (chunk) {
    debug('wrapped data');
    if (state.decoder) chunk = state.decoder.write(chunk); // don't skip over falsy values in objectMode

    if (state.objectMode && (chunk === null || chunk === undefined)) return;else if (!state.objectMode && (!chunk || !chunk.length)) return;

    var ret = _this.push(chunk);

    if (!ret) {
      paused = true;
      stream.pause();
    }
  }); // proxy all the other methods.
  // important when wrapping filters and duplexes.

  for (var i in stream) {
    if (this[i] === undefined && typeof stream[i] === 'function') {
      this[i] = function methodWrap(method) {
        return function methodWrapReturnFunction() {
          return stream[method].apply(stream, arguments);
        };
      }(i);
    }
  } // proxy certain important events.


  for (var n = 0; n < kProxyEvents.length; n++) {
    stream.on(kProxyEvents[n], this.emit.bind(this, kProxyEvents[n]));
  } // when we try to consume some more bytes, simply unpause the
  // underlying stream.


  this._read = function (n) {
    debug('wrapped _read', n);

    if (paused) {
      paused = false;
      stream.resume();
    }
  };

  return this;
};

if (typeof Symbol === 'function') {
  Readable.prototype[Symbol.asyncIterator] = function () {
    if (createReadableStreamAsyncIterator === undefined) {
      createReadableStreamAsyncIterator = require('./internal/streams/async_iterator');
    }

    return createReadableStreamAsyncIterator(this);
  };
}

Object.defineProperty(Readable.prototype, 'readableHighWaterMark', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._readableState.highWaterMark;
  }
});
Object.defineProperty(Readable.prototype, 'readableBuffer', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._readableState && this._readableState.buffer;
  }
});
Object.defineProperty(Readable.prototype, 'readableFlowing', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._readableState.flowing;
  },
  set: function set(state) {
    if (this._readableState) {
      this._readableState.flowing = state;
    }
  }
}); // exposed for testing purposes only.

Readable._fromList = fromList;
Object.defineProperty(Readable.prototype, 'readableLength', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._readableState.length;
  }
}); // Pluck off n bytes from an array of buffers.
// Length is the combined lengths of all the buffers in the list.
// This function is designed to be inlinable, so please take care when making
// changes to the function body.

function fromList(n, state) {
  // nothing buffered
  if (state.length === 0) return null;
  var ret;
  if (state.objectMode) ret = state.buffer.shift();else if (!n || n >= state.length) {
    // read it all, truncate the list
    if (state.decoder) ret = state.buffer.join('');else if (state.buffer.length === 1) ret = state.buffer.first();else ret = state.buffer.concat(state.length);
    state.buffer.clear();
  } else {
    // read part of list
    ret = state.buffer.consume(n, state.decoder);
  }
  return ret;
}

function endReadable(stream) {
  var state = stream._readableState;
  debug('endReadable', state.endEmitted);

  if (!state.endEmitted) {
    state.ended = true;
    process.nextTick(endReadableNT, state, stream);
  }
}

function endReadableNT(state, stream) {
  debug('endReadableNT', state.endEmitted, state.length); // Check that we didn't get one last unshift.

  if (!state.endEmitted && state.length === 0) {
    state.endEmitted = true;
    stream.readable = false;
    stream.emit('end');

    if (state.autoDestroy) {
      // In case of duplex streams we need a way to detect
      // if the writable side is ready for autoDestroy as well
      var wState = stream._writableState;

      if (!wState || wState.autoDestroy && wState.finished) {
        stream.destroy();
      }
    }
  }
}

if (typeof Symbol === 'function') {
  Readable.from = function (iterable, opts) {
    if (from === undefined) {
      from = require('./internal/streams/from');
    }

    return from(Readable, iterable, opts);
  };
}

function indexOf(xs, x) {
  for (var i = 0, l = xs.length; i < l; i++) {
    if (xs[i] === x) return i;
  }

  return -1;
}
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../errors":68,"./_stream_duplex":69,"./internal/streams/async_iterator":74,"./internal/streams/buffer_list":75,"./internal/streams/destroy":76,"./internal/streams/from":78,"./internal/streams/state":80,"./internal/streams/stream":81,"_process":58,"buffer":22,"events":29,"inherits":35,"string_decoder/":103,"util":17}],72:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.
// a transform stream is a readable/writable stream where you do
// something with the data.  Sometimes it's called a "filter",
// but that's not a great name for it, since that implies a thing where
// some bits pass through, and others are simply ignored.  (That would
// be a valid example of a transform, of course.)
//
// While the output is causally related to the input, it's not a
// necessarily symmetric or synchronous transformation.  For example,
// a zlib stream might take multiple plain-text writes(), and then
// emit a single compressed chunk some time in the future.
//
// Here's how this works:
//
// The Transform stream has all the aspects of the readable and writable
// stream classes.  When you write(chunk), that calls _write(chunk,cb)
// internally, and returns false if there's a lot of pending writes
// buffered up.  When you call read(), that calls _read(n) until
// there's enough pending readable data buffered up.
//
// In a transform stream, the written data is placed in a buffer.  When
// _read(n) is called, it transforms the queued up data, calling the
// buffered _write cb's as it consumes chunks.  If consuming a single
// written chunk would result in multiple output chunks, then the first
// outputted bit calls the readcb, and subsequent chunks just go into
// the read buffer, and will cause it to emit 'readable' if necessary.
//
// This way, back-pressure is actually determined by the reading side,
// since _read has to be called to start processing a new chunk.  However,
// a pathological inflate type of transform can cause excessive buffering
// here.  For example, imagine a stream where every byte of input is
// interpreted as an integer from 0-255, and then results in that many
// bytes of output.  Writing the 4 bytes {ff,ff,ff,ff} would result in
// 1kb of data being output.  In this case, you could write a very small
// amount of input, and end up with a very large amount of output.  In
// such a pathological inflating mechanism, there'd be no way to tell
// the system to stop doing the transform.  A single 4MB write could
// cause the system to run out of memory.
//
// However, even in such a pathological case, only a single written chunk
// would be consumed, and then the rest would wait (un-transformed) until
// the results of the previous transformed chunk were consumed.
'use strict';

module.exports = Transform;

var _require$codes = require('../errors').codes,
    ERR_METHOD_NOT_IMPLEMENTED = _require$codes.ERR_METHOD_NOT_IMPLEMENTED,
    ERR_MULTIPLE_CALLBACK = _require$codes.ERR_MULTIPLE_CALLBACK,
    ERR_TRANSFORM_ALREADY_TRANSFORMING = _require$codes.ERR_TRANSFORM_ALREADY_TRANSFORMING,
    ERR_TRANSFORM_WITH_LENGTH_0 = _require$codes.ERR_TRANSFORM_WITH_LENGTH_0;

var Duplex = require('./_stream_duplex');

require('inherits')(Transform, Duplex);

function afterTransform(er, data) {
  var ts = this._transformState;
  ts.transforming = false;
  var cb = ts.writecb;

  if (cb === null) {
    return this.emit('error', new ERR_MULTIPLE_CALLBACK());
  }

  ts.writechunk = null;
  ts.writecb = null;
  if (data != null) // single equals check for both `null` and `undefined`
    this.push(data);
  cb(er);
  var rs = this._readableState;
  rs.reading = false;

  if (rs.needReadable || rs.length < rs.highWaterMark) {
    this._read(rs.highWaterMark);
  }
}

function Transform(options) {
  if (!(this instanceof Transform)) return new Transform(options);
  Duplex.call(this, options);
  this._transformState = {
    afterTransform: afterTransform.bind(this),
    needTransform: false,
    transforming: false,
    writecb: null,
    writechunk: null,
    writeencoding: null
  }; // start out asking for a readable event once data is transformed.

  this._readableState.needReadable = true; // we have implemented the _read method, and done the other things
  // that Readable wants before the first _read call, so unset the
  // sync guard flag.

  this._readableState.sync = false;

  if (options) {
    if (typeof options.transform === 'function') this._transform = options.transform;
    if (typeof options.flush === 'function') this._flush = options.flush;
  } // When the writable side finishes, then flush out anything remaining.


  this.on('prefinish', prefinish);
}

function prefinish() {
  var _this = this;

  if (typeof this._flush === 'function' && !this._readableState.destroyed) {
    this._flush(function (er, data) {
      done(_this, er, data);
    });
  } else {
    done(this, null, null);
  }
}

Transform.prototype.push = function (chunk, encoding) {
  this._transformState.needTransform = false;
  return Duplex.prototype.push.call(this, chunk, encoding);
}; // This is the part where you do stuff!
// override this function in implementation classes.
// 'chunk' is an input chunk.
//
// Call `push(newChunk)` to pass along transformed output
// to the readable side.  You may call 'push' zero or more times.
//
// Call `cb(err)` when you are done with this chunk.  If you pass
// an error, then that'll put the hurt on the whole operation.  If you
// never call cb(), then you'll never get another chunk.


Transform.prototype._transform = function (chunk, encoding, cb) {
  cb(new ERR_METHOD_NOT_IMPLEMENTED('_transform()'));
};

Transform.prototype._write = function (chunk, encoding, cb) {
  var ts = this._transformState;
  ts.writecb = cb;
  ts.writechunk = chunk;
  ts.writeencoding = encoding;

  if (!ts.transforming) {
    var rs = this._readableState;
    if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark) this._read(rs.highWaterMark);
  }
}; // Doesn't matter what the args are here.
// _transform does all the work.
// That we got here means that the readable side wants more data.


Transform.prototype._read = function (n) {
  var ts = this._transformState;

  if (ts.writechunk !== null && !ts.transforming) {
    ts.transforming = true;

    this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
  } else {
    // mark that we need a transform, so that any data that comes in
    // will get processed, now that we've asked for it.
    ts.needTransform = true;
  }
};

Transform.prototype._destroy = function (err, cb) {
  Duplex.prototype._destroy.call(this, err, function (err2) {
    cb(err2);
  });
};

function done(stream, er, data) {
  if (er) return stream.emit('error', er);
  if (data != null) // single equals check for both `null` and `undefined`
    stream.push(data); // TODO(BridgeAR): Write a test for these two error cases
  // if there's nothing in the write buffer, then that means
  // that nothing more will ever be provided

  if (stream._writableState.length) throw new ERR_TRANSFORM_WITH_LENGTH_0();
  if (stream._transformState.transforming) throw new ERR_TRANSFORM_ALREADY_TRANSFORMING();
  return stream.push(null);
}
},{"../errors":68,"./_stream_duplex":69,"inherits":35}],73:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.
// A bit simpler than readable streams.
// Implement an async ._write(chunk, encoding, cb), and it'll handle all
// the drain event emission and buffering.
'use strict';

module.exports = Writable;
/* <replacement> */

function WriteReq(chunk, encoding, cb) {
  this.chunk = chunk;
  this.encoding = encoding;
  this.callback = cb;
  this.next = null;
} // It seems a linked list but it is not
// there will be only 2 of these for each stream


function CorkedRequest(state) {
  var _this = this;

  this.next = null;
  this.entry = null;

  this.finish = function () {
    onCorkedFinish(_this, state);
  };
}
/* </replacement> */

/*<replacement>*/


var Duplex;
/*</replacement>*/

Writable.WritableState = WritableState;
/*<replacement>*/

var internalUtil = {
  deprecate: require('util-deprecate')
};
/*</replacement>*/

/*<replacement>*/

var Stream = require('./internal/streams/stream');
/*</replacement>*/


var Buffer = require('buffer').Buffer;

var OurUint8Array = global.Uint8Array || function () {};

function _uint8ArrayToBuffer(chunk) {
  return Buffer.from(chunk);
}

function _isUint8Array(obj) {
  return Buffer.isBuffer(obj) || obj instanceof OurUint8Array;
}

var destroyImpl = require('./internal/streams/destroy');

var _require = require('./internal/streams/state'),
    getHighWaterMark = _require.getHighWaterMark;

var _require$codes = require('../errors').codes,
    ERR_INVALID_ARG_TYPE = _require$codes.ERR_INVALID_ARG_TYPE,
    ERR_METHOD_NOT_IMPLEMENTED = _require$codes.ERR_METHOD_NOT_IMPLEMENTED,
    ERR_MULTIPLE_CALLBACK = _require$codes.ERR_MULTIPLE_CALLBACK,
    ERR_STREAM_CANNOT_PIPE = _require$codes.ERR_STREAM_CANNOT_PIPE,
    ERR_STREAM_DESTROYED = _require$codes.ERR_STREAM_DESTROYED,
    ERR_STREAM_NULL_VALUES = _require$codes.ERR_STREAM_NULL_VALUES,
    ERR_STREAM_WRITE_AFTER_END = _require$codes.ERR_STREAM_WRITE_AFTER_END,
    ERR_UNKNOWN_ENCODING = _require$codes.ERR_UNKNOWN_ENCODING;

var errorOrDestroy = destroyImpl.errorOrDestroy;

require('inherits')(Writable, Stream);

function nop() {}

function WritableState(options, stream, isDuplex) {
  Duplex = Duplex || require('./_stream_duplex');
  options = options || {}; // Duplex streams are both readable and writable, but share
  // the same options object.
  // However, some cases require setting options to different
  // values for the readable and the writable sides of the duplex stream,
  // e.g. options.readableObjectMode vs. options.writableObjectMode, etc.

  if (typeof isDuplex !== 'boolean') isDuplex = stream instanceof Duplex; // object stream flag to indicate whether or not this stream
  // contains buffers or objects.

  this.objectMode = !!options.objectMode;
  if (isDuplex) this.objectMode = this.objectMode || !!options.writableObjectMode; // the point at which write() starts returning false
  // Note: 0 is a valid value, means that we always return false if
  // the entire buffer is not flushed immediately on write()

  this.highWaterMark = getHighWaterMark(this, options, 'writableHighWaterMark', isDuplex); // if _final has been called

  this.finalCalled = false; // drain event flag.

  this.needDrain = false; // at the start of calling end()

  this.ending = false; // when end() has been called, and returned

  this.ended = false; // when 'finish' is emitted

  this.finished = false; // has it been destroyed

  this.destroyed = false; // should we decode strings into buffers before passing to _write?
  // this is here so that some node-core streams can optimize string
  // handling at a lower level.

  var noDecode = options.decodeStrings === false;
  this.decodeStrings = !noDecode; // Crypto is kind of old and crusty.  Historically, its default string
  // encoding is 'binary' so we have to make this configurable.
  // Everything else in the universe uses 'utf8', though.

  this.defaultEncoding = options.defaultEncoding || 'utf8'; // not an actual buffer we keep track of, but a measurement
  // of how much we're waiting to get pushed to some underlying
  // socket or file.

  this.length = 0; // a flag to see when we're in the middle of a write.

  this.writing = false; // when true all writes will be buffered until .uncork() call

  this.corked = 0; // a flag to be able to tell if the onwrite cb is called immediately,
  // or on a later tick.  We set this to true at first, because any
  // actions that shouldn't happen until "later" should generally also
  // not happen before the first write call.

  this.sync = true; // a flag to know if we're processing previously buffered items, which
  // may call the _write() callback in the same tick, so that we don't
  // end up in an overlapped onwrite situation.

  this.bufferProcessing = false; // the callback that's passed to _write(chunk,cb)

  this.onwrite = function (er) {
    onwrite(stream, er);
  }; // the callback that the user supplies to write(chunk,encoding,cb)


  this.writecb = null; // the amount that is being written when _write is called.

  this.writelen = 0;
  this.bufferedRequest = null;
  this.lastBufferedRequest = null; // number of pending user-supplied write callbacks
  // this must be 0 before 'finish' can be emitted

  this.pendingcb = 0; // emit prefinish if the only thing we're waiting for is _write cbs
  // This is relevant for synchronous Transform streams

  this.prefinished = false; // True if the error was already emitted and should not be thrown again

  this.errorEmitted = false; // Should close be emitted on destroy. Defaults to true.

  this.emitClose = options.emitClose !== false; // Should .destroy() be called after 'finish' (and potentially 'end')

  this.autoDestroy = !!options.autoDestroy; // count buffered requests

  this.bufferedRequestCount = 0; // allocate the first CorkedRequest, there is always
  // one allocated and free to use, and we maintain at most two

  this.corkedRequestsFree = new CorkedRequest(this);
}

WritableState.prototype.getBuffer = function getBuffer() {
  var current = this.bufferedRequest;
  var out = [];

  while (current) {
    out.push(current);
    current = current.next;
  }

  return out;
};

(function () {
  try {
    Object.defineProperty(WritableState.prototype, 'buffer', {
      get: internalUtil.deprecate(function writableStateBufferGetter() {
        return this.getBuffer();
      }, '_writableState.buffer is deprecated. Use _writableState.getBuffer ' + 'instead.', 'DEP0003')
    });
  } catch (_) {}
})(); // Test _writableState for inheritance to account for Duplex streams,
// whose prototype chain only points to Readable.


var realHasInstance;

if (typeof Symbol === 'function' && Symbol.hasInstance && typeof Function.prototype[Symbol.hasInstance] === 'function') {
  realHasInstance = Function.prototype[Symbol.hasInstance];
  Object.defineProperty(Writable, Symbol.hasInstance, {
    value: function value(object) {
      if (realHasInstance.call(this, object)) return true;
      if (this !== Writable) return false;
      return object && object._writableState instanceof WritableState;
    }
  });
} else {
  realHasInstance = function realHasInstance(object) {
    return object instanceof this;
  };
}

function Writable(options) {
  Duplex = Duplex || require('./_stream_duplex'); // Writable ctor is applied to Duplexes, too.
  // `realHasInstance` is necessary because using plain `instanceof`
  // would return false, as no `_writableState` property is attached.
  // Trying to use the custom `instanceof` for Writable here will also break the
  // Node.js LazyTransform implementation, which has a non-trivial getter for
  // `_writableState` that would lead to infinite recursion.
  // Checking for a Stream.Duplex instance is faster here instead of inside
  // the WritableState constructor, at least with V8 6.5

  var isDuplex = this instanceof Duplex;
  if (!isDuplex && !realHasInstance.call(Writable, this)) return new Writable(options);
  this._writableState = new WritableState(options, this, isDuplex); // legacy.

  this.writable = true;

  if (options) {
    if (typeof options.write === 'function') this._write = options.write;
    if (typeof options.writev === 'function') this._writev = options.writev;
    if (typeof options.destroy === 'function') this._destroy = options.destroy;
    if (typeof options.final === 'function') this._final = options.final;
  }

  Stream.call(this);
} // Otherwise people can pipe Writable streams, which is just wrong.


Writable.prototype.pipe = function () {
  errorOrDestroy(this, new ERR_STREAM_CANNOT_PIPE());
};

function writeAfterEnd(stream, cb) {
  var er = new ERR_STREAM_WRITE_AFTER_END(); // TODO: defer error events consistently everywhere, not just the cb

  errorOrDestroy(stream, er);
  process.nextTick(cb, er);
} // Checks that a user-supplied chunk is valid, especially for the particular
// mode the stream is in. Currently this means that `null` is never accepted
// and undefined/non-string values are only allowed in object mode.


function validChunk(stream, state, chunk, cb) {
  var er;

  if (chunk === null) {
    er = new ERR_STREAM_NULL_VALUES();
  } else if (typeof chunk !== 'string' && !state.objectMode) {
    er = new ERR_INVALID_ARG_TYPE('chunk', ['string', 'Buffer'], chunk);
  }

  if (er) {
    errorOrDestroy(stream, er);
    process.nextTick(cb, er);
    return false;
  }

  return true;
}

Writable.prototype.write = function (chunk, encoding, cb) {
  var state = this._writableState;
  var ret = false;

  var isBuf = !state.objectMode && _isUint8Array(chunk);

  if (isBuf && !Buffer.isBuffer(chunk)) {
    chunk = _uint8ArrayToBuffer(chunk);
  }

  if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (isBuf) encoding = 'buffer';else if (!encoding) encoding = state.defaultEncoding;
  if (typeof cb !== 'function') cb = nop;
  if (state.ending) writeAfterEnd(this, cb);else if (isBuf || validChunk(this, state, chunk, cb)) {
    state.pendingcb++;
    ret = writeOrBuffer(this, state, isBuf, chunk, encoding, cb);
  }
  return ret;
};

Writable.prototype.cork = function () {
  this._writableState.corked++;
};

Writable.prototype.uncork = function () {
  var state = this._writableState;

  if (state.corked) {
    state.corked--;
    if (!state.writing && !state.corked && !state.bufferProcessing && state.bufferedRequest) clearBuffer(this, state);
  }
};

Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
  // node::ParseEncoding() requires lower case.
  if (typeof encoding === 'string') encoding = encoding.toLowerCase();
  if (!(['hex', 'utf8', 'utf-8', 'ascii', 'binary', 'base64', 'ucs2', 'ucs-2', 'utf16le', 'utf-16le', 'raw'].indexOf((encoding + '').toLowerCase()) > -1)) throw new ERR_UNKNOWN_ENCODING(encoding);
  this._writableState.defaultEncoding = encoding;
  return this;
};

Object.defineProperty(Writable.prototype, 'writableBuffer', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState && this._writableState.getBuffer();
  }
});

function decodeChunk(state, chunk, encoding) {
  if (!state.objectMode && state.decodeStrings !== false && typeof chunk === 'string') {
    chunk = Buffer.from(chunk, encoding);
  }

  return chunk;
}

Object.defineProperty(Writable.prototype, 'writableHighWaterMark', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState.highWaterMark;
  }
}); // if we're already writing something, then just put this
// in the queue, and wait our turn.  Otherwise, call _write
// If we return false, then we need a drain event, so set that flag.

function writeOrBuffer(stream, state, isBuf, chunk, encoding, cb) {
  if (!isBuf) {
    var newChunk = decodeChunk(state, chunk, encoding);

    if (chunk !== newChunk) {
      isBuf = true;
      encoding = 'buffer';
      chunk = newChunk;
    }
  }

  var len = state.objectMode ? 1 : chunk.length;
  state.length += len;
  var ret = state.length < state.highWaterMark; // we must ensure that previous needDrain will not be reset to false.

  if (!ret) state.needDrain = true;

  if (state.writing || state.corked) {
    var last = state.lastBufferedRequest;
    state.lastBufferedRequest = {
      chunk: chunk,
      encoding: encoding,
      isBuf: isBuf,
      callback: cb,
      next: null
    };

    if (last) {
      last.next = state.lastBufferedRequest;
    } else {
      state.bufferedRequest = state.lastBufferedRequest;
    }

    state.bufferedRequestCount += 1;
  } else {
    doWrite(stream, state, false, len, chunk, encoding, cb);
  }

  return ret;
}

function doWrite(stream, state, writev, len, chunk, encoding, cb) {
  state.writelen = len;
  state.writecb = cb;
  state.writing = true;
  state.sync = true;
  if (state.destroyed) state.onwrite(new ERR_STREAM_DESTROYED('write'));else if (writev) stream._writev(chunk, state.onwrite);else stream._write(chunk, encoding, state.onwrite);
  state.sync = false;
}

function onwriteError(stream, state, sync, er, cb) {
  --state.pendingcb;

  if (sync) {
    // defer the callback if we are being called synchronously
    // to avoid piling up things on the stack
    process.nextTick(cb, er); // this can emit finish, and it will always happen
    // after error

    process.nextTick(finishMaybe, stream, state);
    stream._writableState.errorEmitted = true;
    errorOrDestroy(stream, er);
  } else {
    // the caller expect this to happen before if
    // it is async
    cb(er);
    stream._writableState.errorEmitted = true;
    errorOrDestroy(stream, er); // this can emit finish, but finish must
    // always follow error

    finishMaybe(stream, state);
  }
}

function onwriteStateUpdate(state) {
  state.writing = false;
  state.writecb = null;
  state.length -= state.writelen;
  state.writelen = 0;
}

function onwrite(stream, er) {
  var state = stream._writableState;
  var sync = state.sync;
  var cb = state.writecb;
  if (typeof cb !== 'function') throw new ERR_MULTIPLE_CALLBACK();
  onwriteStateUpdate(state);
  if (er) onwriteError(stream, state, sync, er, cb);else {
    // Check if we're actually ready to finish, but don't emit yet
    var finished = needFinish(state) || stream.destroyed;

    if (!finished && !state.corked && !state.bufferProcessing && state.bufferedRequest) {
      clearBuffer(stream, state);
    }

    if (sync) {
      process.nextTick(afterWrite, stream, state, finished, cb);
    } else {
      afterWrite(stream, state, finished, cb);
    }
  }
}

function afterWrite(stream, state, finished, cb) {
  if (!finished) onwriteDrain(stream, state);
  state.pendingcb--;
  cb();
  finishMaybe(stream, state);
} // Must force callback to be called on nextTick, so that we don't
// emit 'drain' before the write() consumer gets the 'false' return
// value, and has a chance to attach a 'drain' listener.


function onwriteDrain(stream, state) {
  if (state.length === 0 && state.needDrain) {
    state.needDrain = false;
    stream.emit('drain');
  }
} // if there's something in the buffer waiting, then process it


function clearBuffer(stream, state) {
  state.bufferProcessing = true;
  var entry = state.bufferedRequest;

  if (stream._writev && entry && entry.next) {
    // Fast case, write everything using _writev()
    var l = state.bufferedRequestCount;
    var buffer = new Array(l);
    var holder = state.corkedRequestsFree;
    holder.entry = entry;
    var count = 0;
    var allBuffers = true;

    while (entry) {
      buffer[count] = entry;
      if (!entry.isBuf) allBuffers = false;
      entry = entry.next;
      count += 1;
    }

    buffer.allBuffers = allBuffers;
    doWrite(stream, state, true, state.length, buffer, '', holder.finish); // doWrite is almost always async, defer these to save a bit of time
    // as the hot path ends with doWrite

    state.pendingcb++;
    state.lastBufferedRequest = null;

    if (holder.next) {
      state.corkedRequestsFree = holder.next;
      holder.next = null;
    } else {
      state.corkedRequestsFree = new CorkedRequest(state);
    }

    state.bufferedRequestCount = 0;
  } else {
    // Slow case, write chunks one-by-one
    while (entry) {
      var chunk = entry.chunk;
      var encoding = entry.encoding;
      var cb = entry.callback;
      var len = state.objectMode ? 1 : chunk.length;
      doWrite(stream, state, false, len, chunk, encoding, cb);
      entry = entry.next;
      state.bufferedRequestCount--; // if we didn't call the onwrite immediately, then
      // it means that we need to wait until it does.
      // also, that means that the chunk and cb are currently
      // being processed, so move the buffer counter past them.

      if (state.writing) {
        break;
      }
    }

    if (entry === null) state.lastBufferedRequest = null;
  }

  state.bufferedRequest = entry;
  state.bufferProcessing = false;
}

Writable.prototype._write = function (chunk, encoding, cb) {
  cb(new ERR_METHOD_NOT_IMPLEMENTED('_write()'));
};

Writable.prototype._writev = null;

Writable.prototype.end = function (chunk, encoding, cb) {
  var state = this._writableState;

  if (typeof chunk === 'function') {
    cb = chunk;
    chunk = null;
    encoding = null;
  } else if (typeof encoding === 'function') {
    cb = encoding;
    encoding = null;
  }

  if (chunk !== null && chunk !== undefined) this.write(chunk, encoding); // .end() fully uncorks

  if (state.corked) {
    state.corked = 1;
    this.uncork();
  } // ignore unnecessary end() calls.


  if (!state.ending) endWritable(this, state, cb);
  return this;
};

Object.defineProperty(Writable.prototype, 'writableLength', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    return this._writableState.length;
  }
});

function needFinish(state) {
  return state.ending && state.length === 0 && state.bufferedRequest === null && !state.finished && !state.writing;
}

function callFinal(stream, state) {
  stream._final(function (err) {
    state.pendingcb--;

    if (err) {
      errorOrDestroy(stream, err);
    }

    state.prefinished = true;
    stream.emit('prefinish');
    finishMaybe(stream, state);
  });
}

function prefinish(stream, state) {
  if (!state.prefinished && !state.finalCalled) {
    if (typeof stream._final === 'function' && !state.destroyed) {
      state.pendingcb++;
      state.finalCalled = true;
      process.nextTick(callFinal, stream, state);
    } else {
      state.prefinished = true;
      stream.emit('prefinish');
    }
  }
}

function finishMaybe(stream, state) {
  var need = needFinish(state);

  if (need) {
    prefinish(stream, state);

    if (state.pendingcb === 0) {
      state.finished = true;
      stream.emit('finish');

      if (state.autoDestroy) {
        // In case of duplex streams we need a way to detect
        // if the readable side is ready for autoDestroy as well
        var rState = stream._readableState;

        if (!rState || rState.autoDestroy && rState.endEmitted) {
          stream.destroy();
        }
      }
    }
  }

  return need;
}

function endWritable(stream, state, cb) {
  state.ending = true;
  finishMaybe(stream, state);

  if (cb) {
    if (state.finished) process.nextTick(cb);else stream.once('finish', cb);
  }

  state.ended = true;
  stream.writable = false;
}

function onCorkedFinish(corkReq, state, err) {
  var entry = corkReq.entry;
  corkReq.entry = null;

  while (entry) {
    var cb = entry.callback;
    state.pendingcb--;
    cb(err);
    entry = entry.next;
  } // reuse the free corkReq.


  state.corkedRequestsFree.next = corkReq;
}

Object.defineProperty(Writable.prototype, 'destroyed', {
  // making it explicit this property is not enumerable
  // because otherwise some prototype manipulation in
  // userland will fail
  enumerable: false,
  get: function get() {
    if (this._writableState === undefined) {
      return false;
    }

    return this._writableState.destroyed;
  },
  set: function set(value) {
    // we ignore the value if the stream
    // has not been initialized yet
    if (!this._writableState) {
      return;
    } // backward compatibility, the user is explicitly
    // managing destroyed


    this._writableState.destroyed = value;
  }
});
Writable.prototype.destroy = destroyImpl.destroy;
Writable.prototype._undestroy = destroyImpl.undestroy;

Writable.prototype._destroy = function (err, cb) {
  cb(err);
};
}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../errors":68,"./_stream_duplex":69,"./internal/streams/destroy":76,"./internal/streams/state":80,"./internal/streams/stream":81,"_process":58,"buffer":22,"inherits":35,"util-deprecate":116}],74:[function(require,module,exports){
(function (process){
'use strict';

var _Object$setPrototypeO;

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var finished = require('./end-of-stream');

var kLastResolve = Symbol('lastResolve');
var kLastReject = Symbol('lastReject');
var kError = Symbol('error');
var kEnded = Symbol('ended');
var kLastPromise = Symbol('lastPromise');
var kHandlePromise = Symbol('handlePromise');
var kStream = Symbol('stream');

function createIterResult(value, done) {
  return {
    value: value,
    done: done
  };
}

function readAndResolve(iter) {
  var resolve = iter[kLastResolve];

  if (resolve !== null) {
    var data = iter[kStream].read(); // we defer if data is null
    // we can be expecting either 'end' or
    // 'error'

    if (data !== null) {
      iter[kLastPromise] = null;
      iter[kLastResolve] = null;
      iter[kLastReject] = null;
      resolve(createIterResult(data, false));
    }
  }
}

function onReadable(iter) {
  // we wait for the next tick, because it might
  // emit an error with process.nextTick
  process.nextTick(readAndResolve, iter);
}

function wrapForNext(lastPromise, iter) {
  return function (resolve, reject) {
    lastPromise.then(function () {
      if (iter[kEnded]) {
        resolve(createIterResult(undefined, true));
        return;
      }

      iter[kHandlePromise](resolve, reject);
    }, reject);
  };
}

var AsyncIteratorPrototype = Object.getPrototypeOf(function () {});
var ReadableStreamAsyncIteratorPrototype = Object.setPrototypeOf((_Object$setPrototypeO = {
  get stream() {
    return this[kStream];
  },

  next: function next() {
    var _this = this;

    // if we have detected an error in the meanwhile
    // reject straight away
    var error = this[kError];

    if (error !== null) {
      return Promise.reject(error);
    }

    if (this[kEnded]) {
      return Promise.resolve(createIterResult(undefined, true));
    }

    if (this[kStream].destroyed) {
      // We need to defer via nextTick because if .destroy(err) is
      // called, the error will be emitted via nextTick, and
      // we cannot guarantee that there is no error lingering around
      // waiting to be emitted.
      return new Promise(function (resolve, reject) {
        process.nextTick(function () {
          if (_this[kError]) {
            reject(_this[kError]);
          } else {
            resolve(createIterResult(undefined, true));
          }
        });
      });
    } // if we have multiple next() calls
    // we will wait for the previous Promise to finish
    // this logic is optimized to support for await loops,
    // where next() is only called once at a time


    var lastPromise = this[kLastPromise];
    var promise;

    if (lastPromise) {
      promise = new Promise(wrapForNext(lastPromise, this));
    } else {
      // fast path needed to support multiple this.push()
      // without triggering the next() queue
      var data = this[kStream].read();

      if (data !== null) {
        return Promise.resolve(createIterResult(data, false));
      }

      promise = new Promise(this[kHandlePromise]);
    }

    this[kLastPromise] = promise;
    return promise;
  }
}, _defineProperty(_Object$setPrototypeO, Symbol.asyncIterator, function () {
  return this;
}), _defineProperty(_Object$setPrototypeO, "return", function _return() {
  var _this2 = this;

  // destroy(err, cb) is a private API
  // we can guarantee we have that here, because we control the
  // Readable class this is attached to
  return new Promise(function (resolve, reject) {
    _this2[kStream].destroy(null, function (err) {
      if (err) {
        reject(err);
        return;
      }

      resolve(createIterResult(undefined, true));
    });
  });
}), _Object$setPrototypeO), AsyncIteratorPrototype);

var createReadableStreamAsyncIterator = function createReadableStreamAsyncIterator(stream) {
  var _Object$create;

  var iterator = Object.create(ReadableStreamAsyncIteratorPrototype, (_Object$create = {}, _defineProperty(_Object$create, kStream, {
    value: stream,
    writable: true
  }), _defineProperty(_Object$create, kLastResolve, {
    value: null,
    writable: true
  }), _defineProperty(_Object$create, kLastReject, {
    value: null,
    writable: true
  }), _defineProperty(_Object$create, kError, {
    value: null,
    writable: true
  }), _defineProperty(_Object$create, kEnded, {
    value: stream._readableState.endEmitted,
    writable: true
  }), _defineProperty(_Object$create, kHandlePromise, {
    value: function value(resolve, reject) {
      var data = iterator[kStream].read();

      if (data) {
        iterator[kLastPromise] = null;
        iterator[kLastResolve] = null;
        iterator[kLastReject] = null;
        resolve(createIterResult(data, false));
      } else {
        iterator[kLastResolve] = resolve;
        iterator[kLastReject] = reject;
      }
    },
    writable: true
  }), _Object$create));
  iterator[kLastPromise] = null;
  finished(stream, function (err) {
    if (err && err.code !== 'ERR_STREAM_PREMATURE_CLOSE') {
      var reject = iterator[kLastReject]; // reject if we are waiting for data in the Promise
      // returned by next() and store the error

      if (reject !== null) {
        iterator[kLastPromise] = null;
        iterator[kLastResolve] = null;
        iterator[kLastReject] = null;
        reject(err);
      }

      iterator[kError] = err;
      return;
    }

    var resolve = iterator[kLastResolve];

    if (resolve !== null) {
      iterator[kLastPromise] = null;
      iterator[kLastResolve] = null;
      iterator[kLastReject] = null;
      resolve(createIterResult(undefined, true));
    }

    iterator[kEnded] = true;
  });
  stream.on('readable', onReadable.bind(null, iterator));
  return iterator;
};

module.exports = createReadableStreamAsyncIterator;
}).call(this,require('_process'))
},{"./end-of-stream":77,"_process":58}],75:[function(require,module,exports){
'use strict';

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var _require = require('buffer'),
    Buffer = _require.Buffer;

var _require2 = require('util'),
    inspect = _require2.inspect;

var custom = inspect && inspect.custom || 'inspect';

function copyBuffer(src, target, offset) {
  Buffer.prototype.copy.call(src, target, offset);
}

module.exports =
/*#__PURE__*/
function () {
  function BufferList() {
    this.head = null;
    this.tail = null;
    this.length = 0;
  }

  var _proto = BufferList.prototype;

  _proto.push = function push(v) {
    var entry = {
      data: v,
      next: null
    };
    if (this.length > 0) this.tail.next = entry;else this.head = entry;
    this.tail = entry;
    ++this.length;
  };

  _proto.unshift = function unshift(v) {
    var entry = {
      data: v,
      next: this.head
    };
    if (this.length === 0) this.tail = entry;
    this.head = entry;
    ++this.length;
  };

  _proto.shift = function shift() {
    if (this.length === 0) return;
    var ret = this.head.data;
    if (this.length === 1) this.head = this.tail = null;else this.head = this.head.next;
    --this.length;
    return ret;
  };

  _proto.clear = function clear() {
    this.head = this.tail = null;
    this.length = 0;
  };

  _proto.join = function join(s) {
    if (this.length === 0) return '';
    var p = this.head;
    var ret = '' + p.data;

    while (p = p.next) {
      ret += s + p.data;
    }

    return ret;
  };

  _proto.concat = function concat(n) {
    if (this.length === 0) return Buffer.alloc(0);
    var ret = Buffer.allocUnsafe(n >>> 0);
    var p = this.head;
    var i = 0;

    while (p) {
      copyBuffer(p.data, ret, i);
      i += p.data.length;
      p = p.next;
    }

    return ret;
  } // Consumes a specified amount of bytes or characters from the buffered data.
  ;

  _proto.consume = function consume(n, hasStrings) {
    var ret;

    if (n < this.head.data.length) {
      // `slice` is the same for buffers and strings.
      ret = this.head.data.slice(0, n);
      this.head.data = this.head.data.slice(n);
    } else if (n === this.head.data.length) {
      // First chunk is a perfect match.
      ret = this.shift();
    } else {
      // Result spans more than one buffer.
      ret = hasStrings ? this._getString(n) : this._getBuffer(n);
    }

    return ret;
  };

  _proto.first = function first() {
    return this.head.data;
  } // Consumes a specified amount of characters from the buffered data.
  ;

  _proto._getString = function _getString(n) {
    var p = this.head;
    var c = 1;
    var ret = p.data;
    n -= ret.length;

    while (p = p.next) {
      var str = p.data;
      var nb = n > str.length ? str.length : n;
      if (nb === str.length) ret += str;else ret += str.slice(0, n);
      n -= nb;

      if (n === 0) {
        if (nb === str.length) {
          ++c;
          if (p.next) this.head = p.next;else this.head = this.tail = null;
        } else {
          this.head = p;
          p.data = str.slice(nb);
        }

        break;
      }

      ++c;
    }

    this.length -= c;
    return ret;
  } // Consumes a specified amount of bytes from the buffered data.
  ;

  _proto._getBuffer = function _getBuffer(n) {
    var ret = Buffer.allocUnsafe(n);
    var p = this.head;
    var c = 1;
    p.data.copy(ret);
    n -= p.data.length;

    while (p = p.next) {
      var buf = p.data;
      var nb = n > buf.length ? buf.length : n;
      buf.copy(ret, ret.length - n, 0, nb);
      n -= nb;

      if (n === 0) {
        if (nb === buf.length) {
          ++c;
          if (p.next) this.head = p.next;else this.head = this.tail = null;
        } else {
          this.head = p;
          p.data = buf.slice(nb);
        }

        break;
      }

      ++c;
    }

    this.length -= c;
    return ret;
  } // Make sure the linked list only shows the minimal necessary information.
  ;

  _proto[custom] = function (_, options) {
    return inspect(this, _objectSpread({}, options, {
      // Only inspect one level.
      depth: 0,
      // It should not recurse.
      customInspect: false
    }));
  };

  return BufferList;
}();
},{"buffer":22,"util":17}],76:[function(require,module,exports){
(function (process){
'use strict'; // undocumented cb() API, needed for core, not for public API

function destroy(err, cb) {
  var _this = this;

  var readableDestroyed = this._readableState && this._readableState.destroyed;
  var writableDestroyed = this._writableState && this._writableState.destroyed;

  if (readableDestroyed || writableDestroyed) {
    if (cb) {
      cb(err);
    } else if (err) {
      if (!this._writableState) {
        process.nextTick(emitErrorNT, this, err);
      } else if (!this._writableState.errorEmitted) {
        this._writableState.errorEmitted = true;
        process.nextTick(emitErrorNT, this, err);
      }
    }

    return this;
  } // we set destroyed to true before firing error callbacks in order
  // to make it re-entrance safe in case destroy() is called within callbacks


  if (this._readableState) {
    this._readableState.destroyed = true;
  } // if this is a duplex stream mark the writable part as destroyed as well


  if (this._writableState) {
    this._writableState.destroyed = true;
  }

  this._destroy(err || null, function (err) {
    if (!cb && err) {
      if (!_this._writableState) {
        process.nextTick(emitErrorAndCloseNT, _this, err);
      } else if (!_this._writableState.errorEmitted) {
        _this._writableState.errorEmitted = true;
        process.nextTick(emitErrorAndCloseNT, _this, err);
      } else {
        process.nextTick(emitCloseNT, _this);
      }
    } else if (cb) {
      process.nextTick(emitCloseNT, _this);
      cb(err);
    } else {
      process.nextTick(emitCloseNT, _this);
    }
  });

  return this;
}

function emitErrorAndCloseNT(self, err) {
  emitErrorNT(self, err);
  emitCloseNT(self);
}

function emitCloseNT(self) {
  if (self._writableState && !self._writableState.emitClose) return;
  if (self._readableState && !self._readableState.emitClose) return;
  self.emit('close');
}

function undestroy() {
  if (this._readableState) {
    this._readableState.destroyed = false;
    this._readableState.reading = false;
    this._readableState.ended = false;
    this._readableState.endEmitted = false;
  }

  if (this._writableState) {
    this._writableState.destroyed = false;
    this._writableState.ended = false;
    this._writableState.ending = false;
    this._writableState.finalCalled = false;
    this._writableState.prefinished = false;
    this._writableState.finished = false;
    this._writableState.errorEmitted = false;
  }
}

function emitErrorNT(self, err) {
  self.emit('error', err);
}

function errorOrDestroy(stream, err) {
  // We have tests that rely on errors being emitted
  // in the same tick, so changing this is semver major.
  // For now when you opt-in to autoDestroy we allow
  // the error to be emitted nextTick. In a future
  // semver major update we should change the default to this.
  var rState = stream._readableState;
  var wState = stream._writableState;
  if (rState && rState.autoDestroy || wState && wState.autoDestroy) stream.destroy(err);else stream.emit('error', err);
}

module.exports = {
  destroy: destroy,
  undestroy: undestroy,
  errorOrDestroy: errorOrDestroy
};
}).call(this,require('_process'))
},{"_process":58}],77:[function(require,module,exports){
// Ported from https://github.com/mafintosh/end-of-stream with
// permission from the author, Mathias Buus (@mafintosh).
'use strict';

var ERR_STREAM_PREMATURE_CLOSE = require('../../../errors').codes.ERR_STREAM_PREMATURE_CLOSE;

function once(callback) {
  var called = false;
  return function () {
    if (called) return;
    called = true;

    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    callback.apply(this, args);
  };
}

function noop() {}

function isRequest(stream) {
  return stream.setHeader && typeof stream.abort === 'function';
}

function eos(stream, opts, callback) {
  if (typeof opts === 'function') return eos(stream, null, opts);
  if (!opts) opts = {};
  callback = once(callback || noop);
  var readable = opts.readable || opts.readable !== false && stream.readable;
  var writable = opts.writable || opts.writable !== false && stream.writable;

  var onlegacyfinish = function onlegacyfinish() {
    if (!stream.writable) onfinish();
  };

  var writableEnded = stream._writableState && stream._writableState.finished;

  var onfinish = function onfinish() {
    writable = false;
    writableEnded = true;
    if (!readable) callback.call(stream);
  };

  var readableEnded = stream._readableState && stream._readableState.endEmitted;

  var onend = function onend() {
    readable = false;
    readableEnded = true;
    if (!writable) callback.call(stream);
  };

  var onerror = function onerror(err) {
    callback.call(stream, err);
  };

  var onclose = function onclose() {
    var err;

    if (readable && !readableEnded) {
      if (!stream._readableState || !stream._readableState.ended) err = new ERR_STREAM_PREMATURE_CLOSE();
      return callback.call(stream, err);
    }

    if (writable && !writableEnded) {
      if (!stream._writableState || !stream._writableState.ended) err = new ERR_STREAM_PREMATURE_CLOSE();
      return callback.call(stream, err);
    }
  };

  var onrequest = function onrequest() {
    stream.req.on('finish', onfinish);
  };

  if (isRequest(stream)) {
    stream.on('complete', onfinish);
    stream.on('abort', onclose);
    if (stream.req) onrequest();else stream.on('request', onrequest);
  } else if (writable && !stream._writableState) {
    // legacy streams
    stream.on('end', onlegacyfinish);
    stream.on('close', onlegacyfinish);
  }

  stream.on('end', onend);
  stream.on('finish', onfinish);
  if (opts.error !== false) stream.on('error', onerror);
  stream.on('close', onclose);
  return function () {
    stream.removeListener('complete', onfinish);
    stream.removeListener('abort', onclose);
    stream.removeListener('request', onrequest);
    if (stream.req) stream.req.removeListener('finish', onfinish);
    stream.removeListener('end', onlegacyfinish);
    stream.removeListener('close', onlegacyfinish);
    stream.removeListener('finish', onfinish);
    stream.removeListener('end', onend);
    stream.removeListener('error', onerror);
    stream.removeListener('close', onclose);
  };
}

module.exports = eos;
},{"../../../errors":68}],78:[function(require,module,exports){
module.exports = function () {
  throw new Error('Readable.from is not available in the browser')
};

},{}],79:[function(require,module,exports){
// Ported from https://github.com/mafintosh/pump with
// permission from the author, Mathias Buus (@mafintosh).
'use strict';

var eos;

function once(callback) {
  var called = false;
  return function () {
    if (called) return;
    called = true;
    callback.apply(void 0, arguments);
  };
}

var _require$codes = require('../../../errors').codes,
    ERR_MISSING_ARGS = _require$codes.ERR_MISSING_ARGS,
    ERR_STREAM_DESTROYED = _require$codes.ERR_STREAM_DESTROYED;

function noop(err) {
  // Rethrow the error if it exists to avoid swallowing it
  if (err) throw err;
}

function isRequest(stream) {
  return stream.setHeader && typeof stream.abort === 'function';
}

function destroyer(stream, reading, writing, callback) {
  callback = once(callback);
  var closed = false;
  stream.on('close', function () {
    closed = true;
  });
  if (eos === undefined) eos = require('./end-of-stream');
  eos(stream, {
    readable: reading,
    writable: writing
  }, function (err) {
    if (err) return callback(err);
    closed = true;
    callback();
  });
  var destroyed = false;
  return function (err) {
    if (closed) return;
    if (destroyed) return;
    destroyed = true; // request.destroy just do .end - .abort is what we want

    if (isRequest(stream)) return stream.abort();
    if (typeof stream.destroy === 'function') return stream.destroy();
    callback(err || new ERR_STREAM_DESTROYED('pipe'));
  };
}

function call(fn) {
  fn();
}

function pipe(from, to) {
  return from.pipe(to);
}

function popCallback(streams) {
  if (!streams.length) return noop;
  if (typeof streams[streams.length - 1] !== 'function') return noop;
  return streams.pop();
}

function pipeline() {
  for (var _len = arguments.length, streams = new Array(_len), _key = 0; _key < _len; _key++) {
    streams[_key] = arguments[_key];
  }

  var callback = popCallback(streams);
  if (Array.isArray(streams[0])) streams = streams[0];

  if (streams.length < 2) {
    throw new ERR_MISSING_ARGS('streams');
  }

  var error;
  var destroys = streams.map(function (stream, i) {
    var reading = i < streams.length - 1;
    var writing = i > 0;
    return destroyer(stream, reading, writing, function (err) {
      if (!error) error = err;
      if (err) destroys.forEach(call);
      if (reading) return;
      destroys.forEach(call);
      callback(error);
    });
  });
  return streams.reduce(pipe);
}

module.exports = pipeline;
},{"../../../errors":68,"./end-of-stream":77}],80:[function(require,module,exports){
'use strict';

var ERR_INVALID_OPT_VALUE = require('../../../errors').codes.ERR_INVALID_OPT_VALUE;

function highWaterMarkFrom(options, isDuplex, duplexKey) {
  return options.highWaterMark != null ? options.highWaterMark : isDuplex ? options[duplexKey] : null;
}

function getHighWaterMark(state, options, duplexKey, isDuplex) {
  var hwm = highWaterMarkFrom(options, isDuplex, duplexKey);

  if (hwm != null) {
    if (!(isFinite(hwm) && Math.floor(hwm) === hwm) || hwm < 0) {
      var name = isDuplex ? duplexKey : 'highWaterMark';
      throw new ERR_INVALID_OPT_VALUE(name, hwm);
    }

    return Math.floor(hwm);
  } // Default value


  return state.objectMode ? 16 : 16 * 1024;
}

module.exports = {
  getHighWaterMark: getHighWaterMark
};
},{"../../../errors":68}],81:[function(require,module,exports){
module.exports = require('events').EventEmitter;

},{"events":29}],82:[function(require,module,exports){
exports = module.exports = require('./lib/_stream_readable.js');
exports.Stream = exports;
exports.Readable = exports;
exports.Writable = require('./lib/_stream_writable.js');
exports.Duplex = require('./lib/_stream_duplex.js');
exports.Transform = require('./lib/_stream_transform.js');
exports.PassThrough = require('./lib/_stream_passthrough.js');
exports.finished = require('./lib/internal/streams/end-of-stream.js');
exports.pipeline = require('./lib/internal/streams/pipeline.js');

},{"./lib/_stream_duplex.js":69,"./lib/_stream_passthrough.js":70,"./lib/_stream_readable.js":71,"./lib/_stream_transform.js":72,"./lib/_stream_writable.js":73,"./lib/internal/streams/end-of-stream.js":77,"./lib/internal/streams/pipeline.js":79}],83:[function(require,module,exports){
exports.render = render
exports.append = append
exports.mime = require('./lib/mime.json')

var debug = require('debug')('render-media')
var isAscii = require('is-ascii')
var MediaElementWrapper = require('mediasource')
var path = require('path')
var streamToBlobURL = require('stream-to-blob-url')
var videostream = require('videostream')

// Note: Everything listed in VIDEOSTREAM_EXTS should also appear in either
// MEDIASOURCE_VIDEO_EXTS or MEDIASOURCE_AUDIO_EXTS.
var VIDEOSTREAM_EXTS = [
  '.m4a',
  '.m4b',
  '.m4p',
  '.m4v',
  '.mp4'
]

var MEDIASOURCE_VIDEO_EXTS = [
  '.m4v',
  '.mkv',
  '.mp4',
  '.webm'
]

var MEDIASOURCE_AUDIO_EXTS = [
  '.m4a',
  '.m4b',
  '.m4p',
  '.mp3'
]

var MEDIASOURCE_EXTS = [].concat(
  MEDIASOURCE_VIDEO_EXTS,
  MEDIASOURCE_AUDIO_EXTS
)

var VIDEO_EXTS = [
  '.mov',
  '.ogv'
]

var AUDIO_EXTS = [
  '.aac',
  '.oga',
  '.ogg',
  '.wav',
  '.flac'
]

var IMAGE_EXTS = [
  '.bmp',
  '.gif',
  '.jpeg',
  '.jpg',
  '.png',
  '.svg'
]

var IFRAME_EXTS = [
  '.css',
  '.html',
  '.js',
  '.md',
  '.pdf',
  '.txt'
]

// Maximum file length for which the Blob URL strategy will be attempted
// See: https://github.com/feross/render-media/issues/18
var MAX_BLOB_LENGTH = 200 * 1000 * 1000 // 200 MB

var MediaSource = typeof window !== 'undefined' && window.MediaSource

function render (file, elem, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }
  if (!opts) opts = {}
  if (!cb) cb = function () {}

  validateFile(file)
  parseOpts(opts)

  if (typeof elem === 'string') elem = document.querySelector(elem)

  renderMedia(file, function (tagName) {
    if (elem.nodeName !== tagName.toUpperCase()) {
      var extname = path.extname(file.name).toLowerCase()

      throw new Error(
        'Cannot render "' + extname + '" inside a "' +
        elem.nodeName.toLowerCase() + '" element, expected "' + tagName + '"'
      )
    }

    if (tagName === 'video' || tagName === 'audio') setMediaOpts(elem, opts)

    return elem
  }, opts, cb)
}

function append (file, rootElem, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }
  if (!opts) opts = {}
  if (!cb) cb = function () {}

  validateFile(file)
  parseOpts(opts)

  if (typeof rootElem === 'string') rootElem = document.querySelector(rootElem)

  if (rootElem && (rootElem.nodeName === 'VIDEO' || rootElem.nodeName === 'AUDIO')) {
    throw new Error(
      'Invalid video/audio node argument. Argument must be root element that ' +
      'video/audio tag will be appended to.'
    )
  }

  renderMedia(file, getElem, opts, done)

  function getElem (tagName) {
    if (tagName === 'video' || tagName === 'audio') return createMedia(tagName)
    else return createElem(tagName)
  }

  function createMedia (tagName) {
    var elem = createElem(tagName)
    setMediaOpts(elem, opts)
    rootElem.appendChild(elem)
    return elem
  }

  function createElem (tagName) {
    var elem = document.createElement(tagName)
    rootElem.appendChild(elem)
    return elem
  }

  function done (err, elem) {
    if (err && elem) elem.remove()
    cb(err, elem)
  }
}

function renderMedia (file, getElem, opts, cb) {
  var extname = path.extname(file.name).toLowerCase()
  var currentTime = 0
  var elem

  if (MEDIASOURCE_EXTS.indexOf(extname) >= 0) {
    renderMediaSource()
  } else if (VIDEO_EXTS.indexOf(extname) >= 0) {
    renderMediaElement('video')
  } else if (AUDIO_EXTS.indexOf(extname) >= 0) {
    renderMediaElement('audio')
  } else if (IMAGE_EXTS.indexOf(extname) >= 0) {
    renderImage()
  } else if (IFRAME_EXTS.indexOf(extname) >= 0) {
    renderIframe()
  } else {
    tryRenderIframe()
  }

  function renderMediaSource () {
    var tagName = MEDIASOURCE_VIDEO_EXTS.indexOf(extname) >= 0 ? 'video' : 'audio'

    if (MediaSource) {
      if (VIDEOSTREAM_EXTS.indexOf(extname) >= 0) {
        useVideostream()
      } else {
        useMediaSource()
      }
    } else {
      useBlobURL()
    }

    function useVideostream () {
      debug('Use `videostream` package for ' + file.name)
      prepareElem()
      elem.addEventListener('error', fallbackToMediaSource)
      elem.addEventListener('loadstart', onLoadStart)
      elem.addEventListener('canplay', onCanPlay)
      videostream(file, elem)
    }

    function useMediaSource () {
      debug('Use MediaSource API for ' + file.name)
      prepareElem()
      elem.addEventListener('error', fallbackToBlobURL)
      elem.addEventListener('loadstart', onLoadStart)
      elem.addEventListener('canplay', onCanPlay)

      var wrapper = new MediaElementWrapper(elem)
      var writable = wrapper.createWriteStream(getCodec(file.name))
      file.createReadStream().pipe(writable)

      if (currentTime) elem.currentTime = currentTime
    }

    function useBlobURL () {
      debug('Use Blob URL for ' + file.name)
      prepareElem()
      elem.addEventListener('error', fatalError)
      elem.addEventListener('loadstart', onLoadStart)
      elem.addEventListener('canplay', onCanPlay)
      getBlobURL(file, function (err, url) {
        if (err) return fatalError(err)
        elem.src = url
        if (currentTime) elem.currentTime = currentTime
      })
    }

    function fallbackToMediaSource (err) {
      debug('videostream error: fallback to MediaSource API: %o', err.message || err)
      elem.removeEventListener('error', fallbackToMediaSource)
      elem.removeEventListener('canplay', onCanPlay)

      useMediaSource()
    }

    function fallbackToBlobURL (err) {
      debug('MediaSource API error: fallback to Blob URL: %o', err.message || err)
      if (!checkBlobLength()) return

      elem.removeEventListener('error', fallbackToBlobURL)
      elem.removeEventListener('canplay', onCanPlay)

      useBlobURL()
    }

    function prepareElem () {
      if (!elem) {
        elem = getElem(tagName)

        elem.addEventListener('progress', function () {
          currentTime = elem.currentTime
        })
      }
    }
  }

  function checkBlobLength () {
    if (typeof file.length === 'number' && file.length > opts.maxBlobLength) {
      debug(
        'File length too large for Blob URL approach: %d (max: %d)',
        file.length, opts.maxBlobLength
      )
      fatalError(new Error(
        'File length too large for Blob URL approach: ' + file.length +
        ' (max: ' + opts.maxBlobLength + ')'
      ))
      return false
    }
    return true
  }

  function renderMediaElement (type) {
    if (!checkBlobLength()) return

    elem = getElem(type)
    getBlobURL(file, function (err, url) {
      if (err) return fatalError(err)
      elem.addEventListener('error', fatalError)
      elem.addEventListener('loadstart', onLoadStart)
      elem.addEventListener('canplay', onCanPlay)
      elem.src = url
    })
  }

  function onLoadStart () {
    elem.removeEventListener('loadstart', onLoadStart)
    if (opts.autoplay) elem.play()
  }

  function onCanPlay () {
    elem.removeEventListener('canplay', onCanPlay)
    cb(null, elem)
  }

  function renderImage () {
    elem = getElem('img')
    getBlobURL(file, function (err, url) {
      if (err) return fatalError(err)
      elem.src = url
      elem.alt = file.name
      cb(null, elem)
    })
  }

  function renderIframe () {
    getBlobURL(file, function (err, url) {
      if (err) return fatalError(err)

      if (extname !== '.pdf') {
        // Render iframe
        elem = getElem('iframe')
        elem.sandbox = 'allow-forms allow-scripts'
        elem.src = url
      } else {
        // Render .pdf
        elem = getElem('object')
        // Firefox-only: `typemustmatch` keeps the embedded file from running unless
        // its content type matches the specified `type` attribute
        elem.setAttribute('typemustmatch', true)
        elem.setAttribute('type', 'application/pdf')
        elem.setAttribute('data', url)
      }
      cb(null, elem)
    })
  }

  function tryRenderIframe () {
    debug('Unknown file extension "%s" - will attempt to render into iframe', extname)

    var str = ''
    file.createReadStream({ start: 0, end: 1000 })
      .setEncoding('utf8')
      .on('data', function (chunk) {
        str += chunk
      })
      .on('end', done)
      .on('error', cb)

    function done () {
      if (isAscii(str)) {
        debug('File extension "%s" appears ascii, so will render.', extname)
        renderIframe()
      } else {
        debug('File extension "%s" appears non-ascii, will not render.', extname)
        cb(new Error('Unsupported file type "' + extname + '": Cannot append to DOM'))
      }
    }
  }

  function fatalError (err) {
    err.message = 'Error rendering file "' + file.name + '": ' + err.message
    debug(err.message)
    cb(err)
  }
}

function getBlobURL (file, cb) {
  var extname = path.extname(file.name).toLowerCase()
  streamToBlobURL(file.createReadStream(), exports.mime[extname])
    .then(
      blobUrl => cb(null, blobUrl),
      err => cb(err)
    )
}

function validateFile (file) {
  if (file == null) {
    throw new Error('file cannot be null or undefined')
  }
  if (typeof file.name !== 'string') {
    throw new Error('missing or invalid file.name property')
  }
  if (typeof file.createReadStream !== 'function') {
    throw new Error('missing or invalid file.createReadStream property')
  }
}

function getCodec (name) {
  var extname = path.extname(name).toLowerCase()
  return {
    '.m4a': 'audio/mp4; codecs="mp4a.40.5"',
    '.m4b': 'audio/mp4; codecs="mp4a.40.5"',
    '.m4p': 'audio/mp4; codecs="mp4a.40.5"',
    '.m4v': 'video/mp4; codecs="avc1.640029, mp4a.40.5"',
    '.mkv': 'video/webm; codecs="avc1.640029, mp4a.40.5"',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4; codecs="avc1.640029, mp4a.40.5"',
    '.webm': 'video/webm; codecs="vorbis, vp8"'
  }[extname]
}

function parseOpts (opts) {
  if (opts.autoplay == null) opts.autoplay = false
  if (opts.muted == null) opts.muted = false
  if (opts.controls == null) opts.controls = true
  if (opts.maxBlobLength == null) opts.maxBlobLength = MAX_BLOB_LENGTH
}

function setMediaOpts (elem, opts) {
  elem.autoplay = !!opts.autoplay
  elem.muted = !!opts.muted
  elem.controls = !!opts.controls
}

},{"./lib/mime.json":84,"debug":26,"is-ascii":36,"mediasource":41,"path":55,"stream-to-blob-url":100,"videostream":118}],84:[function(require,module,exports){
module.exports={
  ".3gp": "video/3gpp",
  ".aac": "audio/aac",
  ".aif": "audio/x-aiff",
  ".aiff": "audio/x-aiff",
  ".atom": "application/atom+xml",
  ".avi": "video/x-msvideo",
  ".bmp": "image/bmp",
  ".bz2": "application/x-bzip2",
  ".conf": "text/plain",
  ".css": "text/css",
  ".csv": "text/plain",
  ".diff": "text/x-diff",
  ".doc": "application/msword",
  ".flv": "video/x-flv",
  ".gif": "image/gif",
  ".gz": "application/x-gzip",
  ".htm": "text/html",
  ".html": "text/html",
  ".ico": "image/vnd.microsoft.icon",
  ".ics": "text/calendar",
  ".iso": "application/octet-stream",
  ".jar": "application/java-archive",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript",
  ".json": "application/json",
  ".less": "text/css",
  ".log": "text/plain",
  ".m3u": "audio/x-mpegurl",
  ".m4a": "audio/x-m4a",
  ".m4b": "audio/mp4",
  ".m4p": "audio/mp4",
  ".m4v": "video/x-m4v",
  ".manifest": "text/cache-manifest",
  ".markdown": "text/x-markdown",
  ".mathml": "application/mathml+xml",
  ".md": "text/x-markdown",
  ".mid": "audio/midi",
  ".midi": "audio/midi",
  ".mov": "video/quicktime",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".mp4v": "video/mp4",
  ".mpeg": "video/mpeg",
  ".mpg": "video/mpeg",
  ".odp": "application/vnd.oasis.opendocument.presentation",
  ".ods": "application/vnd.oasis.opendocument.spreadsheet",
  ".odt": "application/vnd.oasis.opendocument.text",
  ".oga": "audio/ogg",
  ".ogg": "application/ogg",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".pps": "application/vnd.ms-powerpoint",
  ".ppt": "application/vnd.ms-powerpoint",
  ".ps": "application/postscript",
  ".psd": "image/vnd.adobe.photoshop",
  ".qt": "video/quicktime",
  ".rar": "application/x-rar-compressed",
  ".rdf": "application/rdf+xml",
  ".rss": "application/rss+xml",
  ".rtf": "application/rtf",
  ".svg": "image/svg+xml",
  ".svgz": "image/svg+xml",
  ".swf": "application/x-shockwave-flash",
  ".tar": "application/x-tar",
  ".tbz": "application/x-bzip-compressed-tar",
  ".text": "text/plain",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".torrent": "application/x-bittorrent",
  ".ttf": "application/x-font-ttf",
  ".txt": "text/plain",
  ".wav": "audio/wav",
  ".webm": "video/webm",
  ".wma": "audio/x-ms-wma",
  ".wmv": "video/x-ms-wmv",
  ".xls": "application/vnd.ms-excel",
  ".xml": "application/xml",
  ".yaml": "text/yaml",
  ".yml": "text/yaml",
  ".zip": "application/zip"
}

},{}],85:[function(require,module,exports){
(function (process){
module.exports = runParallelLimit

function runParallelLimit (tasks, limit, cb) {
  if (typeof limit !== 'number') throw new Error('second argument must be a Number')
  var results, len, pending, keys, isErrored
  var isSync = true

  if (Array.isArray(tasks)) {
    results = []
    pending = len = tasks.length
  } else {
    keys = Object.keys(tasks)
    results = {}
    pending = len = keys.length
  }

  function done (err) {
    function end () {
      if (cb) cb(err, results)
      cb = null
    }
    if (isSync) process.nextTick(end)
    else end()
  }

  function each (i, err, result) {
    results[i] = result
    if (err) isErrored = true
    if (--pending === 0 || err) {
      done(err)
    } else if (!isErrored && next < len) {
      var key
      if (keys) {
        key = keys[next]
        next += 1
        tasks[key](function (err, result) { each(key, err, result) })
      } else {
        key = next
        next += 1
        tasks[key](function (err, result) { each(key, err, result) })
      }
    }
  }

  var next = limit
  if (!pending) {
    // empty
    done(null)
  } else if (keys) {
    // object
    keys.some(function (key, i) {
      tasks[key](function (err, result) { each(key, err, result) })
      if (i === limit - 1) return true // early return
    })
  } else {
    // array
    tasks.some(function (task, i) {
      task(function (err, result) { each(i, err, result) })
      if (i === limit - 1) return true // early return
    })
  }

  isSync = false
}

}).call(this,require('_process'))
},{"_process":58}],86:[function(require,module,exports){
(function (process){
module.exports = runParallel

function runParallel (tasks, cb) {
  var results, pending, keys
  var isSync = true

  if (Array.isArray(tasks)) {
    results = []
    pending = tasks.length
  } else {
    keys = Object.keys(tasks)
    results = {}
    pending = keys.length
  }

  function done (err) {
    function end () {
      if (cb) cb(err, results)
      cb = null
    }
    if (isSync) process.nextTick(end)
    else end()
  }

  function each (i, err, result) {
    results[i] = result
    if (--pending === 0 || err) {
      done(err)
    }
  }

  if (!pending) {
    // empty
    done(null)
  } else if (keys) {
    // object
    keys.forEach(function (key) {
      tasks[key](function (err, result) { each(key, err, result) })
    })
  } else {
    // array
    tasks.forEach(function (task, i) {
      task(function (err, result) { each(i, err, result) })
    })
  }

  isSync = false
}

}).call(this,require('_process'))
},{"_process":58}],87:[function(require,module,exports){
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["Rusha"] = factory();
	else
		root["Rusha"] = factory();
})(typeof self !== 'undefined' ? self : this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 3);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports, __webpack_require__) {

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/* eslint-env commonjs, browser */

var RushaCore = __webpack_require__(5);

var _require = __webpack_require__(1),
    toHex = _require.toHex,
    ceilHeapSize = _require.ceilHeapSize;

var conv = __webpack_require__(6);

// Calculate the length of buffer that the sha1 routine uses
// including the padding.
var padlen = function (len) {
  for (len += 9; len % 64 > 0; len += 1) {}
  return len;
};

var padZeroes = function (bin, len) {
  var h8 = new Uint8Array(bin.buffer);
  var om = len % 4,
      align = len - om;
  switch (om) {
    case 0:
      h8[align + 3] = 0;
    case 1:
      h8[align + 2] = 0;
    case 2:
      h8[align + 1] = 0;
    case 3:
      h8[align + 0] = 0;
  }
  for (var i = (len >> 2) + 1; i < bin.length; i++) {
    bin[i] = 0;
  }
};

var padData = function (bin, chunkLen, msgLen) {
  bin[chunkLen >> 2] |= 0x80 << 24 - (chunkLen % 4 << 3);
  // To support msgLen >= 2 GiB, use a float division when computing the
  // high 32-bits of the big-endian message length in bits.
  bin[((chunkLen >> 2) + 2 & ~0x0f) + 14] = msgLen / (1 << 29) | 0;
  bin[((chunkLen >> 2) + 2 & ~0x0f) + 15] = msgLen << 3;
};

var getRawDigest = function (heap, padMaxChunkLen) {
  var io = new Int32Array(heap, padMaxChunkLen + 320, 5);
  var out = new Int32Array(5);
  var arr = new DataView(out.buffer);
  arr.setInt32(0, io[0], false);
  arr.setInt32(4, io[1], false);
  arr.setInt32(8, io[2], false);
  arr.setInt32(12, io[3], false);
  arr.setInt32(16, io[4], false);
  return out;
};

var Rusha = function () {
  function Rusha(chunkSize) {
    _classCallCheck(this, Rusha);

    chunkSize = chunkSize || 64 * 1024;
    if (chunkSize % 64 > 0) {
      throw new Error('Chunk size must be a multiple of 128 bit');
    }
    this._offset = 0;
    this._maxChunkLen = chunkSize;
    this._padMaxChunkLen = padlen(chunkSize);
    // The size of the heap is the sum of:
    // 1. The padded input message size
    // 2. The extended space the algorithm needs (320 byte)
    // 3. The 160 bit state the algoritm uses
    this._heap = new ArrayBuffer(ceilHeapSize(this._padMaxChunkLen + 320 + 20));
    this._h32 = new Int32Array(this._heap);
    this._h8 = new Int8Array(this._heap);
    this._core = new RushaCore({ Int32Array: Int32Array }, {}, this._heap);
  }

  Rusha.prototype._initState = function _initState(heap, padMsgLen) {
    this._offset = 0;
    var io = new Int32Array(heap, padMsgLen + 320, 5);
    io[0] = 1732584193;
    io[1] = -271733879;
    io[2] = -1732584194;
    io[3] = 271733878;
    io[4] = -1009589776;
  };

  Rusha.prototype._padChunk = function _padChunk(chunkLen, msgLen) {
    var padChunkLen = padlen(chunkLen);
    var view = new Int32Array(this._heap, 0, padChunkLen >> 2);
    padZeroes(view, chunkLen);
    padData(view, chunkLen, msgLen);
    return padChunkLen;
  };

  Rusha.prototype._write = function _write(data, chunkOffset, chunkLen, off) {
    conv(data, this._h8, this._h32, chunkOffset, chunkLen, off || 0);
  };

  Rusha.prototype._coreCall = function _coreCall(data, chunkOffset, chunkLen, msgLen, finalize) {
    var padChunkLen = chunkLen;
    this._write(data, chunkOffset, chunkLen);
    if (finalize) {
      padChunkLen = this._padChunk(chunkLen, msgLen);
    }
    this._core.hash(padChunkLen, this._padMaxChunkLen);
  };

  Rusha.prototype.rawDigest = function rawDigest(str) {
    var msgLen = str.byteLength || str.length || str.size || 0;
    this._initState(this._heap, this._padMaxChunkLen);
    var chunkOffset = 0,
        chunkLen = this._maxChunkLen;
    for (chunkOffset = 0; msgLen > chunkOffset + chunkLen; chunkOffset += chunkLen) {
      this._coreCall(str, chunkOffset, chunkLen, msgLen, false);
    }
    this._coreCall(str, chunkOffset, msgLen - chunkOffset, msgLen, true);
    return getRawDigest(this._heap, this._padMaxChunkLen);
  };

  Rusha.prototype.digest = function digest(str) {
    return toHex(this.rawDigest(str).buffer);
  };

  Rusha.prototype.digestFromString = function digestFromString(str) {
    return this.digest(str);
  };

  Rusha.prototype.digestFromBuffer = function digestFromBuffer(str) {
    return this.digest(str);
  };

  Rusha.prototype.digestFromArrayBuffer = function digestFromArrayBuffer(str) {
    return this.digest(str);
  };

  Rusha.prototype.resetState = function resetState() {
    this._initState(this._heap, this._padMaxChunkLen);
    return this;
  };

  Rusha.prototype.append = function append(chunk) {
    var chunkOffset = 0;
    var chunkLen = chunk.byteLength || chunk.length || chunk.size || 0;
    var turnOffset = this._offset % this._maxChunkLen;
    var inputLen = void 0;

    this._offset += chunkLen;
    while (chunkOffset < chunkLen) {
      inputLen = Math.min(chunkLen - chunkOffset, this._maxChunkLen - turnOffset);
      this._write(chunk, chunkOffset, inputLen, turnOffset);
      turnOffset += inputLen;
      chunkOffset += inputLen;
      if (turnOffset === this._maxChunkLen) {
        this._core.hash(this._maxChunkLen, this._padMaxChunkLen);
        turnOffset = 0;
      }
    }
    return this;
  };

  Rusha.prototype.getState = function getState() {
    var turnOffset = this._offset % this._maxChunkLen;
    var heap = void 0;
    if (!turnOffset) {
      var io = new Int32Array(this._heap, this._padMaxChunkLen + 320, 5);
      heap = io.buffer.slice(io.byteOffset, io.byteOffset + io.byteLength);
    } else {
      heap = this._heap.slice(0);
    }
    return {
      offset: this._offset,
      heap: heap
    };
  };

  Rusha.prototype.setState = function setState(state) {
    this._offset = state.offset;
    if (state.heap.byteLength === 20) {
      var io = new Int32Array(this._heap, this._padMaxChunkLen + 320, 5);
      io.set(new Int32Array(state.heap));
    } else {
      this._h32.set(new Int32Array(state.heap));
    }
    return this;
  };

  Rusha.prototype.rawEnd = function rawEnd() {
    var msgLen = this._offset;
    var chunkLen = msgLen % this._maxChunkLen;
    var padChunkLen = this._padChunk(chunkLen, msgLen);
    this._core.hash(padChunkLen, this._padMaxChunkLen);
    var result = getRawDigest(this._heap, this._padMaxChunkLen);
    this._initState(this._heap, this._padMaxChunkLen);
    return result;
  };

  Rusha.prototype.end = function end() {
    return toHex(this.rawEnd().buffer);
  };

  return Rusha;
}();

module.exports = Rusha;
module.exports._core = RushaCore;

/***/ }),
/* 1 */
/***/ (function(module, exports) {

/* eslint-env commonjs, browser */

//
// toHex
//

var precomputedHex = new Array(256);
for (var i = 0; i < 256; i++) {
  precomputedHex[i] = (i < 0x10 ? '0' : '') + i.toString(16);
}

module.exports.toHex = function (arrayBuffer) {
  var binarray = new Uint8Array(arrayBuffer);
  var res = new Array(arrayBuffer.byteLength);
  for (var _i = 0; _i < res.length; _i++) {
    res[_i] = precomputedHex[binarray[_i]];
  }
  return res.join('');
};

//
// ceilHeapSize
//

module.exports.ceilHeapSize = function (v) {
  // The asm.js spec says:
  // The heap object's byteLength must be either
  // 2^n for n in [12, 24) or 2^24 * n for n ≥ 1.
  // Also, byteLengths smaller than 2^16 are deprecated.
  var p = 0;
  // If v is smaller than 2^16, the smallest possible solution
  // is 2^16.
  if (v <= 65536) return 65536;
  // If v < 2^24, we round up to 2^n,
  // otherwise we round up to 2^24 * n.
  if (v < 16777216) {
    for (p = 1; p < v; p = p << 1) {}
  } else {
    for (p = 16777216; p < v; p += 16777216) {}
  }
  return p;
};

//
// isDedicatedWorkerScope
//

module.exports.isDedicatedWorkerScope = function (self) {
  var isRunningInWorker = 'WorkerGlobalScope' in self && self instanceof self.WorkerGlobalScope;
  var isRunningInSharedWorker = 'SharedWorkerGlobalScope' in self && self instanceof self.SharedWorkerGlobalScope;
  var isRunningInServiceWorker = 'ServiceWorkerGlobalScope' in self && self instanceof self.ServiceWorkerGlobalScope;

  // Detects whether we run inside a dedicated worker or not.
  //
  // We can't just check for `DedicatedWorkerGlobalScope`, since IE11
  // has a bug where it only supports `WorkerGlobalScope`.
  //
  // Therefore, we consider us as running inside a dedicated worker
  // when we are running inside a worker, but not in a shared or service worker.
  //
  // When new types of workers are introduced, we will need to adjust this code.
  return isRunningInWorker && !isRunningInSharedWorker && !isRunningInServiceWorker;
};

/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

/* eslint-env commonjs, worker */

module.exports = function () {
  var Rusha = __webpack_require__(0);

  var hashData = function (hasher, data, cb) {
    try {
      return cb(null, hasher.digest(data));
    } catch (e) {
      return cb(e);
    }
  };

  var hashFile = function (hasher, readTotal, blockSize, file, cb) {
    var reader = new self.FileReader();
    reader.onloadend = function onloadend() {
      if (reader.error) {
        return cb(reader.error);
      }
      var buffer = reader.result;
      readTotal += reader.result.byteLength;
      try {
        hasher.append(buffer);
      } catch (e) {
        cb(e);
        return;
      }
      if (readTotal < file.size) {
        hashFile(hasher, readTotal, blockSize, file, cb);
      } else {
        cb(null, hasher.end());
      }
    };
    reader.readAsArrayBuffer(file.slice(readTotal, readTotal + blockSize));
  };

  var workerBehaviourEnabled = true;

  self.onmessage = function (event) {
    if (!workerBehaviourEnabled) {
      return;
    }

    var data = event.data.data,
        file = event.data.file,
        id = event.data.id;
    if (typeof id === 'undefined') return;
    if (!file && !data) return;
    var blockSize = event.data.blockSize || 4 * 1024 * 1024;
    var hasher = new Rusha(blockSize);
    hasher.resetState();
    var done = function (err, hash) {
      if (!err) {
        self.postMessage({ id: id, hash: hash });
      } else {
        self.postMessage({ id: id, error: err.name });
      }
    };
    if (data) hashData(hasher, data, done);
    if (file) hashFile(hasher, 0, blockSize, file, done);
  };

  return function () {
    workerBehaviourEnabled = false;
  };
};

/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

/* eslint-env commonjs, browser */

var work = __webpack_require__(4);
var Rusha = __webpack_require__(0);
var createHash = __webpack_require__(7);
var runWorker = __webpack_require__(2);

var _require = __webpack_require__(1),
    isDedicatedWorkerScope = _require.isDedicatedWorkerScope;

var isRunningInDedicatedWorker = typeof self !== 'undefined' && isDedicatedWorkerScope(self);

Rusha.disableWorkerBehaviour = isRunningInDedicatedWorker ? runWorker() : function () {};

Rusha.createWorker = function () {
  var worker = work(/*require.resolve*/(2));
  var terminate = worker.terminate;
  worker.terminate = function () {
    URL.revokeObjectURL(worker.objectURL);
    terminate.call(worker);
  };
  return worker;
};

Rusha.createHash = createHash;

module.exports = Rusha;

/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

function webpackBootstrapFunc (modules) {
/******/  // The module cache
/******/  var installedModules = {};

/******/  // The require function
/******/  function __webpack_require__(moduleId) {

/******/    // Check if module is in cache
/******/    if(installedModules[moduleId])
/******/      return installedModules[moduleId].exports;

/******/    // Create a new module (and put it into the cache)
/******/    var module = installedModules[moduleId] = {
/******/      i: moduleId,
/******/      l: false,
/******/      exports: {}
/******/    };

/******/    // Execute the module function
/******/    modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/    // Flag the module as loaded
/******/    module.l = true;

/******/    // Return the exports of the module
/******/    return module.exports;
/******/  }

/******/  // expose the modules object (__webpack_modules__)
/******/  __webpack_require__.m = modules;

/******/  // expose the module cache
/******/  __webpack_require__.c = installedModules;

/******/  // identity function for calling harmony imports with the correct context
/******/  __webpack_require__.i = function(value) { return value; };

/******/  // define getter function for harmony exports
/******/  __webpack_require__.d = function(exports, name, getter) {
/******/    if(!__webpack_require__.o(exports, name)) {
/******/      Object.defineProperty(exports, name, {
/******/        configurable: false,
/******/        enumerable: true,
/******/        get: getter
/******/      });
/******/    }
/******/  };

/******/  // define __esModule on exports
/******/  __webpack_require__.r = function(exports) {
/******/    Object.defineProperty(exports, '__esModule', { value: true });
/******/  };

/******/  // getDefaultExport function for compatibility with non-harmony modules
/******/  __webpack_require__.n = function(module) {
/******/    var getter = module && module.__esModule ?
/******/      function getDefault() { return module['default']; } :
/******/      function getModuleExports() { return module; };
/******/    __webpack_require__.d(getter, 'a', getter);
/******/    return getter;
/******/  };

/******/  // Object.prototype.hasOwnProperty.call
/******/  __webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };

/******/  // __webpack_public_path__
/******/  __webpack_require__.p = "/";

/******/  // on error function for async loading
/******/  __webpack_require__.oe = function(err) { console.error(err); throw err; };

  var f = __webpack_require__(__webpack_require__.s = ENTRY_MODULE)
  return f.default || f // try to call default if defined to also support babel esmodule exports
}

var moduleNameReqExp = '[\\.|\\-|\\+|\\w|\/|@]+'
var dependencyRegExp = '\\((\/\\*.*?\\*\/)?\s?.*?(' + moduleNameReqExp + ').*?\\)' // additional chars when output.pathinfo is true

// http://stackoverflow.com/a/2593661/130442
function quoteRegExp (str) {
  return (str + '').replace(/[.?*+^$[\]\\(){}|-]/g, '\\$&')
}

function getModuleDependencies (sources, module, queueName) {
  var retval = {}
  retval[queueName] = []

  var fnString = module.toString()
  var wrapperSignature = fnString.match(/^function\s?\(\w+,\s*\w+,\s*(\w+)\)/)
  if (!wrapperSignature) return retval
  var webpackRequireName = wrapperSignature[1]

  // main bundle deps
  var re = new RegExp('(\\\\n|\\W)' + quoteRegExp(webpackRequireName) + dependencyRegExp, 'g')
  var match
  while ((match = re.exec(fnString))) {
    if (match[3] === 'dll-reference') continue
    retval[queueName].push(match[3])
  }

  // dll deps
  re = new RegExp('\\(' + quoteRegExp(webpackRequireName) + '\\("(dll-reference\\s(' + moduleNameReqExp + '))"\\)\\)' + dependencyRegExp, 'g')
  while ((match = re.exec(fnString))) {
    if (!sources[match[2]]) {
      retval[queueName].push(match[1])
      sources[match[2]] = __webpack_require__(match[1]).m
    }
    retval[match[2]] = retval[match[2]] || []
    retval[match[2]].push(match[4])
  }

  return retval
}

function hasValuesInQueues (queues) {
  var keys = Object.keys(queues)
  return keys.reduce(function (hasValues, key) {
    return hasValues || queues[key].length > 0
  }, false)
}

function getRequiredModules (sources, moduleId) {
  var modulesQueue = {
    main: [moduleId]
  }
  var requiredModules = {
    main: []
  }
  var seenModules = {
    main: {}
  }

  while (hasValuesInQueues(modulesQueue)) {
    var queues = Object.keys(modulesQueue)
    for (var i = 0; i < queues.length; i++) {
      var queueName = queues[i]
      var queue = modulesQueue[queueName]
      var moduleToCheck = queue.pop()
      seenModules[queueName] = seenModules[queueName] || {}
      if (seenModules[queueName][moduleToCheck] || !sources[queueName][moduleToCheck]) continue
      seenModules[queueName][moduleToCheck] = true
      requiredModules[queueName] = requiredModules[queueName] || []
      requiredModules[queueName].push(moduleToCheck)
      var newModules = getModuleDependencies(sources, sources[queueName][moduleToCheck], queueName)
      var newModulesKeys = Object.keys(newModules)
      for (var j = 0; j < newModulesKeys.length; j++) {
        modulesQueue[newModulesKeys[j]] = modulesQueue[newModulesKeys[j]] || []
        modulesQueue[newModulesKeys[j]] = modulesQueue[newModulesKeys[j]].concat(newModules[newModulesKeys[j]])
      }
    }
  }

  return requiredModules
}

module.exports = function (moduleId, options) {
  options = options || {}
  var sources = {
    main: __webpack_require__.m
  }

  var requiredModules = options.all ? { main: Object.keys(sources) } : getRequiredModules(sources, moduleId)

  var src = ''

  Object.keys(requiredModules).filter(function (m) { return m !== 'main' }).forEach(function (module) {
    var entryModule = 0
    while (requiredModules[module][entryModule]) {
      entryModule++
    }
    requiredModules[module].push(entryModule)
    sources[module][entryModule] = '(function(module, exports, __webpack_require__) { module.exports = __webpack_require__; })'
    src = src + 'var ' + module + ' = (' + webpackBootstrapFunc.toString().replace('ENTRY_MODULE', JSON.stringify(entryModule)) + ')({' + requiredModules[module].map(function (id) { return '' + JSON.stringify(id) + ': ' + sources[module][id].toString() }).join(',') + '});\n'
  })

  src = src + '(' + webpackBootstrapFunc.toString().replace('ENTRY_MODULE', JSON.stringify(moduleId)) + ')({' + requiredModules.main.map(function (id) { return '' + JSON.stringify(id) + ': ' + sources.main[id].toString() }).join(',') + '})(self);'

  var blob = new window.Blob([src], { type: 'text/javascript' })
  if (options.bare) { return blob }

  var URL = window.URL || window.webkitURL || window.mozURL || window.msURL

  var workerUrl = URL.createObjectURL(blob)
  var worker = new window.Worker(workerUrl)
  worker.objectURL = workerUrl

  return worker
}


/***/ }),
/* 5 */
/***/ (function(module, exports) {

// The low-level RushCore module provides the heart of Rusha,
// a high-speed sha1 implementation working on an Int32Array heap.
// At first glance, the implementation seems complicated, however
// with the SHA1 spec at hand, it is obvious this almost a textbook
// implementation that has a few functions hand-inlined and a few loops
// hand-unrolled.
module.exports = function RushaCore(stdlib$846, foreign$847, heap$848) {
    'use asm';
    var H$849 = new stdlib$846.Int32Array(heap$848);
    function hash$850(k$851, x$852) {
        // k in bytes
        k$851 = k$851 | 0;
        x$852 = x$852 | 0;
        var i$853 = 0, j$854 = 0, y0$855 = 0, z0$856 = 0, y1$857 = 0, z1$858 = 0, y2$859 = 0, z2$860 = 0, y3$861 = 0, z3$862 = 0, y4$863 = 0, z4$864 = 0, t0$865 = 0, t1$866 = 0;
        y0$855 = H$849[x$852 + 320 >> 2] | 0;
        y1$857 = H$849[x$852 + 324 >> 2] | 0;
        y2$859 = H$849[x$852 + 328 >> 2] | 0;
        y3$861 = H$849[x$852 + 332 >> 2] | 0;
        y4$863 = H$849[x$852 + 336 >> 2] | 0;
        for (i$853 = 0; (i$853 | 0) < (k$851 | 0); i$853 = i$853 + 64 | 0) {
            z0$856 = y0$855;
            z1$858 = y1$857;
            z2$860 = y2$859;
            z3$862 = y3$861;
            z4$864 = y4$863;
            for (j$854 = 0; (j$854 | 0) < 64; j$854 = j$854 + 4 | 0) {
                t1$866 = H$849[i$853 + j$854 >> 2] | 0;
                t0$865 = ((y0$855 << 5 | y0$855 >>> 27) + (y1$857 & y2$859 | ~y1$857 & y3$861) | 0) + ((t1$866 + y4$863 | 0) + 1518500249 | 0) | 0;
                y4$863 = y3$861;
                y3$861 = y2$859;
                y2$859 = y1$857 << 30 | y1$857 >>> 2;
                y1$857 = y0$855;
                y0$855 = t0$865;
                H$849[k$851 + j$854 >> 2] = t1$866;
            }
            for (j$854 = k$851 + 64 | 0; (j$854 | 0) < (k$851 + 80 | 0); j$854 = j$854 + 4 | 0) {
                t1$866 = (H$849[j$854 - 12 >> 2] ^ H$849[j$854 - 32 >> 2] ^ H$849[j$854 - 56 >> 2] ^ H$849[j$854 - 64 >> 2]) << 1 | (H$849[j$854 - 12 >> 2] ^ H$849[j$854 - 32 >> 2] ^ H$849[j$854 - 56 >> 2] ^ H$849[j$854 - 64 >> 2]) >>> 31;
                t0$865 = ((y0$855 << 5 | y0$855 >>> 27) + (y1$857 & y2$859 | ~y1$857 & y3$861) | 0) + ((t1$866 + y4$863 | 0) + 1518500249 | 0) | 0;
                y4$863 = y3$861;
                y3$861 = y2$859;
                y2$859 = y1$857 << 30 | y1$857 >>> 2;
                y1$857 = y0$855;
                y0$855 = t0$865;
                H$849[j$854 >> 2] = t1$866;
            }
            for (j$854 = k$851 + 80 | 0; (j$854 | 0) < (k$851 + 160 | 0); j$854 = j$854 + 4 | 0) {
                t1$866 = (H$849[j$854 - 12 >> 2] ^ H$849[j$854 - 32 >> 2] ^ H$849[j$854 - 56 >> 2] ^ H$849[j$854 - 64 >> 2]) << 1 | (H$849[j$854 - 12 >> 2] ^ H$849[j$854 - 32 >> 2] ^ H$849[j$854 - 56 >> 2] ^ H$849[j$854 - 64 >> 2]) >>> 31;
                t0$865 = ((y0$855 << 5 | y0$855 >>> 27) + (y1$857 ^ y2$859 ^ y3$861) | 0) + ((t1$866 + y4$863 | 0) + 1859775393 | 0) | 0;
                y4$863 = y3$861;
                y3$861 = y2$859;
                y2$859 = y1$857 << 30 | y1$857 >>> 2;
                y1$857 = y0$855;
                y0$855 = t0$865;
                H$849[j$854 >> 2] = t1$866;
            }
            for (j$854 = k$851 + 160 | 0; (j$854 | 0) < (k$851 + 240 | 0); j$854 = j$854 + 4 | 0) {
                t1$866 = (H$849[j$854 - 12 >> 2] ^ H$849[j$854 - 32 >> 2] ^ H$849[j$854 - 56 >> 2] ^ H$849[j$854 - 64 >> 2]) << 1 | (H$849[j$854 - 12 >> 2] ^ H$849[j$854 - 32 >> 2] ^ H$849[j$854 - 56 >> 2] ^ H$849[j$854 - 64 >> 2]) >>> 31;
                t0$865 = ((y0$855 << 5 | y0$855 >>> 27) + (y1$857 & y2$859 | y1$857 & y3$861 | y2$859 & y3$861) | 0) + ((t1$866 + y4$863 | 0) - 1894007588 | 0) | 0;
                y4$863 = y3$861;
                y3$861 = y2$859;
                y2$859 = y1$857 << 30 | y1$857 >>> 2;
                y1$857 = y0$855;
                y0$855 = t0$865;
                H$849[j$854 >> 2] = t1$866;
            }
            for (j$854 = k$851 + 240 | 0; (j$854 | 0) < (k$851 + 320 | 0); j$854 = j$854 + 4 | 0) {
                t1$866 = (H$849[j$854 - 12 >> 2] ^ H$849[j$854 - 32 >> 2] ^ H$849[j$854 - 56 >> 2] ^ H$849[j$854 - 64 >> 2]) << 1 | (H$849[j$854 - 12 >> 2] ^ H$849[j$854 - 32 >> 2] ^ H$849[j$854 - 56 >> 2] ^ H$849[j$854 - 64 >> 2]) >>> 31;
                t0$865 = ((y0$855 << 5 | y0$855 >>> 27) + (y1$857 ^ y2$859 ^ y3$861) | 0) + ((t1$866 + y4$863 | 0) - 899497514 | 0) | 0;
                y4$863 = y3$861;
                y3$861 = y2$859;
                y2$859 = y1$857 << 30 | y1$857 >>> 2;
                y1$857 = y0$855;
                y0$855 = t0$865;
                H$849[j$854 >> 2] = t1$866;
            }
            y0$855 = y0$855 + z0$856 | 0;
            y1$857 = y1$857 + z1$858 | 0;
            y2$859 = y2$859 + z2$860 | 0;
            y3$861 = y3$861 + z3$862 | 0;
            y4$863 = y4$863 + z4$864 | 0;
        }
        H$849[x$852 + 320 >> 2] = y0$855;
        H$849[x$852 + 324 >> 2] = y1$857;
        H$849[x$852 + 328 >> 2] = y2$859;
        H$849[x$852 + 332 >> 2] = y3$861;
        H$849[x$852 + 336 >> 2] = y4$863;
    }
    return { hash: hash$850 };
};

/***/ }),
/* 6 */
/***/ (function(module, exports) {

var _this = this;

/* eslint-env commonjs, browser */

var reader = void 0;
if (typeof self !== 'undefined' && typeof self.FileReaderSync !== 'undefined') {
  reader = new self.FileReaderSync();
}

// Convert a binary string and write it to the heap.
// A binary string is expected to only contain char codes < 256.
var convStr = function (str, H8, H32, start, len, off) {
  var i = void 0,
      om = off % 4,
      lm = (len + om) % 4,
      j = len - lm;
  switch (om) {
    case 0:
      H8[off] = str.charCodeAt(start + 3);
    case 1:
      H8[off + 1 - (om << 1) | 0] = str.charCodeAt(start + 2);
    case 2:
      H8[off + 2 - (om << 1) | 0] = str.charCodeAt(start + 1);
    case 3:
      H8[off + 3 - (om << 1) | 0] = str.charCodeAt(start);
  }
  if (len < lm + (4 - om)) {
    return;
  }
  for (i = 4 - om; i < j; i = i + 4 | 0) {
    H32[off + i >> 2] = str.charCodeAt(start + i) << 24 | str.charCodeAt(start + i + 1) << 16 | str.charCodeAt(start + i + 2) << 8 | str.charCodeAt(start + i + 3);
  }
  switch (lm) {
    case 3:
      H8[off + j + 1 | 0] = str.charCodeAt(start + j + 2);
    case 2:
      H8[off + j + 2 | 0] = str.charCodeAt(start + j + 1);
    case 1:
      H8[off + j + 3 | 0] = str.charCodeAt(start + j);
  }
};

// Convert a buffer or array and write it to the heap.
// The buffer or array is expected to only contain elements < 256.
var convBuf = function (buf, H8, H32, start, len, off) {
  var i = void 0,
      om = off % 4,
      lm = (len + om) % 4,
      j = len - lm;
  switch (om) {
    case 0:
      H8[off] = buf[start + 3];
    case 1:
      H8[off + 1 - (om << 1) | 0] = buf[start + 2];
    case 2:
      H8[off + 2 - (om << 1) | 0] = buf[start + 1];
    case 3:
      H8[off + 3 - (om << 1) | 0] = buf[start];
  }
  if (len < lm + (4 - om)) {
    return;
  }
  for (i = 4 - om; i < j; i = i + 4 | 0) {
    H32[off + i >> 2 | 0] = buf[start + i] << 24 | buf[start + i + 1] << 16 | buf[start + i + 2] << 8 | buf[start + i + 3];
  }
  switch (lm) {
    case 3:
      H8[off + j + 1 | 0] = buf[start + j + 2];
    case 2:
      H8[off + j + 2 | 0] = buf[start + j + 1];
    case 1:
      H8[off + j + 3 | 0] = buf[start + j];
  }
};

var convBlob = function (blob, H8, H32, start, len, off) {
  var i = void 0,
      om = off % 4,
      lm = (len + om) % 4,
      j = len - lm;
  var buf = new Uint8Array(reader.readAsArrayBuffer(blob.slice(start, start + len)));
  switch (om) {
    case 0:
      H8[off] = buf[3];
    case 1:
      H8[off + 1 - (om << 1) | 0] = buf[2];
    case 2:
      H8[off + 2 - (om << 1) | 0] = buf[1];
    case 3:
      H8[off + 3 - (om << 1) | 0] = buf[0];
  }
  if (len < lm + (4 - om)) {
    return;
  }
  for (i = 4 - om; i < j; i = i + 4 | 0) {
    H32[off + i >> 2 | 0] = buf[i] << 24 | buf[i + 1] << 16 | buf[i + 2] << 8 | buf[i + 3];
  }
  switch (lm) {
    case 3:
      H8[off + j + 1 | 0] = buf[j + 2];
    case 2:
      H8[off + j + 2 | 0] = buf[j + 1];
    case 1:
      H8[off + j + 3 | 0] = buf[j];
  }
};

module.exports = function (data, H8, H32, start, len, off) {
  if (typeof data === 'string') {
    return convStr(data, H8, H32, start, len, off);
  }
  if (data instanceof Array) {
    return convBuf(data, H8, H32, start, len, off);
  }
  // Safely doing a Buffer check using "this" to avoid Buffer polyfill to be included in the dist
  if (_this && _this.Buffer && _this.Buffer.isBuffer(data)) {
    return convBuf(data, H8, H32, start, len, off);
  }
  if (data instanceof ArrayBuffer) {
    return convBuf(new Uint8Array(data), H8, H32, start, len, off);
  }
  if (data.buffer instanceof ArrayBuffer) {
    return convBuf(new Uint8Array(data.buffer, data.byteOffset, data.byteLength), H8, H32, start, len, off);
  }
  if (data instanceof Blob) {
    return convBlob(data, H8, H32, start, len, off);
  }
  throw new Error('Unsupported data type.');
};

/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/* eslint-env commonjs, browser */

var Rusha = __webpack_require__(0);

var _require = __webpack_require__(1),
    toHex = _require.toHex;

var Hash = function () {
  function Hash() {
    _classCallCheck(this, Hash);

    this._rusha = new Rusha();
    this._rusha.resetState();
  }

  Hash.prototype.update = function update(data) {
    this._rusha.append(data);
    return this;
  };

  Hash.prototype.digest = function digest(encoding) {
    var digest = this._rusha.rawEnd().buffer;
    if (!encoding) {
      return digest;
    }
    if (encoding === 'hex') {
      return toHex(digest);
    }
    throw new Error('unsupported digest encoding');
  };

  return Hash;
}();

module.exports = function () {
  return new Hash();
};

/***/ })
/******/ ]);
});
},{}],88:[function(require,module,exports){
/* eslint-disable node/no-deprecated-api */
var buffer = require('buffer')
var Buffer = buffer.Buffer

// alternative to using Object.keys for old browsers
function copyProps (src, dst) {
  for (var key in src) {
    dst[key] = src[key]
  }
}
if (Buffer.from && Buffer.alloc && Buffer.allocUnsafe && Buffer.allocUnsafeSlow) {
  module.exports = buffer
} else {
  // Copy properties from require('buffer')
  copyProps(buffer, exports)
  exports.Buffer = SafeBuffer
}

function SafeBuffer (arg, encodingOrOffset, length) {
  return Buffer(arg, encodingOrOffset, length)
}

SafeBuffer.prototype = Object.create(Buffer.prototype)

// Copy static methods from Buffer
copyProps(Buffer, SafeBuffer)

SafeBuffer.from = function (arg, encodingOrOffset, length) {
  if (typeof arg === 'number') {
    throw new TypeError('Argument must not be a number')
  }
  return Buffer(arg, encodingOrOffset, length)
}

SafeBuffer.alloc = function (size, fill, encoding) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  var buf = Buffer(size)
  if (fill !== undefined) {
    if (typeof encoding === 'string') {
      buf.fill(fill, encoding)
    } else {
      buf.fill(fill)
    }
  } else {
    buf.fill(0)
  }
  return buf
}

SafeBuffer.allocUnsafe = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return Buffer(size)
}

SafeBuffer.allocUnsafeSlow = function (size) {
  if (typeof size !== 'number') {
    throw new TypeError('Argument must be a number')
  }
  return buffer.SlowBuffer(size)
}

},{"buffer":22}],89:[function(require,module,exports){
(function (Buffer){
module.exports = function (stream, cb) {
  var chunks = []
  stream.on('data', function (chunk) {
    chunks.push(chunk)
  })
  stream.once('end', function () {
    if (cb) cb(null, Buffer.concat(chunks))
    cb = null
  })
  stream.once('error', function (err) {
    if (cb) cb(err)
    cb = null
  })
}

}).call(this,require("buffer").Buffer)
},{"buffer":22}],90:[function(require,module,exports){
(function (Buffer){
module.exports = simpleGet

const concat = require('simple-concat')
const decompressResponse = require('decompress-response') // excluded from browser build
const http = require('http')
const https = require('https')
const once = require('once')
const querystring = require('querystring')
const url = require('url')

const isStream = o => o !== null && typeof o === 'object' && typeof o.pipe === 'function'

function simpleGet (opts, cb) {
  opts = Object.assign({ maxRedirects: 10 }, typeof opts === 'string' ? { url: opts } : opts)
  cb = once(cb)

  if (opts.url) {
    const { hostname, port, protocol, auth, path } = url.parse(opts.url) // eslint-disable-line node/no-deprecated-api
    delete opts.url
    if (!hostname && !port && !protocol && !auth) opts.path = path // Relative redirect
    else Object.assign(opts, { hostname, port, protocol, auth, path }) // Absolute redirect
  }

  const headers = { 'accept-encoding': 'gzip, deflate' }
  if (opts.headers) Object.keys(opts.headers).forEach(k => (headers[k.toLowerCase()] = opts.headers[k]))
  opts.headers = headers

  let body
  if (opts.body) {
    body = opts.json && !isStream(opts.body) ? JSON.stringify(opts.body) : opts.body
  } else if (opts.form) {
    body = typeof opts.form === 'string' ? opts.form : querystring.stringify(opts.form)
    opts.headers['content-type'] = 'application/x-www-form-urlencoded'
  }

  if (body) {
    if (!opts.method) opts.method = 'POST'
    if (!isStream(body)) opts.headers['content-length'] = Buffer.byteLength(body)
    if (opts.json && !opts.form) opts.headers['content-type'] = 'application/json'
  }
  delete opts.body; delete opts.form

  if (opts.json) opts.headers.accept = 'application/json'
  if (opts.method) opts.method = opts.method.toUpperCase()

  const protocol = opts.protocol === 'https:' ? https : http // Support http/https urls
  const req = protocol.request(opts, res => {
    if (opts.followRedirects !== false && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
      opts.url = res.headers.location // Follow 3xx redirects
      delete opts.headers.host // Discard `host` header on redirect (see #32)
      res.resume() // Discard response

      if (opts.method === 'POST' && [301, 302].includes(res.statusCode)) {
        opts.method = 'GET' // On 301/302 redirect, change POST to GET (see #35)
        delete opts.headers['content-length']; delete opts.headers['content-type']
      }

      if (opts.maxRedirects-- === 0) return cb(new Error('too many redirects'))
      else return simpleGet(opts, cb)
    }

    const tryUnzip = typeof decompressResponse === 'function' && opts.method !== 'HEAD'
    cb(null, tryUnzip ? decompressResponse(res) : res)
  })
  req.on('timeout', () => {
    req.abort()
    cb(new Error('Request timed out'))
  })
  req.on('error', cb)

  if (isStream(body)) body.on('error', cb).pipe(req)
  else req.end(body)

  return req
}

simpleGet.concat = (opts, cb) => {
  return simpleGet(opts, (err, res) => {
    if (err) return cb(err)
    concat(res, (err, data) => {
      if (err) return cb(err)
      if (opts.json) {
        try {
          data = JSON.parse(data.toString())
        } catch (err) {
          return cb(err, res, data)
        }
      }
      cb(null, res, data)
    })
  })
}

;['get', 'post', 'put', 'patch', 'head', 'delete'].forEach(method => {
  simpleGet[method] = (opts, cb) => {
    if (typeof opts === 'string') opts = { url: opts }
    return simpleGet(Object.assign({ method: method.toUpperCase() }, opts), cb)
  }
})

}).call(this,require("buffer").Buffer)
},{"buffer":22,"decompress-response":17,"http":96,"https":32,"once":52,"querystring":63,"simple-concat":89,"url":113}],91:[function(require,module,exports){
(function (Buffer){
var debug = require('debug')('simple-peer')
var getBrowserRTC = require('get-browser-rtc')
var randombytes = require('randombytes')
var stream = require('readable-stream')
var queueMicrotask = require('queue-microtask') // TODO: remove when Node 10 is not supported

var MAX_BUFFERED_AMOUNT = 64 * 1024
var ICECOMPLETE_TIMEOUT = 5 * 1000
var CHANNEL_CLOSING_TIMEOUT = 5 * 1000

// HACK: Filter trickle lines when trickle is disabled #354
function filterTrickle (sdp) {
  return sdp.replace(/a=ice-options:trickle\s\n/g, '')
}

function makeError (message, code) {
  var err = new Error(message)
  err.code = code
  return err
}

function warn (message) {
  console.warn(message)
}

/**
 * WebRTC peer connection. Same API as node core `net.Socket`, plus a few extra methods.
 * Duplex stream.
 * @param {Object} opts
 */
class Peer extends stream.Duplex {
  constructor (opts) {
    opts = Object.assign({
      allowHalfOpen: false
    }, opts)

    super(opts)

    this._id = randombytes(4).toString('hex').slice(0, 7)
    this._debug('new peer %o', opts)

    this.channelName = opts.initiator
      ? opts.channelName || randombytes(20).toString('hex')
      : null

    this.initiator = opts.initiator || false
    this.channelConfig = opts.channelConfig || Peer.channelConfig
    this.config = Object.assign({}, Peer.config, opts.config)
    this.offerOptions = opts.offerOptions || {}
    this.answerOptions = opts.answerOptions || {}
    this.sdpTransform = opts.sdpTransform || (sdp => sdp)
    this.streams = opts.streams || (opts.stream ? [opts.stream] : []) // support old "stream" option
    this.trickle = opts.trickle !== undefined ? opts.trickle : true
    this.allowHalfTrickle = opts.allowHalfTrickle !== undefined ? opts.allowHalfTrickle : false
    this.iceCompleteTimeout = opts.iceCompleteTimeout || ICECOMPLETE_TIMEOUT

    this.destroyed = false
    this._connected = false

    this.remoteAddress = undefined
    this.remoteFamily = undefined
    this.remotePort = undefined
    this.localAddress = undefined
    this.localFamily = undefined
    this.localPort = undefined

    this._wrtc = (opts.wrtc && typeof opts.wrtc === 'object')
      ? opts.wrtc
      : getBrowserRTC()

    if (!this._wrtc) {
      if (typeof window === 'undefined') {
        throw makeError('No WebRTC support: Specify `opts.wrtc` option in this environment', 'ERR_WEBRTC_SUPPORT')
      } else {
        throw makeError('No WebRTC support: Not a supported browser', 'ERR_WEBRTC_SUPPORT')
      }
    }

    this._pcReady = false
    this._channelReady = false
    this._iceComplete = false // ice candidate trickle done (got null candidate)
    this._iceCompleteTimer = null // send an offer/answer anyway after some timeout
    this._channel = null
    this._pendingCandidates = []

    this._isNegotiating = !this.initiator // is this peer waiting for negotiation to complete?
    this._batchedNegotiation = false // batch synchronous negotiations
    this._queuedNegotiation = false // is there a queued negotiation request?
    this._sendersAwaitingStable = []
    this._senderMap = new Map()
    this._firstStable = true
    this._closingInterval = null

    this._remoteTracks = []
    this._remoteStreams = []

    this._chunk = null
    this._cb = null
    this._interval = null

    try {
      this._pc = new (this._wrtc.RTCPeerConnection)(this.config)
    } catch (err) {
      queueMicrotask(() => this.destroy(makeError(err, 'ERR_PC_CONSTRUCTOR')))
      return
    }

    // We prefer feature detection whenever possible, but sometimes that's not
    // possible for certain implementations.
    this._isReactNativeWebrtc = typeof this._pc._peerConnectionId === 'number'

    this._pc.oniceconnectionstatechange = () => {
      this._onIceStateChange()
    }
    this._pc.onicegatheringstatechange = () => {
      this._onIceStateChange()
    }
    this._pc.onconnectionstatechange = () => {
      this._onConnectionStateChange()
    }
    this._pc.onsignalingstatechange = () => {
      this._onSignalingStateChange()
    }
    this._pc.onicecandidate = event => {
      this._onIceCandidate(event)
    }

    // Other spec events, unused by this implementation:
    // - onconnectionstatechange
    // - onicecandidateerror
    // - onfingerprintfailure
    // - onnegotiationneeded

    if (this.initiator) {
      this._setupData({
        channel: this._pc.createDataChannel(this.channelName, this.channelConfig)
      })
    } else {
      this._pc.ondatachannel = event => {
        this._setupData(event)
      }
    }

    if (this.streams) {
      this.streams.forEach(stream => {
        this.addStream(stream)
      })
    }
    this._pc.ontrack = event => {
      this._onTrack(event)
    }

    if (this.initiator) {
      this._needsNegotiation()
    }

    this._onFinishBound = () => {
      this._onFinish()
    }
    this.once('finish', this._onFinishBound)
  }

  get bufferSize () {
    return (this._channel && this._channel.bufferedAmount) || 0
  }

  // HACK: it's possible channel.readyState is "closing" before peer.destroy() fires
  // https://bugs.chromium.org/p/chromium/issues/detail?id=882743
  get connected () {
    return (this._connected && this._channel.readyState === 'open')
  }

  address () {
    return { port: this.localPort, family: this.localFamily, address: this.localAddress }
  }

  signal (data) {
    if (this.destroyed) throw makeError('cannot signal after peer is destroyed', 'ERR_SIGNALING')
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data)
      } catch (err) {
        data = {}
      }
    }
    this._debug('signal()')

    if (data.renegotiate && this.initiator) {
      this._debug('got request to renegotiate')
      this._needsNegotiation()
    }
    if (data.transceiverRequest && this.initiator) {
      this._debug('got request for transceiver')
      this.addTransceiver(data.transceiverRequest.kind, data.transceiverRequest.init)
    }
    if (data.candidate) {
      if (this._pc.remoteDescription && this._pc.remoteDescription.type) {
        this._addIceCandidate(data.candidate)
      } else {
        this._pendingCandidates.push(data.candidate)
      }
    }
    if (data.sdp) {
      this._pc.setRemoteDescription(new (this._wrtc.RTCSessionDescription)(data))
        .then(() => {
          if (this.destroyed) return

          this._pendingCandidates.forEach(candidate => {
            this._addIceCandidate(candidate)
          })
          this._pendingCandidates = []

          if (this._pc.remoteDescription.type === 'offer') this._createAnswer()
        })
        .catch(err => {
          this.destroy(makeError(err, 'ERR_SET_REMOTE_DESCRIPTION'))
        })
    }
    if (!data.sdp && !data.candidate && !data.renegotiate && !data.transceiverRequest) {
      this.destroy(makeError('signal() called with invalid signal data', 'ERR_SIGNALING'))
    }
  }

  _addIceCandidate (candidate) {
    var iceCandidateObj = new this._wrtc.RTCIceCandidate(candidate)
    this._pc.addIceCandidate(iceCandidateObj)
      .catch(err => {
        if (!iceCandidateObj.address || iceCandidateObj.address.endsWith('.local')) {
          warn('Ignoring unsupported ICE candidate.')
        } else {
          this.destroy(makeError(err, 'ERR_ADD_ICE_CANDIDATE'))
        }
      })
  }

  /**
   * Send text/binary data to the remote peer.
   * @param {ArrayBufferView|ArrayBuffer|Buffer|string|Blob} chunk
   */
  send (chunk) {
    this._channel.send(chunk)
  }

  /**
   * Add a Transceiver to the connection.
   * @param {String} kind
   * @param {Object} init
   */
  addTransceiver (kind, init) {
    this._debug('addTransceiver()')

    if (this.initiator) {
      try {
        this._pc.addTransceiver(kind, init)
        this._needsNegotiation()
      } catch (err) {
        this.destroy(makeError(err, 'ERR_ADD_TRANSCEIVER'))
      }
    } else {
      this.emit('signal', { // request initiator to renegotiate
        transceiverRequest: { kind, init }
      })
    }
  }

  /**
   * Add a MediaStream to the connection.
   * @param {MediaStream} stream
   */
  addStream (stream) {
    this._debug('addStream()')

    stream.getTracks().forEach(track => {
      this.addTrack(track, stream)
    })
  }

  /**
   * Add a MediaStreamTrack to the connection.
   * @param {MediaStreamTrack} track
   * @param {MediaStream} stream
   */
  addTrack (track, stream) {
    this._debug('addTrack()')

    var submap = this._senderMap.get(track) || new Map() // nested Maps map [track, stream] to sender
    var sender = submap.get(stream)
    if (!sender) {
      sender = this._pc.addTrack(track, stream)
      submap.set(stream, sender)
      this._senderMap.set(track, submap)
      this._needsNegotiation()
    } else if (sender.removed) {
      throw makeError('Track has been removed. You should enable/disable tracks that you want to re-add.', 'ERR_SENDER_REMOVED')
    } else {
      throw makeError('Track has already been added to that stream.', 'ERR_SENDER_ALREADY_ADDED')
    }
  }

  /**
   * Replace a MediaStreamTrack by another in the connection.
   * @param {MediaStreamTrack} oldTrack
   * @param {MediaStreamTrack} newTrack
   * @param {MediaStream} stream
   */
  replaceTrack (oldTrack, newTrack, stream) {
    this._debug('replaceTrack()')

    var submap = this._senderMap.get(oldTrack)
    var sender = submap ? submap.get(stream) : null
    if (!sender) {
      throw makeError('Cannot replace track that was never added.', 'ERR_TRACK_NOT_ADDED')
    }
    if (newTrack) this._senderMap.set(newTrack, submap)

    if (sender.replaceTrack != null) {
      sender.replaceTrack(newTrack)
    } else {
      this.destroy(makeError('replaceTrack is not supported in this browser', 'ERR_UNSUPPORTED_REPLACETRACK'))
    }
  }

  /**
   * Remove a MediaStreamTrack from the connection.
   * @param {MediaStreamTrack} track
   * @param {MediaStream} stream
   */
  removeTrack (track, stream) {
    this._debug('removeSender()')

    var submap = this._senderMap.get(track)
    var sender = submap ? submap.get(stream) : null
    if (!sender) {
      throw makeError('Cannot remove track that was never added.', 'ERR_TRACK_NOT_ADDED')
    }
    try {
      sender.removed = true
      this._pc.removeTrack(sender)
    } catch (err) {
      if (err.name === 'NS_ERROR_UNEXPECTED') {
        this._sendersAwaitingStable.push(sender) // HACK: Firefox must wait until (signalingState === stable) https://bugzilla.mozilla.org/show_bug.cgi?id=1133874
      } else {
        this.destroy(makeError(err, 'ERR_REMOVE_TRACK'))
      }
    }
    this._needsNegotiation()
  }

  /**
   * Remove a MediaStream from the connection.
   * @param {MediaStream} stream
   */
  removeStream (stream) {
    this._debug('removeSenders()')

    stream.getTracks().forEach(track => {
      this.removeTrack(track, stream)
    })
  }

  _needsNegotiation () {
    this._debug('_needsNegotiation')
    if (this._batchedNegotiation) return // batch synchronous renegotiations
    this._batchedNegotiation = true
    queueMicrotask(() => {
      this._batchedNegotiation = false
      this._debug('starting batched negotiation')
      this.negotiate()
    })
  }

  negotiate () {
    if (this.initiator) {
      if (this._isNegotiating) {
        this._queuedNegotiation = true
        this._debug('already negotiating, queueing')
      } else {
        this._debug('start negotiation')
        setTimeout(() => { // HACK: Chrome crashes if we immediately call createOffer
          this._createOffer()
        }, 0)
      }
    } else {
      if (!this._isNegotiating) {
        this._debug('requesting negotiation from initiator')
        this.emit('signal', { // request initiator to renegotiate
          renegotiate: true
        })
      }
    }
    this._isNegotiating = true
  }

  // TODO: Delete this method once readable-stream is updated to contain a default
  // implementation of destroy() that automatically calls _destroy()
  // See: https://github.com/nodejs/readable-stream/issues/283
  destroy (err) {
    this._destroy(err, () => {})
  }

  _destroy (err, cb) {
    if (this.destroyed) return

    this._debug('destroy (error: %s)', err && (err.message || err))

    this.readable = this.writable = false

    if (!this._readableState.ended) this.push(null)
    if (!this._writableState.finished) this.end()

    this.destroyed = true
    this._connected = false
    this._pcReady = false
    this._channelReady = false
    this._remoteTracks = null
    this._remoteStreams = null
    this._senderMap = null

    clearInterval(this._closingInterval)
    this._closingInterval = null

    clearInterval(this._interval)
    this._interval = null
    this._chunk = null
    this._cb = null

    if (this._onFinishBound) this.removeListener('finish', this._onFinishBound)
    this._onFinishBound = null

    if (this._channel) {
      try {
        this._channel.close()
      } catch (err) {}

      this._channel.onmessage = null
      this._channel.onopen = null
      this._channel.onclose = null
      this._channel.onerror = null
    }
    if (this._pc) {
      try {
        this._pc.close()
      } catch (err) {}

      this._pc.oniceconnectionstatechange = null
      this._pc.onicegatheringstatechange = null
      this._pc.onsignalingstatechange = null
      this._pc.onicecandidate = null
      this._pc.ontrack = null
      this._pc.ondatachannel = null
    }
    this._pc = null
    this._channel = null

    if (err) this.emit('error', err)
    this.emit('close')
    cb()
  }

  _setupData (event) {
    if (!event.channel) {
      // In some situations `pc.createDataChannel()` returns `undefined` (in wrtc),
      // which is invalid behavior. Handle it gracefully.
      // See: https://github.com/feross/simple-peer/issues/163
      return this.destroy(makeError('Data channel event is missing `channel` property', 'ERR_DATA_CHANNEL'))
    }

    this._channel = event.channel
    this._channel.binaryType = 'arraybuffer'

    if (typeof this._channel.bufferedAmountLowThreshold === 'number') {
      this._channel.bufferedAmountLowThreshold = MAX_BUFFERED_AMOUNT
    }

    this.channelName = this._channel.label

    this._channel.onmessage = event => {
      this._onChannelMessage(event)
    }
    this._channel.onbufferedamountlow = () => {
      this._onChannelBufferedAmountLow()
    }
    this._channel.onopen = () => {
      this._onChannelOpen()
    }
    this._channel.onclose = () => {
      this._onChannelClose()
    }
    this._channel.onerror = err => {
      this.destroy(makeError(err, 'ERR_DATA_CHANNEL'))
    }

    // HACK: Chrome will sometimes get stuck in readyState "closing", let's check for this condition
    // https://bugs.chromium.org/p/chromium/issues/detail?id=882743
    var isClosing = false
    this._closingInterval = setInterval(() => { // No "onclosing" event
      if (this._channel && this._channel.readyState === 'closing') {
        if (isClosing) this._onChannelClose() // closing timed out: equivalent to onclose firing
        isClosing = true
      } else {
        isClosing = false
      }
    }, CHANNEL_CLOSING_TIMEOUT)
  }

  _read () {}

  _write (chunk, encoding, cb) {
    if (this.destroyed) return cb(makeError('cannot write after peer is destroyed', 'ERR_DATA_CHANNEL'))

    if (this._connected) {
      try {
        this.send(chunk)
      } catch (err) {
        return this.destroy(makeError(err, 'ERR_DATA_CHANNEL'))
      }
      if (this._channel.bufferedAmount > MAX_BUFFERED_AMOUNT) {
        this._debug('start backpressure: bufferedAmount %d', this._channel.bufferedAmount)
        this._cb = cb
      } else {
        cb(null)
      }
    } else {
      this._debug('write before connect')
      this._chunk = chunk
      this._cb = cb
    }
  }

  // When stream finishes writing, close socket. Half open connections are not
  // supported.
  _onFinish () {
    if (this.destroyed) return

    // Wait a bit before destroying so the socket flushes.
    // TODO: is there a more reliable way to accomplish this?
    const destroySoon = () => {
      setTimeout(() => this.destroy(), 1000)
    }

    if (this._connected) {
      destroySoon()
    } else {
      this.once('connect', destroySoon)
    }
  }

  _startIceCompleteTimeout () {
    if (this.destroyed) return
    if (this._iceCompleteTimer) return
    this._debug('started iceComplete timeout')
    this._iceCompleteTimer = setTimeout(() => {
      if (!this._iceComplete) {
        this._iceComplete = true
        this._debug('iceComplete timeout completed')
        this.emit('iceTimeout')
        this.emit('_iceComplete')
      }
    }, this.iceCompleteTimeout)
  }

  _createOffer () {
    if (this.destroyed) return

    this._pc.createOffer(this.offerOptions)
      .then(offer => {
        if (this.destroyed) return
        if (!this.trickle && !this.allowHalfTrickle) offer.sdp = filterTrickle(offer.sdp)
        offer.sdp = this.sdpTransform(offer.sdp)

        const sendOffer = () => {
          if (this.destroyed) return
          var signal = this._pc.localDescription || offer
          this._debug('signal')
          this.emit('signal', {
            type: signal.type,
            sdp: signal.sdp
          })
        }

        const onSuccess = () => {
          this._debug('createOffer success')
          if (this.destroyed) return
          if (this.trickle || this._iceComplete) sendOffer()
          else this.once('_iceComplete', sendOffer) // wait for candidates
        }

        const onError = err => {
          this.destroy(makeError(err, 'ERR_SET_LOCAL_DESCRIPTION'))
        }

        this._pc.setLocalDescription(offer)
          .then(onSuccess)
          .catch(onError)
      })
      .catch(err => {
        this.destroy(makeError(err, 'ERR_CREATE_OFFER'))
      })
  }

  _requestMissingTransceivers () {
    if (this._pc.getTransceivers) {
      this._pc.getTransceivers().forEach(transceiver => {
        if (!transceiver.mid && transceiver.sender.track && !transceiver.requested) {
          transceiver.requested = true // HACK: Safari returns negotiated transceivers with a null mid
          this.addTransceiver(transceiver.sender.track.kind)
        }
      })
    }
  }

  _createAnswer () {
    if (this.destroyed) return

    this._pc.createAnswer(this.answerOptions)
      .then(answer => {
        if (this.destroyed) return
        if (!this.trickle && !this.allowHalfTrickle) answer.sdp = filterTrickle(answer.sdp)
        answer.sdp = this.sdpTransform(answer.sdp)

        const sendAnswer = () => {
          if (this.destroyed) return
          var signal = this._pc.localDescription || answer
          this._debug('signal')
          this.emit('signal', {
            type: signal.type,
            sdp: signal.sdp
          })
          if (!this.initiator) this._requestMissingTransceivers()
        }

        const onSuccess = () => {
          if (this.destroyed) return
          if (this.trickle || this._iceComplete) sendAnswer()
          else this.once('_iceComplete', sendAnswer)
        }

        const onError = err => {
          this.destroy(makeError(err, 'ERR_SET_LOCAL_DESCRIPTION'))
        }

        this._pc.setLocalDescription(answer)
          .then(onSuccess)
          .catch(onError)
      })
      .catch(err => {
        this.destroy(makeError(err, 'ERR_CREATE_ANSWER'))
      })
  }

  _onConnectionStateChange () {
    if (this.destroyed) return
    if (this._pc.connectionState === 'failed') {
      this.destroy(makeError('Connection failed.', 'ERR_CONNECTION_FAILURE'))
    }
  }

  _onIceStateChange () {
    if (this.destroyed) return
    var iceConnectionState = this._pc.iceConnectionState
    var iceGatheringState = this._pc.iceGatheringState

    this._debug(
      'iceStateChange (connection: %s) (gathering: %s)',
      iceConnectionState,
      iceGatheringState
    )
    this.emit('iceStateChange', iceConnectionState, iceGatheringState)

    if (iceConnectionState === 'connected' || iceConnectionState === 'completed') {
      this._pcReady = true
      this._maybeReady()
    }
    if (iceConnectionState === 'failed') {
      this.destroy(makeError('Ice connection failed.', 'ERR_ICE_CONNECTION_FAILURE'))
    }
    if (iceConnectionState === 'closed') {
      this.destroy(makeError('Ice connection closed.', 'ERR_ICE_CONNECTION_CLOSED'))
    }
  }

  getStats (cb) {
    // statreports can come with a value array instead of properties
    const flattenValues = report => {
      if (Object.prototype.toString.call(report.values) === '[object Array]') {
        report.values.forEach(value => {
          Object.assign(report, value)
        })
      }
      return report
    }

    // Promise-based getStats() (standard)
    if (this._pc.getStats.length === 0 || this._isReactNativeWebrtc) {
      this._pc.getStats()
        .then(res => {
          var reports = []
          res.forEach(report => {
            reports.push(flattenValues(report))
          })
          cb(null, reports)
        }, err => cb(err))

    // Single-parameter callback-based getStats() (non-standard)
    } else if (this._pc.getStats.length > 0) {
      this._pc.getStats(res => {
        // If we destroy connection in `connect` callback this code might happen to run when actual connection is already closed
        if (this.destroyed) return

        var reports = []
        res.result().forEach(result => {
          var report = {}
          result.names().forEach(name => {
            report[name] = result.stat(name)
          })
          report.id = result.id
          report.type = result.type
          report.timestamp = result.timestamp
          reports.push(flattenValues(report))
        })
        cb(null, reports)
      }, err => cb(err))

    // Unknown browser, skip getStats() since it's anyone's guess which style of
    // getStats() they implement.
    } else {
      cb(null, [])
    }
  }

  _maybeReady () {
    this._debug('maybeReady pc %s channel %s', this._pcReady, this._channelReady)
    if (this._connected || this._connecting || !this._pcReady || !this._channelReady) return

    this._connecting = true

    // HACK: We can't rely on order here, for details see https://github.com/js-platform/node-webrtc/issues/339
    const findCandidatePair = () => {
      if (this.destroyed) return

      this.getStats((err, items) => {
        if (this.destroyed) return

        // Treat getStats error as non-fatal. It's not essential.
        if (err) items = []

        var remoteCandidates = {}
        var localCandidates = {}
        var candidatePairs = {}
        var foundSelectedCandidatePair = false

        items.forEach(item => {
          // TODO: Once all browsers support the hyphenated stats report types, remove
          // the non-hypenated ones
          if (item.type === 'remotecandidate' || item.type === 'remote-candidate') {
            remoteCandidates[item.id] = item
          }
          if (item.type === 'localcandidate' || item.type === 'local-candidate') {
            localCandidates[item.id] = item
          }
          if (item.type === 'candidatepair' || item.type === 'candidate-pair') {
            candidatePairs[item.id] = item
          }
        })

        const setSelectedCandidatePair = selectedCandidatePair => {
          foundSelectedCandidatePair = true

          var local = localCandidates[selectedCandidatePair.localCandidateId]

          if (local && (local.ip || local.address)) {
            // Spec
            this.localAddress = local.ip || local.address
            this.localPort = Number(local.port)
          } else if (local && local.ipAddress) {
            // Firefox
            this.localAddress = local.ipAddress
            this.localPort = Number(local.portNumber)
          } else if (typeof selectedCandidatePair.googLocalAddress === 'string') {
            // TODO: remove this once Chrome 58 is released
            local = selectedCandidatePair.googLocalAddress.split(':')
            this.localAddress = local[0]
            this.localPort = Number(local[1])
          }
          if (this.localAddress) {
            this.localFamily = this.localAddress.includes(':') ? 'IPv6' : 'IPv4'
          }

          var remote = remoteCandidates[selectedCandidatePair.remoteCandidateId]

          if (remote && (remote.ip || remote.address)) {
            // Spec
            this.remoteAddress = remote.ip || remote.address
            this.remotePort = Number(remote.port)
          } else if (remote && remote.ipAddress) {
            // Firefox
            this.remoteAddress = remote.ipAddress
            this.remotePort = Number(remote.portNumber)
          } else if (typeof selectedCandidatePair.googRemoteAddress === 'string') {
            // TODO: remove this once Chrome 58 is released
            remote = selectedCandidatePair.googRemoteAddress.split(':')
            this.remoteAddress = remote[0]
            this.remotePort = Number(remote[1])
          }
          if (this.remoteAddress) {
            this.remoteFamily = this.remoteAddress.includes(':') ? 'IPv6' : 'IPv4'
          }

          this._debug(
            'connect local: %s:%s remote: %s:%s',
            this.localAddress, this.localPort, this.remoteAddress, this.remotePort
          )
        }

        items.forEach(item => {
          // Spec-compliant
          if (item.type === 'transport' && item.selectedCandidatePairId) {
            setSelectedCandidatePair(candidatePairs[item.selectedCandidatePairId])
          }

          // Old implementations
          if (
            (item.type === 'googCandidatePair' && item.googActiveConnection === 'true') ||
            ((item.type === 'candidatepair' || item.type === 'candidate-pair') && item.selected)
          ) {
            setSelectedCandidatePair(item)
          }
        })

        // Ignore candidate pair selection in browsers like Safari 11 that do not have any local or remote candidates
        // But wait until at least 1 candidate pair is available
        if (!foundSelectedCandidatePair && (!Object.keys(candidatePairs).length || Object.keys(localCandidates).length)) {
          setTimeout(findCandidatePair, 100)
          return
        } else {
          this._connecting = false
          this._connected = true
        }

        if (this._chunk) {
          try {
            this.send(this._chunk)
          } catch (err) {
            return this.destroy(makeError(err, 'ERR_DATA_CHANNEL'))
          }
          this._chunk = null
          this._debug('sent chunk from "write before connect"')

          var cb = this._cb
          this._cb = null
          cb(null)
        }

        // If `bufferedAmountLowThreshold` and 'onbufferedamountlow' are unsupported,
        // fallback to using setInterval to implement backpressure.
        if (typeof this._channel.bufferedAmountLowThreshold !== 'number') {
          this._interval = setInterval(() => this._onInterval(), 150)
          if (this._interval.unref) this._interval.unref()
        }

        this._debug('connect')
        this.emit('connect')
      })
    }
    findCandidatePair()
  }

  _onInterval () {
    if (!this._cb || !this._channel || this._channel.bufferedAmount > MAX_BUFFERED_AMOUNT) {
      return
    }
    this._onChannelBufferedAmountLow()
  }

  _onSignalingStateChange () {
    if (this.destroyed) return

    if (this._pc.signalingState === 'stable' && !this._firstStable) {
      this._isNegotiating = false

      // HACK: Firefox doesn't yet support removing tracks when signalingState !== 'stable'
      this._debug('flushing sender queue', this._sendersAwaitingStable)
      this._sendersAwaitingStable.forEach(sender => {
        this._pc.removeTrack(sender)
        this._queuedNegotiation = true
      })
      this._sendersAwaitingStable = []

      if (this._queuedNegotiation) {
        this._debug('flushing negotiation queue')
        this._queuedNegotiation = false
        this._needsNegotiation() // negotiate again
      }

      this._debug('negotiate')
      this.emit('negotiate')
    }
    this._firstStable = false

    this._debug('signalingStateChange %s', this._pc.signalingState)
    this.emit('signalingStateChange', this._pc.signalingState)
  }

  _onIceCandidate (event) {
    if (this.destroyed) return
    if (event.candidate && this.trickle) {
      this.emit('signal', {
        candidate: {
          candidate: event.candidate.candidate,
          sdpMLineIndex: event.candidate.sdpMLineIndex,
          sdpMid: event.candidate.sdpMid
        }
      })
    } else if (!event.candidate && !this._iceComplete) {
      this._iceComplete = true
      this.emit('_iceComplete')
    }
    // as soon as we've received one valid candidate start timeout
    if (event.candidate) {
      this._startIceCompleteTimeout()
    }
  }

  _onChannelMessage (event) {
    if (this.destroyed) return
    var data = event.data
    if (data instanceof ArrayBuffer) data = Buffer.from(data)
    this.push(data)
  }

  _onChannelBufferedAmountLow () {
    if (this.destroyed || !this._cb) return
    this._debug('ending backpressure: bufferedAmount %d', this._channel.bufferedAmount)
    var cb = this._cb
    this._cb = null
    cb(null)
  }

  _onChannelOpen () {
    if (this._connected || this.destroyed) return
    this._debug('on channel open')
    this._channelReady = true
    this._maybeReady()
  }

  _onChannelClose () {
    if (this.destroyed) return
    this._debug('on channel close')
    this.destroy()
  }

  _onTrack (event) {
    if (this.destroyed) return

    event.streams.forEach(eventStream => {
      this._debug('on track')
      this.emit('track', event.track, eventStream)

      this._remoteTracks.push({
        track: event.track,
        stream: eventStream
      })

      if (this._remoteStreams.some(remoteStream => {
        return remoteStream.id === eventStream.id
      })) return // Only fire one 'stream' event, even though there may be multiple tracks per stream

      this._remoteStreams.push(eventStream)
      queueMicrotask(() => {
        this.emit('stream', eventStream) // ensure all tracks have been added
      })
    })
  }

  _debug () {
    var args = [].slice.call(arguments)
    args[0] = '[' + this._id + '] ' + args[0]
    debug.apply(null, args)
  }
}

Peer.WEBRTC_SUPPORT = !!getBrowserRTC()

/**
 * Expose peer and data channel config for overriding all Peer
 * instances. Otherwise, just set opts.config or opts.channelConfig
 * when constructing a Peer.
 */
Peer.config = {
  iceServers: [
    {
      urls: 'stun:stun.l.google.com:19302'
    },
    {
      urls: 'stun:global.stun.twilio.com:3478?transport=udp'
    }
  ],
  sdpSemantics: 'unified-plan'
}

Peer.channelConfig = {}

module.exports = Peer

}).call(this,require("buffer").Buffer)
},{"buffer":22,"debug":26,"get-browser-rtc":31,"queue-microtask":64,"randombytes":66,"readable-stream":82}],92:[function(require,module,exports){
/* global self */

var Rusha = require('rusha')
var rushaWorkerSha1 = require('./rusha-worker-sha1')

var rusha = new Rusha()
var scope = typeof window !== 'undefined' ? window : self
var crypto = scope.crypto || scope.msCrypto || {}
var subtle = crypto.subtle || crypto.webkitSubtle

function sha1sync (buf) {
  return rusha.digest(buf)
}

// Browsers throw if they lack support for an algorithm.
// Promise will be rejected on non-secure origins. (http://goo.gl/lq4gCo)
try {
  subtle.digest({ name: 'sha-1' }, new Uint8Array()).catch(function () {
    subtle = false
  })
} catch (err) { subtle = false }

function sha1 (buf, cb) {
  if (!subtle) {
    if (typeof window !== 'undefined') {
      rushaWorkerSha1(buf, function onRushaWorkerSha1 (err, hash) {
        if (err) {
          // On error, fallback to synchronous method which cannot fail
          cb(sha1sync(buf))
          return
        }

        cb(hash)
      })
    } else {
      queueMicrotask(() => cb(sha1sync(buf)))
    }
    return
  }

  if (typeof buf === 'string') {
    buf = uint8array(buf)
  }

  subtle.digest({ name: 'sha-1' }, buf)
    .then(function succeed (result) {
      cb(hex(new Uint8Array(result)))
    },
    function fail () {
      // On error, fallback to synchronous method which cannot fail
      cb(sha1sync(buf))
    })
}

function uint8array (s) {
  var l = s.length
  var array = new Uint8Array(l)
  for (var i = 0; i < l; i++) {
    array[i] = s.charCodeAt(i)
  }
  return array
}

function hex (buf) {
  var l = buf.length
  var chars = []
  for (var i = 0; i < l; i++) {
    var bite = buf[i]
    chars.push((bite >>> 4).toString(16))
    chars.push((bite & 0x0f).toString(16))
  }
  return chars.join('')
}

module.exports = sha1
module.exports.sync = sha1sync

},{"./rusha-worker-sha1":93,"rusha":87}],93:[function(require,module,exports){
var Rusha = require('rusha')

var worker
var nextTaskId
var cbs

function init () {
  worker = Rusha.createWorker()
  nextTaskId = 1
  cbs = {} // taskId -> cb

  worker.onmessage = function onRushaMessage (e) {
    var taskId = e.data.id
    var cb = cbs[taskId]
    delete cbs[taskId]

    if (e.data.error != null) {
      cb(new Error('Rusha worker error: ' + e.data.error))
    } else {
      cb(null, e.data.hash)
    }
  }
}

function sha1 (buf, cb) {
  if (!worker) init()

  cbs[nextTaskId] = cb
  worker.postMessage({ id: nextTaskId, data: buf })
  nextTaskId += 1
}

module.exports = sha1

},{"rusha":87}],94:[function(require,module,exports){
(function (Buffer){
/* global WebSocket, DOMException */

const debug = require('debug')('simple-websocket')
const randombytes = require('randombytes')
const stream = require('readable-stream')
const queueMicrotask = require('queue-microtask') // TODO: remove when Node 10 is not supported
const ws = require('ws') // websockets in node - will be empty object in browser

const _WebSocket = typeof ws !== 'function' ? WebSocket : ws

const MAX_BUFFERED_AMOUNT = 64 * 1024

/**
 * WebSocket. Same API as node core `net.Socket`. Duplex stream.
 * @param {Object} opts
 * @param {string=} opts.url websocket server url
 * @param {string=} opts.socket raw websocket instance to wrap
 */
class Socket extends stream.Duplex {
  constructor (opts = {}) {
    // Support simple usage: `new Socket(url)`
    if (typeof opts === 'string') {
      opts = { url: opts }
    }

    opts = Object.assign({
      allowHalfOpen: false
    }, opts)

    super(opts)

    if (opts.url == null && opts.socket == null) {
      throw new Error('Missing required `url` or `socket` option')
    }
    if (opts.url != null && opts.socket != null) {
      throw new Error('Must specify either `url` or `socket` option, not both')
    }

    this._id = randombytes(4).toString('hex').slice(0, 7)
    this._debug('new websocket: %o', opts)

    this.connected = false
    this.destroyed = false

    this._chunk = null
    this._cb = null
    this._interval = null

    if (opts.socket) {
      this.url = opts.socket.url
      this._ws = opts.socket
      this.connected = opts.socket.readyState === _WebSocket.OPEN
    } else {
      this.url = opts.url
      try {
        if (typeof ws === 'function') {
          // `ws` package accepts options
          this._ws = new _WebSocket(opts.url, opts)
        } else {
          this._ws = new _WebSocket(opts.url)
        }
      } catch (err) {
        queueMicrotask(() => this.destroy(err))
        return
      }
    }

    this._ws.binaryType = 'arraybuffer'
    this._ws.onopen = () => {
      this._onOpen()
    }
    this._ws.onmessage = event => {
      this._onMessage(event)
    }
    this._ws.onclose = () => {
      this._onClose()
    }
    this._ws.onerror = () => {
      this.destroy(new Error('connection error to ' + this.url))
    }

    this._onFinishBound = () => {
      this._onFinish()
    }
    this.once('finish', this._onFinishBound)
  }

  /**
   * Send text/binary data to the WebSocket server.
   * @param {TypedArrayView|ArrayBuffer|Buffer|string|Blob|Object} chunk
   */
  send (chunk) {
    this._ws.send(chunk)
  }

  // TODO: Delete this method once readable-stream is updated to contain a default
  // implementation of destroy() that automatically calls _destroy()
  // See: https://github.com/nodejs/readable-stream/issues/283
  destroy (err) {
    this._destroy(err, () => {})
  }

  _destroy (err, cb) {
    if (this.destroyed) return

    this._debug('destroy (error: %s)', err && (err.message || err))

    this.readable = this.writable = false
    if (!this._readableState.ended) this.push(null)
    if (!this._writableState.finished) this.end()

    this.connected = false
    this.destroyed = true

    clearInterval(this._interval)
    this._interval = null
    this._chunk = null
    this._cb = null

    if (this._onFinishBound) this.removeListener('finish', this._onFinishBound)
    this._onFinishBound = null

    if (this._ws) {
      const ws = this._ws
      const onClose = () => {
        ws.onclose = null
      }
      if (ws.readyState === _WebSocket.CLOSED) {
        onClose()
      } else {
        try {
          ws.onclose = onClose
          ws.close()
        } catch (err) {
          onClose()
        }
      }

      ws.onopen = null
      ws.onmessage = null
      ws.onerror = () => {}
    }
    this._ws = null

    if (err) {
      if (typeof DOMException !== 'undefined' && err instanceof DOMException) {
        // Convert Edge DOMException object to Error object
        const code = err.code
        err = new Error(err.message)
        err.code = code
      }
      this.emit('error', err)
    }
    this.emit('close')
    cb()
  }

  _read () {}

  _write (chunk, encoding, cb) {
    if (this.destroyed) return cb(new Error('cannot write after socket is destroyed'))

    if (this.connected) {
      try {
        this.send(chunk)
      } catch (err) {
        return this.destroy(err)
      }
      if (typeof ws !== 'function' && this._ws.bufferedAmount > MAX_BUFFERED_AMOUNT) {
        this._debug('start backpressure: bufferedAmount %d', this._ws.bufferedAmount)
        this._cb = cb
      } else {
        cb(null)
      }
    } else {
      this._debug('write before connect')
      this._chunk = chunk
      this._cb = cb
    }
  }

  // When stream finishes writing, close socket. Half open connections are not
  // supported.
  _onFinish () {
    if (this.destroyed) return

    // Wait a bit before destroying so the socket flushes.
    // TODO: is there a more reliable way to accomplish this?
    const destroySoon = () => {
      setTimeout(() => this.destroy(), 1000)
    }

    if (this.connected) {
      destroySoon()
    } else {
      this.once('connect', destroySoon)
    }
  }

  _onMessage (event) {
    if (this.destroyed) return
    let data = event.data
    if (data instanceof ArrayBuffer) data = Buffer.from(data)
    this.push(data)
  }

  _onOpen () {
    if (this.connected || this.destroyed) return
    this.connected = true

    if (this._chunk) {
      try {
        this.send(this._chunk)
      } catch (err) {
        return this.destroy(err)
      }
      this._chunk = null
      this._debug('sent chunk from "write before connect"')

      const cb = this._cb
      this._cb = null
      cb(null)
    }

    // Backpressure is not implemented in Node.js. The `ws` module has a buggy
    // `bufferedAmount` property. See: https://github.com/websockets/ws/issues/492
    if (typeof ws !== 'function') {
      this._interval = setInterval(() => this._onInterval(), 150)
      if (this._interval.unref) this._interval.unref()
    }

    this._debug('connect')
    this.emit('connect')
  }

  _onInterval () {
    if (!this._cb || !this._ws || this._ws.bufferedAmount > MAX_BUFFERED_AMOUNT) {
      return
    }
    this._debug('ending backpressure: bufferedAmount %d', this._ws.bufferedAmount)
    const cb = this._cb
    this._cb = null
    cb(null)
  }

  _onClose () {
    if (this.destroyed) return
    this._debug('on close')
    this.destroy()
  }

  _debug () {
    const args = [].slice.call(arguments)
    args[0] = '[' + this._id + '] ' + args[0]
    debug.apply(null, args)
  }
}

Socket.WEBSOCKET_SUPPORT = !!_WebSocket

module.exports = Socket

}).call(this,require("buffer").Buffer)
},{"buffer":22,"debug":26,"queue-microtask":64,"randombytes":66,"readable-stream":82,"ws":17}],95:[function(require,module,exports){
var tick = 1
var maxTick = 65535
var resolution = 4
var timer
var inc = function () {
  tick = (tick + 1) & maxTick
}


module.exports = function (seconds) {
  if (!timer) {
    timer = setInterval(inc, (1000 / resolution) | 0)
    if (timer.unref) timer.unref()
  }

  var size = resolution * (seconds || 5)
  var buffer = [0]
  var pointer = 1
  var last = (tick - 1) & maxTick

  return function (delta) {
    var dist = (tick - last) & maxTick
    if (dist > size) dist = size
    last = tick

    while (dist--) {
      if (pointer === size) pointer = 0
      buffer[pointer] = buffer[pointer === 0 ? size - 1 : pointer - 1]
      pointer++
    }

    if (delta) buffer[pointer - 1] += delta

    var top = buffer[pointer - 1]
    var btm = buffer.length < size ? 0 : buffer[pointer === size ? 0 : pointer]

    return buffer.length < resolution ? top : (top - btm) * resolution / buffer.length
  }
}

},{}],96:[function(require,module,exports){
(function (global){
var ClientRequest = require('./lib/request')
var response = require('./lib/response')
var extend = require('xtend')
var statusCodes = require('builtin-status-codes')
var url = require('url')

var http = exports

http.request = function (opts, cb) {
	if (typeof opts === 'string')
		opts = url.parse(opts)
	else
		opts = extend(opts)

	// Normally, the page is loaded from http or https, so not specifying a protocol
	// will result in a (valid) protocol-relative url. However, this won't work if
	// the protocol is something else, like 'file:'
	var defaultProtocol = global.location.protocol.search(/^https?:$/) === -1 ? 'http:' : ''

	var protocol = opts.protocol || defaultProtocol
	var host = opts.hostname || opts.host
	var port = opts.port
	var path = opts.path || '/'

	// Necessary for IPv6 addresses
	if (host && host.indexOf(':') !== -1)
		host = '[' + host + ']'

	// This may be a relative url. The browser should always be able to interpret it correctly.
	opts.url = (host ? (protocol + '//' + host) : '') + (port ? ':' + port : '') + path
	opts.method = (opts.method || 'GET').toUpperCase()
	opts.headers = opts.headers || {}

	// Also valid opts.auth, opts.mode

	var req = new ClientRequest(opts)
	if (cb)
		req.on('response', cb)
	return req
}

http.get = function get (opts, cb) {
	var req = http.request(opts, cb)
	req.end()
	return req
}

http.ClientRequest = ClientRequest
http.IncomingMessage = response.IncomingMessage

http.Agent = function () {}
http.Agent.defaultMaxSockets = 4

http.globalAgent = new http.Agent()

http.STATUS_CODES = statusCodes

http.METHODS = [
	'CHECKOUT',
	'CONNECT',
	'COPY',
	'DELETE',
	'GET',
	'HEAD',
	'LOCK',
	'M-SEARCH',
	'MERGE',
	'MKACTIVITY',
	'MKCOL',
	'MOVE',
	'NOTIFY',
	'OPTIONS',
	'PATCH',
	'POST',
	'PROPFIND',
	'PROPPATCH',
	'PURGE',
	'PUT',
	'REPORT',
	'SEARCH',
	'SUBSCRIBE',
	'TRACE',
	'UNLOCK',
	'UNSUBSCRIBE'
]
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./lib/request":98,"./lib/response":99,"builtin-status-codes":23,"url":113,"xtend":128}],97:[function(require,module,exports){
(function (global){
exports.fetch = isFunction(global.fetch) && isFunction(global.ReadableStream)

exports.writableStream = isFunction(global.WritableStream)

exports.abortController = isFunction(global.AbortController)

// The xhr request to example.com may violate some restrictive CSP configurations,
// so if we're running in a browser that supports `fetch`, avoid calling getXHR()
// and assume support for certain features below.
var xhr
function getXHR () {
	// Cache the xhr value
	if (xhr !== undefined) return xhr

	if (global.XMLHttpRequest) {
		xhr = new global.XMLHttpRequest()
		// If XDomainRequest is available (ie only, where xhr might not work
		// cross domain), use the page location. Otherwise use example.com
		// Note: this doesn't actually make an http request.
		try {
			xhr.open('GET', global.XDomainRequest ? '/' : 'https://example.com')
		} catch(e) {
			xhr = null
		}
	} else {
		// Service workers don't have XHR
		xhr = null
	}
	return xhr
}

function checkTypeSupport (type) {
	var xhr = getXHR()
	if (!xhr) return false
	try {
		xhr.responseType = type
		return xhr.responseType === type
	} catch (e) {}
	return false
}

// If fetch is supported, then arraybuffer will be supported too. Skip calling
// checkTypeSupport(), since that calls getXHR().
exports.arraybuffer = exports.fetch || checkTypeSupport('arraybuffer')

// These next two tests unavoidably show warnings in Chrome. Since fetch will always
// be used if it's available, just return false for these to avoid the warnings.
exports.msstream = !exports.fetch && checkTypeSupport('ms-stream')
exports.mozchunkedarraybuffer = !exports.fetch && checkTypeSupport('moz-chunked-arraybuffer')

// If fetch is supported, then overrideMimeType will be supported too. Skip calling
// getXHR().
exports.overrideMimeType = exports.fetch || (getXHR() ? isFunction(getXHR().overrideMimeType) : false)

function isFunction (value) {
	return typeof value === 'function'
}

xhr = null // Help gc

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],98:[function(require,module,exports){
(function (process,global,Buffer){
var capability = require('./capability')
var inherits = require('inherits')
var response = require('./response')
var stream = require('readable-stream')

var IncomingMessage = response.IncomingMessage
var rStates = response.readyStates

function decideMode (preferBinary, useFetch) {
	if (capability.fetch && useFetch) {
		return 'fetch'
	} else if (capability.mozchunkedarraybuffer) {
		return 'moz-chunked-arraybuffer'
	} else if (capability.msstream) {
		return 'ms-stream'
	} else if (capability.arraybuffer && preferBinary) {
		return 'arraybuffer'
	} else {
		return 'text'
	}
}

var ClientRequest = module.exports = function (opts) {
	var self = this
	stream.Writable.call(self)

	self._opts = opts
	self._body = []
	self._headers = {}
	if (opts.auth)
		self.setHeader('Authorization', 'Basic ' + Buffer.from(opts.auth).toString('base64'))
	Object.keys(opts.headers).forEach(function (name) {
		self.setHeader(name, opts.headers[name])
	})

	var preferBinary
	var useFetch = true
	if (opts.mode === 'disable-fetch' || ('requestTimeout' in opts && !capability.abortController)) {
		// If the use of XHR should be preferred. Not typically needed.
		useFetch = false
		preferBinary = true
	} else if (opts.mode === 'prefer-streaming') {
		// If streaming is a high priority but binary compatibility and
		// the accuracy of the 'content-type' header aren't
		preferBinary = false
	} else if (opts.mode === 'allow-wrong-content-type') {
		// If streaming is more important than preserving the 'content-type' header
		preferBinary = !capability.overrideMimeType
	} else if (!opts.mode || opts.mode === 'default' || opts.mode === 'prefer-fast') {
		// Use binary if text streaming may corrupt data or the content-type header, or for speed
		preferBinary = true
	} else {
		throw new Error('Invalid value for opts.mode')
	}
	self._mode = decideMode(preferBinary, useFetch)
	self._fetchTimer = null

	self.on('finish', function () {
		self._onFinish()
	})
}

inherits(ClientRequest, stream.Writable)

ClientRequest.prototype.setHeader = function (name, value) {
	var self = this
	var lowerName = name.toLowerCase()
	// This check is not necessary, but it prevents warnings from browsers about setting unsafe
	// headers. To be honest I'm not entirely sure hiding these warnings is a good thing, but
	// http-browserify did it, so I will too.
	if (unsafeHeaders.indexOf(lowerName) !== -1)
		return

	self._headers[lowerName] = {
		name: name,
		value: value
	}
}

ClientRequest.prototype.getHeader = function (name) {
	var header = this._headers[name.toLowerCase()]
	if (header)
		return header.value
	return null
}

ClientRequest.prototype.removeHeader = function (name) {
	var self = this
	delete self._headers[name.toLowerCase()]
}

ClientRequest.prototype._onFinish = function () {
	var self = this

	if (self._destroyed)
		return
	var opts = self._opts

	var headersObj = self._headers
	var body = null
	if (opts.method !== 'GET' && opts.method !== 'HEAD') {
        body = new Blob(self._body, {
            type: (headersObj['content-type'] || {}).value || ''
        });
    }

	// create flattened list of headers
	var headersList = []
	Object.keys(headersObj).forEach(function (keyName) {
		var name = headersObj[keyName].name
		var value = headersObj[keyName].value
		if (Array.isArray(value)) {
			value.forEach(function (v) {
				headersList.push([name, v])
			})
		} else {
			headersList.push([name, value])
		}
	})

	if (self._mode === 'fetch') {
		var signal = null
		var fetchTimer = null
		if (capability.abortController) {
			var controller = new AbortController()
			signal = controller.signal
			self._fetchAbortController = controller

			if ('requestTimeout' in opts && opts.requestTimeout !== 0) {
				self._fetchTimer = global.setTimeout(function () {
					self.emit('requestTimeout')
					if (self._fetchAbortController)
						self._fetchAbortController.abort()
				}, opts.requestTimeout)
			}
		}

		global.fetch(self._opts.url, {
			method: self._opts.method,
			headers: headersList,
			body: body || undefined,
			mode: 'cors',
			credentials: opts.withCredentials ? 'include' : 'same-origin',
			signal: signal
		}).then(function (response) {
			self._fetchResponse = response
			self._connect()
		}, function (reason) {
			global.clearTimeout(self._fetchTimer)
			if (!self._destroyed)
				self.emit('error', reason)
		})
	} else {
		var xhr = self._xhr = new global.XMLHttpRequest()
		try {
			xhr.open(self._opts.method, self._opts.url, true)
		} catch (err) {
			process.nextTick(function () {
				self.emit('error', err)
			})
			return
		}

		// Can't set responseType on really old browsers
		if ('responseType' in xhr)
			xhr.responseType = self._mode

		if ('withCredentials' in xhr)
			xhr.withCredentials = !!opts.withCredentials

		if (self._mode === 'text' && 'overrideMimeType' in xhr)
			xhr.overrideMimeType('text/plain; charset=x-user-defined')

		if ('requestTimeout' in opts) {
			xhr.timeout = opts.requestTimeout
			xhr.ontimeout = function () {
				self.emit('requestTimeout')
			}
		}

		headersList.forEach(function (header) {
			xhr.setRequestHeader(header[0], header[1])
		})

		self._response = null
		xhr.onreadystatechange = function () {
			switch (xhr.readyState) {
				case rStates.LOADING:
				case rStates.DONE:
					self._onXHRProgress()
					break
			}
		}
		// Necessary for streaming in Firefox, since xhr.response is ONLY defined
		// in onprogress, not in onreadystatechange with xhr.readyState = 3
		if (self._mode === 'moz-chunked-arraybuffer') {
			xhr.onprogress = function () {
				self._onXHRProgress()
			}
		}

		xhr.onerror = function () {
			if (self._destroyed)
				return
			self.emit('error', new Error('XHR error'))
		}

		try {
			xhr.send(body)
		} catch (err) {
			process.nextTick(function () {
				self.emit('error', err)
			})
			return
		}
	}
}

/**
 * Checks if xhr.status is readable and non-zero, indicating no error.
 * Even though the spec says it should be available in readyState 3,
 * accessing it throws an exception in IE8
 */
function statusValid (xhr) {
	try {
		var status = xhr.status
		return (status !== null && status !== 0)
	} catch (e) {
		return false
	}
}

ClientRequest.prototype._onXHRProgress = function () {
	var self = this

	if (!statusValid(self._xhr) || self._destroyed)
		return

	if (!self._response)
		self._connect()

	self._response._onXHRProgress()
}

ClientRequest.prototype._connect = function () {
	var self = this

	if (self._destroyed)
		return

	self._response = new IncomingMessage(self._xhr, self._fetchResponse, self._mode, self._fetchTimer)
	self._response.on('error', function(err) {
		self.emit('error', err)
	})

	self.emit('response', self._response)
}

ClientRequest.prototype._write = function (chunk, encoding, cb) {
	var self = this

	self._body.push(chunk)
	cb()
}

ClientRequest.prototype.abort = ClientRequest.prototype.destroy = function () {
	var self = this
	self._destroyed = true
	global.clearTimeout(self._fetchTimer)
	if (self._response)
		self._response._destroyed = true
	if (self._xhr)
		self._xhr.abort()
	else if (self._fetchAbortController)
		self._fetchAbortController.abort()
}

ClientRequest.prototype.end = function (data, encoding, cb) {
	var self = this
	if (typeof data === 'function') {
		cb = data
		data = undefined
	}

	stream.Writable.prototype.end.call(self, data, encoding, cb)
}

ClientRequest.prototype.flushHeaders = function () {}
ClientRequest.prototype.setTimeout = function () {}
ClientRequest.prototype.setNoDelay = function () {}
ClientRequest.prototype.setSocketKeepAlive = function () {}

// Taken from http://www.w3.org/TR/XMLHttpRequest/#the-setrequestheader%28%29-method
var unsafeHeaders = [
	'accept-charset',
	'accept-encoding',
	'access-control-request-headers',
	'access-control-request-method',
	'connection',
	'content-length',
	'cookie',
	'cookie2',
	'date',
	'dnt',
	'expect',
	'host',
	'keep-alive',
	'origin',
	'referer',
	'te',
	'trailer',
	'transfer-encoding',
	'upgrade',
	'via'
]

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer)
},{"./capability":97,"./response":99,"_process":58,"buffer":22,"inherits":35,"readable-stream":82}],99:[function(require,module,exports){
(function (process,global,Buffer){
var capability = require('./capability')
var inherits = require('inherits')
var stream = require('readable-stream')

var rStates = exports.readyStates = {
	UNSENT: 0,
	OPENED: 1,
	HEADERS_RECEIVED: 2,
	LOADING: 3,
	DONE: 4
}

var IncomingMessage = exports.IncomingMessage = function (xhr, response, mode, fetchTimer) {
	var self = this
	stream.Readable.call(self)

	self._mode = mode
	self.headers = {}
	self.rawHeaders = []
	self.trailers = {}
	self.rawTrailers = []

	// Fake the 'close' event, but only once 'end' fires
	self.on('end', function () {
		// The nextTick is necessary to prevent the 'request' module from causing an infinite loop
		process.nextTick(function () {
			self.emit('close')
		})
	})

	if (mode === 'fetch') {
		self._fetchResponse = response

		self.url = response.url
		self.statusCode = response.status
		self.statusMessage = response.statusText
		
		response.headers.forEach(function (header, key){
			self.headers[key.toLowerCase()] = header
			self.rawHeaders.push(key, header)
		})

		if (capability.writableStream) {
			var writable = new WritableStream({
				write: function (chunk) {
					return new Promise(function (resolve, reject) {
						if (self._destroyed) {
							reject()
						} else if(self.push(Buffer.from(chunk))) {
							resolve()
						} else {
							self._resumeFetch = resolve
						}
					})
				},
				close: function () {
					global.clearTimeout(fetchTimer)
					if (!self._destroyed)
						self.push(null)
				},
				abort: function (err) {
					if (!self._destroyed)
						self.emit('error', err)
				}
			})

			try {
				response.body.pipeTo(writable).catch(function (err) {
					global.clearTimeout(fetchTimer)
					if (!self._destroyed)
						self.emit('error', err)
				})
				return
			} catch (e) {} // pipeTo method isn't defined. Can't find a better way to feature test this
		}
		// fallback for when writableStream or pipeTo aren't available
		var reader = response.body.getReader()
		function read () {
			reader.read().then(function (result) {
				if (self._destroyed)
					return
				if (result.done) {
					global.clearTimeout(fetchTimer)
					self.push(null)
					return
				}
				self.push(Buffer.from(result.value))
				read()
			}).catch(function (err) {
				global.clearTimeout(fetchTimer)
				if (!self._destroyed)
					self.emit('error', err)
			})
		}
		read()
	} else {
		self._xhr = xhr
		self._pos = 0

		self.url = xhr.responseURL
		self.statusCode = xhr.status
		self.statusMessage = xhr.statusText
		var headers = xhr.getAllResponseHeaders().split(/\r?\n/)
		headers.forEach(function (header) {
			var matches = header.match(/^([^:]+):\s*(.*)/)
			if (matches) {
				var key = matches[1].toLowerCase()
				if (key === 'set-cookie') {
					if (self.headers[key] === undefined) {
						self.headers[key] = []
					}
					self.headers[key].push(matches[2])
				} else if (self.headers[key] !== undefined) {
					self.headers[key] += ', ' + matches[2]
				} else {
					self.headers[key] = matches[2]
				}
				self.rawHeaders.push(matches[1], matches[2])
			}
		})

		self._charset = 'x-user-defined'
		if (!capability.overrideMimeType) {
			var mimeType = self.rawHeaders['mime-type']
			if (mimeType) {
				var charsetMatch = mimeType.match(/;\s*charset=([^;])(;|$)/)
				if (charsetMatch) {
					self._charset = charsetMatch[1].toLowerCase()
				}
			}
			if (!self._charset)
				self._charset = 'utf-8' // best guess
		}
	}
}

inherits(IncomingMessage, stream.Readable)

IncomingMessage.prototype._read = function () {
	var self = this

	var resolve = self._resumeFetch
	if (resolve) {
		self._resumeFetch = null
		resolve()
	}
}

IncomingMessage.prototype._onXHRProgress = function () {
	var self = this

	var xhr = self._xhr

	var response = null
	switch (self._mode) {
		case 'text':
			response = xhr.responseText
			if (response.length > self._pos) {
				var newData = response.substr(self._pos)
				if (self._charset === 'x-user-defined') {
					var buffer = Buffer.alloc(newData.length)
					for (var i = 0; i < newData.length; i++)
						buffer[i] = newData.charCodeAt(i) & 0xff

					self.push(buffer)
				} else {
					self.push(newData, self._charset)
				}
				self._pos = response.length
			}
			break
		case 'arraybuffer':
			if (xhr.readyState !== rStates.DONE || !xhr.response)
				break
			response = xhr.response
			self.push(Buffer.from(new Uint8Array(response)))
			break
		case 'moz-chunked-arraybuffer': // take whole
			response = xhr.response
			if (xhr.readyState !== rStates.LOADING || !response)
				break
			self.push(Buffer.from(new Uint8Array(response)))
			break
		case 'ms-stream':
			response = xhr.response
			if (xhr.readyState !== rStates.LOADING)
				break
			var reader = new global.MSStreamReader()
			reader.onprogress = function () {
				if (reader.result.byteLength > self._pos) {
					self.push(Buffer.from(new Uint8Array(reader.result.slice(self._pos))))
					self._pos = reader.result.byteLength
				}
			}
			reader.onload = function () {
				self.push(null)
			}
			// reader.onerror = ??? // TODO: this
			reader.readAsArrayBuffer(response)
			break
	}

	// The ms-stream case handles end separately in reader.onload()
	if (self._xhr.readyState === rStates.DONE && self._mode !== 'ms-stream') {
		self.push(null)
	}
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer)
},{"./capability":97,"_process":58,"buffer":22,"inherits":35,"readable-stream":82}],100:[function(require,module,exports){
module.exports = getBlobURL

const getBlob = require('stream-to-blob')

async function getBlobURL (stream, mimeType) {
  const blob = await getBlob(stream, mimeType)
  const url = URL.createObjectURL(blob)
  return url
}

},{"stream-to-blob":101}],101:[function(require,module,exports){
/* global Blob */

module.exports = streamToBlob

function streamToBlob (stream, mimeType) {
  if (mimeType != null && typeof mimeType !== 'string') {
    throw new Error('Invalid mimetype, expected string.')
  }
  return new Promise((resolve, reject) => {
    const chunks = []
    stream
      .on('data', chunk => chunks.push(chunk))
      .once('end', () => {
        const blob = mimeType != null
          ? new Blob(chunks, { type: mimeType })
          : new Blob(chunks)
        resolve(blob)
      })
      .once('error', reject)
  })
}

},{}],102:[function(require,module,exports){
(function (Buffer){
var once = require('once')

module.exports = function getBuffer (stream, length, cb) {
  cb = once(cb)
  var buf = Buffer.alloc(length)
  var offset = 0
  stream
    .on('data', function (chunk) {
      chunk.copy(buf, offset)
      offset += chunk.length
    })
    .on('end', function () { cb(null, buf) })
    .on('error', cb)
}

}).call(this,require("buffer").Buffer)
},{"buffer":22,"once":52}],103:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

/*<replacement>*/

var Buffer = require('safe-buffer').Buffer;
/*</replacement>*/

var isEncoding = Buffer.isEncoding || function (encoding) {
  encoding = '' + encoding;
  switch (encoding && encoding.toLowerCase()) {
    case 'hex':case 'utf8':case 'utf-8':case 'ascii':case 'binary':case 'base64':case 'ucs2':case 'ucs-2':case 'utf16le':case 'utf-16le':case 'raw':
      return true;
    default:
      return false;
  }
};

function _normalizeEncoding(enc) {
  if (!enc) return 'utf8';
  var retried;
  while (true) {
    switch (enc) {
      case 'utf8':
      case 'utf-8':
        return 'utf8';
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return 'utf16le';
      case 'latin1':
      case 'binary':
        return 'latin1';
      case 'base64':
      case 'ascii':
      case 'hex':
        return enc;
      default:
        if (retried) return; // undefined
        enc = ('' + enc).toLowerCase();
        retried = true;
    }
  }
};

// Do not cache `Buffer.isEncoding` when checking encoding names as some
// modules monkey-patch it to support additional encodings
function normalizeEncoding(enc) {
  var nenc = _normalizeEncoding(enc);
  if (typeof nenc !== 'string' && (Buffer.isEncoding === isEncoding || !isEncoding(enc))) throw new Error('Unknown encoding: ' + enc);
  return nenc || enc;
}

// StringDecoder provides an interface for efficiently splitting a series of
// buffers into a series of JS strings without breaking apart multi-byte
// characters.
exports.StringDecoder = StringDecoder;
function StringDecoder(encoding) {
  this.encoding = normalizeEncoding(encoding);
  var nb;
  switch (this.encoding) {
    case 'utf16le':
      this.text = utf16Text;
      this.end = utf16End;
      nb = 4;
      break;
    case 'utf8':
      this.fillLast = utf8FillLast;
      nb = 4;
      break;
    case 'base64':
      this.text = base64Text;
      this.end = base64End;
      nb = 3;
      break;
    default:
      this.write = simpleWrite;
      this.end = simpleEnd;
      return;
  }
  this.lastNeed = 0;
  this.lastTotal = 0;
  this.lastChar = Buffer.allocUnsafe(nb);
}

StringDecoder.prototype.write = function (buf) {
  if (buf.length === 0) return '';
  var r;
  var i;
  if (this.lastNeed) {
    r = this.fillLast(buf);
    if (r === undefined) return '';
    i = this.lastNeed;
    this.lastNeed = 0;
  } else {
    i = 0;
  }
  if (i < buf.length) return r ? r + this.text(buf, i) : this.text(buf, i);
  return r || '';
};

StringDecoder.prototype.end = utf8End;

// Returns only complete characters in a Buffer
StringDecoder.prototype.text = utf8Text;

// Attempts to complete a partial non-UTF-8 character using bytes from a Buffer
StringDecoder.prototype.fillLast = function (buf) {
  if (this.lastNeed <= buf.length) {
    buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed);
    return this.lastChar.toString(this.encoding, 0, this.lastTotal);
  }
  buf.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, buf.length);
  this.lastNeed -= buf.length;
};

// Checks the type of a UTF-8 byte, whether it's ASCII, a leading byte, or a
// continuation byte. If an invalid byte is detected, -2 is returned.
function utf8CheckByte(byte) {
  if (byte <= 0x7F) return 0;else if (byte >> 5 === 0x06) return 2;else if (byte >> 4 === 0x0E) return 3;else if (byte >> 3 === 0x1E) return 4;
  return byte >> 6 === 0x02 ? -1 : -2;
}

// Checks at most 3 bytes at the end of a Buffer in order to detect an
// incomplete multi-byte UTF-8 character. The total number of bytes (2, 3, or 4)
// needed to complete the UTF-8 character (if applicable) are returned.
function utf8CheckIncomplete(self, buf, i) {
  var j = buf.length - 1;
  if (j < i) return 0;
  var nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) self.lastNeed = nb - 1;
    return nb;
  }
  if (--j < i || nb === -2) return 0;
  nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) self.lastNeed = nb - 2;
    return nb;
  }
  if (--j < i || nb === -2) return 0;
  nb = utf8CheckByte(buf[j]);
  if (nb >= 0) {
    if (nb > 0) {
      if (nb === 2) nb = 0;else self.lastNeed = nb - 3;
    }
    return nb;
  }
  return 0;
}

// Validates as many continuation bytes for a multi-byte UTF-8 character as
// needed or are available. If we see a non-continuation byte where we expect
// one, we "replace" the validated continuation bytes we've seen so far with
// a single UTF-8 replacement character ('\ufffd'), to match v8's UTF-8 decoding
// behavior. The continuation byte check is included three times in the case
// where all of the continuation bytes for a character exist in the same buffer.
// It is also done this way as a slight performance increase instead of using a
// loop.
function utf8CheckExtraBytes(self, buf, p) {
  if ((buf[0] & 0xC0) !== 0x80) {
    self.lastNeed = 0;
    return '\ufffd';
  }
  if (self.lastNeed > 1 && buf.length > 1) {
    if ((buf[1] & 0xC0) !== 0x80) {
      self.lastNeed = 1;
      return '\ufffd';
    }
    if (self.lastNeed > 2 && buf.length > 2) {
      if ((buf[2] & 0xC0) !== 0x80) {
        self.lastNeed = 2;
        return '\ufffd';
      }
    }
  }
}

// Attempts to complete a multi-byte UTF-8 character using bytes from a Buffer.
function utf8FillLast(buf) {
  var p = this.lastTotal - this.lastNeed;
  var r = utf8CheckExtraBytes(this, buf, p);
  if (r !== undefined) return r;
  if (this.lastNeed <= buf.length) {
    buf.copy(this.lastChar, p, 0, this.lastNeed);
    return this.lastChar.toString(this.encoding, 0, this.lastTotal);
  }
  buf.copy(this.lastChar, p, 0, buf.length);
  this.lastNeed -= buf.length;
}

// Returns all complete UTF-8 characters in a Buffer. If the Buffer ended on a
// partial character, the character's bytes are buffered until the required
// number of bytes are available.
function utf8Text(buf, i) {
  var total = utf8CheckIncomplete(this, buf, i);
  if (!this.lastNeed) return buf.toString('utf8', i);
  this.lastTotal = total;
  var end = buf.length - (total - this.lastNeed);
  buf.copy(this.lastChar, 0, end);
  return buf.toString('utf8', i, end);
}

// For UTF-8, a replacement character is added when ending on a partial
// character.
function utf8End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) return r + '\ufffd';
  return r;
}

// UTF-16LE typically needs two bytes per character, but even if we have an even
// number of bytes available, we need to check if we end on a leading/high
// surrogate. In that case, we need to wait for the next two bytes in order to
// decode the last character properly.
function utf16Text(buf, i) {
  if ((buf.length - i) % 2 === 0) {
    var r = buf.toString('utf16le', i);
    if (r) {
      var c = r.charCodeAt(r.length - 1);
      if (c >= 0xD800 && c <= 0xDBFF) {
        this.lastNeed = 2;
        this.lastTotal = 4;
        this.lastChar[0] = buf[buf.length - 2];
        this.lastChar[1] = buf[buf.length - 1];
        return r.slice(0, -1);
      }
    }
    return r;
  }
  this.lastNeed = 1;
  this.lastTotal = 2;
  this.lastChar[0] = buf[buf.length - 1];
  return buf.toString('utf16le', i, buf.length - 1);
}

// For UTF-16LE we do not explicitly append special replacement characters if we
// end on a partial character, we simply let v8 handle that.
function utf16End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) {
    var end = this.lastTotal - this.lastNeed;
    return r + this.lastChar.toString('utf16le', 0, end);
  }
  return r;
}

function base64Text(buf, i) {
  var n = (buf.length - i) % 3;
  if (n === 0) return buf.toString('base64', i);
  this.lastNeed = 3 - n;
  this.lastTotal = 3;
  if (n === 1) {
    this.lastChar[0] = buf[buf.length - 1];
  } else {
    this.lastChar[0] = buf[buf.length - 2];
    this.lastChar[1] = buf[buf.length - 1];
  }
  return buf.toString('base64', i, buf.length - n);
}

function base64End(buf) {
  var r = buf && buf.length ? this.write(buf) : '';
  if (this.lastNeed) return r + this.lastChar.toString('base64', 0, 3 - this.lastNeed);
  return r;
}

// Pass bytes on through for single-byte encodings (e.g. ascii, latin1, hex)
function simpleWrite(buf) {
  return buf.toString(this.encoding);
}

function simpleEnd(buf) {
  return buf && buf.length ? this.write(buf) : '';
}
},{"safe-buffer":88}],104:[function(require,module,exports){
/*                                                                              
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in      
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN 
THE SOFTWARE.
*/

var base32 = require('./thirty-two');

exports.encode = base32.encode;
exports.decode = base32.decode;

},{"./thirty-two":105}],105:[function(require,module,exports){
(function (Buffer){
/*
Copyright (c) 2011, Chris Umbel

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/
'use strict';

var charTable = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
var byteTable = [
    0xff, 0xff, 0x1a, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f,
    0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06,
    0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e,
    0x0f, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16,
    0x17, 0x18, 0x19, 0xff, 0xff, 0xff, 0xff, 0xff,
    0xff, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06,
    0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e,
    0x0f, 0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x16,
    0x17, 0x18, 0x19, 0xff, 0xff, 0xff, 0xff, 0xff
];

function quintetCount(buff) {
    var quintets = Math.floor(buff.length / 5);
    return buff.length % 5 === 0 ? quintets: quintets + 1;
}

exports.encode = function(plain) {
    if(!Buffer.isBuffer(plain)){
    	plain = new Buffer(plain);
    }
    var i = 0;
    var j = 0;
    var shiftIndex = 0;
    var digit = 0;
    var encoded = new Buffer(quintetCount(plain) * 8);

    /* byte by byte isn't as pretty as quintet by quintet but tests a bit
        faster. will have to revisit. */
    while(i < plain.length) {
        var current = plain[i];

        if(shiftIndex > 3) {
            digit = current & (0xff >> shiftIndex);
            shiftIndex = (shiftIndex + 5) % 8;
            digit = (digit << shiftIndex) | ((i + 1 < plain.length) ?
                plain[i + 1] : 0) >> (8 - shiftIndex);
            i++;
        } else {
            digit = (current >> (8 - (shiftIndex + 5))) & 0x1f;
            shiftIndex = (shiftIndex + 5) % 8;
            if(shiftIndex === 0) i++;
        }

        encoded[j] = charTable.charCodeAt(digit);
        j++;
    }

    for(i = j; i < encoded.length; i++) {
        encoded[i] = 0x3d; //'='.charCodeAt(0)
    }

    return encoded;
};

exports.decode = function(encoded) {
    var shiftIndex = 0;
    var plainDigit = 0;
    var plainChar;
    var plainPos = 0;
    if(!Buffer.isBuffer(encoded)){
    	encoded = new Buffer(encoded);
    }
    var decoded = new Buffer(Math.ceil(encoded.length * 5 / 8));

    /* byte by byte isn't as pretty as octet by octet but tests a bit
        faster. will have to revisit. */
    for(var i = 0; i < encoded.length; i++) {
    	if(encoded[i] === 0x3d){ //'='
    		break;
    	}

        var encodedByte = encoded[i] - 0x30;

        if(encodedByte < byteTable.length) {
            plainDigit = byteTable[encodedByte];

            if(shiftIndex <= 3) {
                shiftIndex = (shiftIndex + 5) % 8;

                if(shiftIndex === 0) {
                    plainChar |= plainDigit;
                    decoded[plainPos] = plainChar;
                    plainPos++;
                    plainChar = 0;
                } else {
                    plainChar |= 0xff & (plainDigit << (8 - shiftIndex));
                }
            } else {
                shiftIndex = (shiftIndex + 5) % 8;
                plainChar |= 0xff & (plainDigit >>> shiftIndex);
                decoded[plainPos] = plainChar;
                plainPos++;

                plainChar = 0xff & (plainDigit << (8 - shiftIndex));
            }
        } else {
        	throw new Error('Invalid input - it is not base32 encoded string');
        }
    }

    return decoded.slice(0, plainPos);
};

}).call(this,require("buffer").Buffer)
},{"buffer":22}],106:[function(require,module,exports){
var Buffer = require('buffer').Buffer

module.exports = function (buf) {
	// If the buffer is backed by a Uint8Array, a faster version will work
	if (buf instanceof Uint8Array) {
		// If the buffer isn't a subarray, return the underlying ArrayBuffer
		if (buf.byteOffset === 0 && buf.byteLength === buf.buffer.byteLength) {
			return buf.buffer
		} else if (typeof buf.buffer.slice === 'function') {
			// Otherwise we need to get a proper copy
			return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
		}
	}

	if (Buffer.isBuffer(buf)) {
		// This is the slow version that will work with any Buffer
		// implementation (even in old browsers)
		var arrayCopy = new Uint8Array(buf.length)
		var len = buf.length
		for (var i = 0; i < len; i++) {
			arrayCopy[i] = buf[i]
		}
		return arrayCopy.buffer
	} else {
		throw new Error('Argument must be a Buffer')
	}
}

},{"buffer":22}],107:[function(require,module,exports){
(function (process){
const debug = require('debug')('torrent-discovery')
const DHT = require('bittorrent-dht/client') // empty object in browser
const EventEmitter = require('events').EventEmitter
const parallel = require('run-parallel')
const Tracker = require('bittorrent-tracker/client')

class Discovery extends EventEmitter {
  constructor (opts) {
    super()

    if (!opts.peerId) throw new Error('Option `peerId` is required')
    if (!opts.infoHash) throw new Error('Option `infoHash` is required')
    if (!process.browser && !opts.port) throw new Error('Option `port` is required')

    this.peerId = typeof opts.peerId === 'string'
      ? opts.peerId
      : opts.peerId.toString('hex')
    this.infoHash = typeof opts.infoHash === 'string'
      ? opts.infoHash.toLowerCase()
      : opts.infoHash.toString('hex')
    this._port = opts.port // torrent port
    this._userAgent = opts.userAgent // User-Agent header for http requests

    this.destroyed = false

    this._announce = opts.announce || []
    this._intervalMs = opts.intervalMs || (15 * 60 * 1000)
    this._trackerOpts = null
    this._dhtAnnouncing = false
    this._dhtTimeout = false
    this._internalDHT = false // is the DHT created internally?

    this._onWarning = err => {
      this.emit('warning', err)
    }
    this._onError = err => {
      this.emit('error', err)
    }
    this._onDHTPeer = (peer, infoHash) => {
      if (infoHash.toString('hex') !== this.infoHash) return
      this.emit('peer', `${peer.host}:${peer.port}`, 'dht')
    }
    this._onTrackerPeer = peer => {
      this.emit('peer', peer, 'tracker')
    }
    this._onTrackerAnnounce = () => {
      this.emit('trackerAnnounce')
    }

    const createDHT = (port, opts) => {
      const dht = new DHT(opts)
      dht.on('warning', this._onWarning)
      dht.on('error', this._onError)
      dht.listen(port)
      this._internalDHT = true
      return dht
    }

    if (opts.tracker === false) {
      this.tracker = null
    } else if (opts.tracker && typeof opts.tracker === 'object') {
      this._trackerOpts = Object.assign({}, opts.tracker)
      this.tracker = this._createTracker()
    } else {
      this.tracker = this._createTracker()
    }

    if (opts.dht === false || typeof DHT !== 'function') {
      this.dht = null
    } else if (opts.dht && typeof opts.dht.addNode === 'function') {
      this.dht = opts.dht
    } else if (opts.dht && typeof opts.dht === 'object') {
      this.dht = createDHT(opts.dhtPort, opts.dht)
    } else {
      this.dht = createDHT(opts.dhtPort)
    }

    if (this.dht) {
      this.dht.on('peer', this._onDHTPeer)
      this._dhtAnnounce()
    }
  }

  updatePort (port) {
    if (port === this._port) return
    this._port = port

    if (this.dht) this._dhtAnnounce()

    if (this.tracker) {
      this.tracker.stop()
      this.tracker.destroy(() => {
        this.tracker = this._createTracker()
      })
    }
  }

  complete (opts) {
    if (this.tracker) {
      this.tracker.complete(opts)
    }
  }

  destroy (cb) {
    if (this.destroyed) return
    this.destroyed = true

    clearTimeout(this._dhtTimeout)

    const tasks = []

    if (this.tracker) {
      this.tracker.stop()
      this.tracker.removeListener('warning', this._onWarning)
      this.tracker.removeListener('error', this._onError)
      this.tracker.removeListener('peer', this._onTrackerPeer)
      this.tracker.removeListener('update', this._onTrackerAnnounce)
      tasks.push(cb => {
        this.tracker.destroy(cb)
      })
    }

    if (this.dht) {
      this.dht.removeListener('peer', this._onDHTPeer)
    }

    if (this._internalDHT) {
      this.dht.removeListener('warning', this._onWarning)
      this.dht.removeListener('error', this._onError)
      tasks.push(cb => {
        this.dht.destroy(cb)
      })
    }

    parallel(tasks, cb)

    // cleanup
    this.dht = null
    this.tracker = null
    this._announce = null
  }

  _createTracker () {
    const opts = Object.assign({}, this._trackerOpts, {
      infoHash: this.infoHash,
      announce: this._announce,
      peerId: this.peerId,
      port: this._port,
      userAgent: this._userAgent
    })

    const tracker = new Tracker(opts)
    tracker.on('warning', this._onWarning)
    tracker.on('error', this._onError)
    tracker.on('peer', this._onTrackerPeer)
    tracker.on('update', this._onTrackerAnnounce)
    tracker.setInterval(this._intervalMs)
    tracker.start()
    return tracker
  }

  _dhtAnnounce () {
    if (this._dhtAnnouncing) return
    debug('dht announce')

    this._dhtAnnouncing = true
    clearTimeout(this._dhtTimeout)

    this.dht.announce(this.infoHash, this._port, err => {
      this._dhtAnnouncing = false
      debug('dht announce complete')

      if (err) this.emit('warning', err)
      this.emit('dhtAnnounce')

      if (!this.destroyed) {
        this._dhtTimeout = setTimeout(() => {
          this._dhtAnnounce()
        }, this._intervalMs + Math.floor(Math.random() * this._intervalMs / 5))
        if (this._dhtTimeout.unref) this._dhtTimeout.unref()
      }
    })
  }
}

module.exports = Discovery

}).call(this,require('_process'))
},{"_process":58,"bittorrent-dht/client":17,"bittorrent-tracker/client":11,"debug":26,"events":29,"run-parallel":86}],108:[function(require,module,exports){
(function (Buffer){
const BLOCK_LENGTH = 1 << 14

class Piece {
  constructor (length) {
    this.length = length
    this.missing = length
    this.sources = null

    this._chunks = Math.ceil(length / BLOCK_LENGTH)
    this._remainder = (length % BLOCK_LENGTH) || BLOCK_LENGTH
    this._buffered = 0
    this._buffer = null
    this._cancellations = null
    this._reservations = 0
    this._flushed = false
  }

  chunkLength (i) {
    return i === this._chunks - 1 ? this._remainder : BLOCK_LENGTH
  }

  chunkLengthRemaining (i) {
    return this.length - (i * BLOCK_LENGTH)
  }

  chunkOffset (i) {
    return i * BLOCK_LENGTH
  }

  reserve () {
    if (!this.init()) return -1
    if (this._cancellations.length) return this._cancellations.pop()
    if (this._reservations < this._chunks) return this._reservations++
    return -1
  }

  reserveRemaining () {
    if (!this.init()) return -1
    if (this._reservations < this._chunks) {
      const min = this._reservations
      this._reservations = this._chunks
      return min
    }
    return -1
  }

  cancel (i) {
    if (!this.init()) return
    this._cancellations.push(i)
  }

  cancelRemaining (i) {
    if (!this.init()) return
    this._reservations = i
  }

  get (i) {
    if (!this.init()) return null
    return this._buffer[i]
  }

  set (i, data, source) {
    if (!this.init()) return false
    const len = data.length
    const blocks = Math.ceil(len / BLOCK_LENGTH)
    for (let j = 0; j < blocks; j++) {
      if (!this._buffer[i + j]) {
        const offset = j * BLOCK_LENGTH
        const splitData = data.slice(offset, offset + BLOCK_LENGTH)
        this._buffered++
        this._buffer[i + j] = splitData
        this.missing -= splitData.length
        if (!this.sources.includes(source)) {
          this.sources.push(source)
        }
      }
    }
    return this._buffered === this._chunks
  }

  flush () {
    if (!this._buffer || this._chunks !== this._buffered) return null
    const buffer = Buffer.concat(this._buffer, this.length)
    this._buffer = null
    this._cancellations = null
    this.sources = null
    this._flushed = true
    return buffer
  }

  init () {
    if (this._flushed) return false
    if (this._buffer) return true
    this._buffer = new Array(this._chunks)
    this._cancellations = []
    this.sources = []
    return true
  }
}

Object.defineProperty(Piece, 'BLOCK_LENGTH', { value: BLOCK_LENGTH })

module.exports = Piece

}).call(this,require("buffer").Buffer)
},{"buffer":22}],109:[function(require,module,exports){
(function (Buffer){
/**
 * Convert a typed array to a Buffer without a copy
 *
 * Author:   Feross Aboukhadijeh <https://feross.org>
 * License:  MIT
 *
 * `npm install typedarray-to-buffer`
 */

var isTypedArray = require('is-typedarray').strict

module.exports = function typedarrayToBuffer (arr) {
  if (isTypedArray(arr)) {
    // To avoid a copy, use the typed array's underlying ArrayBuffer to back new Buffer
    var buf = Buffer.from(arr.buffer)
    if (arr.byteLength !== arr.buffer.byteLength) {
      // Respect the "view", i.e. byteOffset and byteLength, without doing a copy
      buf = buf.slice(arr.byteOffset, arr.byteOffset + arr.byteLength)
    }
    return buf
  } else {
    // Pass through all other types to `Buffer.from`
    return Buffer.from(arr)
  }
}

}).call(this,require("buffer").Buffer)
},{"buffer":22,"is-typedarray":38}],110:[function(require,module,exports){
var bufferAlloc = require('buffer-alloc')

var UINT_32_MAX = Math.pow(2, 32)

exports.encodingLength = function () {
  return 8
}

exports.encode = function (num, buf, offset) {
  if (!buf) buf = bufferAlloc(8)
  if (!offset) offset = 0

  var top = Math.floor(num / UINT_32_MAX)
  var rem = num - top * UINT_32_MAX

  buf.writeUInt32BE(top, offset)
  buf.writeUInt32BE(rem, offset + 4)
  return buf
}

exports.decode = function (buf, offset) {
  if (!offset) offset = 0

  var top = buf.readUInt32BE(offset)
  var rem = buf.readUInt32BE(offset + 4)

  return top * UINT_32_MAX + rem
}

exports.encode.bytes = 8
exports.decode.bytes = 8

},{"buffer-alloc":20}],111:[function(require,module,exports){
"use strict"

function unique_pred(list, compare) {
  var ptr = 1
    , len = list.length
    , a=list[0], b=list[0]
  for(var i=1; i<len; ++i) {
    b = a
    a = list[i]
    if(compare(a, b)) {
      if(i === ptr) {
        ptr++
        continue
      }
      list[ptr++] = a
    }
  }
  list.length = ptr
  return list
}

function unique_eq(list) {
  var ptr = 1
    , len = list.length
    , a=list[0], b = list[0]
  for(var i=1; i<len; ++i, b=a) {
    b = a
    a = list[i]
    if(a !== b) {
      if(i === ptr) {
        ptr++
        continue
      }
      list[ptr++] = a
    }
  }
  list.length = ptr
  return list
}

function unique(list, compare, sorted) {
  if(list.length === 0) {
    return list
  }
  if(compare) {
    if(!sorted) {
      list.sort(compare)
    }
    return unique_pred(list, compare)
  }
  if(!sorted) {
    list.sort()
  }
  return unique_eq(list)
}

module.exports = unique

},{}],112:[function(require,module,exports){
module.exports = remove

function remove (arr, i) {
  if (i >= arr.length || i < 0) return
  var last = arr.pop()
  if (i < arr.length) {
    var tmp = arr[i]
    arr[i] = last
    return tmp
  }
  return last
}

},{}],113:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

'use strict';

var punycode = require('punycode');
var util = require('./util');

exports.parse = urlParse;
exports.resolve = urlResolve;
exports.resolveObject = urlResolveObject;
exports.format = urlFormat;

exports.Url = Url;

function Url() {
  this.protocol = null;
  this.slashes = null;
  this.auth = null;
  this.host = null;
  this.port = null;
  this.hostname = null;
  this.hash = null;
  this.search = null;
  this.query = null;
  this.pathname = null;
  this.path = null;
  this.href = null;
}

// Reference: RFC 3986, RFC 1808, RFC 2396

// define these here so at least they only have to be
// compiled once on the first module load.
var protocolPattern = /^([a-z0-9.+-]+:)/i,
    portPattern = /:[0-9]*$/,

    // Special case for a simple path URL
    simplePathPattern = /^(\/\/?(?!\/)[^\?\s]*)(\?[^\s]*)?$/,

    // RFC 2396: characters reserved for delimiting URLs.
    // We actually just auto-escape these.
    delims = ['<', '>', '"', '`', ' ', '\r', '\n', '\t'],

    // RFC 2396: characters not allowed for various reasons.
    unwise = ['{', '}', '|', '\\', '^', '`'].concat(delims),

    // Allowed by RFCs, but cause of XSS attacks.  Always escape these.
    autoEscape = ['\''].concat(unwise),
    // Characters that are never ever allowed in a hostname.
    // Note that any invalid chars are also handled, but these
    // are the ones that are *expected* to be seen, so we fast-path
    // them.
    nonHostChars = ['%', '/', '?', ';', '#'].concat(autoEscape),
    hostEndingChars = ['/', '?', '#'],
    hostnameMaxLen = 255,
    hostnamePartPattern = /^[+a-z0-9A-Z_-]{0,63}$/,
    hostnamePartStart = /^([+a-z0-9A-Z_-]{0,63})(.*)$/,
    // protocols that can allow "unsafe" and "unwise" chars.
    unsafeProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that never have a hostname.
    hostlessProtocol = {
      'javascript': true,
      'javascript:': true
    },
    // protocols that always contain a // bit.
    slashedProtocol = {
      'http': true,
      'https': true,
      'ftp': true,
      'gopher': true,
      'file': true,
      'http:': true,
      'https:': true,
      'ftp:': true,
      'gopher:': true,
      'file:': true
    },
    querystring = require('querystring');

function urlParse(url, parseQueryString, slashesDenoteHost) {
  if (url && util.isObject(url) && url instanceof Url) return url;

  var u = new Url;
  u.parse(url, parseQueryString, slashesDenoteHost);
  return u;
}

Url.prototype.parse = function(url, parseQueryString, slashesDenoteHost) {
  if (!util.isString(url)) {
    throw new TypeError("Parameter 'url' must be a string, not " + typeof url);
  }

  // Copy chrome, IE, opera backslash-handling behavior.
  // Back slashes before the query string get converted to forward slashes
  // See: https://code.google.com/p/chromium/issues/detail?id=25916
  var queryIndex = url.indexOf('?'),
      splitter =
          (queryIndex !== -1 && queryIndex < url.indexOf('#')) ? '?' : '#',
      uSplit = url.split(splitter),
      slashRegex = /\\/g;
  uSplit[0] = uSplit[0].replace(slashRegex, '/');
  url = uSplit.join(splitter);

  var rest = url;

  // trim before proceeding.
  // This is to support parse stuff like "  http://foo.com  \n"
  rest = rest.trim();

  if (!slashesDenoteHost && url.split('#').length === 1) {
    // Try fast path regexp
    var simplePath = simplePathPattern.exec(rest);
    if (simplePath) {
      this.path = rest;
      this.href = rest;
      this.pathname = simplePath[1];
      if (simplePath[2]) {
        this.search = simplePath[2];
        if (parseQueryString) {
          this.query = querystring.parse(this.search.substr(1));
        } else {
          this.query = this.search.substr(1);
        }
      } else if (parseQueryString) {
        this.search = '';
        this.query = {};
      }
      return this;
    }
  }

  var proto = protocolPattern.exec(rest);
  if (proto) {
    proto = proto[0];
    var lowerProto = proto.toLowerCase();
    this.protocol = lowerProto;
    rest = rest.substr(proto.length);
  }

  // figure out if it's got a host
  // user@server is *always* interpreted as a hostname, and url
  // resolution will treat //foo/bar as host=foo,path=bar because that's
  // how the browser resolves relative URLs.
  if (slashesDenoteHost || proto || rest.match(/^\/\/[^@\/]+@[^@\/]+/)) {
    var slashes = rest.substr(0, 2) === '//';
    if (slashes && !(proto && hostlessProtocol[proto])) {
      rest = rest.substr(2);
      this.slashes = true;
    }
  }

  if (!hostlessProtocol[proto] &&
      (slashes || (proto && !slashedProtocol[proto]))) {

    // there's a hostname.
    // the first instance of /, ?, ;, or # ends the host.
    //
    // If there is an @ in the hostname, then non-host chars *are* allowed
    // to the left of the last @ sign, unless some host-ending character
    // comes *before* the @-sign.
    // URLs are obnoxious.
    //
    // ex:
    // http://a@b@c/ => user:a@b host:c
    // http://a@b?@c => user:a host:c path:/?@c

    // v0.12 TODO(isaacs): This is not quite how Chrome does things.
    // Review our test case against browsers more comprehensively.

    // find the first instance of any hostEndingChars
    var hostEnd = -1;
    for (var i = 0; i < hostEndingChars.length; i++) {
      var hec = rest.indexOf(hostEndingChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }

    // at this point, either we have an explicit point where the
    // auth portion cannot go past, or the last @ char is the decider.
    var auth, atSign;
    if (hostEnd === -1) {
      // atSign can be anywhere.
      atSign = rest.lastIndexOf('@');
    } else {
      // atSign must be in auth portion.
      // http://a@b/c@d => host:b auth:a path:/c@d
      atSign = rest.lastIndexOf('@', hostEnd);
    }

    // Now we have a portion which is definitely the auth.
    // Pull that off.
    if (atSign !== -1) {
      auth = rest.slice(0, atSign);
      rest = rest.slice(atSign + 1);
      this.auth = decodeURIComponent(auth);
    }

    // the host is the remaining to the left of the first non-host char
    hostEnd = -1;
    for (var i = 0; i < nonHostChars.length; i++) {
      var hec = rest.indexOf(nonHostChars[i]);
      if (hec !== -1 && (hostEnd === -1 || hec < hostEnd))
        hostEnd = hec;
    }
    // if we still have not hit it, then the entire thing is a host.
    if (hostEnd === -1)
      hostEnd = rest.length;

    this.host = rest.slice(0, hostEnd);
    rest = rest.slice(hostEnd);

    // pull out port.
    this.parseHost();

    // we've indicated that there is a hostname,
    // so even if it's empty, it has to be present.
    this.hostname = this.hostname || '';

    // if hostname begins with [ and ends with ]
    // assume that it's an IPv6 address.
    var ipv6Hostname = this.hostname[0] === '[' &&
        this.hostname[this.hostname.length - 1] === ']';

    // validate a little.
    if (!ipv6Hostname) {
      var hostparts = this.hostname.split(/\./);
      for (var i = 0, l = hostparts.length; i < l; i++) {
        var part = hostparts[i];
        if (!part) continue;
        if (!part.match(hostnamePartPattern)) {
          var newpart = '';
          for (var j = 0, k = part.length; j < k; j++) {
            if (part.charCodeAt(j) > 127) {
              // we replace non-ASCII char with a temporary placeholder
              // we need this to make sure size of hostname is not
              // broken by replacing non-ASCII by nothing
              newpart += 'x';
            } else {
              newpart += part[j];
            }
          }
          // we test again with ASCII char only
          if (!newpart.match(hostnamePartPattern)) {
            var validParts = hostparts.slice(0, i);
            var notHost = hostparts.slice(i + 1);
            var bit = part.match(hostnamePartStart);
            if (bit) {
              validParts.push(bit[1]);
              notHost.unshift(bit[2]);
            }
            if (notHost.length) {
              rest = '/' + notHost.join('.') + rest;
            }
            this.hostname = validParts.join('.');
            break;
          }
        }
      }
    }

    if (this.hostname.length > hostnameMaxLen) {
      this.hostname = '';
    } else {
      // hostnames are always lower case.
      this.hostname = this.hostname.toLowerCase();
    }

    if (!ipv6Hostname) {
      // IDNA Support: Returns a punycoded representation of "domain".
      // It only converts parts of the domain name that
      // have non-ASCII characters, i.e. it doesn't matter if
      // you call it with a domain that already is ASCII-only.
      this.hostname = punycode.toASCII(this.hostname);
    }

    var p = this.port ? ':' + this.port : '';
    var h = this.hostname || '';
    this.host = h + p;
    this.href += this.host;

    // strip [ and ] from the hostname
    // the host field still retains them, though
    if (ipv6Hostname) {
      this.hostname = this.hostname.substr(1, this.hostname.length - 2);
      if (rest[0] !== '/') {
        rest = '/' + rest;
      }
    }
  }

  // now rest is set to the post-host stuff.
  // chop off any delim chars.
  if (!unsafeProtocol[lowerProto]) {

    // First, make 100% sure that any "autoEscape" chars get
    // escaped, even if encodeURIComponent doesn't think they
    // need to be.
    for (var i = 0, l = autoEscape.length; i < l; i++) {
      var ae = autoEscape[i];
      if (rest.indexOf(ae) === -1)
        continue;
      var esc = encodeURIComponent(ae);
      if (esc === ae) {
        esc = escape(ae);
      }
      rest = rest.split(ae).join(esc);
    }
  }


  // chop off from the tail first.
  var hash = rest.indexOf('#');
  if (hash !== -1) {
    // got a fragment string.
    this.hash = rest.substr(hash);
    rest = rest.slice(0, hash);
  }
  var qm = rest.indexOf('?');
  if (qm !== -1) {
    this.search = rest.substr(qm);
    this.query = rest.substr(qm + 1);
    if (parseQueryString) {
      this.query = querystring.parse(this.query);
    }
    rest = rest.slice(0, qm);
  } else if (parseQueryString) {
    // no query string, but parseQueryString still requested
    this.search = '';
    this.query = {};
  }
  if (rest) this.pathname = rest;
  if (slashedProtocol[lowerProto] &&
      this.hostname && !this.pathname) {
    this.pathname = '/';
  }

  //to support http.request
  if (this.pathname || this.search) {
    var p = this.pathname || '';
    var s = this.search || '';
    this.path = p + s;
  }

  // finally, reconstruct the href based on what has been validated.
  this.href = this.format();
  return this;
};

// format a parsed object into a url string
function urlFormat(obj) {
  // ensure it's an object, and not a string url.
  // If it's an obj, this is a no-op.
  // this way, you can call url_format() on strings
  // to clean up potentially wonky urls.
  if (util.isString(obj)) obj = urlParse(obj);
  if (!(obj instanceof Url)) return Url.prototype.format.call(obj);
  return obj.format();
}

Url.prototype.format = function() {
  var auth = this.auth || '';
  if (auth) {
    auth = encodeURIComponent(auth);
    auth = auth.replace(/%3A/i, ':');
    auth += '@';
  }

  var protocol = this.protocol || '',
      pathname = this.pathname || '',
      hash = this.hash || '',
      host = false,
      query = '';

  if (this.host) {
    host = auth + this.host;
  } else if (this.hostname) {
    host = auth + (this.hostname.indexOf(':') === -1 ?
        this.hostname :
        '[' + this.hostname + ']');
    if (this.port) {
      host += ':' + this.port;
    }
  }

  if (this.query &&
      util.isObject(this.query) &&
      Object.keys(this.query).length) {
    query = querystring.stringify(this.query);
  }

  var search = this.search || (query && ('?' + query)) || '';

  if (protocol && protocol.substr(-1) !== ':') protocol += ':';

  // only the slashedProtocols get the //.  Not mailto:, xmpp:, etc.
  // unless they had them to begin with.
  if (this.slashes ||
      (!protocol || slashedProtocol[protocol]) && host !== false) {
    host = '//' + (host || '');
    if (pathname && pathname.charAt(0) !== '/') pathname = '/' + pathname;
  } else if (!host) {
    host = '';
  }

  if (hash && hash.charAt(0) !== '#') hash = '#' + hash;
  if (search && search.charAt(0) !== '?') search = '?' + search;

  pathname = pathname.replace(/[?#]/g, function(match) {
    return encodeURIComponent(match);
  });
  search = search.replace('#', '%23');

  return protocol + host + pathname + search + hash;
};

function urlResolve(source, relative) {
  return urlParse(source, false, true).resolve(relative);
}

Url.prototype.resolve = function(relative) {
  return this.resolveObject(urlParse(relative, false, true)).format();
};

function urlResolveObject(source, relative) {
  if (!source) return relative;
  return urlParse(source, false, true).resolveObject(relative);
}

Url.prototype.resolveObject = function(relative) {
  if (util.isString(relative)) {
    var rel = new Url();
    rel.parse(relative, false, true);
    relative = rel;
  }

  var result = new Url();
  var tkeys = Object.keys(this);
  for (var tk = 0; tk < tkeys.length; tk++) {
    var tkey = tkeys[tk];
    result[tkey] = this[tkey];
  }

  // hash is always overridden, no matter what.
  // even href="" will remove it.
  result.hash = relative.hash;

  // if the relative url is empty, then there's nothing left to do here.
  if (relative.href === '') {
    result.href = result.format();
    return result;
  }

  // hrefs like //foo/bar always cut to the protocol.
  if (relative.slashes && !relative.protocol) {
    // take everything except the protocol from relative
    var rkeys = Object.keys(relative);
    for (var rk = 0; rk < rkeys.length; rk++) {
      var rkey = rkeys[rk];
      if (rkey !== 'protocol')
        result[rkey] = relative[rkey];
    }

    //urlParse appends trailing / to urls like http://www.example.com
    if (slashedProtocol[result.protocol] &&
        result.hostname && !result.pathname) {
      result.path = result.pathname = '/';
    }

    result.href = result.format();
    return result;
  }

  if (relative.protocol && relative.protocol !== result.protocol) {
    // if it's a known url protocol, then changing
    // the protocol does weird things
    // first, if it's not file:, then we MUST have a host,
    // and if there was a path
    // to begin with, then we MUST have a path.
    // if it is file:, then the host is dropped,
    // because that's known to be hostless.
    // anything else is assumed to be absolute.
    if (!slashedProtocol[relative.protocol]) {
      var keys = Object.keys(relative);
      for (var v = 0; v < keys.length; v++) {
        var k = keys[v];
        result[k] = relative[k];
      }
      result.href = result.format();
      return result;
    }

    result.protocol = relative.protocol;
    if (!relative.host && !hostlessProtocol[relative.protocol]) {
      var relPath = (relative.pathname || '').split('/');
      while (relPath.length && !(relative.host = relPath.shift()));
      if (!relative.host) relative.host = '';
      if (!relative.hostname) relative.hostname = '';
      if (relPath[0] !== '') relPath.unshift('');
      if (relPath.length < 2) relPath.unshift('');
      result.pathname = relPath.join('/');
    } else {
      result.pathname = relative.pathname;
    }
    result.search = relative.search;
    result.query = relative.query;
    result.host = relative.host || '';
    result.auth = relative.auth;
    result.hostname = relative.hostname || relative.host;
    result.port = relative.port;
    // to support http.request
    if (result.pathname || result.search) {
      var p = result.pathname || '';
      var s = result.search || '';
      result.path = p + s;
    }
    result.slashes = result.slashes || relative.slashes;
    result.href = result.format();
    return result;
  }

  var isSourceAbs = (result.pathname && result.pathname.charAt(0) === '/'),
      isRelAbs = (
          relative.host ||
          relative.pathname && relative.pathname.charAt(0) === '/'
      ),
      mustEndAbs = (isRelAbs || isSourceAbs ||
                    (result.host && relative.pathname)),
      removeAllDots = mustEndAbs,
      srcPath = result.pathname && result.pathname.split('/') || [],
      relPath = relative.pathname && relative.pathname.split('/') || [],
      psychotic = result.protocol && !slashedProtocol[result.protocol];

  // if the url is a non-slashed url, then relative
  // links like ../.. should be able
  // to crawl up to the hostname, as well.  This is strange.
  // result.protocol has already been set by now.
  // Later on, put the first path part into the host field.
  if (psychotic) {
    result.hostname = '';
    result.port = null;
    if (result.host) {
      if (srcPath[0] === '') srcPath[0] = result.host;
      else srcPath.unshift(result.host);
    }
    result.host = '';
    if (relative.protocol) {
      relative.hostname = null;
      relative.port = null;
      if (relative.host) {
        if (relPath[0] === '') relPath[0] = relative.host;
        else relPath.unshift(relative.host);
      }
      relative.host = null;
    }
    mustEndAbs = mustEndAbs && (relPath[0] === '' || srcPath[0] === '');
  }

  if (isRelAbs) {
    // it's absolute.
    result.host = (relative.host || relative.host === '') ?
                  relative.host : result.host;
    result.hostname = (relative.hostname || relative.hostname === '') ?
                      relative.hostname : result.hostname;
    result.search = relative.search;
    result.query = relative.query;
    srcPath = relPath;
    // fall through to the dot-handling below.
  } else if (relPath.length) {
    // it's relative
    // throw away the existing file, and take the new path instead.
    if (!srcPath) srcPath = [];
    srcPath.pop();
    srcPath = srcPath.concat(relPath);
    result.search = relative.search;
    result.query = relative.query;
  } else if (!util.isNullOrUndefined(relative.search)) {
    // just pull out the search.
    // like href='?foo'.
    // Put this after the other two cases because it simplifies the booleans
    if (psychotic) {
      result.hostname = result.host = srcPath.shift();
      //occationaly the auth can get stuck only in host
      //this especially happens in cases like
      //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
      var authInHost = result.host && result.host.indexOf('@') > 0 ?
                       result.host.split('@') : false;
      if (authInHost) {
        result.auth = authInHost.shift();
        result.host = result.hostname = authInHost.shift();
      }
    }
    result.search = relative.search;
    result.query = relative.query;
    //to support http.request
    if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
      result.path = (result.pathname ? result.pathname : '') +
                    (result.search ? result.search : '');
    }
    result.href = result.format();
    return result;
  }

  if (!srcPath.length) {
    // no path at all.  easy.
    // we've already handled the other stuff above.
    result.pathname = null;
    //to support http.request
    if (result.search) {
      result.path = '/' + result.search;
    } else {
      result.path = null;
    }
    result.href = result.format();
    return result;
  }

  // if a url ENDs in . or .., then it must get a trailing slash.
  // however, if it ends in anything else non-slashy,
  // then it must NOT get a trailing slash.
  var last = srcPath.slice(-1)[0];
  var hasTrailingSlash = (
      (result.host || relative.host || srcPath.length > 1) &&
      (last === '.' || last === '..') || last === '');

  // strip single dots, resolve double dots to parent dir
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = srcPath.length; i >= 0; i--) {
    last = srcPath[i];
    if (last === '.') {
      srcPath.splice(i, 1);
    } else if (last === '..') {
      srcPath.splice(i, 1);
      up++;
    } else if (up) {
      srcPath.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (!mustEndAbs && !removeAllDots) {
    for (; up--; up) {
      srcPath.unshift('..');
    }
  }

  if (mustEndAbs && srcPath[0] !== '' &&
      (!srcPath[0] || srcPath[0].charAt(0) !== '/')) {
    srcPath.unshift('');
  }

  if (hasTrailingSlash && (srcPath.join('/').substr(-1) !== '/')) {
    srcPath.push('');
  }

  var isAbsolute = srcPath[0] === '' ||
      (srcPath[0] && srcPath[0].charAt(0) === '/');

  // put the host back
  if (psychotic) {
    result.hostname = result.host = isAbsolute ? '' :
                                    srcPath.length ? srcPath.shift() : '';
    //occationaly the auth can get stuck only in host
    //this especially happens in cases like
    //url.resolveObject('mailto:local1@domain1', 'local2@domain2')
    var authInHost = result.host && result.host.indexOf('@') > 0 ?
                     result.host.split('@') : false;
    if (authInHost) {
      result.auth = authInHost.shift();
      result.host = result.hostname = authInHost.shift();
    }
  }

  mustEndAbs = mustEndAbs || (result.host && srcPath.length);

  if (mustEndAbs && !isAbsolute) {
    srcPath.unshift('');
  }

  if (!srcPath.length) {
    result.pathname = null;
    result.path = null;
  } else {
    result.pathname = srcPath.join('/');
  }

  //to support request.http
  if (!util.isNull(result.pathname) || !util.isNull(result.search)) {
    result.path = (result.pathname ? result.pathname : '') +
                  (result.search ? result.search : '');
  }
  result.auth = relative.auth || result.auth;
  result.slashes = result.slashes || relative.slashes;
  result.href = result.format();
  return result;
};

Url.prototype.parseHost = function() {
  var host = this.host;
  var port = portPattern.exec(host);
  if (port) {
    port = port[0];
    if (port !== ':') {
      this.port = port.substr(1);
    }
    host = host.substr(0, host.length - port.length);
  }
  if (host) this.hostname = host;
};

},{"./util":114,"punycode":60,"querystring":63}],114:[function(require,module,exports){
'use strict';

module.exports = {
  isString: function(arg) {
    return typeof(arg) === 'string';
  },
  isObject: function(arg) {
    return typeof(arg) === 'object' && arg !== null;
  },
  isNull: function(arg) {
    return arg === null;
  },
  isNullOrUndefined: function(arg) {
    return arg == null;
  }
};

},{}],115:[function(require,module,exports){
(function (Buffer){
const { EventEmitter } = require('events')
const bencode = require('bencode')
const BitField = require('bitfield')
const debug = require('debug')('ut_metadata')
const sha1 = require('simple-sha1')

const MAX_METADATA_SIZE = 1E7 // 10 MB
const BITFIELD_GROW = 1E3
const PIECE_LENGTH = 1 << 14 // 16 KiB

module.exports = metadata => {
  class utMetadata extends EventEmitter {
    constructor (wire) {
      super()

      this._wire = wire

      this._fetching = false
      this._metadataComplete = false
      this._metadataSize = null
      // how many reject messages to tolerate before quitting
      this._remainingRejects = null

      // The largest torrent file that I know of is ~1-2MB, which is ~100
      // pieces. Therefore, cap the bitfield to 10x that (1000 pieces) so a
      // malicious peer can't make it grow to fill all memory.
      this._bitfield = new BitField(0, { grow: BITFIELD_GROW })

      if (Buffer.isBuffer(metadata)) {
        this.setMetadata(metadata)
      }
    }

    onHandshake (infoHash, peerId, extensions) {
      this._infoHash = infoHash
    }

    onExtendedHandshake (handshake) {
      if (!handshake.m || !handshake.m.ut_metadata) {
        return this.emit('warning', new Error('Peer does not support ut_metadata'))
      }
      if (!handshake.metadata_size) {
        return this.emit('warning', new Error('Peer does not have metadata'))
      }
      if (typeof handshake.metadata_size !== 'number' ||
          MAX_METADATA_SIZE < handshake.metadata_size ||
          handshake.metadata_size <= 0) {
        return this.emit('warning', new Error('Peer gave invalid metadata size'))
      }

      this._metadataSize = handshake.metadata_size
      this._numPieces = Math.ceil(this._metadataSize / PIECE_LENGTH)
      this._remainingRejects = this._numPieces * 2

      this._requestPieces()
    }

    onMessage (buf) {
      let dict
      let trailer
      try {
        const str = buf.toString()
        const trailerIndex = str.indexOf('ee') + 2
        dict = bencode.decode(str.substring(0, trailerIndex))
        trailer = buf.slice(trailerIndex)
      } catch (err) {
        // drop invalid messages
        return
      }

      switch (dict.msg_type) {
        case 0:
          // ut_metadata request (from peer)
          // example: { 'msg_type': 0, 'piece': 0 }
          this._onRequest(dict.piece)
          break
        case 1:
          // ut_metadata data (in response to our request)
          // example: { 'msg_type': 1, 'piece': 0, 'total_size': 3425 }
          this._onData(dict.piece, trailer, dict.total_size)
          break
        case 2:
          // ut_metadata reject (peer doesn't have piece we requested)
          // { 'msg_type': 2, 'piece': 0 }
          this._onReject(dict.piece)
          break
      }
    }

    /**
     * Ask the peer to send metadata.
     * @public
     */
    fetch () {
      if (this._metadataComplete) {
        return
      }
      this._fetching = true
      if (this._metadataSize) {
        this._requestPieces()
      }
    }

    /**
     * Stop asking the peer to send metadata.
     * @public
     */
    cancel () {
      this._fetching = false
    }

    setMetadata (metadata) {
      if (this._metadataComplete) return true
      debug('set metadata')

      // if full torrent dictionary was passed in, pull out just `info` key
      try {
        const info = bencode.decode(metadata).info
        if (info) {
          metadata = bencode.encode(info)
        }
      } catch (err) {}

      // check hash
      if (this._infoHash && this._infoHash !== sha1.sync(metadata)) {
        return false
      }

      this.cancel()

      this.metadata = metadata
      this._metadataComplete = true
      this._metadataSize = this.metadata.length
      this._wire.extendedHandshake.metadata_size = this._metadataSize

      this.emit('metadata', bencode.encode({
        info: bencode.decode(this.metadata)
      }))

      return true
    }

    _send (dict, trailer) {
      let buf = bencode.encode(dict)
      if (Buffer.isBuffer(trailer)) {
        buf = Buffer.concat([buf, trailer])
      }
      this._wire.extended('ut_metadata', buf)
    }

    _request (piece) {
      this._send({ msg_type: 0, piece })
    }

    _data (piece, buf, totalSize) {
      const msg = { msg_type: 1, piece }
      if (typeof totalSize === 'number') {
        msg.total_size = totalSize
      }
      this._send(msg, buf)
    }

    _reject (piece) {
      this._send({ msg_type: 2, piece })
    }

    _onRequest (piece) {
      if (!this._metadataComplete) {
        this._reject(piece)
        return
      }
      const start = piece * PIECE_LENGTH
      let end = start + PIECE_LENGTH
      if (end > this._metadataSize) {
        end = this._metadataSize
      }
      const buf = this.metadata.slice(start, end)
      this._data(piece, buf, this._metadataSize)
    }

    _onData (piece, buf, totalSize) {
      if (buf.length > PIECE_LENGTH || !this._fetching) {
        return
      }
      buf.copy(this.metadata, piece * PIECE_LENGTH)
      this._bitfield.set(piece)
      this._checkDone()
    }

    _onReject (piece) {
      if (this._remainingRejects > 0 && this._fetching) {
        // If we haven't been rejected too much,
        // then try to request the piece again
        this._request(piece)
        this._remainingRejects -= 1
      } else {
        this.emit('warning', new Error('Peer sent "reject" too much'))
      }
    }

    _requestPieces () {
      if (!this._fetching) return
      this.metadata = Buffer.alloc(this._metadataSize)
      for (let piece = 0; piece < this._numPieces; piece++) {
        this._request(piece)
      }
    }

    _checkDone () {
      let done = true
      for (let piece = 0; piece < this._numPieces; piece++) {
        if (!this._bitfield.get(piece)) {
          done = false
          break
        }
      }
      if (!done) return

      // attempt to set metadata -- may fail sha1 check
      const success = this.setMetadata(this.metadata)

      if (!success) {
        this._failedMetadata()
      }
    }

    _failedMetadata () {
      // reset bitfield & try again
      this._bitfield = new BitField(0, { grow: BITFIELD_GROW })
      this._remainingRejects -= this._numPieces
      if (this._remainingRejects > 0) {
        this._requestPieces()
      } else {
        this.emit('warning', new Error('Peer sent invalid metadata'))
      }
    }
  }

  // Name of the bittorrent-protocol extension
  utMetadata.prototype.name = 'ut_metadata'

  return utMetadata
}

}).call(this,require("buffer").Buffer)
},{"bencode":7,"bitfield":9,"buffer":22,"debug":26,"events":29,"simple-sha1":92}],116:[function(require,module,exports){
(function (global){

/**
 * Module exports.
 */

module.exports = deprecate;

/**
 * Mark that a method should not be used.
 * Returns a modified function which warns once by default.
 *
 * If `localStorage.noDeprecation = true` is set, then it is a no-op.
 *
 * If `localStorage.throwDeprecation = true` is set, then deprecated functions
 * will throw an Error when invoked.
 *
 * If `localStorage.traceDeprecation = true` is set, then deprecated functions
 * will invoke `console.trace()` instead of `console.error()`.
 *
 * @param {Function} fn - the function to deprecate
 * @param {String} msg - the string to print to the console when `fn` is invoked
 * @returns {Function} a new "deprecated" version of `fn`
 * @api public
 */

function deprecate (fn, msg) {
  if (config('noDeprecation')) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (config('throwDeprecation')) {
        throw new Error(msg);
      } else if (config('traceDeprecation')) {
        console.trace(msg);
      } else {
        console.warn(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
}

/**
 * Checks `localStorage` for boolean values for the given `name`.
 *
 * @param {String} name
 * @returns {Boolean}
 * @api private
 */

function config (name) {
  // accessing global.localStorage can trigger a DOMException in sandboxed iframes
  try {
    if (!global.localStorage) return false;
  } catch (_) {
    return false;
  }
  var val = global.localStorage[name];
  if (null == val) return false;
  return String(val).toLowerCase() === 'true';
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],117:[function(require,module,exports){
(function (Buffer){
const bs = require('binary-search')
const EventEmitter = require('events')
const mp4 = require('mp4-stream')
const Box = require('mp4-box-encoding')
const RangeSliceStream = require('range-slice-stream')

// if we want to ignore more than this many bytes, request a new stream.
// if we want to ignore fewer, just skip them.
const FIND_MOOV_SEEK_SIZE = 4096

class MP4Remuxer extends EventEmitter {
  constructor (file) {
    super()

    this._tracks = []
    this._file = file
    this._decoder = null
    this._findMoov(0)
  }

  _findMoov (offset) {
    if (this._decoder) {
      this._decoder.destroy()
    }

    let toSkip = 0
    this._decoder = mp4.decode()
    const fileStream = this._file.createReadStream({
      start: offset
    })
    fileStream.pipe(this._decoder)

    const boxHandler = headers => {
      if (headers.type === 'moov') {
        this._decoder.removeListener('box', boxHandler)
        this._decoder.decode(moov => {
          fileStream.destroy()
          try {
            this._processMoov(moov)
          } catch (err) {
            err.message = `Cannot parse mp4 file: ${err.message}`
            this.emit('error', err)
          }
        })
      } else if (headers.length < FIND_MOOV_SEEK_SIZE) {
        toSkip += headers.length
        this._decoder.ignore()
      } else {
        this._decoder.removeListener('box', boxHandler)
        toSkip += headers.length
        fileStream.destroy()
        this._decoder.destroy()
        this._findMoov(offset + toSkip)
      }
    }
    this._decoder.on('box', boxHandler)

  }

  _processMoov (moov) {
    const traks = moov.traks
    this._tracks = []
    this._hasVideo = false
    this._hasAudio = false
    for (let i = 0; i < traks.length; i++) {
      const trak = traks[i]
      const stbl = trak.mdia.minf.stbl
      const stsdEntry = stbl.stsd.entries[0]
      const handlerType = trak.mdia.hdlr.handlerType
      let codec
      let mime
      if (handlerType === 'vide' && stsdEntry.type === 'avc1') {
        if (this._hasVideo) {
          continue
        }
        this._hasVideo = true
        codec = 'avc1'
        if (stsdEntry.avcC) {
          codec += `.${stsdEntry.avcC.mimeCodec}`
        }
        mime = `video/mp4; codecs="${codec}"`
      } else if (handlerType === 'soun' && stsdEntry.type === 'mp4a') {
        if (this._hasAudio) {
          continue
        }
        this._hasAudio = true
        codec = 'mp4a'
        if (stsdEntry.esds && stsdEntry.esds.mimeCodec) {
          codec += `.${stsdEntry.esds.mimeCodec}`
        }
        mime = `audio/mp4; codecs="${codec}"`
      } else {
        continue
      }

      const samples = []
      let sample = 0

      // Chunk/position data
      let sampleInChunk = 0
      let chunk = 0
      let offsetInChunk = 0
      let sampleToChunkIndex = 0

      // Time data
      let dts = 0
      const decodingTimeEntry = new RunLengthIndex(stbl.stts.entries)
      let presentationOffsetEntry = null
      if (stbl.ctts) {
        presentationOffsetEntry = new RunLengthIndex(stbl.ctts.entries)
      }

      // Sync table index
      let syncSampleIndex = 0

      while (true) {
        var currChunkEntry = stbl.stsc.entries[sampleToChunkIndex]

        // Compute size
        const size = stbl.stsz.entries[sample]

        // Compute time data
        const duration = decodingTimeEntry.value.duration
        const presentationOffset = presentationOffsetEntry ? presentationOffsetEntry.value.compositionOffset : 0

        // Compute sync
        let sync = true
        if (stbl.stss) {
          sync = stbl.stss.entries[syncSampleIndex] === sample + 1
        }

        // Create new sample entry
        const chunkOffsetTable = stbl.stco || stbl.co64
        samples.push({
          size,
          duration,
          dts,
          presentationOffset,
          sync,
          offset: offsetInChunk + chunkOffsetTable.entries[chunk]
        })

        // Go to next sample
        sample++
        if (sample >= stbl.stsz.entries.length) {
          break
        }

        // Move position/chunk
        sampleInChunk++
        offsetInChunk += size
        if (sampleInChunk >= currChunkEntry.samplesPerChunk) {
          // Move to new chunk
          sampleInChunk = 0
          offsetInChunk = 0
          chunk++
          // Move sample to chunk box index
          const nextChunkEntry = stbl.stsc.entries[sampleToChunkIndex + 1]
          if (nextChunkEntry && chunk + 1 >= nextChunkEntry.firstChunk) {
            sampleToChunkIndex++
          }
        }

        // Move time forward
        dts += duration
        decodingTimeEntry.inc()
        presentationOffsetEntry && presentationOffsetEntry.inc()

        // Move sync table index
        if (sync) {
          syncSampleIndex++
        }
      }

      trak.mdia.mdhd.duration = 0
      trak.tkhd.duration = 0

      const defaultSampleDescriptionIndex = currChunkEntry.sampleDescriptionId

      const trackMoov = {
        type: 'moov',
        mvhd: moov.mvhd,
        traks: [{
          tkhd: trak.tkhd,
          mdia: {
            mdhd: trak.mdia.mdhd,
            hdlr: trak.mdia.hdlr,
            elng: trak.mdia.elng,
            minf: {
              vmhd: trak.mdia.minf.vmhd,
              smhd: trak.mdia.minf.smhd,
              dinf: trak.mdia.minf.dinf,
              stbl: {
                stsd: stbl.stsd,
                stts: empty(),
                ctts: empty(),
                stsc: empty(),
                stsz: empty(),
                stco: empty(),
                stss: empty()
              }
            }
          }
        }],
        mvex: {
          mehd: {
            fragmentDuration: moov.mvhd.duration
          },
          trexs: [{
            trackId: trak.tkhd.trackId,
            defaultSampleDescriptionIndex,
            defaultSampleDuration: 0,
            defaultSampleSize: 0,
            defaultSampleFlags: 0
          }]
        }
      }

      this._tracks.push({
        fragmentSequence: 1,
        trackId: trak.tkhd.trackId,
        timeScale: trak.mdia.mdhd.timeScale,
        samples,
        currSample: null,
        currTime: null,
        moov: trackMoov,
        mime
      })
    }

    if (this._tracks.length === 0) {
      this.emit('error', new Error('no playable tracks'))
      return
    }

    // Must be set last since this is used above
    moov.mvhd.duration = 0

    this._ftyp = {
      type: 'ftyp',
      brand: 'iso5',
      brandVersion: 0,
      compatibleBrands: [
        'iso5'
      ]
    }

    const ftypBuf = Box.encode(this._ftyp)
    const data = this._tracks.map(track => {
      const moovBuf = Box.encode(track.moov)
      return {
        mime: track.mime,
        init: Buffer.concat([ftypBuf, moovBuf])
      }
    })

    this.emit('ready', data)
  }

  seek (time) {
    if (!this._tracks) {
      throw new Error('Not ready yet; wait for \'ready\' event')
    }

    if (this._fileStream) {
      this._fileStream.destroy()
      this._fileStream = null
    }

    let startOffset = -1
    this._tracks.map((track, i) => {
      // find the keyframe before the time
      // stream from there
      if (track.outStream) {
        track.outStream.destroy()
      }
      if (track.inStream) {
        track.inStream.destroy()
        track.inStream = null
      }
      const outStream = track.outStream = mp4.encode()
      const fragment = this._generateFragment(i, time)
      if (!fragment) {
        return outStream.finalize()
      }

      if (startOffset === -1 || fragment.ranges[0].start < startOffset) {
        startOffset = fragment.ranges[0].start
      }

      const writeFragment = (frag) => {
        if (outStream.destroyed) return
        outStream.box(frag.moof, err => {
          if (err) return this.emit('error', err)
          if (outStream.destroyed) return
          const slicedStream = track.inStream.slice(frag.ranges)
          slicedStream.pipe(outStream.mediaData(frag.length, err => {
            if (err) return this.emit('error', err)
            if (outStream.destroyed) return
            const nextFrag = this._generateFragment(i)
            if (!nextFrag) {
              return outStream.finalize()
            }
            writeFragment(nextFrag)
          }))
        })
      }
      writeFragment(fragment)
    })

    if (startOffset >= 0) {
      const fileStream = this._fileStream = this._file.createReadStream({
        start: startOffset
      })

      this._tracks.forEach(track => {
        track.inStream = new RangeSliceStream(startOffset, {
          // Allow up to a 10MB offset between audio and video,
          // which should be fine for any reasonable interleaving
          // interval and bitrate
          highWaterMark: 10000000
        })
        fileStream.pipe(track.inStream)
      })
    }

    return this._tracks.map(track => {
      return track.outStream
    })
  }

  _findSampleBefore (trackInd, time) {
    const track = this._tracks[trackInd]
    const scaledTime = Math.floor(track.timeScale * time)
    let sample = bs(track.samples, scaledTime, (sample, t) => {
      const pts = sample.dts + sample.presentationOffset// - track.editShift
      return pts - t
    })
    if (sample === -1) {
      sample = 0
    } else if (sample < 0) {
      sample = -sample - 2
    }
    // sample is now the last sample with dts <= time
    // Find the preceeding sync sample
    while (!track.samples[sample].sync) {
      sample--
    }
    return sample
  }

  _generateFragment (track, time) {
    /*
        1. Find correct sample
        2. Process backward until sync sample found
        3. Process forward until next sync sample after MIN_FRAGMENT_DURATION found
        */
    const currTrack = this._tracks[track]
    let firstSample
    if (time !== undefined) {
      firstSample = this._findSampleBefore(track, time)
    } else {
      firstSample = currTrack.currSample
    }

    if (firstSample >= currTrack.samples.length) { return null }

    const startDts = currTrack.samples[firstSample].dts

    let totalLen = 0
    const ranges = []
    for (var currSample = firstSample; currSample < currTrack.samples.length; currSample++) {
      const sample = currTrack.samples[currSample]
      if (sample.sync && sample.dts - startDts >= currTrack.timeScale * MIN_FRAGMENT_DURATION) {
        break // This is a reasonable place to end the fragment
      }

      totalLen += sample.size
      const currRange = ranges.length - 1
      if (currRange < 0 || ranges[currRange].end !== sample.offset) {
        // Push a new range
        ranges.push({
          start: sample.offset,
          end: sample.offset + sample.size
        })
      } else {
        ranges[currRange].end += sample.size
      }
    }

    currTrack.currSample = currSample

    return {
      moof: this._generateMoof(track, firstSample, currSample),
      ranges,
      length: totalLen
    }
  }

  _generateMoof (track, firstSample, lastSample) {
    const currTrack = this._tracks[track]

    const entries = []
    let trunVersion = 0
    for (let j = firstSample; j < lastSample; j++) {
      const currSample = currTrack.samples[j]
      if (currSample.presentationOffset < 0) { trunVersion = 1 }
      entries.push({
        sampleDuration: currSample.duration,
        sampleSize: currSample.size,
        sampleFlags: currSample.sync ? 0x2000000 : 0x1010000,
        sampleCompositionTimeOffset: currSample.presentationOffset
      })
    }

    const moof = {
      type: 'moof',
      mfhd: {
        sequenceNumber: currTrack.fragmentSequence++
      },
      trafs: [{
        tfhd: {
          flags: 0x20000, // default-base-is-moof
          trackId: currTrack.trackId
        },
        tfdt: {
          baseMediaDecodeTime: currTrack.samples[firstSample].dts
        },
        trun: {
          flags: 0xf01,
          dataOffset: 8, // The moof size has to be added to this later as well
          entries,
          version: trunVersion
        }
      }]
    }

    // Update the offset
    moof.trafs[0].trun.dataOffset += Box.encodingLength(moof)

    return moof
  }
}

class RunLengthIndex {
  constructor (entries, countName) {
    this._entries = entries
    this._countName = countName || 'count'
    this._index = 0
    this._offset = 0

    this.value = this._entries[0]
  }

  inc () {
    this._offset++
    if (this._offset >= this._entries[this._index][this._countName]) {
      this._index++
      this._offset = 0
    }

    this.value = this._entries[this._index]
  }
}

function empty () {
  return {
    version: 0,
    flags: 0,
    entries: []
  }
}

const MIN_FRAGMENT_DURATION = 1 // second

module.exports = MP4Remuxer

}).call(this,require("buffer").Buffer)
},{"binary-search":8,"buffer":22,"events":29,"mp4-box-encoding":45,"mp4-stream":48,"range-slice-stream":67}],118:[function(require,module,exports){
const MediaElementWrapper = require('mediasource')
const pump = require('pump')

const MP4Remuxer = require('./mp4-remuxer')

function VideoStream (file, mediaElem, opts = {}) {
  if (!(this instanceof VideoStream)) {
    console.warn("don't invoked VideoStream without 'new'")
    return new VideoStream(file, mediaElem, opts)
  }

  this.detailedError = null

  this._elem = mediaElem
  this._elemWrapper = new MediaElementWrapper(mediaElem)
  this._waitingFired = false
  this._trackMeta = null
  this._file = file
  this._tracks = null

  if (this._elem.preload !== 'none') {
    this._createMuxer()
  }

  this._onError = () => {
    this.detailedError = this._elemWrapper.detailedError
    this.destroy() // don't pass err though so the user doesn't need to listen for errors
  }

  this._onWaiting = () => {
    this._waitingFired = true
    if (!this._muxer) {
      this._createMuxer()
    } else if (this._tracks) {
      this._pump()
    }
  }

  if (mediaElem.autoplay) { mediaElem.preload = 'auto' }
  mediaElem.addEventListener('waiting', this._onWaiting)
  mediaElem.addEventListener('error', this._onError)
}

VideoStream.prototype = {
  _createMuxer () {
    this._muxer = new MP4Remuxer(this._file)
    this._muxer.on('ready', data => {
      this._tracks = data.map(trackData => {
        const mediaSource = this._elemWrapper.createWriteStream(trackData.mime)
        mediaSource.on('error', err => {
          this._elemWrapper.error(err)
        })
        const track = {
          muxed: null,
          mediaSource,
          initFlushed: false,
          onInitFlushed: null
        }
        mediaSource.write(trackData.init, err => {
          track.initFlushed = true
          if (track.onInitFlushed) {
            track.onInitFlushed(err)
          }
        })
        return track
      })

      if (this._waitingFired || this._elem.preload === 'auto') {
        this._pump()
      }
    })

    this._muxer.on('error', err => {
      this._elemWrapper.error(err)
    })
  },
  _pump () {
    const muxed = this._muxer.seek(this._elem.currentTime, !this._tracks)

    this._tracks.forEach((track, i) => {
      const pumpTrack = () => {
        if (track.muxed) {
          track.muxed.destroy()
          track.mediaSource = this._elemWrapper.createWriteStream(track.mediaSource)
          track.mediaSource.on('error', err => {
            this._elemWrapper.error(err)
          })
        }
        track.muxed = muxed[i]
        pump(track.muxed, track.mediaSource)
      }
      if (!track.initFlushed) {
        track.onInitFlushed = err => {
          if (err) {
            this._elemWrapper.error(err)
            return
          }
          pumpTrack()
        }
      } else {
        pumpTrack()
      }
    })
  },
  destroy () {
    if (this.destroyed) {
      return
    }
    this.destroyed = true

    this._elem.removeEventListener('waiting', this._onWaiting)
    this._elem.removeEventListener('error', this._onError)

    if (this._tracks) {
      this._tracks.forEach(track => {
        if (track.muxed) {
          track.muxed.destroy()
        }
      })
    }

    this._elem.src = ''
  }
}

module.exports = VideoStream

},{"./mp4-remuxer":117,"mediasource":41,"pump":59}],119:[function(require,module,exports){
(function (process,global,Buffer){
/* global FileList */

const { EventEmitter } = require('events')
const concat = require('simple-concat')
const createTorrent = require('create-torrent')
const debug = require('debug')('webtorrent')
const DHT = require('bittorrent-dht/client') // browser exclude
const loadIPSet = require('load-ip-set') // browser exclude
const parallel = require('run-parallel')
const parseTorrent = require('parse-torrent')
const path = require('path')
const Peer = require('simple-peer')
const randombytes = require('randombytes')
const speedometer = require('speedometer')

const TCPPool = require('./lib/tcp-pool') // browser exclude
const Torrent = require('./lib/torrent')
const VERSION = require('./package.json').version

/**
 * Version number in Azureus-style. Generated from major and minor semver version.
 * For example:
 *   '0.16.1' -> '0016'
 *   '1.2.5' -> '0102'
 */
const VERSION_STR = VERSION
  .replace(/\d*./g, v => `0${v % 100}`.slice(-2))
  .slice(0, 4)

/**
 * Version prefix string (used in peer ID). WebTorrent uses the Azureus-style
 * encoding: '-', two characters for client id ('WW'), four ascii digits for version
 * number, '-', followed by random numbers.
 * For example:
 *   '-WW0102-'...
 */
const VERSION_PREFIX = `-WW${VERSION_STR}-`

/**
 * WebTorrent Client
 * @param {Object=} opts
 */
class WebTorrent extends EventEmitter {
  constructor (opts = {}) {
    super()

    if (typeof opts.peerId === 'string') {
      this.peerId = opts.peerId
    } else if (Buffer.isBuffer(opts.peerId)) {
      this.peerId = opts.peerId.toString('hex')
    } else {
      this.peerId = Buffer.from(VERSION_PREFIX + randombytes(9).toString('base64')).toString('hex')
    }
    this.peerIdBuffer = Buffer.from(this.peerId, 'hex')

    if (typeof opts.nodeId === 'string') {
      this.nodeId = opts.nodeId
    } else if (Buffer.isBuffer(opts.nodeId)) {
      this.nodeId = opts.nodeId.toString('hex')
    } else {
      this.nodeId = randombytes(20).toString('hex')
    }
    this.nodeIdBuffer = Buffer.from(this.nodeId, 'hex')

    this._debugId = this.peerId.toString('hex').substring(0, 7)

    this.destroyed = false
    this.listening = false
    this.torrentPort = opts.torrentPort || 0
    this.dhtPort = opts.dhtPort || 0
    this.tracker = opts.tracker !== undefined ? opts.tracker : {}
    this.torrents = []
    this.maxConns = Number(opts.maxConns) || 55

    this._debug(
      'new webtorrent (peerId %s, nodeId %s, port %s)',
      this.peerId, this.nodeId, this.torrentPort
    )

    if (this.tracker) {
      if (typeof this.tracker !== 'object') this.tracker = {}
      if (opts.rtcConfig) {
        // TODO: remove in v1
        console.warn('WebTorrent: opts.rtcConfig is deprecated. Use opts.tracker.rtcConfig instead')
        this.tracker.rtcConfig = opts.rtcConfig
      }
      if (opts.wrtc) {
        // TODO: remove in v1
        console.warn('WebTorrent: opts.wrtc is deprecated. Use opts.tracker.wrtc instead')
        this.tracker.wrtc = opts.wrtc
      }
      if (global.WRTC && !this.tracker.wrtc) {
        this.tracker.wrtc = global.WRTC
      }
    }

    if (typeof TCPPool === 'function') {
      this._tcpPool = new TCPPool(this)
    } else {
      process.nextTick(() => {
        this._onListening()
      })
    }

    // stats
    this._downloadSpeed = speedometer()
    this._uploadSpeed = speedometer()

    if (opts.dht !== false && typeof DHT === 'function' /* browser exclude */) {
      // use a single DHT instance for all torrents, so the routing table can be reused
      this.dht = new DHT(Object.assign({}, { nodeId: this.nodeId }, opts.dht))

      this.dht.once('error', err => {
        this._destroy(err)
      })

      this.dht.once('listening', () => {
        const address = this.dht.address()
        if (address) this.dhtPort = address.port
      })

      // Ignore warning when there are > 10 torrents in the client
      this.dht.setMaxListeners(0)

      this.dht.listen(this.dhtPort)
    } else {
      this.dht = false
    }

    // Enable or disable BEP19 (Web Seeds). Enabled by default:
    this.enableWebSeeds = opts.webSeeds !== false

    const ready = () => {
      if (this.destroyed) return
      this.ready = true
      this.emit('ready')
    }

    if (typeof loadIPSet === 'function' && opts.blocklist != null) {
      loadIPSet(opts.blocklist, {
        headers: {
          'user-agent': `WebTorrent/${VERSION} (https://webtorrent.io)`
        }
      }, (err, ipSet) => {
        if (err) return this.error(`Failed to load blocklist: ${err.message}`)
        this.blocked = ipSet
        ready()
      })
    } else {
      process.nextTick(ready)
    }
  }

  get downloadSpeed () { return this._downloadSpeed() }

  get uploadSpeed () { return this._uploadSpeed() }

  get progress () {
    const torrents = this.torrents.filter(torrent => torrent.progress !== 1)
    const downloaded = torrents.reduce((total, torrent) => total + torrent.downloaded, 0)
    const length = torrents.reduce((total, torrent) => total + (torrent.length || 0), 0) || 1
    return downloaded / length
  }

  get ratio () {
    const uploaded = this.torrents.reduce((total, torrent) => total + torrent.uploaded, 0)
    const received = this.torrents.reduce((total, torrent) => total + torrent.received, 0) || 1
    return uploaded / received
  }

  /**
   * Returns the torrent with the given `torrentId`. Convenience method. Easier than
   * searching through the `client.torrents` array. Returns `null` if no matching torrent
   * found.
   *
   * @param  {string|Buffer|Object|Torrent} torrentId
   * @return {Torrent|null}
   */
  get (torrentId) {
    if (torrentId instanceof Torrent) {
      if (this.torrents.includes(torrentId)) return torrentId
    } else {
      let parsed
      try { parsed = parseTorrent(torrentId) } catch (err) {}

      if (!parsed) return null
      if (!parsed.infoHash) throw new Error('Invalid torrent identifier')

      for (const torrent of this.torrents) {
        if (torrent.infoHash === parsed.infoHash) return torrent
      }
    }
    return null
  }

  // TODO: remove in v1
  download (torrentId, opts, ontorrent) {
    console.warn('WebTorrent: client.download() is deprecated. Use client.add() instead')
    return this.add(torrentId, opts, ontorrent)
  }

  /**
   * Start downloading a new torrent. Aliased as `client.download`.
   * @param {string|Buffer|Object} torrentId
   * @param {Object} opts torrent-specific options
   * @param {function=} ontorrent called when the torrent is ready (has metadata)
   */
  add (torrentId, opts = {}, ontorrent) {
    if (this.destroyed) throw new Error('client is destroyed')
    if (typeof opts === 'function') [opts, ontorrent] = [{}, opts]

    const onInfoHash = () => {
      if (this.destroyed) return
      for (const t of this.torrents) {
        if (t.infoHash === torrent.infoHash && t !== torrent) {
          torrent._destroy(new Error(`Cannot add duplicate torrent ${torrent.infoHash}`))
          return
        }
      }
    }

    const onReady = () => {
      if (this.destroyed) return
      if (typeof ontorrent === 'function') ontorrent(torrent)
      this.emit('torrent', torrent)
    }

    function onClose () {
      torrent.removeListener('_infoHash', onInfoHash)
      torrent.removeListener('ready', onReady)
      torrent.removeListener('close', onClose)
    }

    this._debug('add')
    opts = opts ? Object.assign({}, opts) : {}

    const torrent = new Torrent(torrentId, this, opts)
    this.torrents.push(torrent)

    torrent.once('_infoHash', onInfoHash)
    torrent.once('ready', onReady)
    torrent.once('close', onClose)

    return torrent
  }

  /**
   * Start seeding a new file/folder.
   * @param  {string|File|FileList|Buffer|Array.<string|File|Buffer>} input
   * @param  {Object=} opts
   * @param  {function=} onseed called when torrent is seeding
   */
  seed (input, opts, onseed) {
    if (this.destroyed) throw new Error('client is destroyed')
    if (typeof opts === 'function') [opts, onseed] = [{}, opts]

    this._debug('seed')
    opts = opts ? Object.assign({}, opts) : {}

    // no need to verify the hashes we create
    opts.skipVerify = true

    const isFilePath = typeof input === 'string'

    // When seeding from fs path, initialize store from that path to avoid a copy
    if (isFilePath) opts.path = path.dirname(input)
    if (!opts.createdBy) opts.createdBy = `WebTorrent/${VERSION_STR}`

    const onTorrent = torrent => {
      const tasks = [
        cb => {
          // when a filesystem path is specified, files are already in the FS store
          if (isFilePath) return cb()
          torrent.load(streams, cb)
        }
      ]
      if (this.dht) {
        tasks.push(cb => {
          torrent.once('dhtAnnounce', cb)
        })
      }
      parallel(tasks, err => {
        if (this.destroyed) return
        if (err) return torrent._destroy(err)
        _onseed(torrent)
      })
    }

    const _onseed = torrent => {
      this._debug('on seed')
      if (typeof onseed === 'function') onseed(torrent)
      torrent.emit('seed')
      this.emit('seed', torrent)
    }

    const torrent = this.add(null, opts, onTorrent)
    let streams

    if (isFileList(input)) input = Array.from(input)
    else if (!Array.isArray(input)) input = [input]

    parallel(input.map(item => cb => {
      if (isReadable(item)) concat(item, cb)
      else cb(null, item)
    }), (err, input) => {
      if (this.destroyed) return
      if (err) return torrent._destroy(err)

      createTorrent.parseInput(input, opts, (err, files) => {
        if (this.destroyed) return
        if (err) return torrent._destroy(err)

        streams = files.map(file => file.getStream)

        createTorrent(input, opts, (err, torrentBuf) => {
          if (this.destroyed) return
          if (err) return torrent._destroy(err)

          const existingTorrent = this.get(torrentBuf)
          if (existingTorrent) {
            torrent._destroy(new Error(`Cannot add duplicate torrent ${existingTorrent.infoHash}`))
          } else {
            torrent._onTorrentId(torrentBuf)
          }
        })
      })
    })

    return torrent
  }

  /**
   * Remove a torrent from the client.
   * @param  {string|Buffer|Torrent}   torrentId
   * @param  {function} cb
   */
  remove (torrentId, cb) {
    this._debug('remove')
    const torrent = this.get(torrentId)
    if (!torrent) throw new Error(`No torrent with id ${torrentId}`)
    this._remove(torrentId, cb)
  }

  _remove (torrentId, cb) {
    const torrent = this.get(torrentId)
    if (!torrent) return
    this.torrents.splice(this.torrents.indexOf(torrent), 1)
    torrent.destroy(cb)
  }

  address () {
    if (!this.listening) return null
    return this._tcpPool
      ? this._tcpPool.server.address()
      : { address: '0.0.0.0', family: 'IPv4', port: 0 }
  }

  /**
   * Destroy the client, including all torrents and connections to peers.
   * @param  {function} cb
   */
  destroy (cb) {
    if (this.destroyed) throw new Error('client already destroyed')
    this._destroy(null, cb)
  }

  _destroy (err, cb) {
    this._debug('client destroy')
    this.destroyed = true

    const tasks = this.torrents.map(torrent => cb => {
      torrent.destroy(cb)
    })

    if (this._tcpPool) {
      tasks.push(cb => {
        this._tcpPool.destroy(cb)
      })
    }

    if (this.dht) {
      tasks.push(cb => {
        this.dht.destroy(cb)
      })
    }

    parallel(tasks, cb)

    if (err) this.emit('error', err)

    this.torrents = []
    this._tcpPool = null
    this.dht = null
  }

  _onListening () {
    this._debug('listening')
    this.listening = true

    if (this._tcpPool) {
      // Sometimes server.address() returns `null` in Docker.
      const address = this._tcpPool.server.address()
      if (address) this.torrentPort = address.port
    }

    this.emit('listening')
  }

  _debug () {
    const args = [].slice.call(arguments)
    args[0] = `[${this._debugId}] ${args[0]}`
    debug(...args)
  }
}

WebTorrent.WEBRTC_SUPPORT = Peer.WEBRTC_SUPPORT
WebTorrent.VERSION = VERSION

/**
 * Check if `obj` is a node Readable stream
 * @param  {*} obj
 * @return {boolean}
 */
function isReadable (obj) {
  return typeof obj === 'object' && obj != null && typeof obj.pipe === 'function'
}

/**
 * Check if `obj` is a W3C `FileList` object
 * @param  {*} obj
 * @return {boolean}
 */
function isFileList (obj) {
  return typeof FileList !== 'undefined' && obj instanceof FileList
}

module.exports = WebTorrent

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},require("buffer").Buffer)
},{"./lib/tcp-pool":17,"./lib/torrent":124,"./package.json":126,"_process":58,"bittorrent-dht/client":17,"buffer":22,"create-torrent":25,"debug":26,"events":29,"load-ip-set":17,"parse-torrent":54,"path":55,"randombytes":66,"run-parallel":86,"simple-concat":89,"simple-peer":91,"speedometer":95}],120:[function(require,module,exports){
const debug = require('debug')('webtorrent:file-stream')
const stream = require('readable-stream')

/**
 * Readable stream of a torrent file
 *
 * @param {File} file
 * @param {Object} opts
 * @param {number} opts.start stream slice of file, starting from this byte (inclusive)
 * @param {number} opts.end stream slice of file, ending with this byte (inclusive)
 */
class FileStream extends stream.Readable {
  constructor (file, opts) {
    super(opts)

    this.destroyed = false
    this._torrent = file._torrent

    const start = (opts && opts.start) || 0
    const end = (opts && opts.end && opts.end < file.length)
      ? opts.end
      : file.length - 1

    const pieceLength = file._torrent.pieceLength

    this._startPiece = (start + file.offset) / pieceLength | 0
    this._endPiece = (end + file.offset) / pieceLength | 0

    this._piece = this._startPiece
    this._offset = (start + file.offset) - (this._startPiece * pieceLength)

    this._missing = end - start + 1
    this._reading = false
    this._notifying = false
    this._criticalLength = Math.min((1024 * 1024 / pieceLength) | 0, 2)
  }

  _read () {
    if (this._reading) return
    this._reading = true
    this._notify()
  }

  _notify () {
    if (!this._reading || this._missing === 0) return
    if (!this._torrent.bitfield.get(this._piece)) {
      return this._torrent.critical(this._piece, this._piece + this._criticalLength)
    }

    if (this._notifying) return
    this._notifying = true

    if (this._torrent.destroyed) return this._destroy(new Error('Torrent removed'))

    const p = this._piece
    this._torrent.store.get(p, (err, buffer) => {
      this._notifying = false
      if (this.destroyed) return
      debug('read %s (length %s) (err %s)', p, buffer.length, err && err.message)

      if (err) return this._destroy(err)

      if (this._offset) {
        buffer = buffer.slice(this._offset)
        this._offset = 0
      }

      if (this._missing < buffer.length) {
        buffer = buffer.slice(0, this._missing)
      }
      this._missing -= buffer.length

      debug('pushing buffer of length %s', buffer.length)
      this._reading = false
      this.push(buffer)

      if (this._missing === 0) this.push(null)
    })
    this._piece += 1
  }

  destroy (onclose) {
    this._destroy(null, onclose)
  }

  _destroy (err, onclose) {
    if (this.destroyed) return
    this.destroyed = true

    if (!this._torrent.destroyed) {
      this._torrent.deselect(this._startPiece, this._endPiece, true)
    }

    if (err) this.emit('error', err)
    this.emit('close')
    if (onclose) onclose()
  }
}

module.exports = FileStream

},{"debug":26,"readable-stream":82}],121:[function(require,module,exports){
(function (process){
const { EventEmitter } = require('events')
const { PassThrough } = require('readable-stream')
const eos = require('end-of-stream')
const path = require('path')
const render = require('render-media')
const streamToBlob = require('stream-to-blob')
const streamToBlobURL = require('stream-to-blob-url')
const streamToBuffer = require('stream-with-known-length-to-buffer')
const FileStream = require('./file-stream')

class File extends EventEmitter {
  constructor (torrent, file) {
    super()

    this._torrent = torrent
    this._destroyed = false

    this.name = file.name
    this.path = file.path
    this.length = file.length
    this.offset = file.offset

    this.done = false

    const start = file.offset
    const end = start + file.length - 1

    this._startPiece = start / this._torrent.pieceLength | 0
    this._endPiece = end / this._torrent.pieceLength | 0

    if (this.length === 0) {
      this.done = true
      this.emit('done')
    }
  }

  get downloaded () {
    if (!this._torrent.bitfield) return 0

    const { pieces, bitfield, pieceLength } = this._torrent
    const { _startPiece: start, _endPiece: end } = this
    const piece = pieces[start]

    // First piece may have an offset, e.g. irrelevant bytes from the end of
    // the previous file
    const irrelevantFirstPieceBytes = this.offset % pieceLength
    let downloaded = bitfield.get(start)
      ? pieceLength - irrelevantFirstPieceBytes
      : Math.max(pieceLength - irrelevantFirstPieceBytes - piece.missing, 0)

    for (let index = start + 1; index <= end; ++index) {
      if (bitfield.get(index)) {
        // verified data
        downloaded += pieceLength
      } else {
        // "in progress" data
        const piece = pieces[index]
        downloaded += pieceLength - piece.missing
      }
    }

    // We don't know the end offset, so return this.length if it's oversized.
    // e.g. One small file can fit in the middle of a piece.
    return Math.min(downloaded, this.length)
  }

  get progress () {
    return this.length ? this.downloaded / this.length : 0
  }

  select (priority) {
    if (this.length === 0) return
    this._torrent.select(this._startPiece, this._endPiece, priority)
  }

  deselect () {
    if (this.length === 0) return
    this._torrent.deselect(this._startPiece, this._endPiece, false)
  }

  createReadStream (opts) {
    if (this.length === 0) {
      const empty = new PassThrough()
      process.nextTick(() => {
        empty.end()
      })
      return empty
    }

    const fileStream = new FileStream(this, opts)
    this._torrent.select(fileStream._startPiece, fileStream._endPiece, true, () => {
      fileStream._notify()
    })
    eos(fileStream, () => {
      if (this._destroyed) return
      if (!this._torrent.destroyed) {
        this._torrent.deselect(fileStream._startPiece, fileStream._endPiece, true)
      }
    })
    return fileStream
  }

  getBuffer (cb) {
    streamToBuffer(this.createReadStream(), this.length, cb)
  }

  getBlob (cb) {
    if (typeof window === 'undefined') throw new Error('browser-only method')
    streamToBlob(this.createReadStream(), this._getMimeType())
      .then(
        blob => cb(null, blob),
        err => cb(err)
      )
  }

  getBlobURL (cb) {
    if (typeof window === 'undefined') throw new Error('browser-only method')
    streamToBlobURL(this.createReadStream(), this._getMimeType())
      .then(
        blobUrl => cb(null, blobUrl),
        err => cb(err)
      )
  }

  appendTo (elem, opts, cb) {
    if (typeof window === 'undefined') throw new Error('browser-only method')
    render.append(this, elem, opts, cb)
  }

  renderTo (elem, opts, cb) {
    if (typeof window === 'undefined') throw new Error('browser-only method')
    render.render(this, elem, opts, cb)
  }

  _getMimeType () {
    return render.mime[path.extname(this.name).toLowerCase()]
  }

  _destroy () {
    this._destroyed = true
    this._torrent = null
  }
}

module.exports = File

}).call(this,require('_process'))
},{"./file-stream":120,"_process":58,"end-of-stream":28,"events":29,"path":55,"readable-stream":82,"render-media":83,"stream-to-blob":101,"stream-to-blob-url":100,"stream-with-known-length-to-buffer":102}],122:[function(require,module,exports){
const arrayRemove = require('unordered-array-remove')
const debug = require('debug')('webtorrent:peer')
const Wire = require('bittorrent-protocol')

const WebConn = require('./webconn')

const CONNECT_TIMEOUT_TCP = 5000
const CONNECT_TIMEOUT_WEBRTC = 25000
const HANDSHAKE_TIMEOUT = 25000

/**
 * WebRTC peer connections start out connected, because WebRTC peers require an
 * "introduction" (i.e. WebRTC signaling), and there's no equivalent to an IP address
 * that lets you refer to a WebRTC endpoint.
 */
exports.createWebRTCPeer = (conn, swarm) => {
  const peer = new Peer(conn.id, 'webrtc')
  peer.conn = conn
  peer.swarm = swarm

  if (peer.conn.connected) {
    peer.onConnect()
  } else {
    peer.conn.once('connect', () => { peer.onConnect() })
    peer.conn.once('error', err => { peer.destroy(err) })
    peer.startConnectTimeout()
  }

  return peer
}

/**
 * Incoming TCP peers start out connected, because the remote peer connected to the
 * listening port of the TCP server. Until the remote peer sends a handshake, we don't
 * know what swarm the connection is intended for.
 */
exports.createTCPIncomingPeer = conn => {
  const addr = `${conn.remoteAddress}:${conn.remotePort}`
  const peer = new Peer(addr, 'tcpIncoming')
  peer.conn = conn
  peer.addr = addr

  peer.onConnect()

  return peer
}

/**
 * Outgoing TCP peers start out with just an IP address. At some point (when there is an
 * available connection), the client can attempt to connect to the address.
 */
exports.createTCPOutgoingPeer = (addr, swarm) => {
  const peer = new Peer(addr, 'tcpOutgoing')
  peer.addr = addr
  peer.swarm = swarm

  return peer
}

/**
 * Peer that represents a Web Seed (BEP17 / BEP19).
 */
exports.createWebSeedPeer = (url, swarm) => {
  const peer = new Peer(url, 'webSeed')
  peer.swarm = swarm
  peer.conn = new WebConn(url, swarm)

  peer.onConnect()

  return peer
}

/**
 * Peer. Represents a peer in the torrent swarm.
 *
 * @param {string} id "ip:port" string, peer id (for WebRTC peers), or url (for Web Seeds)
 * @param {string} type the type of the peer
 */
class Peer {
  constructor (id, type) {
    this.id = id
    this.type = type

    debug('new %s Peer %s', type, id)

    this.addr = null
    this.conn = null
    this.swarm = null
    this.wire = null

    this.connected = false
    this.destroyed = false
    this.timeout = null // handshake timeout
    this.retries = 0 // outgoing TCP connection retry count

    this.sentHandshake = false
  }

  /**
   * Called once the peer is connected (i.e. fired 'connect' event)
   * @param {Socket} conn
   */
  onConnect () {
    if (this.destroyed) return
    this.connected = true

    debug('Peer %s connected', this.id)

    clearTimeout(this.connectTimeout)

    const conn = this.conn
    conn.once('end', () => {
      this.destroy()
    })
    conn.once('close', () => {
      this.destroy()
    })
    conn.once('finish', () => {
      this.destroy()
    })
    conn.once('error', err => {
      this.destroy(err)
    })

    const wire = this.wire = new Wire()
    wire.type = this.type
    wire.once('end', () => {
      this.destroy()
    })
    wire.once('close', () => {
      this.destroy()
    })
    wire.once('finish', () => {
      this.destroy()
    })
    wire.once('error', err => {
      this.destroy(err)
    })

    wire.once('handshake', (infoHash, peerId) => {
      this.onHandshake(infoHash, peerId)
    })
    this.startHandshakeTimeout()

    conn.pipe(wire).pipe(conn)
    if (this.swarm && !this.sentHandshake) this.handshake()
  }

  /**
   * Called when handshake is received from remote peer.
   * @param {string} infoHash
   * @param {string} peerId
   */
  onHandshake (infoHash, peerId) {
    if (!this.swarm) return // `this.swarm` not set yet, so do nothing
    if (this.destroyed) return

    if (this.swarm.destroyed) {
      return this.destroy(new Error('swarm already destroyed'))
    }
    if (infoHash !== this.swarm.infoHash) {
      return this.destroy(new Error('unexpected handshake info hash for this swarm'))
    }
    if (peerId === this.swarm.peerId) {
      return this.destroy(new Error('refusing to connect to ourselves'))
    }

    debug('Peer %s got handshake %s', this.id, infoHash)

    clearTimeout(this.handshakeTimeout)

    this.retries = 0

    let addr = this.addr
    if (!addr && this.conn.remoteAddress && this.conn.remotePort) {
      addr = `${this.conn.remoteAddress}:${this.conn.remotePort}`
    }
    this.swarm._onWire(this.wire, addr)

    // swarm could be destroyed in user's 'wire' event handler
    if (!this.swarm || this.swarm.destroyed) return

    if (!this.sentHandshake) this.handshake()
  }

  handshake () {
    const opts = {
      dht: this.swarm.private ? false : !!this.swarm.client.dht
    }
    this.wire.handshake(this.swarm.infoHash, this.swarm.client.peerId, opts)
    this.sentHandshake = true
  }

  startConnectTimeout () {
    clearTimeout(this.connectTimeout)
    this.connectTimeout = setTimeout(() => {
      this.destroy(new Error('connect timeout'))
    }, this.type === 'webrtc' ? CONNECT_TIMEOUT_WEBRTC : CONNECT_TIMEOUT_TCP)
    if (this.connectTimeout.unref) this.connectTimeout.unref()
  }

  startHandshakeTimeout () {
    clearTimeout(this.handshakeTimeout)
    this.handshakeTimeout = setTimeout(() => {
      this.destroy(new Error('handshake timeout'))
    }, HANDSHAKE_TIMEOUT)
    if (this.handshakeTimeout.unref) this.handshakeTimeout.unref()
  }

  destroy (err) {
    if (this.destroyed) return
    this.destroyed = true
    this.connected = false

    debug('destroy %s (error: %s)', this.id, err && (err.message || err))

    clearTimeout(this.connectTimeout)
    clearTimeout(this.handshakeTimeout)

    const swarm = this.swarm
    const conn = this.conn
    const wire = this.wire

    this.swarm = null
    this.conn = null
    this.wire = null

    if (swarm && wire) {
      arrayRemove(swarm.wires, swarm.wires.indexOf(wire))
    }
    if (conn) {
      conn.on('error', () => {})
      conn.destroy()
    }
    if (wire) wire.destroy()
    if (swarm) swarm.removePeer(this.id)
  }
}

},{"./webconn":125,"bittorrent-protocol":10,"debug":26,"unordered-array-remove":112}],123:[function(require,module,exports){

/**
 * Mapping of torrent pieces to their respective availability in the torrent swarm. Used
 * by the torrent manager for implementing the rarest piece first selection strategy.
 */
class RarityMap {
  constructor (torrent) {
    this._torrent = torrent
    this._numPieces = torrent.pieces.length
    this._pieces = new Array(this._numPieces)

    this._onWire = wire => {
      this.recalculate()
      this._initWire(wire)
    }
    this._onWireHave = index => {
      this._pieces[index] += 1
    }
    this._onWireBitfield = () => {
      this.recalculate()
    }

    this._torrent.wires.forEach(wire => {
      this._initWire(wire)
    })
    this._torrent.on('wire', this._onWire)
    this.recalculate()
  }

  /**
   * Get the index of the rarest piece. Optionally, pass a filter function to exclude
   * certain pieces (for instance, those that we already have).
   *
   * @param {function} pieceFilterFunc
   * @return {number} index of rarest piece, or -1
   */
  getRarestPiece (pieceFilterFunc) {
    let candidates = []
    let min = Infinity

    for (let i = 0; i < this._numPieces; ++i) {
      if (pieceFilterFunc && !pieceFilterFunc(i)) continue

      const availability = this._pieces[i]
      if (availability === min) {
        candidates.push(i)
      } else if (availability < min) {
        candidates = [i]
        min = availability
      }
    }

    if (candidates.length) {
      // if there are multiple pieces with the same availability, choose one randomly
      return candidates[Math.random() * candidates.length | 0]
    } else {
      return -1
    }
  }

  destroy () {
    this._torrent.removeListener('wire', this._onWire)
    this._torrent.wires.forEach(wire => {
      this._cleanupWireEvents(wire)
    })
    this._torrent = null
    this._pieces = null

    this._onWire = null
    this._onWireHave = null
    this._onWireBitfield = null
  }

  _initWire (wire) {
    wire._onClose = () => {
      this._cleanupWireEvents(wire)
      for (let i = 0; i < this._numPieces; ++i) {
        this._pieces[i] -= wire.peerPieces.get(i)
      }
    }

    wire.on('have', this._onWireHave)
    wire.on('bitfield', this._onWireBitfield)
    wire.once('close', wire._onClose)
  }

  /**
   * Recalculates piece availability across all peers in the torrent.
   */
  recalculate () {
    this._pieces.fill(0)

    for (const wire of this._torrent.wires) {
      for (let i = 0; i < this._numPieces; ++i) {
        this._pieces[i] += wire.peerPieces.get(i)
      }
    }
  }

  _cleanupWireEvents (wire) {
    wire.removeListener('have', this._onWireHave)
    wire.removeListener('bitfield', this._onWireBitfield)
    if (wire._onClose) wire.removeListener('close', wire._onClose)
    wire._onClose = null
  }
}

module.exports = RarityMap

},{}],124:[function(require,module,exports){
(function (process,global){
/* global Blob */

const addrToIPPort = require('addr-to-ip-port')
const BitField = require('bitfield')
const ChunkStoreWriteStream = require('chunk-store-stream/write')
const debug = require('debug')('webtorrent:torrent')
const Discovery = require('torrent-discovery')
const EventEmitter = require('events').EventEmitter
const fs = require('fs')
const FSChunkStore = require('fs-chunk-store') // browser: `memory-chunk-store`
const get = require('simple-get')
const ImmediateChunkStore = require('immediate-chunk-store')
const MultiStream = require('multistream')
const net = require('net') // browser exclude
const os = require('os') // browser exclude
const parallel = require('run-parallel')
const parallelLimit = require('run-parallel-limit')
const parseTorrent = require('parse-torrent')
const path = require('path')
const Piece = require('torrent-piece')
const pump = require('pump')
const randomIterate = require('random-iterate')
const sha1 = require('simple-sha1')
const speedometer = require('speedometer')
const uniq = require('uniq')
const utMetadata = require('ut_metadata')
const utPex = require('ut_pex') // browser exclude
const parseRange = require('parse-numeric-range')

const File = require('./file')
const Peer = require('./peer')
const RarityMap = require('./rarity-map')
const Server = require('./server') // browser exclude

const MAX_BLOCK_LENGTH = 128 * 1024
const PIECE_TIMEOUT = 30000
const CHOKE_TIMEOUT = 5000
const SPEED_THRESHOLD = 3 * Piece.BLOCK_LENGTH

const PIPELINE_MIN_DURATION = 0.5
const PIPELINE_MAX_DURATION = 1

const RECHOKE_INTERVAL = 10000 // 10 seconds
const RECHOKE_OPTIMISTIC_DURATION = 2 // 30 seconds

// IndexedDB chunk stores used in the browser benefit from maximum concurrency
const FILESYSTEM_CONCURRENCY = process.browser ? Infinity : 2

const RECONNECT_WAIT = [1000, 5000, 15000]

const VERSION = require('../package.json').version
const USER_AGENT = `WebTorrent/${VERSION} (https://webtorrent.io)`

let TMP
try {
  TMP = path.join(fs.statSync('/tmp') && '/tmp', 'webtorrent')
} catch (err) {
  TMP = path.join(typeof os.tmpdir === 'function' ? os.tmpdir() : '/', 'webtorrent')
}

class Torrent extends EventEmitter {
  constructor (torrentId, client, opts) {
    super()

    this._debugId = 'unknown infohash'
    this.client = client

    this.announce = opts.announce
    this.urlList = opts.urlList

    this.path = opts.path
    this.skipVerify = !!opts.skipVerify
    this._store = opts.store || FSChunkStore
    this._getAnnounceOpts = opts.getAnnounceOpts

    this.strategy = opts.strategy || 'sequential'

    this.maxWebConns = opts.maxWebConns || 4

    this._rechokeNumSlots = (opts.uploads === false || opts.uploads === 0)
      ? 0
      : (+opts.uploads || 10)
    this._rechokeOptimisticWire = null
    this._rechokeOptimisticTime = 0
    this._rechokeIntervalId = null

    this.ready = false
    this.destroyed = false
    this.paused = false
    this.done = false

    this.metadata = null
    this.store = null
    this.files = []
    this.pieces = []

    this._amInterested = false
    this._selections = []
    this._critical = []

    this.wires = [] // open wires (added *after* handshake)

    this._queue = [] // queue of outgoing tcp peers to connect to
    this._peers = {} // connected peers (addr/peerId -> Peer)
    this._peersLength = 0 // number of elements in `this._peers` (cache, for perf)

    // stats
    this.received = 0
    this.uploaded = 0
    this._downloadSpeed = speedometer()
    this._uploadSpeed = speedometer()

    // for cleanup
    this._servers = []
    this._xsRequests = []

    // TODO: remove this and expose a hook instead
    // optimization: don't recheck every file if it hasn't changed
    this._fileModtimes = opts.fileModtimes

    if (torrentId !== null) this._onTorrentId(torrentId)

    this._debug('new torrent')
  }

  get timeRemaining () {
    if (this.done) return 0
    if (this.downloadSpeed === 0) return Infinity
    return ((this.length - this.downloaded) / this.downloadSpeed) * 1000
  }

  get downloaded () {
    if (!this.bitfield) return 0
    let downloaded = 0
    for (let index = 0, len = this.pieces.length; index < len; ++index) {
      if (this.bitfield.get(index)) { // verified data
        downloaded += (index === len - 1) ? this.lastPieceLength : this.pieceLength
      } else { // "in progress" data
        const piece = this.pieces[index]
        downloaded += (piece.length - piece.missing)
      }
    }
    return downloaded
  }

  // TODO: re-enable this. The number of missing pieces. Used to implement 'end game' mode.
  // Object.defineProperty(Storage.prototype, 'numMissing', {
  //   get: function () {
  //     var self = this
  //     var numMissing = self.pieces.length
  //     for (var index = 0, len = self.pieces.length; index < len; index++) {
  //       numMissing -= self.bitfield.get(index)
  //     }
  //     return numMissing
  //   }
  // })

  get downloadSpeed () { return this._downloadSpeed() }

  get uploadSpeed () { return this._uploadSpeed() }

  get progress () { return this.length ? this.downloaded / this.length : 0 }

  get ratio () { return this.uploaded / (this.received || 1) }

  get numPeers () { return this.wires.length }

  get torrentFileBlobURL () {
    if (typeof window === 'undefined') throw new Error('browser-only property')
    if (!this.torrentFile) return null
    return URL.createObjectURL(
      new Blob([this.torrentFile], { type: 'application/x-bittorrent' })
    )
  }

  get _numQueued () {
    return this._queue.length + (this._peersLength - this._numConns)
  }

  get _numConns () {
    let numConns = 0
    for (const id in this._peers) {
      if (this._peers[id].connected) numConns += 1
    }
    return numConns
  }

  // TODO: remove in v1
  get swarm () {
    console.warn('WebTorrent: `torrent.swarm` is deprecated. Use `torrent` directly instead.')
    return this
  }

  _onTorrentId (torrentId) {
    if (this.destroyed) return

    let parsedTorrent
    try { parsedTorrent = parseTorrent(torrentId) } catch (err) {}
    if (parsedTorrent) {
      // Attempt to set infoHash property synchronously
      this.infoHash = parsedTorrent.infoHash
      this._debugId = parsedTorrent.infoHash.toString('hex').substring(0, 7)
      process.nextTick(() => {
        if (this.destroyed) return
        this._onParsedTorrent(parsedTorrent)
      })
    } else {
      // If torrentId failed to parse, it could be in a form that requires an async
      // operation, i.e. http/https link, filesystem path, or Blob.
      parseTorrent.remote(torrentId, (err, parsedTorrent) => {
        if (this.destroyed) return
        if (err) return this._destroy(err)
        this._onParsedTorrent(parsedTorrent)
      })
    }
  }

  _onParsedTorrent (parsedTorrent) {
    if (this.destroyed) return

    this._processParsedTorrent(parsedTorrent)

    if (!this.infoHash) {
      return this._destroy(new Error('Malformed torrent data: No info hash'))
    }

    if (!this.path) this.path = path.join(TMP, this.infoHash)

    this._rechokeIntervalId = setInterval(() => {
      this._rechoke()
    }, RECHOKE_INTERVAL)
    if (this._rechokeIntervalId.unref) this._rechokeIntervalId.unref()

    // Private 'infoHash' event allows client.add to check for duplicate torrents and
    // destroy them before the normal 'infoHash' event is emitted. Prevents user
    // applications from needing to deal with duplicate 'infoHash' events.
    this.emit('_infoHash', this.infoHash)
    if (this.destroyed) return

    this.emit('infoHash', this.infoHash)
    if (this.destroyed) return // user might destroy torrent in event handler

    if (this.client.listening) {
      this._onListening()
    } else {
      this.client.once('listening', () => {
        this._onListening()
      })
    }
  }

  _processParsedTorrent (parsedTorrent) {
    this._debugId = parsedTorrent.infoHash.toString('hex').substring(0, 7)

    if (this.announce) {
      // Allow specifying trackers via `opts` parameter
      parsedTorrent.announce = parsedTorrent.announce.concat(this.announce)
    }

    if (this.client.tracker && global.WEBTORRENT_ANNOUNCE && !this.private) {
      // So `webtorrent-hybrid` can force specific trackers to be used
      parsedTorrent.announce = parsedTorrent.announce.concat(global.WEBTORRENT_ANNOUNCE)
    }

    if (this.urlList) {
      // Allow specifying web seeds via `opts` parameter
      parsedTorrent.urlList = parsedTorrent.urlList.concat(this.urlList)
    }

    uniq(parsedTorrent.announce)
    uniq(parsedTorrent.urlList)

    Object.assign(this, parsedTorrent)

    this.magnetURI = parseTorrent.toMagnetURI(parsedTorrent)
    this.torrentFile = parseTorrent.toTorrentFile(parsedTorrent)
  }

  _onListening () {
    if (this.destroyed) return

    if (this.info) {
      // if full metadata was included in initial torrent id, use it immediately. Otherwise,
      // wait for torrent-discovery to find peers and ut_metadata to get the metadata.
      this._onMetadata(this)
    } else {
      if (this.xs) this._getMetadataFromServer()
      this._startDiscovery()
    }
  }

  _startDiscovery () {
    if (this.discovery || this.destroyed) return

    let trackerOpts = this.client.tracker
    if (trackerOpts) {
      trackerOpts = Object.assign({}, this.client.tracker, {
        getAnnounceOpts: () => {
          const opts = {
            uploaded: this.uploaded,
            downloaded: this.downloaded,
            left: Math.max(this.length - this.downloaded, 0)
          }
          if (this.client.tracker.getAnnounceOpts) {
            Object.assign(opts, this.client.tracker.getAnnounceOpts())
          }
          if (this._getAnnounceOpts) {
            // TODO: consider deprecating this, as it's redundant with the former case
            Object.assign(opts, this._getAnnounceOpts())
          }
          return opts
        }
      })
    }

    // begin discovering peers via DHT and trackers
    this.discovery = new Discovery({
      infoHash: this.infoHash,
      announce: this.announce,
      peerId: this.client.peerId,
      dht: !this.private && this.client.dht,
      tracker: trackerOpts,
      port: this.client.torrentPort,
      userAgent: USER_AGENT
    })

    this.discovery.on('error', (err) => {
      this._destroy(err)
    })

    this.discovery.on('peer', (peer) => {
      // Don't create new outgoing TCP connections when torrent is done
      if (typeof peer === 'string' && this.done) return
      this.addPeer(peer)
    })

    this.discovery.on('trackerAnnounce', () => {
      this.emit('trackerAnnounce')
      if (this.numPeers === 0) this.emit('noPeers', 'tracker')
    })

    this.discovery.on('dhtAnnounce', () => {
      this.emit('dhtAnnounce')
      if (this.numPeers === 0) this.emit('noPeers', 'dht')
    })

    this.discovery.on('warning', (err) => {
      this.emit('warning', err)
    })
  }

  _getMetadataFromServer () {
    // to allow function hoisting
    const self = this

    const urls = Array.isArray(this.xs) ? this.xs : [this.xs]

    const tasks = urls.map(url => cb => {
      getMetadataFromURL(url, cb)
    })
    parallel(tasks)

    function getMetadataFromURL (url, cb) {
      if (url.indexOf('http://') !== 0 && url.indexOf('https://') !== 0) {
        self.emit('warning', new Error(`skipping non-http xs param: ${url}`))
        return cb(null)
      }

      const opts = {
        url,
        method: 'GET',
        headers: {
          'user-agent': USER_AGENT
        }
      }
      let req
      try {
        req = get.concat(opts, onResponse)
      } catch (err) {
        self.emit('warning', new Error(`skipping invalid url xs param: ${url}`))
        return cb(null)
      }

      self._xsRequests.push(req)

      function onResponse (err, res, torrent) {
        if (self.destroyed) return cb(null)
        if (self.metadata) return cb(null)

        if (err) {
          self.emit('warning', new Error(`http error from xs param: ${url}`))
          return cb(null)
        }
        if (res.statusCode !== 200) {
          self.emit('warning', new Error(`non-200 status code ${res.statusCode} from xs param: ${url}`))
          return cb(null)
        }

        let parsedTorrent
        try {
          parsedTorrent = parseTorrent(torrent)
        } catch (err) {}

        if (!parsedTorrent) {
          self.emit('warning', new Error(`got invalid torrent file from xs param: ${url}`))
          return cb(null)
        }

        if (parsedTorrent.infoHash !== self.infoHash) {
          self.emit('warning', new Error(`got torrent file with incorrect info hash from xs param: ${url}`))
          return cb(null)
        }

        self._onMetadata(parsedTorrent)
        cb(null)
      }
    }
  }

  /**
   * Called when the full torrent metadata is received.
   */
  _onMetadata (metadata) {
    if (this.metadata || this.destroyed) return
    this._debug('got metadata')

    this._xsRequests.forEach(req => {
      req.abort()
    })
    this._xsRequests = []

    let parsedTorrent
    if (metadata && metadata.infoHash) {
      // `metadata` is a parsed torrent (from parse-torrent module)
      parsedTorrent = metadata
    } else {
      try {
        parsedTorrent = parseTorrent(metadata)
      } catch (err) {
        return this._destroy(err)
      }
    }

    this._processParsedTorrent(parsedTorrent)
    this.metadata = this.torrentFile

    // add web seed urls (BEP19)
    if (this.client.enableWebSeeds) {
      this.urlList.forEach(url => {
        this.addWebSeed(url)
      })
    }

    this._rarityMap = new RarityMap(this)

    this.store = new ImmediateChunkStore(
      new this._store(this.pieceLength, {
        torrent: {
          infoHash: this.infoHash
        },
        files: this.files.map(file => ({
          path: path.join(this.path, file.path),
          length: file.length,
          offset: file.offset
        })),
        length: this.length,
        name: this.infoHash
      })
    )

    this.files = this.files.map(file => new File(this, file))

    // Select only specified files (BEP53) http://www.bittorrent.org/beps/bep_0053.html
    if (this.so) {
      const selectOnlyFiles = parseRange.parse(this.so)

      this.files.forEach((v, i) => {
        if (selectOnlyFiles.includes(i)) this.files[i].select(true)
      })
    } else {
      // start off selecting the entire torrent with low priority
      if (this.pieces.length !== 0) {
        this.select(0, this.pieces.length - 1, false)
      }
    }

    this._hashes = this.pieces

    this.pieces = this.pieces.map((hash, i) => {
      const pieceLength = (i === this.pieces.length - 1)
        ? this.lastPieceLength
        : this.pieceLength
      return new Piece(pieceLength)
    })

    this._reservations = this.pieces.map(() => [])

    this.bitfield = new BitField(this.pieces.length)

    this.wires.forEach(wire => {
      // If we didn't have the metadata at the time ut_metadata was initialized for this
      // wire, we still want to make it available to the peer in case they request it.
      if (wire.ut_metadata) wire.ut_metadata.setMetadata(this.metadata)

      this._onWireWithMetadata(wire)
    })

    // Emit 'metadata' before 'ready' and 'done'
    this.emit('metadata')

    // User might destroy torrent in response to 'metadata' event
    if (this.destroyed) return

    if (this.skipVerify) {
      // Skip verifying exisitng data and just assume it's correct
      this._markAllVerified()
      this._onStore()
    } else {
      const onPiecesVerified = (err) => {
        if (err) return this._destroy(err)
        this._debug('done verifying')
        this._onStore()
      }

      this._debug('verifying existing torrent data')
      if (this._fileModtimes && this._store === FSChunkStore) {
        // don't verify if the files haven't been modified since we last checked
        this.getFileModtimes((err, fileModtimes) => {
          if (err) return this._destroy(err)

          const unchanged = this.files.map((_, index) => fileModtimes[index] === this._fileModtimes[index]).every(x => x)

          if (unchanged) {
            this._markAllVerified()
            this._onStore()
          } else {
            this._verifyPieces(onPiecesVerified)
          }
        })
      } else {
        this._verifyPieces(onPiecesVerified)
      }
    }
  }

  /*
   * TODO: remove this
   * Gets the last modified time of every file on disk for this torrent.
   * Only valid in Node, not in the browser.
   */
  getFileModtimes (cb) {
    const ret = []
    parallelLimit(this.files.map((file, index) => cb => {
      fs.stat(path.join(this.path, file.path), (err, stat) => {
        if (err && err.code !== 'ENOENT') return cb(err)
        ret[index] = stat && stat.mtime.getTime()
        cb(null)
      })
    }), FILESYSTEM_CONCURRENCY, err => {
      this._debug('done getting file modtimes')
      cb(err, ret)
    })
  }

  _verifyPieces (cb) {
    parallelLimit(this.pieces.map((piece, index) => cb => {
      if (this.destroyed) return cb(new Error('torrent is destroyed'))

      this.store.get(index, (err, buf) => {
        if (this.destroyed) return cb(new Error('torrent is destroyed'))

        if (err) return process.nextTick(cb, null) // ignore error
        sha1(buf, hash => {
          if (this.destroyed) return cb(new Error('torrent is destroyed'))

          if (hash === this._hashes[index]) {
            if (!this.pieces[index]) return cb(null)
            this._debug('piece verified %s', index)
            this._markVerified(index)
          } else {
            this._debug('piece invalid %s', index)
          }
          cb(null)
        })
      })
    }), FILESYSTEM_CONCURRENCY, cb)
  }

  rescanFiles (cb) {
    if (this.destroyed) throw new Error('torrent is destroyed')
    if (!cb) cb = noop

    this._verifyPieces((err) => {
      if (err) {
        this._destroy(err)
        return cb(err)
      }

      this._checkDone()
      cb(null)
    })
  }

  _markAllVerified () {
    for (let index = 0; index < this.pieces.length; index++) {
      this._markVerified(index)
    }
  }

  _markVerified (index) {
    this.pieces[index] = null
    this._reservations[index] = null
    this.bitfield.set(index, true)
  }

  /**
   * Called when the metadata, listening server, and underlying chunk store is initialized.
   */
  _onStore () {
    if (this.destroyed) return
    this._debug('on store')

    // Start discovery before emitting 'ready'
    this._startDiscovery()

    this.ready = true
    this.emit('ready')

    // Files may start out done if the file was already in the store
    this._checkDone()

    // In case any selections were made before torrent was ready
    this._updateSelections()
  }

  destroy (cb) {
    this._destroy(null, cb)
  }

  _destroy (err, cb) {
    if (this.destroyed) return
    this.destroyed = true
    this._debug('destroy')

    this.client._remove(this)

    clearInterval(this._rechokeIntervalId)

    this._xsRequests.forEach(req => {
      req.abort()
    })

    if (this._rarityMap) {
      this._rarityMap.destroy()
    }

    for (const id in this._peers) {
      this.removePeer(id)
    }

    this.files.forEach(file => {
      if (file instanceof File) file._destroy()
    })

    const tasks = this._servers.map(server => cb => {
      server.destroy(cb)
    })

    if (this.discovery) {
      tasks.push(cb => {
        this.discovery.destroy(cb)
      })
    }

    if (this.store) {
      tasks.push(cb => {
        this.store.close(cb)
      })
    }

    parallel(tasks, cb)

    if (err) {
      // Torrent errors are emitted at `torrent.on('error')`. If there are no 'error'
      // event handlers on the torrent instance, then the error will be emitted at
      // `client.on('error')`. This prevents throwing an uncaught exception
      // (unhandled 'error' event), but it makes it impossible to distinguish client
      // errors versus torrent errors. Torrent errors are not fatal, and the client
      // is still usable afterwards. Therefore, always listen for errors in both
      // places (`client.on('error')` and `torrent.on('error')`).
      if (this.listenerCount('error') === 0) {
        this.client.emit('error', err)
      } else {
        this.emit('error', err)
      }
    }

    this.emit('close')

    this.client = null
    this.files = []
    this.discovery = null
    this.store = null
    this._rarityMap = null
    this._peers = null
    this._servers = null
    this._xsRequests = null
  }

  addPeer (peer) {
    if (this.destroyed) throw new Error('torrent is destroyed')
    if (!this.infoHash) throw new Error('addPeer() must not be called before the `infoHash` event')

    if (this.client.blocked) {
      let host
      if (typeof peer === 'string') {
        let parts
        try {
          parts = addrToIPPort(peer)
        } catch (e) {
          this._debug('ignoring peer: invalid %s', peer)
          this.emit('invalidPeer', peer)
          return false
        }
        host = parts[0]
      } else if (typeof peer.remoteAddress === 'string') {
        host = peer.remoteAddress
      }

      if (host && this.client.blocked.contains(host)) {
        this._debug('ignoring peer: blocked %s', peer)
        if (typeof peer !== 'string') peer.destroy()
        this.emit('blockedPeer', peer)
        return false
      }
    }

    const wasAdded = !!this._addPeer(peer)
    if (wasAdded) {
      this.emit('peer', peer)
    } else {
      this.emit('invalidPeer', peer)
    }
    return wasAdded
  }

  _addPeer (peer) {
    if (this.destroyed) {
      if (typeof peer !== 'string') peer.destroy()
      return null
    }
    if (typeof peer === 'string' && !this._validAddr(peer)) {
      this._debug('ignoring peer: invalid %s', peer)
      return null
    }

    const id = (peer && peer.id) || peer
    if (this._peers[id]) {
      this._debug('ignoring peer: duplicate (%s)', id)
      if (typeof peer !== 'string') peer.destroy()
      return null
    }

    if (this.paused) {
      this._debug('ignoring peer: torrent is paused')
      if (typeof peer !== 'string') peer.destroy()
      return null
    }

    this._debug('add peer %s', id)

    let newPeer
    if (typeof peer === 'string') {
      // `peer` is an addr ("ip:port" string)
      newPeer = Peer.createTCPOutgoingPeer(peer, this)
    } else {
      // `peer` is a WebRTC connection (simple-peer)
      newPeer = Peer.createWebRTCPeer(peer, this)
    }

    this._peers[newPeer.id] = newPeer
    this._peersLength += 1

    if (typeof peer === 'string') {
      // `peer` is an addr ("ip:port" string)
      this._queue.push(newPeer)
      this._drain()
    }

    return newPeer
  }

  addWebSeed (url) {
    if (this.destroyed) throw new Error('torrent is destroyed')

    if (!/^https?:\/\/.+/.test(url)) {
      this.emit('warning', new Error(`ignoring invalid web seed: ${url}`))
      this.emit('invalidPeer', url)
      return
    }

    if (this._peers[url]) {
      this.emit('warning', new Error(`ignoring duplicate web seed: ${url}`))
      this.emit('invalidPeer', url)
      return
    }

    this._debug('add web seed %s', url)

    const newPeer = Peer.createWebSeedPeer(url, this)
    this._peers[newPeer.id] = newPeer
    this._peersLength += 1

    this.emit('peer', url)
  }

  /**
   * Called whenever a new incoming TCP peer connects to this torrent swarm. Called with a
   * peer that has already sent a handshake.
   */
  _addIncomingPeer (peer) {
    if (this.destroyed) return peer.destroy(new Error('torrent is destroyed'))
    if (this.paused) return peer.destroy(new Error('torrent is paused'))

    this._debug('add incoming peer %s', peer.id)

    this._peers[peer.id] = peer
    this._peersLength += 1
  }

  removePeer (peer) {
    const id = (peer && peer.id) || peer
    peer = this._peers[id]

    if (!peer) return

    this._debug('removePeer %s', id)

    delete this._peers[id]
    this._peersLength -= 1

    peer.destroy()

    // If torrent swarm was at capacity before, try to open a new connection now
    this._drain()
  }

  select (start, end, priority, notify) {
    if (this.destroyed) throw new Error('torrent is destroyed')

    if (start < 0 || end < start || this.pieces.length <= end) {
      throw new Error(`invalid selection ${start} : ${end}`)
    }
    priority = Number(priority) || 0

    this._debug('select %s-%s (priority %s)', start, end, priority)

    this._selections.push({
      from: start,
      to: end,
      offset: 0,
      priority,
      notify: notify || noop
    })

    this._selections.sort((a, b) => b.priority - a.priority)

    this._updateSelections()
  }

  deselect (start, end, priority) {
    if (this.destroyed) throw new Error('torrent is destroyed')

    priority = Number(priority) || 0
    this._debug('deselect %s-%s (priority %s)', start, end, priority)

    for (let i = 0; i < this._selections.length; ++i) {
      const s = this._selections[i]
      if (s.from === start && s.to === end && s.priority === priority) {
        this._selections.splice(i, 1)
        break
      }
    }

    this._updateSelections()
  }

  critical (start, end) {
    if (this.destroyed) throw new Error('torrent is destroyed')

    this._debug('critical %s-%s', start, end)

    for (let i = start; i <= end; ++i) {
      this._critical[i] = true
    }

    this._updateSelections()
  }

  _onWire (wire, addr) {
    this._debug('got wire %s (%s)', wire._debugId, addr || 'Unknown')

    wire.on('download', downloaded => {
      if (this.destroyed) return
      this.received += downloaded
      this._downloadSpeed(downloaded)
      this.client._downloadSpeed(downloaded)
      this.emit('download', downloaded)
      this.client.emit('download', downloaded)
    })

    wire.on('upload', uploaded => {
      if (this.destroyed) return
      this.uploaded += uploaded
      this._uploadSpeed(uploaded)
      this.client._uploadSpeed(uploaded)
      this.emit('upload', uploaded)
      this.client.emit('upload', uploaded)
    })

    this.wires.push(wire)

    if (addr) {
      // Sometimes RTCPeerConnection.getStats() doesn't return an ip:port for peers
      const parts = addrToIPPort(addr)
      wire.remoteAddress = parts[0]
      wire.remotePort = parts[1]
    }

    // When peer sends PORT message, add that DHT node to routing table
    if (this.client.dht && this.client.dht.listening) {
      wire.on('port', port => {
        if (this.destroyed || this.client.dht.destroyed) {
          return
        }
        if (!wire.remoteAddress) {
          return this._debug('ignoring PORT from peer with no address')
        }
        if (port === 0 || port > 65536) {
          return this._debug('ignoring invalid PORT from peer')
        }

        this._debug('port: %s (from %s)', port, addr)
        this.client.dht.addNode({ host: wire.remoteAddress, port })
      })
    }

    wire.on('timeout', () => {
      this._debug('wire timeout (%s)', addr)
      // TODO: this might be destroying wires too eagerly
      wire.destroy()
    })

    // Timeout for piece requests to this peer
    wire.setTimeout(PIECE_TIMEOUT, true)

    // Send KEEP-ALIVE (every 60s) so peers will not disconnect the wire
    wire.setKeepAlive(true)

    // use ut_metadata extension
    wire.use(utMetadata(this.metadata))

    wire.ut_metadata.on('warning', err => {
      this._debug('ut_metadata warning: %s', err.message)
    })

    if (!this.metadata) {
      wire.ut_metadata.on('metadata', metadata => {
        this._debug('got metadata via ut_metadata')
        this._onMetadata(metadata)
      })
      wire.ut_metadata.fetch()
    }

    // use ut_pex extension if the torrent is not flagged as private
    if (typeof utPex === 'function' && !this.private) {
      wire.use(utPex())

      wire.ut_pex.on('peer', peer => {
        // Only add potential new peers when we're not seeding
        if (this.done) return
        this._debug('ut_pex: got peer: %s (from %s)', peer, addr)
        this.addPeer(peer)
      })

      wire.ut_pex.on('dropped', peer => {
        // the remote peer believes a given peer has been dropped from the torrent swarm.
        // if we're not currently connected to it, then remove it from the queue.
        const peerObj = this._peers[peer]
        if (peerObj && !peerObj.connected) {
          this._debug('ut_pex: dropped peer: %s (from %s)', peer, addr)
          this.removePeer(peer)
        }
      })

      wire.once('close', () => {
        // Stop sending updates to remote peer
        wire.ut_pex.reset()
      })
    }

    // Hook to allow user-defined `bittorrent-protocol` extensions
    // More info: https://github.com/webtorrent/bittorrent-protocol#extension-api
    this.emit('wire', wire, addr)

    if (this.metadata) {
      process.nextTick(() => {
        // This allows wire.handshake() to be called (by Peer.onHandshake) before any
        // messages get sent on the wire
        this._onWireWithMetadata(wire)
      })
    }
  }

  _onWireWithMetadata (wire) {
    let timeoutId = null

    const onChokeTimeout = () => {
      if (this.destroyed || wire.destroyed) return

      if (this._numQueued > 2 * (this._numConns - this.numPeers) &&
        wire.amInterested) {
        wire.destroy()
      } else {
        timeoutId = setTimeout(onChokeTimeout, CHOKE_TIMEOUT)
        if (timeoutId.unref) timeoutId.unref()
      }
    }

    let i
    const updateSeedStatus = () => {
      if (wire.peerPieces.buffer.length !== this.bitfield.buffer.length) return
      for (i = 0; i < this.pieces.length; ++i) {
        if (!wire.peerPieces.get(i)) return
      }
      wire.isSeeder = true
      wire.choke() // always choke seeders
    }

    wire.on('bitfield', () => {
      updateSeedStatus()
      this._update()
    })

    wire.on('have', () => {
      updateSeedStatus()
      this._update()
    })

    wire.once('interested', () => {
      wire.unchoke()
    })

    wire.once('close', () => {
      clearTimeout(timeoutId)
    })

    wire.on('choke', () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(onChokeTimeout, CHOKE_TIMEOUT)
      if (timeoutId.unref) timeoutId.unref()
    })

    wire.on('unchoke', () => {
      clearTimeout(timeoutId)
      this._update()
    })

    wire.on('request', (index, offset, length, cb) => {
      if (length > MAX_BLOCK_LENGTH) {
        // Per spec, disconnect from peers that request >128KB
        return wire.destroy()
      }
      if (this.pieces[index]) return
      this.store.get(index, { offset, length }, cb)
    })

    wire.bitfield(this.bitfield) // always send bitfield (required)
    wire.uninterested() // always start out uninterested (as per protocol)

    // Send PORT message to peers that support DHT
    if (wire.peerExtensions.dht && this.client.dht && this.client.dht.listening) {
      wire.port(this.client.dht.address().port)
    }

    if (wire.type !== 'webSeed') { // do not choke on webseeds
      timeoutId = setTimeout(onChokeTimeout, CHOKE_TIMEOUT)
      if (timeoutId.unref) timeoutId.unref()
    }

    wire.isSeeder = false
    updateSeedStatus()
  }

  /**
   * Called on selection changes.
   */
  _updateSelections () {
    if (!this.ready || this.destroyed) return

    process.nextTick(() => {
      this._gcSelections()
    })
    this._updateInterest()
    this._update()
  }

  /**
   * Garbage collect selections with respect to the store's current state.
   */
  _gcSelections () {
    for (let i = 0; i < this._selections.length; ++i) {
      const s = this._selections[i]
      const oldOffset = s.offset

      // check for newly downloaded pieces in selection
      while (this.bitfield.get(s.from + s.offset) && s.from + s.offset < s.to) {
        s.offset += 1
      }

      if (oldOffset !== s.offset) s.notify()
      if (s.to !== s.from + s.offset) continue
      if (!this.bitfield.get(s.from + s.offset)) continue

      this._selections.splice(i, 1) // remove fully downloaded selection
      i -= 1 // decrement i to offset splice

      s.notify()
      this._updateInterest()
    }

    if (!this._selections.length) this.emit('idle')
  }

  /**
   * Update interested status for all peers.
   */
  _updateInterest () {
    const prev = this._amInterested
    this._amInterested = !!this._selections.length

    this.wires.forEach(wire => {
      let interested = false
      for (let index = 0; index < this.pieces.length; ++index) {
        if (this.pieces[index] && wire.peerPieces.get(index)) {
          interested = true
          break
        }
      }

      if (interested) wire.interested()
      else wire.uninterested()
    })

    if (prev === this._amInterested) return
    if (this._amInterested) this.emit('interested')
    else this.emit('uninterested')
  }

  /**
   * Heartbeat to update all peers and their requests.
   */
  _update () {
    if (this.destroyed) return

    // update wires in random order for better request distribution
    const ite = randomIterate(this.wires)
    let wire
    while ((wire = ite())) {
      this._updateWireWrapper(wire)
    }
  }

  _updateWireWrapper (wire) {
    const self = this

    if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(function () { self._updateWire(wire) }, { timeout: 250 })
    } else {
      self._updateWire(wire)
    }
  }

  /**
   * Attempts to update a peer's requests
   */
  _updateWire (wire) {
    // to allow function hoisting
    const self = this

    if (wire.peerChoking) return
    if (!wire.downloaded) return validateWire()

    const minOutstandingRequests = getBlockPipelineLength(wire, PIPELINE_MIN_DURATION)
    if (wire.requests.length >= minOutstandingRequests) return
    const maxOutstandingRequests = getBlockPipelineLength(wire, PIPELINE_MAX_DURATION)

    trySelectWire(false) || trySelectWire(true)

    function genPieceFilterFunc (start, end, tried, rank) {
      return i => i >= start && i <= end && !(i in tried) && wire.peerPieces.get(i) && (!rank || rank(i))
    }

    // TODO: Do we need both validateWire and trySelectWire?
    function validateWire () {
      if (wire.requests.length) return

      let i = self._selections.length
      while (i--) {
        const next = self._selections[i]
        let piece
        if (self.strategy === 'rarest') {
          const start = next.from + next.offset
          const end = next.to
          const len = end - start + 1
          const tried = {}
          let tries = 0
          const filter = genPieceFilterFunc(start, end, tried)

          while (tries < len) {
            piece = self._rarityMap.getRarestPiece(filter)
            if (piece < 0) break
            if (self._request(wire, piece, false)) return
            tried[piece] = true
            tries += 1
          }
        } else {
          for (piece = next.to; piece >= next.from + next.offset; --piece) {
            if (!wire.peerPieces.get(piece)) continue
            if (self._request(wire, piece, false)) return
          }
        }
      }

      // TODO: wire failed to validate as useful; should we close it?
      // probably not, since 'have' and 'bitfield' messages might be coming
    }

    function speedRanker () {
      const speed = wire.downloadSpeed() || 1
      if (speed > SPEED_THRESHOLD) return () => true

      const secs = Math.max(1, wire.requests.length) * Piece.BLOCK_LENGTH / speed
      let tries = 10
      let ptr = 0

      return index => {
        if (!tries || self.bitfield.get(index)) return true

        let missing = self.pieces[index].missing

        for (; ptr < self.wires.length; ptr++) {
          const otherWire = self.wires[ptr]
          const otherSpeed = otherWire.downloadSpeed()

          if (otherSpeed < SPEED_THRESHOLD) continue
          if (otherSpeed <= speed) continue
          if (!otherWire.peerPieces.get(index)) continue
          if ((missing -= otherSpeed * secs) > 0) continue

          tries--
          return false
        }

        return true
      }
    }

    function shufflePriority (i) {
      let last = i
      for (let j = i; j < self._selections.length && self._selections[j].priority; j++) {
        last = j
      }
      const tmp = self._selections[i]
      self._selections[i] = self._selections[last]
      self._selections[last] = tmp
    }

    function trySelectWire (hotswap) {
      if (wire.requests.length >= maxOutstandingRequests) return true
      const rank = speedRanker()

      for (let i = 0; i < self._selections.length; i++) {
        const next = self._selections[i]

        let piece
        if (self.strategy === 'rarest') {
          const start = next.from + next.offset
          const end = next.to
          const len = end - start + 1
          const tried = {}
          let tries = 0
          const filter = genPieceFilterFunc(start, end, tried, rank)

          while (tries < len) {
            piece = self._rarityMap.getRarestPiece(filter)
            if (piece < 0) break

            // request all non-reserved blocks in this piece
            while (self._request(wire, piece, self._critical[piece] || hotswap)) {}

            if (wire.requests.length < maxOutstandingRequests) {
              tried[piece] = true
              tries++
              continue
            }

            if (next.priority) shufflePriority(i)
            return true
          }
        } else {
          for (piece = next.from + next.offset; piece <= next.to; piece++) {
            if (!wire.peerPieces.get(piece) || !rank(piece)) continue

            // request all non-reserved blocks in piece
            while (self._request(wire, piece, self._critical[piece] || hotswap)) {}

            if (wire.requests.length < maxOutstandingRequests) continue

            if (next.priority) shufflePriority(i)
            return true
          }
        }
      }

      return false
    }
  }

  /**
   * Called periodically to update the choked status of all peers, handling optimistic
   * unchoking as described in BEP3.
   */
  _rechoke () {
    if (!this.ready) return

    if (this._rechokeOptimisticTime > 0) this._rechokeOptimisticTime -= 1
    else this._rechokeOptimisticWire = null

    const peers = []

    this.wires.forEach(wire => {
      if (!wire.isSeeder && wire !== this._rechokeOptimisticWire) {
        peers.push({
          wire,
          downloadSpeed: wire.downloadSpeed(),
          uploadSpeed: wire.uploadSpeed(),
          salt: Math.random(),
          isChoked: true
        })
      }
    })

    peers.sort(rechokeSort)

    let unchokeInterested = 0
    let i = 0
    for (; i < peers.length && unchokeInterested < this._rechokeNumSlots; ++i) {
      peers[i].isChoked = false
      if (peers[i].wire.peerInterested) unchokeInterested += 1
    }

    // Optimistically unchoke a peer
    if (!this._rechokeOptimisticWire && i < peers.length && this._rechokeNumSlots) {
      const candidates = peers.slice(i).filter(peer => peer.wire.peerInterested)
      const optimistic = candidates[randomInt(candidates.length)]

      if (optimistic) {
        optimistic.isChoked = false
        this._rechokeOptimisticWire = optimistic.wire
        this._rechokeOptimisticTime = RECHOKE_OPTIMISTIC_DURATION
      }
    }

    // Unchoke best peers
    peers.forEach(peer => {
      if (peer.wire.amChoking !== peer.isChoked) {
        if (peer.isChoked) peer.wire.choke()
        else peer.wire.unchoke()
      }
    })

    function rechokeSort (peerA, peerB) {
      // Prefer higher download speed
      if (peerA.downloadSpeed !== peerB.downloadSpeed) {
        return peerB.downloadSpeed - peerA.downloadSpeed
      }

      // Prefer higher upload speed
      if (peerA.uploadSpeed !== peerB.uploadSpeed) {
        return peerB.uploadSpeed - peerA.uploadSpeed
      }

      // Prefer unchoked
      if (peerA.wire.amChoking !== peerB.wire.amChoking) {
        return peerA.wire.amChoking ? 1 : -1
      }

      // Random order
      return peerA.salt - peerB.salt
    }
  }

  /**
   * Attempts to cancel a slow block request from another wire such that the
   * given wire may effectively swap out the request for one of its own.
   */
  _hotswap (wire, index) {
    const speed = wire.downloadSpeed()
    if (speed < Piece.BLOCK_LENGTH) return false
    if (!this._reservations[index]) return false

    const r = this._reservations[index]
    if (!r) {
      return false
    }

    let minSpeed = Infinity
    let minWire

    let i
    for (i = 0; i < r.length; i++) {
      const otherWire = r[i]
      if (!otherWire || otherWire === wire) continue

      const otherSpeed = otherWire.downloadSpeed()
      if (otherSpeed >= SPEED_THRESHOLD) continue
      if (2 * otherSpeed > speed || otherSpeed > minSpeed) continue

      minWire = otherWire
      minSpeed = otherSpeed
    }

    if (!minWire) return false

    for (i = 0; i < r.length; i++) {
      if (r[i] === minWire) r[i] = null
    }

    for (i = 0; i < minWire.requests.length; i++) {
      const req = minWire.requests[i]
      if (req.piece !== index) continue

      this.pieces[index].cancel((req.offset / Piece.BLOCK_LENGTH) | 0)
    }

    this.emit('hotswap', minWire, wire, index)
    return true
  }

  /**
   * Attempts to request a block from the given wire.
   */
  _request (wire, index, hotswap) {
    const self = this
    const numRequests = wire.requests.length
    const isWebSeed = wire.type === 'webSeed'

    if (self.bitfield.get(index)) return false

    const maxOutstandingRequests = isWebSeed
      ? Math.min(
        getPiecePipelineLength(wire, PIPELINE_MAX_DURATION, self.pieceLength),
        self.maxWebConns
      )
      : getBlockPipelineLength(wire, PIPELINE_MAX_DURATION)

    if (numRequests >= maxOutstandingRequests) return false
    // var endGame = (wire.requests.length === 0 && self.store.numMissing < 30)

    const piece = self.pieces[index]
    let reservation = isWebSeed ? piece.reserveRemaining() : piece.reserve()

    if (reservation === -1 && hotswap && self._hotswap(wire, index)) {
      reservation = isWebSeed ? piece.reserveRemaining() : piece.reserve()
    }
    if (reservation === -1) return false

    let r = self._reservations[index]
    if (!r) r = self._reservations[index] = []
    let i = r.indexOf(null)
    if (i === -1) i = r.length
    r[i] = wire

    const chunkOffset = piece.chunkOffset(reservation)
    const chunkLength = isWebSeed ? piece.chunkLengthRemaining(reservation) : piece.chunkLength(reservation)

    wire.request(index, chunkOffset, chunkLength, function onChunk (err, chunk) {
      if (self.destroyed) return

      // TODO: what is this for?
      if (!self.ready) return self.once('ready', () => { onChunk(err, chunk) })

      if (r[i] === wire) r[i] = null

      if (piece !== self.pieces[index]) return onUpdateTick()

      if (err) {
        self._debug(
          'error getting piece %s (offset: %s length: %s) from %s: %s',
          index, chunkOffset, chunkLength, `${wire.remoteAddress}:${wire.remotePort}`,
          err.message
        )
        isWebSeed ? piece.cancelRemaining(reservation) : piece.cancel(reservation)
        onUpdateTick()
        return
      }

      self._debug(
        'got piece %s (offset: %s length: %s) from %s',
        index, chunkOffset, chunkLength, `${wire.remoteAddress}:${wire.remotePort}`
      )

      if (!piece.set(reservation, chunk, wire)) return onUpdateTick()

      const buf = piece.flush()

      // TODO: might need to set self.pieces[index] = null here since sha1 is async

      sha1(buf, hash => {
        if (self.destroyed) return

        if (hash === self._hashes[index]) {
          if (!self.pieces[index]) return
          self._debug('piece verified %s', index)

          self.pieces[index] = null
          self._reservations[index] = null
          self.bitfield.set(index, true)

          self.store.put(index, buf)

          self.wires.forEach(wire => {
            wire.have(index)
          })

          // We also check `self.destroyed` since `torrent.destroy()` could have been
          // called in the `torrent.on('done')` handler, triggered by `_checkDone()`.
          if (self._checkDone() && !self.destroyed) self.discovery.complete()
        } else {
          self.pieces[index] = new Piece(piece.length)
          self.emit('warning', new Error(`Piece ${index} failed verification`))
        }
        onUpdateTick()
      })
    })

    function onUpdateTick () {
      process.nextTick(() => { self._update() })
    }

    return true
  }

  _checkDone () {
    if (this.destroyed) return

    // are any new files done?
    this.files.forEach(file => {
      if (file.done) return
      for (let i = file._startPiece; i <= file._endPiece; ++i) {
        if (!this.bitfield.get(i)) return
      }
      file.done = true
      file.emit('done')
      this._debug(`file done: ${file.name}`)
    })

    // is the torrent done? (if all current selections are satisfied, or there are
    // no selections, then torrent is done)
    let done = true
    for (let i = 0; i < this._selections.length; i++) {
      const selection = this._selections[i]
      for (let piece = selection.from; piece <= selection.to; piece++) {
        if (!this.bitfield.get(piece)) {
          done = false
          break
        }
      }
      if (!done) break
    }
    if (!this.done && done) {
      this.done = true
      this._debug(`torrent done: ${this.infoHash}`)
      this.emit('done')
    }
    this._gcSelections()

    return done
  }

  load (streams, cb) {
    if (this.destroyed) throw new Error('torrent is destroyed')
    if (!this.ready) return this.once('ready', () => { this.load(streams, cb) })

    if (!Array.isArray(streams)) streams = [streams]
    if (!cb) cb = noop

    const readable = new MultiStream(streams)
    const writable = new ChunkStoreWriteStream(this.store, this.pieceLength)

    pump(readable, writable, err => {
      if (err) return cb(err)
      this._markAllVerified()
      this._checkDone()
      cb(null)
    })
  }

  createServer (requestListener) {
    if (typeof Server !== 'function') throw new Error('node.js-only method')
    if (this.destroyed) throw new Error('torrent is destroyed')
    const server = new Server(this, requestListener)
    this._servers.push(server)
    return server
  }

  pause () {
    if (this.destroyed) return
    this._debug('pause')
    this.paused = true
  }

  resume () {
    if (this.destroyed) return
    this._debug('resume')
    this.paused = false
    this._drain()
  }

  _debug () {
    const args = [].slice.call(arguments)
    args[0] = `[${this.client._debugId}] [${this._debugId}] ${args[0]}`
    debug(...args)
  }

  /**
   * Pop a peer off the FIFO queue and connect to it. When _drain() gets called,
   * the queue will usually have only one peer in it, except when there are too
   * many peers (over `this.maxConns`) in which case they will just sit in the
   * queue until another connection closes.
   */
  _drain () {
    this._debug('_drain numConns %s maxConns %s', this._numConns, this.client.maxConns)
    if (typeof net.connect !== 'function' || this.destroyed || this.paused ||
        this._numConns >= this.client.maxConns) {
      return
    }
    this._debug('drain (%s queued, %s/%s peers)', this._numQueued, this.numPeers, this.client.maxConns)

    const peer = this._queue.shift()
    if (!peer) return // queue could be empty

    this._debug('tcp connect attempt to %s', peer.addr)

    const parts = addrToIPPort(peer.addr)
    const opts = {
      host: parts[0],
      port: parts[1]
    }

    const conn = peer.conn = net.connect(opts)

    conn.once('connect', () => { peer.onConnect() })
    conn.once('error', err => { peer.destroy(err) })
    peer.startConnectTimeout()

    // When connection closes, attempt reconnect after timeout (with exponential backoff)
    conn.on('close', () => {
      if (this.destroyed) return

      // TODO: If torrent is done, do not try to reconnect after a timeout

      if (peer.retries >= RECONNECT_WAIT.length) {
        this._debug(
          'conn %s closed: will not re-add (max %s attempts)',
          peer.addr, RECONNECT_WAIT.length
        )
        return
      }

      const ms = RECONNECT_WAIT[peer.retries]
      this._debug(
        'conn %s closed: will re-add to queue in %sms (attempt %s)',
        peer.addr, ms, peer.retries + 1
      )

      const reconnectTimeout = setTimeout(() => {
        const newPeer = this._addPeer(peer.addr)
        if (newPeer) newPeer.retries = peer.retries + 1
      }, ms)
      if (reconnectTimeout.unref) reconnectTimeout.unref()
    })
  }

  /**
   * Returns `true` if string is valid IPv4/6 address.
   * @param {string} addr
   * @return {boolean}
   */
  _validAddr (addr) {
    let parts
    try {
      parts = addrToIPPort(addr)
    } catch (e) {
      return false
    }
    const host = parts[0]
    const port = parts[1]
    return port > 0 && port < 65535 &&
      !(host === '127.0.0.1' && port === this.client.torrentPort)
  }
}

function getBlockPipelineLength (wire, duration) {
  return 2 + Math.ceil(duration * wire.downloadSpeed() / Piece.BLOCK_LENGTH)
}

function getPiecePipelineLength (wire, duration, pieceLength) {
  return 1 + Math.ceil(duration * wire.downloadSpeed() / pieceLength)
}

/**
 * Returns a random integer in [0,high)
 */
function randomInt (high) {
  return Math.random() * high | 0
}

function noop () {}

module.exports = Torrent

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../package.json":126,"./file":121,"./peer":122,"./rarity-map":123,"./server":17,"_process":58,"addr-to-ip-port":3,"bitfield":9,"chunk-store-stream/write":24,"debug":26,"events":29,"fs":18,"fs-chunk-store":42,"immediate-chunk-store":34,"multistream":50,"net":17,"os":17,"parse-numeric-range":53,"parse-torrent":54,"path":55,"pump":59,"random-iterate":65,"run-parallel":86,"run-parallel-limit":85,"simple-get":90,"simple-sha1":92,"speedometer":95,"torrent-discovery":107,"torrent-piece":108,"uniq":111,"ut_metadata":115,"ut_pex":17}],125:[function(require,module,exports){
(function (Buffer){
const BitField = require('bitfield')
const debug = require('debug')('webtorrent:webconn')
const get = require('simple-get')
const sha1 = require('simple-sha1')
const Wire = require('bittorrent-protocol')

const VERSION = require('../package.json').version

/**
 * Converts requests for torrent blocks into http range requests.
 * @param {string} url web seed url
 * @param {Object} torrent
 */
class WebConn extends Wire {
  constructor (url, torrent) {
    super()

    this.url = url
    this.webPeerId = sha1.sync(url)
    this._torrent = torrent

    this._init()
  }

  _init () {
    this.setKeepAlive(true)

    this.once('handshake', (infoHash, peerId) => {
      if (this.destroyed) return
      this.handshake(infoHash, this.webPeerId)
      const numPieces = this._torrent.pieces.length
      const bitfield = new BitField(numPieces)
      for (let i = 0; i <= numPieces; i++) {
        bitfield.set(i, true)
      }
      this.bitfield(bitfield)
    })

    this.once('interested', () => {
      debug('interested')
      this.unchoke()
    })

    this.on('uninterested', () => { debug('uninterested') })
    this.on('choke', () => { debug('choke') })
    this.on('unchoke', () => { debug('unchoke') })
    this.on('bitfield', () => { debug('bitfield') })

    this.on('request', (pieceIndex, offset, length, callback) => {
      debug('request pieceIndex=%d offset=%d length=%d', pieceIndex, offset, length)
      this.httpRequest(pieceIndex, offset, length, callback)
    })
  }

  httpRequest (pieceIndex, offset, length, cb) {
    const pieceOffset = pieceIndex * this._torrent.pieceLength
    const rangeStart = pieceOffset + offset /* offset within whole torrent */
    const rangeEnd = rangeStart + length - 1

    // Web seed URL format:
    // For single-file torrents, make HTTP range requests directly to the web seed URL
    // For multi-file torrents, add the torrent folder and file name to the URL
    const files = this._torrent.files
    let requests
    if (files.length <= 1) {
      requests = [{
        url: this.url,
        start: rangeStart,
        end: rangeEnd
      }]
    } else {
      const requestedFiles = files.filter(file => {
        return file.offset <= rangeEnd && (file.offset + file.length) > rangeStart
      })
      if (requestedFiles.length < 1) {
        return cb(new Error('Could not find file corresponnding to web seed range request'))
      }

      requests = requestedFiles.map(requestedFile => {
        const fileEnd = requestedFile.offset + requestedFile.length - 1
        const url = this.url +
          (this.url[this.url.length - 1] === '/' ? '' : '/') +
          requestedFile.path
        return {
          url,
          fileOffsetInRange: Math.max(requestedFile.offset - rangeStart, 0),
          start: Math.max(rangeStart - requestedFile.offset, 0),
          end: Math.min(fileEnd, rangeEnd - requestedFile.offset)
        }
      })
    }

    // Now make all the HTTP requests we need in order to load this piece
    // Usually that's one requests, but sometimes it will be multiple
    // Send requests in parallel and wait for them all to come back
    let numRequestsSucceeded = 0
    let hasError = false

    let ret
    if (requests.length > 1) {
      ret = Buffer.alloc(length)
    }

    requests.forEach(request => {
      const url = request.url
      const start = request.start
      const end = request.end
      debug(
        'Requesting url=%s pieceIndex=%d offset=%d length=%d start=%d end=%d',
        url, pieceIndex, offset, length, start, end
      )
      const opts = {
        url,
        method: 'GET',
        headers: {
          'user-agent': `WebTorrent/${VERSION} (https://webtorrent.io)`,
          range: `bytes=${start}-${end}`
        }
      }
      function onResponse (res, data) {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          hasError = true
          return cb(new Error(`Unexpected HTTP status code ${res.statusCode}`))
        }
        debug('Got data of length %d', data.length)

        if (requests.length === 1) {
          // Common case: fetch piece in a single HTTP request, return directly
          cb(null, data)
        } else {
          // Rare case: reconstruct multiple HTTP requests across 2+ files into one
          // piece buffer
          data.copy(ret, request.fileOffsetInRange)
          if (++numRequestsSucceeded === requests.length) {
            cb(null, ret)
          }
        }
      }
      get.concat(opts, (err, res, data) => {
        if (hasError) return
        if (err) {
          // Browsers allow HTTP redirects for simple cross-origin
          // requests but not for requests that require preflight.
          // Use a simple request to unravel any redirects and get the
          // final URL.  Retry the original request with the new URL if
          // it's different.
          //
          // This test is imperfect but it's simple and good for common
          // cases.  It catches all cross-origin cases but matches a few
          // same-origin cases too.
          if (typeof window === 'undefined' || url.startsWith(`${window.location.origin}/`)) {
            hasError = true
            return cb(err)
          }

          return get.head(url, (errHead, res) => {
            if (hasError) return
            if (errHead) {
              hasError = true
              return cb(errHead)
            }
            if (res.statusCode < 200 || res.statusCode >= 300) {
              hasError = true
              return cb(new Error(`Unexpected HTTP status code ${res.statusCode}`))
            }
            if (res.url === url) {
              hasError = true
              return cb(err)
            }

            opts.url = res.url
            get.concat(opts, (err, res, data) => {
              if (hasError) return
              if (err) {
                hasError = true
                return cb(err)
              }
              onResponse(res, data)
            })
          })
        }
        onResponse(res, data)
      })
    })
  }

  destroy () {
    super.destroy()
    this._torrent = null
  }
}

module.exports = WebConn

}).call(this,require("buffer").Buffer)
},{"../package.json":126,"bitfield":9,"bittorrent-protocol":10,"buffer":22,"debug":26,"simple-get":90,"simple-sha1":92}],126:[function(require,module,exports){
module.exports={
  "version": "0.107.17"
}
},{}],127:[function(require,module,exports){
// Returns a wrapper function that returns a wrapped callback
// The wrapper function should do some stuff, and return a
// presumably different callback function.
// This makes sure that own properties are retained, so that
// decorations and such are not lost along the way.
module.exports = wrappy
function wrappy (fn, cb) {
  if (fn && cb) return wrappy(fn)(cb)

  if (typeof fn !== 'function')
    throw new TypeError('need wrapper function')

  Object.keys(fn).forEach(function (k) {
    wrapper[k] = fn[k]
  })

  return wrapper

  function wrapper() {
    var args = new Array(arguments.length)
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i]
    }
    var ret = fn.apply(this, args)
    var cb = args[args.length-1]
    if (typeof ret === 'function' && ret !== cb) {
      Object.keys(cb).forEach(function (k) {
        ret[k] = cb[k]
      })
    }
    return ret
  }
}

},{}],128:[function(require,module,exports){
module.exports = extend

var hasOwnProperty = Object.prototype.hasOwnProperty;

function extend() {
    var target = {}

    for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i]

        for (var key in source) {
            if (hasOwnProperty.call(source, key)) {
                target[key] = source[key]
            }
        }
    }

    return target
}

},{}]},{},[1]);
