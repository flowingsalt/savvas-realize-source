angular.module('Realize.common.adaptiveIconDirective', [
    'Realize.paths',
    'Realize.constants.mediaType'
])
    .directive('adaptiveIcon', [
        'PATH',
        'MEDIA_TYPE',
        function(PATH, MEDIA_TYPE) {
            'use strict';

            return {
                scope: {
                    item: '=adaptiveIcon'
                },
                templateUrl: PATH.TEMPLATE_ROOT + '/common/adaptiveIcon/adaptiveIcon.dir.html',
                link: function(scope) {
                    scope.ADAPTIVE_HOMEWORK = MEDIA_TYPE.ADAPTIVE_HOMEWORK;
                }

            };
        }
    ]);
