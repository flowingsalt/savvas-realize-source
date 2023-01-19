angular.module('Realize.filters.removeExtension', [])
    .filter('removeExtension', function() {
        'use strict';

        return function(input) {
            if (!input) {
                return;
            }

            var index = input.lastIndexOf('.');

            return (index === -1) ? input : input.substring(0, index);
        };
    });
