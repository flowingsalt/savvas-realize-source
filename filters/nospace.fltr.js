angular.module('Realize.filters.nospace', [])
    .filter('nospace', function() {
        'use strict';

        return function(input) {
            if (!angular.isString(input)) {
                return input;
            }

            return input.replace(/ /g, '');
        };
    });
