angular.module('Realize.filters.standardNumber', [])
    .filter('standardNumber', [
        function() {
            'use strict';

            return function(input) {
                if (!input) {
                    return;
                }

                var parts = input.split('\\');
                if (parts.length && parts.length > 0) {
                    return parts[parts.length - 1];
                }

                return;
            };
        }
    ]);
