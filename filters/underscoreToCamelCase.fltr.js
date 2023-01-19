angular.module('Realize.filters.underscoreToCamelCase', [])
    .config(function() {
        'use strict';

        angular.uppercase = angular.$$uppercase;
    })
    .filter('underscoreToCamelCase', function() {
        'use strict';

        return function(input) {
            if (!angular.isString(input)) {
                return input;
            }

            return input.replace(/_([a-z])/g, function(g) {
                return angular.uppercase(g[1]);
            });
        };
    });
