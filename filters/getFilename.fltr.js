angular.module('Realize.filters.getFilename', [])
    .filter('getFileName', function() {
        'use strict';

        return function(input) {
            if (!input) {
                return '';
            }
            var pathArray, index;
            pathArray = input.split(/(\/|\\)/);

            input = pathArray[pathArray.length - 1];

            // TODO: this has some specific stuff for program thumbs
            // pull out or rename
            if (input.search('_grid') > -1) {
                index = input.lastIndexOf('_grid');
            } else if (input.search('@2x') > -1) {
                index = input.lastIndexOf('@2x');
            } else {
                index = input.lastIndexOf('.');
            }

            return input.substring(0, index);
        };
    });
