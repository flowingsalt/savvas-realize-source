angular.module('Realize.common.mediaQueryService', [])
    .provider('MediaQuery', function mediaQueryProvider() {
        'use strict';

        var breakpointDefs,
            //bootstrap 2.3.2 breakpoints as default, named as bootstrap names things
            //https://scotch.io/quick-tips/default-sizes-for-twitter-bootstraps-media-queries
            defaultBreakpointDefs = {
                xl: { maxWidth: 1200 },
                lg: { maxWidth: 979 },
                md: { maxWidth: 767 },
                sm: { maxWidth: 480 },
                xs: { maxWidth: 320 }
            };

        this.setBreakpoints = function setBreakpoints(breakpoints) {
            if (angular.isObject(breakpoints) && !angular.isArray(breakpoints)) {
                breakpointDefs = angular.copy(breakpoints);
            }
        };

        this.$get = [
            '$window',
            '$rootScope',
            '$timeout',
            '$log',
            function($window, $rootScope, $timeout, $log) {

                var mediaQuerySvc = {},
                    breakpointTimer,
                    breakpointNames;

                if (!angular.isDefined(breakpointDefs)) {
                    $log.warn(['Breakpoints are not defined.',
                        'Use the MediaQueryProvider at config time and call setBreakpoints() with your breakpoints.',
                        '(i.e. {bigScreen: {minWidth: 1024, maxWidth: 1400} })',
                        'Using breakpoints from twitter bootstrap 2.3.2 as default.'].join('\n'));

                    breakpointDefs = defaultBreakpointDefs;
                }

                breakpointNames = Object.keys(breakpointDefs);

                function buildQuerySegment(minMax, size) {
                    return ['(', minMax.toLowerCase(), '-width: ', size, 'px)'].join('');
                }

                function buildQuery(breakpoint) {
                    var minWidthQry,
                        maxWidthQry,
                        query;

                    if (angular.isNumber(breakpoint.minWidth)) {
                        minWidthQry = buildQuerySegment('min', breakpoint.minWidth);
                    }

                    if (angular.isNumber(breakpoint.maxWidth)) {
                        maxWidthQry = buildQuerySegment('max', breakpoint.maxWidth);
                    }

                    query = (minWidthQry || '');

                    if (angular.isDefined(maxWidthQry)) {
                        query += [(query.length > 0 ? ' and ' : ''), maxWidthQry].join('');
                    }

                    return query;
                }

                function onBreakpointChange() {
                    if (angular.isDefined(breakpointTimer)) {
                        $timeout.cancel(breakpointTimer);
                    }

                    breakpointTimer = $timeout(function broadcastChange() {
                        $rootScope.$broadcast('window.breakpoint.change');
                        breakpointTimer = undefined;
                    }, 20);
                }

                mediaQuerySvc.breakpoint = {};

                Object.defineProperties(mediaQuerySvc, {
                    'breakpointNames': {
                        get: function() {
                            /*essentially want consumers to be able to ref breakpoints like this:
                             mediaQueryService.breakpointNames.largeTablet
                             They get the string, but that correlates directly to our breakpoint defs
                             */
                            return breakpointNames.reduce(function mapKeysToObj(output, name) {
                                output[name] = name;
                                return output;
                            }, {});
                        }
                    },
                    'currentBreakpoint': {
                        get: function() {
                            var currentBreakpoint;
                            for (var i = 0, len = breakpointNames.length; i < len; i++) {
                                var breakpoint = breakpointDefs[breakpointNames[i]];
                                if (breakpoint.mediaQuery.matches) {
                                    currentBreakpoint = angular.copy(breakpoint);
                                    break;
                                }
                            }

                            return currentBreakpoint;
                        }
                    }
                });

                Object.keys(breakpointDefs).forEach(function addBreakpointProp(breakpointName) {

                    //mediaQueryList is kept up to date in real time, so when browser is resized and the
                    //query now [doesn't] match, it fires the event to the function in the listener

                    var breakpoint = breakpointDefs[breakpointName];
                    breakpoint.mediaQuery = $window.matchMedia(buildQuery(breakpoint));
                    breakpoint.mediaQuery.addListener(onBreakpointChange);

                    //for easy comparison if consumer tracks breakpoint changes
                    breakpoint.name = breakpointName;

                    var propName = ['is', breakpointName[0].toUpperCase(), breakpointName.substr(1)].join('');

                    Object.defineProperty(mediaQuerySvc.breakpoint, propName, {
                        get: function() {
                            return breakpointDefs[breakpointName].mediaQuery.matches;
                        }
                    });
                });

                function isGreaterOrLessThan(isGreaterThan, size) {
                    var targetWidth,
                        minMax = isGreaterThan ? 'min' : 'max';

                    if (angular.isString(size) && angular.isDefined(breakpointDefs[size])) {
                        targetWidth = (isGreaterThan ? breakpointDefs[size].maxWidth : breakpointDefs[size].minWidth);
                    } else if (angular.isNumber(size)) {
                        targetWidth = size;
                    }

                    targetWidth += isGreaterThan ? 1 : -1;

                    return $window.matchMedia(buildQuerySegment(minMax, targetWidth)).matches;
                }

                mediaQuerySvc.breakpoint.isGreaterThan = isGreaterOrLessThan.bind(null, true);

                mediaQuerySvc.breakpoint.isLessThan = isGreaterOrLessThan.bind(null, false);

                return mediaQuerySvc;
            }];
    });
