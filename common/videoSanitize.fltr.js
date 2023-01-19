angular.module('RealizeApp') // TODO: move; is here because of dependencies
    .filter('videoSanitize', [
        'RealizeHelpers',
        'BrowserInfo',
        function(RealizeHelpers, BrowserInfo) {
            'use strict';

            // this guid generator guarentees uniqueness per client regardless of session
            var counter = 0;
            var getGUID = function() {
                counter++;
                return (new Date()).getTime() + '-' + counter;
            };

            // needed for RGHT-11672
            var needsCacheBusting = function() {
                var isIE9 = BrowserInfo.browser.msieVersion === 9;
                var isChrome = BrowserInfo.browser.isChrome;
                return isIE9 || isChrome;
            };

            return function(videoUrl) {

                if (needsCacheBusting()) {
                    return RealizeHelpers.buildUrl(videoUrl, {
                        'media_guid': getGUID()
                    });
                }
                return videoUrl;
            };
        }
    ]);
