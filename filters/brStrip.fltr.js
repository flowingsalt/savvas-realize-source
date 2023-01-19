angular.module('Realize.filters.brStrip', [])
    .filter('brStrip', [
        '$log',
        function($log) {
            'use strict';

            return function(input) {
                var output;
                try {
                    output = input.replace(/<br\s*\/?\s*>/g, '');
                } catch (e) {
                    $log.warn('the question/response text is not valid!!', input);
                    output = input;
                }

                return output;
            };
        }
    ]);
