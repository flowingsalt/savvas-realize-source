angular.module('Realize.filters.pipes', [])
    .filter('pipes',
        function() {
            'use strict';

            return function(input) {
                if (!input) {
                    return '';
                }

                if (!angular.isArray(input)) {
                    return input;
                } else {
                    return input.join(' | ');
                }

            };
        }
    );
