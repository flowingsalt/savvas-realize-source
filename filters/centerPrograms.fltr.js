angular.module('Realize.filters.centerPrograms', [])
    .filter('centerPrograms', function() {
        'use strict';

        return function(programs, inCentersTab) {
            var ignoreFilter = inCentersTab === false;

            return _.filter(programs, function(program) {
                if (ignoreFilter) {
                    return true;
                }

                return program.$isCenterProgram();
            });
        };
    });
