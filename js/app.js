var url = 'magnet:?xt=urn:btih:6956280f07264333d4753f50a478de96bf9d28b6&tr=wss://tracker.webtorrent.io'
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
  file.createReadStream().pipe(video)
})
