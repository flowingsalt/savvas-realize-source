angular.module('Realize.filters.underscores', [])
    .filter('underscores', function() {
        'use strict';

        return function(input) {
            if (!angular.isString(input)) {
                return input;
            }
            return input.replace(/ /g, '_');
        };
    });
