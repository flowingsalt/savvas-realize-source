angular.module('Realize.filters.letterizeNumber', [])
    .filter('letterizeNumber', function() {
        'use strict';

        // convert number to a letter. e.g. show responses of assessment question ordered by 'A', 'B', etc

        var CHAR_CODE_OF_A = 'A'.charCodeAt(0);
        return function(number) {
            return String.fromCharCode(CHAR_CODE_OF_A + number);
        };
    });
