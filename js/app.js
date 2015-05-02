var prettysize = require('prettysize')
var videostream = require('videostream')
var WebTorrent = require('webtorrent')

var client = new WebTorrent()

function download (magnetUri) {
  client.add(magnetUri, onTorrent)
}

download(magnetUri)

function onTorrent (torrent) {
  logAppend('Peers <span class="badge">' + torrent.swarm.wires.length + '</span> <a class="btn btn-primary btn-xs" href="' + torrent.magnetURI + '" role="button"><i class="fa fa-magnet"></i> Magnetic link</a>')
  logAppend('Progress: starting...')

  torrent.swarm.on('download', function () {
    var progress = (100 * torrent.downloaded / torrent.parsedTorrent.length).toFixed(1)
    logReplace('Progress: ' + progress + '% / Download speed: ' + prettysize(torrent.swarm.downloadSpeed()) + '/s / Upload speed: ' + prettysize(client.uploadSpeed()) + '/s')
  })

  // Got torrent metadata!
  console.log('Torrent info hash:', torrent.infoHash)

  // Let's say the first file is a webm (vp8) or mp4 (h264) video...
  var file = torrent.files[0]

  // Create a video element
  var videoTo = document.getElementById('player')
  var video = document.createElement('video')
  video.controls = true
  videoTo.appendChild(video)
  video.setAttribute("style","width:100%")

  // Stream the video into the video tag
  videostream(file, video)
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
