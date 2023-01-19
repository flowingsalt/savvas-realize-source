angular.module('Realize.filters.convertHtmlEntities', [])
    .filter('convertHtmlEntities', function() {
        'use strict';

        return function(input) {
            function htmlDecode(input) {
                var textArea = document.createElement('textarea');
                textArea.innerHTML = input;
                return textArea.value;
            }

            var prev;
            do {
                prev = input;
                input = htmlDecode(input);
            } while (input !== prev);

            return input;
        };
    });
