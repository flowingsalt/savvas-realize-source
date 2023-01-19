angular.module('Realize.filters.capitalizeFirstWord', [])
    .filter('capitalizeFirstWord', function() {
        'use strict';

        return function(input) {
            return (input.charAt(0)).toUpperCase() + (input.substr(1)).toLowerCase();
        };
    });
