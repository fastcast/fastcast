var dragDrop = require('drag-drop/buffer')
var toBuffer = require('typedarray-to-buffer')
var upload = require('upload-element')
var prettysize = require('prettysize')
var WebTorrent = require('webtorrent')

var client = new WebTorrent()

upload(document.querySelector('input[name=upload]'), { type: 'array' }, onFile)

function onFile (err, results) {
  var files = results.map(function (r) {
    var buf = toBuffer(new Uint8Array(r.target.result))
    buf.name = r.file.name
    buf.size = r.file.size
    buf.lastModifiedDate = r.file.lastModifiedDate
    buf.type = r.file.type
    return buf
  })
  client.seed(files, onTorrent)
}

dragDrop('body', function (files) {
  client.seed(files, onTorrent)
})

function onTorrent (torrent) {
  logAppend('Thanks for seeding!')
  logAppend('Torrent info hash: ' + torrent.infoHash + ' <a href="https://instant.io/#'+torrent.infoHash+'" target="_blank">(link)</a>')
  logAppend('Progress: starting...')

  torrent.swarm.on('upload', function () {
    logReplace('Upload speed: ' + prettysize(client.uploadSpeed()) + '/s')
  })
}

var log = document.querySelector('.log')

// append a P to the log
function logAppend(str){
  var p = document.createElement('p')
  p.innerHTML = str
  log.appendChild(p)
}

// replace the last P in the log
function logReplace(str){
  log.lastChild.innerHTML = str
}
