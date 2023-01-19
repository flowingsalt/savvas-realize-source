angular.module('RealizeApp') // TODO: is not with the rest because of dependencies
    .filter('sidebarEllipses', [
        '$rootScope',
        '$filter',
        'TOC_TITLE_LIMITS',
        'BrowserInfo',
        'MediaQuery',
        function($rootScope, $filter, limits, BrowserInfo, MediaQuery) {
            'use strict';

            return function(input, open) {

                var openValue = (BrowserInfo.isMobileDevice && !MediaQuery.breakpoint.isDesktop) ?
                    limits.MOBILE_IMODE_SIDEBAR_LIMIT : limits.DEFAULT_SIDEBAR_LIMIT,

                    closedValue = (BrowserInfo.isMobileDevice && !MediaQuery.breakpoint.isDesktop) ?
                    limits.MOBILE_IMODE_LIMIT : limits.DEFAULT_LIMIT;

                return $filter('ellipses')(input, open ? openValue : closedValue);
            };
        }
    ]);
