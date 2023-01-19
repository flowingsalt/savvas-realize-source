angular.module('Realize.filters.stripProtocol', [])
    .filter('stripProtocol', function() {
        'use strict';

        return function(input) {
            if (!angular.isString(input)) {
                return input;
            }

            return input.replace(/^\s*(https|http):/, '');
        };
    });
