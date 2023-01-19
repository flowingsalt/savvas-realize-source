angular.module('Realize.common.realizeReaderSelectionIconDirective', [
    'Realize.paths',
    'Realize.constants.mediaType'
])
    .directive('realizeReaderSelectionIcon', [
        'PATH',
        'MEDIA_TYPE',
        function(PATH, MEDIA_TYPE) {
            'use strict';

            return {
                scope: {
                    item: '=realizeReaderSelectionIcon'
                },
                templateUrl: PATH.TEMPLATE_ROOT +
                                '/common/realizeReaderSelectionIcon/realizeReaderSelectionIcon.dir.html',
                link: function(scope) {
                    scope.REALIZE_READER_SELECTION = MEDIA_TYPE.REALIZE_READER_SELECTION;
                }

            };
        }
    ]);
