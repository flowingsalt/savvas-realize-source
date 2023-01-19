angular.module('Realize.common.gradedStarDirective', [
    'Realize.paths'
])
    .directive('gradedStar', [
        'PATH',
        function(PATH) {
            'use strict';

            return {
                restrict: 'E',
                templateUrl: PATH.TEMPLATE_ROOT + '/common/gradedStar/gradedStar.dir.html'
            };
        }
    ]);
