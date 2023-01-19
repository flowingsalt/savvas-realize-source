angular.module('Realize.common.fitToContentDirective', [
])
    .directive('fitToContent', [
        function() {
        'use strict';

        return {
            restrict: 'A',
            link: function(scope, element) {
                element.on('load', function() {
                    var iFrameHeight = element[0].contentWindow.document.body.scrollHeight + 'px';
                    element.css('height', iFrameHeight);
                });
            }
        };
    }]);
