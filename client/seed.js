var dragDrop = require('drag-drop')
var uploadElement = require('upload-element')
var path = require('path')
var Peer = require('simple-peer')
var prettyBytes = require('pretty-bytes')
var WebTorrent = require('webtorrent')

var util = require('./util')

global.WEBTORRENT_ANNOUNCE = [ 'ws://tracker.fastcast.nz' ]

if (!Peer.WEBRTC_SUPPORT) {
  util.error('Sorry, your browser is unsupported. Please try again using Chrome.')
}

var client = new WebTorrent()

var upload = document.querySelector('input[name=upload]')
uploadElement(upload, function (err, files) {
  if (err) return util.error(err)
  files = files.map(function (file) { return file.file })
  onFiles(files)
})

dragDrop('body', onFiles)

function onFiles (files) {
  client.seed(files, onTorrent)
}

function onTorrent (torrent) {
  upload.value = upload.defaultValue // reset upload element

  var torrentFileName = path.basename(torrent.name, path.extname(torrent.name)) + '.torrent'

  util.log(
    'Torrent info hash: ' + torrent.infoHash + ' ' +
    '<a href="https://instant.io/#' + torrent.infoHash + '" target="_blank">[Share link]</a> ' +
    '<a href="' + torrent.magnetURI + '" target="_blank">[Magnet URI]</a> ' +
    '<a href="' + torrent.torrentFileURL + '" target="_blank" download="' + torrentFileName + '">[Download .torrent]</a>'
  )

  function updateSpeed () {
    var progress = (100 * torrent.progress).toFixed(1)
    util.updateSpeed(
      '<b>Peers:</b> ' + torrent.swarm.wires.length + ' ' +
      '<b>Progress:</b> ' + progress + '% ' +
      '<b>Download speed:</b> ' + prettyBytes(client.downloadSpeed()) + '/s ' +
      '<b>Upload speed:</b> ' + prettyBytes(client.uploadSpeed()) + '/s'
    )
  }

  updateSpeed()
  setInterval(updateSpeed, 500)
}
