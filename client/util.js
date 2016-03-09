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
