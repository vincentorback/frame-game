var fs = require('fs');
var path = require('path');
var cssnext = require('cssnext');
var autoprefixer = require('autoprefixer');

var CSS_PATH = __dirname + '/../../public/css';
var prefixConfig = {
  browsers: ['last 2 versions', '> 1%']
};

var renderer = function (req, res, next) {
  if (!req.accepts('text/html')) {
    // Only render CSS when applicable (request accepts html and in developement)
    return next();
  }

  var input = fs.readFileSync(CSS_PATH + '/style.css', 'utf8');
  var prefixed = autoprefixer(prefixConfig).process(input).css;
  var output = cssnext(prefixed, {
    from: CSS_PATH + '/style.css',
    url: false,
    compress: true
  });

  fs.writeFileSync(CSS_PATH + '/style-min.css', output);
  return next();
};

module.exports = renderer;