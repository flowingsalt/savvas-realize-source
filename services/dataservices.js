angular.module('RealizeDataServices')
    .config([
        '$httpProvider',
        function($httpProvider) {
            'use strict';

            // default POST header to form data rather than JSON for OLE backward compat
            $httpProvider.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded';
            $httpProvider.defaults.headers.put['Content-Type'] = 'application/x-www-form-urlencoded';

            // override JSON behavior
            $httpProvider.defaults.transformRequest = function(d) {
                if (!angular.isObject(d)) {
                    return d;
                }
                var out = {};
                angular.forEach(d, function(value, key) {
                    if (!angular.isFunction(value)) {
                        out[key] = value;
                    }
                });
                return $.param(out, true);
            };
        }
    ]);
