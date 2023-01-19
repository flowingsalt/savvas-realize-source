//NOTE: This should be removed once the realize.core code is pulled in
//      and utilized during the future content viewer refactoring
angular.module('Realize.common.browserInfoService', [])
    .service('BrowserInfo', ['$window',
        function($window) {
            'use strict';

            this.browser = {};
            this.OS = {};

            this.isHDDisplay = $window.devicePixelRatio >= 2;

            try {
                this.isIDevice = $window.navigator.platform === 'iPad' ||
                                 $window.navigator.platform === 'iPhone' ||
                                 $window.navigator.platform === 'iPad Simulator';
            } catch (err) {
                this.isIDevice = false;
            }

            function userAgent() {
                return $window.navigator ? ($window.navigator.userAgent).toLowerCase() : '';
            }
            Object.defineProperties(this.OS, {
                'isIOS': {
                    get: function() {
                        return /(ipod|iphone|ipad)/i.test(userAgent());
                    }
                },
                'isIOS10': {
                    get: function() {
                        return /OS 10_[0-9_]+ like Mac OS X/i.test(userAgent());
                    }
                },
                'isAndroid': {
                    get: function() {
                        return /(android)/i.test(userAgent());
                    }
                },
                'isMobileDevice': {
                    get: function() {
                        return /(ipod|iphone|ipad)/i.test(userAgent()) || /(android)/i.test(userAgent());
                    }
                }
            });

            Object.defineProperties(this.browser, {
                'isFirefox': {
                    get: function() {
                        return /firefox|iceweasel/i.test(userAgent());
                    }
                },
                'isMSIE': {
                    get: function() {
                        return /msie|trident/i.test(userAgent());
                    }
                },
                'isAndroidStock': {
                    get: function() {
                        return /(android)/i.test(userAgent()) && /(Version\/\d+\.\d+)/i.test(userAgent());
                    }
                },
                'msieVersion': {
                    get: function() {
                        var match = userAgent().toLowerCase().match(/(?:msie |trident\/.*; rv:)(\d+)/);
                        return match ? parseInt(match[1], 10) : undefined;
                    }
                },
                'isSafari':{
                    get: function() {
                        return /^((?!chrome).)*safari/i.test(userAgent());
                    }
                },
                'isChrome': {
                    get: function() {
                        return /chrome/i.test(userAgent());
                    }
                }
            });

            this.OS.getAndroidVersion = function() {
                var versionString = userAgent().match(/android\s([0-9\.]*)/i);
                return (versionString) ? versionString[1] : false;
            };

            this.isMobileDevice = this.OS.isMobileDevice;

        }
    ]);
