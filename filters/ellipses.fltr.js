angular.module('Realize.filters.ellipses', [])
    .filter('ellipses', function() {
        'use strict';

        return function(input, len, ellipsis) {
            if (!angular.isString(input) || !len) {
                return input;
            }

            if (!ellipsis) {
                ellipsis = '...';
            }

            if (input.length <= len) {
                return input;
            } else {
                return input.substr(0, len) + ellipsis;
            }
        };
    });
