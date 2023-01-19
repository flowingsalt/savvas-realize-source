angular.module('Realize.common.helpers', []) // want to rename to RealizeUtils or something
    .service('RealizeHelpers', ['$window', '$log', function($window, $log) {
        'use strict';

        var helpers = this;

        helpers.sortedKeys = function(obj) {
            var key, keys = [];
            for (key in obj) {
                if (obj.hasOwnProperty(key)) {
                    keys.push(key);
                }
            }
            return keys.sort();
        };

        helpers.forEachSorted = function(obj, iterator, context) {
            var i, keys = helpers.sortedKeys(obj);
            for (i = 0; i < keys.length; i++) {
                iterator.call(context, obj[keys[i]], keys[i]);
            }
            return keys;
        };

        /**
         * This method is intended for encoding *key* or *value* parts of query component. We need a custom
         * method because encodeURIComponent is too aggressive and encodes stuff that doesn't have to be
         * encoded per http://tools.ietf.org/html/rfc3986:
         *    query       = *( pchar / "/" / "?" )
         *    pchar         = unreserved / pct-encoded / sub-delims / ":" / "@"
         *    unreserved    = ALPHA / DIGIT / "-" / "." / "_" / "~"
         *    pct-encoded   = "%" HEXDIG HEXDIG
         *    sub-delims    = "!" / "$" / "&" / "'" / "(" / ")"
         *                     / "*" / "+" / "," / ";" / "="
         */
        helpers.encodeUriQuery = function(val, pctEncodeSpaces) {
            return encodeURIComponent(val).
            replace(/%40/gi, '@').
            replace(/%3A/gi, ':').
            replace(/%24/g, '$').
            replace(/%2C/gi, ',').
            replace(/%20/g, (pctEncodeSpaces ? '%20' : '+'));
        };

        helpers.buildUrl = function(url, params) {
            if (!params) {
                return url;
            }
            var parts = [];

            helpers.forEachSorted(params, function(value, key) {
                if (value === null || value === undefined) {
                    return;
                }
                if (!angular.isArray(value)) {
                    value = [value];
                }

                angular.forEach(value, function(v) {
                    if (angular.isObject(v)) {
                        v = angular.toJson(v);
                    }
                    parts.push(helpers.encodeUriQuery(key) + '=' + helpers.encodeUriQuery(v));
                });
            });

            return url + ((url.indexOf('?') === -1) ? '?' : '&') + parts.join('&');
        };

        helpers.killEvent = function(event) {
            if (event) {
                event.stopPropagation();
                event.preventDefault();
            }
        };

        helpers.getParentScope = function(scope, property) {
            if (scope.hasOwnProperty(property)) {
                return scope;
            }
            if (!scope.$parent) {
                return undefined;
            }
            return helpers.getParentScope(scope.$parent, property);
        };

        helpers.updateParentScopeValue = function(scope, property, value) {
            var parentScope = helpers.getParentScope(scope, property);
            if (parentScope) {
                parentScope[property] = value;
            } else {
                scope[property] = value;
            }
        };

        helpers.convertFacetsToParams = function(facetGroups) {
            var params = {};

            angular.forEach(facetGroups, function(facets, facetName) {
                angular.forEach(facets, function(facet) {
                    if (angular.isUndefined(params[facetName])) {
                        params[facetName] = [facet.value];
                    } else if ($.inArray(facet.value, params[facetName]) < 0) {
                        params[facetName] = params[facetName].concat(facet.value);
                    }
                });
            });

            return params;
        };

        helpers.isElementScrolledToBottom = function(elem, tolerance) {
            tolerance = tolerance || 0;
            return elem[0].scrollHeight - elem.scrollTop() < elem.outerHeight() + tolerance;
        };

        helpers.isNullOrUndefined = function(obj) {
            return angular.isUndefined(obj) || obj === null;
        };

        helpers.removeIllegalXmlCharacters = function(str) {
            //http://www.w3.org/TR/xml/#charsets

            // #x9 | #xA | #xD | [#x20-#xD7FF] | [#xE000-#xFFFD]
            var re1 = /[^\u0009\u000A\u000D\u0020-\uD7FF\uE000-\uFFFD]/g;
            var re2 = /[^\uD800-\uDBFF][\uDC00-\uDFFF]/g; // [#x10000-#x10FFFF]

            str = str.replace(re1, '').replace(re2, ''); // Should remove any invalid character
            return str;
        };

        helpers.reloadWindow = function() {
            $log.debug('reloading window!!!');
            $window.location.reload();
        };
    }]);
