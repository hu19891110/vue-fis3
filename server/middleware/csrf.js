'use strict';


var token = require('lusca/lib/token');

var isMatchUrl = function(routes, url) {
    var hasMatch = false;

    routes.forEach(function(route, index) {
        route = route.replace('http://', '').replace('https://', '');
        if (url.indexOf(route) === 0) {
            hasMatch = true;
        }
    });

    return hasMatch;
}

/**
 * CSRF
 * https://www.owasp.org/index.php/Cross-Site_Request_Forgery_(CSRF)
 * @param {Object} options
 *    key {String} The name of the CSRF token in the model. Default "_csrf".
 *    impl {Object} An object with create/validate methods for custom tokens. Optional.
 *    header {String} The name of the response header containing the CSRF token. Default "x-csrf-token".
 */
module.exports = function (options) {
    var impl, key, header, secret, routes;

    options = options || {};

    key = options.key || '_csrf';
    impl = options.impl || token;
    header = options.header || 'x-csrf-token';
    secret = options.secret || '_csrfSecret';
    routes = options.routes;

    if (routes && !Array.isArray(routes)) {
        routes = [routes];
    }

    return function csrf(req, res, next) {
        var method, validate, _impl, _token, errmsg;

        //call impl
        _impl = impl.create(req, secret);
        validate = impl.validate || _impl.validate;
        _token = _impl.token || _impl;
        // Set the token
        res.locals[key] = _token;

        // Move along for safe verbs
        method = req.method;
        if ((method === 'GET' || method === 'HEAD' || method === 'OPTIONS') && (!routes || !isMatchUrl(routes, req.url))) {
            return next();
        }

        // Validate token
        _token = (req.body && req.body[key]) || req.headers[header.toLowerCase()];

        if (validate(req, _token)) {
            next();
        } else {
            res.statusCode = 403;
            if (!_token) {
                errmsg = 'CSRF token missing';
            } else {
                errmsg = 'CSRF token mismatch';
            }
            next(new Error(errmsg));
        }
    };
};
