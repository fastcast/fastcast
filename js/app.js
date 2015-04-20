var videostream = require('videostream');
var WebTorrent = require('webtorrent')

var client = new WebTorrent()

client.download(url, function (torrent) {
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
})
