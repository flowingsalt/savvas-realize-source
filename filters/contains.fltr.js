angular.module('Realize.filters.contains', [])
    .filter('contains', function() {
        'use strict';

        return function(input, match, flags) {
            if (!input) {
                return false;
            }

            if (!angular.isString(flags)) {
                flags = 'i';
            }

            var rx = new RegExp(match, flags);

            return input.search(rx) >= 0;
        };
    });
