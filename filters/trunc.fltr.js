angular.module('Realize.filters.trunc', [])
    .filter('trunc', function() {
        'use strict';

        return function(input, len) {
            if (!angular.isString(input) || !len) {
                return input;
            }

            return input.substr(0, len);
        };
    });
