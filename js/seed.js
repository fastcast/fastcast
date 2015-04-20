var dragDrop = require('drag-drop/buffer')
var toBuffer = require('typedarray-to-buffer')
var upload = require('upload-element');
var WebTorrent = require('webtorrent')

var log = document.querySelector('.log')

var client = new WebTorrent()

function seed (files) {
  client.seed(files, function onTorrent (torrent) {
    // Client is seeding the file!
    console.log('Torrent info hash:', torrent.infoHash)
  })
}

upload(document.querySelector('input[name=upload]'), { type: 'array' }, onFile)

function onFile (err, results) {
  if (err) return error(err)
  var files = results.map(function (r) {
    var buf = toBuffer(r.target.result)
    buf.name = r.file.name
    buf.size = r.file.size
    buf.lastModifiedDate = r.file.lastModifiedDate
    buf.type = r.file.type
    return buf
  })
  logAppend('Creating .torrent file...<br>')
  seed(files)
}

dragDrop('body', function (files) {
  logAppend('Creating .torrent file...<br>')
  seed(files)
})

// append a P to the log
function logAppend (str) {
  var p = document.createElement('p')
  p.innerHTML = str
  log.appendChild(p)
}
