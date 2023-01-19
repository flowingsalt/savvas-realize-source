angular.module('Realize.filters.handleEmptyResponse', [])
    .filter('handleEmptyResponse', function() {
        'use strict';

        return function(input) {
            if (null !== input && input.length === 0) {
                return '-';
            } else {
                return input;
            }
        };
    });
