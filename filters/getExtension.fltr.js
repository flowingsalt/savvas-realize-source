angular.module('Realize.filters.getExtension', [])
    .filter('getExtension', function() {
        'use strict';

        return function(input, fallback) {
            if (!input) {
                return;
            }

            var index = input.lastIndexOf('.'),
                extension = input.slice(index);

            return (index === -1) ? fallback : extension;
        };
    });
