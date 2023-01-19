angular.module('Realize.filters.replace', [])
    .filter('replace', function() {
        'use strict';

        return function(input) {
            if (!input) {
                return;
            } else {
                if (arguments.length > 1) {
                    var i;
                    for (i = 1; i < arguments.length; i++) {
                        input = input.replace('%' + i, arguments[i]);
                    }
                }
                return input;
            }
        };
    });
