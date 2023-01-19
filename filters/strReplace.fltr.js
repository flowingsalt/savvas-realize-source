angular.module('Realize.filters.strReplace', [])
    .filter('strReplace', function() {
        'use strict';

        return function(input, pattern, replacement) {
            if (!angular.isString(input) || !pattern) {
                return input;
            }

            if (!replacement) {
                replacement = ' ';
            }

            return input.replace(pattern, replacement);
        };
    });
