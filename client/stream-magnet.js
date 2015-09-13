var path = require('path')
var Peer = require('simple-peer')
var prettyBytes = require('pretty-bytes')
var WebTorrent = require('webtorrent')

var util = require('./util')

global.WEBTORRENT_ANNOUNCE = [ 'ws://tracker.fastcast.nz' ]

if (!Peer.WEBRTC_SUPPORT) {
  util.error('Sorry, your browser is unsupported. Please try using Chrome.')
}

var client = new WebTorrent()

client.add(magnetUri, onTorrent)

function onTorrent (torrent) {
  var torrentFileName = path.basename(torrent.name, path.extname(torrent.name)) + '.torrent'

  util.log(
    '<a class="btn btn-primary btn-xs" href="' + torrent.magnetURI + '" role="button"><i class="fa fa-magnet"></i> Magnet URI</a> ' +
    '<a class="btn btn-primary btn-xs" href="' + torrent.torrentFileURL + '" target="_blank" download="' + torrentFileName + '" role="button"><i class="fa fa-download"></i> Download .torrent</a> ' +
    '<a id="downloadButton" class="btn btn-primary btn-xs" role="button"><i class="fa fa-download"></i> Download ' + torrent.name + '</a>'
  )

  function updateSpeed () {
    var progress = (100 * torrent.progress).toFixed(1)
    util.updateSpeed(
      '<b>Peers:</b> ' + torrent.swarm.wires.length + ' ' +
      '<b>Progress:</b> ' + progress + '% ' +
      '<b>Download speed:</b> ' + prettyBytes(client.downloadSpeed()).toFixed(1) + '/s ' +
      '<b>Upload speed:</b> ' + prettyBytes(client.uploadSpeed()).toFixed(1) + '/s'
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
      var download = document.getElementById('download')
      download.classList.remove('hidden')

      // Get a url for each file
      file.getBlobURL(function (err, url) {
        if (err) return util.error(err)

        // Hide download progress
        download.classList.add('hidden')

        // Add a link to the page
        var a = document.createElement('a')
        a.download = window.URL.createObjectURL(url)
        a.click()
        window.URL.revokeObjectURL(url)
      })
    })
  })
}
