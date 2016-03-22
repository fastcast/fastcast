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
          '<b>Peers:</b> ' + torrent.swarm.wires.length + ' ' +
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
