angular.module('RealizeDirectives')
    .directive('mediaPlayer', [
        '$timeout',
        '$window',
        '$filter',
        'BrowserInfo',
        function($timeout, $window, $filter, BrowserInfo) {
            'use strict';

            var mejs = $window.mejs;

            //override the current supported types to allow x-mp3 (RGHT-7810)
            mejs.plugins.flash = [{
                version: [9, 0, 124],
                types: [
                    'video/mp4', 'video/m4v', 'video/mov', 'video/flv', 'video/rtmp', 'video/x-flv',
                    'audio/flv', 'audio/x-flv', 'audio/mp3', 'audio/xmp3', 'audio/x-mp3', 'audio/m4a', 'audio/mpeg',
                    'video/youtube', 'video/x-youtube'
                ]
            }];

            return {
                scope: {
                    src: '@',
                    mediaType: '@'
                },
                replace: true,
                template: [
                    '<div ng-switch="mediaType">',
                        '<audio ng-switch-when="audio" ng-src="{{ srcAudio }}" type="audio/mp3" controls="controls">',
                        '</audio>',
                        '<video ng-switch-when="video" ng-src="{{ srcVideo }}" ></video>',
                    '</div>'
                ].join(''),
                link: function(scope, el, attrs) {

                    scope.$watch('src', function(newValue) {

                        if (!newValue) {
                            return;
                        }

                        scope.srcVideo = $filter('videoSanitize')(newValue);
                        scope.srcAudio = newValue;

                        // needs a little time to render
                        var timer = $timeout(function() {
                            var configs = {};

                            if (BrowserInfo.browser.isMSIE) {
                                //Additionally on windows machines IE doesn't behave well so also force flash there
                                configs.mode = 'shim';
                            }

                            //initialize the mediaelementplayer
                            $(el).find(attrs.mediaType).mediaelementplayer(configs);

                        }, 100);
                        scope.$on('$destroy', function destroy() {
                            $timeout.cancel(timer);
                        });
                    });

                    scope.$on('$routeChangeStart', function() {
                        $('.mejs-container .mejs-pause').click();
                        $('body > .me-plugin').remove();
                    });
                } //end link
            };
        }
    ]);
