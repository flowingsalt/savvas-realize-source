angular.module('Realize.filters.toArray', [])
    .filter('toArray', function() {
        'use strict';

        return function(input) {
            return _.toArray(input);
        };
    });
