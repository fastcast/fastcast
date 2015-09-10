var parseTorrent = require('parse-torrent')
var path = require('path')
var prettyBytes = require('pretty-bytes')
var http = require('stream-http')
var WebTorrent = require('webtorrent')

var util = require('./util')

global.WEBTORRENT_ANNOUNCE = [ 'ws://tracker.fastcast.nz' ]

http.get('/torrents/' + torrentName, function (res) {
  var data = [] // List of Buffer objects

  res.on("data", function(chunk) {
    data.push(chunk) // Append Buffer object
  })

  res.on("end", function() {
    data = Buffer.concat(data) // Make one large Buffer of it

    var torrentParsed = parseTorrent(data) // Parse the Buffer

    var client = new WebTorrent()

    client.add(torrentParsed, onTorrent)

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
          '<b>Download speed:</b> ' + prettyBytes(client.downloadSpeed()) + '/s ' +
          '<b>Upload speed:</b> ' + prettyBytes(client.uploadSpeed()) + '/s'
        )
        var progressBar = document.getElementById('progressBar')
        progressBar.setAttribute('aria-valuenow', progress)
        progressBar.setAttribute('style', 'width: ' + progress + '%')
      }

      progressBar.classList.add('active')

      torrent.swarm.on('download', updateSpeed)
      torrent.swarm.on('upload', updateSpeed)
      setInterval(updateSpeed, 5000)
      updateSpeed()

      torrent.files.forEach(function (file) {
        // Create a video element
        file.appendTo('#player')

        document.getElementById('downloadButton').onclick = function() {
          var download = document.getElementById('download')
          download.classList.remove('hidden')

          // Get a url for each file
          file.getBlobURL(function (err, url) {
            if (err) return util.error(err)

            // Hide download progress
            download.classList.add('hidden')
            var progress = document.getElementById('progress')
            progress.classList.add('hidden')

            // Add a link to the page
            var a = document.createElement('a')
            a.download = file.name
            a.href = url
            download.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
          })
        }
      })
    }
  })
})
