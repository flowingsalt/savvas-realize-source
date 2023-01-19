angular.module('Realize.content.fullscreenPlayer', [])
    .directive('fullscreenPlayer', [
        '$log',
        '$sce',
        function($log, $sce) {
            'use strict';

            return {
                restrict: 'AE',
                scope: {
                    sourceTitle: '=',
                    sourceUrl: '=',
                    back: '=?'
                },
                templateUrl: 'templates/content/fullscreen.player.dir.html',
                link: function(scope, $filter) {
                    scope.$watch('sourceUrl', function(newVal) {
                        scope.trustedUrl = $sce.trustAsResourceUrl(newVal);
                    });

                    scope.$on('fullscreenplayer.notification', function(e, type, title, message) {
                        var verbiage = {title: title, message: message};
                        type = $filter('lowercase')(type);

                        if (type === 'info') {
                            scope.alertInfo = verbiage;
                        }
                    });

                    scope.$emit('fullscreenplayer.loaded');
                }
            };
        }
    ]);
