    /*
    This file contains line graph implementation for 3.0 release that has pan-zoom support.
    // Usage:
    //    <div line-graph
    //        label-y='Y Label'
    //        label-x='X Label'
    //        local-data='data'
    //        min='filter_startDate' max='filter_endDate' y-max='100' y-suffix='%'
    //        when-hover='display(data)'
    //        when-hover-out='hide()'
    //        when-click='choose(data, index)'>
    //        type='report-type'    whenever the viewport changes we redraw the graph including the
                                    average line and also reset the average score shown above the key
                                    so we send a broadcast to the parent with the new average score
                                    based on the viewport and use the type to get the right instance
    //</div>
    //TODO - implement code review comments made in http://fisheye.pearsoncmg.com/cru/CR-OLE-1289#CFR-95148.
            Some involve adjusting the mocks and some were put in after we closed the story
    */

angular.module('Realize.reporting.LineGraph', [
    'ModalServices',
    'Realize.standards.standardDataService',
    'Realize.common.keyboardSupport.keyCodes',
    'Realize.common.browserInfoService'
])
    .directive('lineGraph', [
        '$log',
        'Messages',
        '$window',
        '$rootScope',
        'Modal',
        'KEY_CODES',
        'BrowserInfo',
        function($log, Messages, $window, $rootScope, Modal, keyCode, BrowserInfo) {
            'use strict';

            var LEFT_MARGIN = 55,
                RIGHT_MARGIN = 10,
                TICK_LENGTH = 5,
                defaultViewPortWidthInWeeks = 2, // the size of the viewport on render
                // for IE8 create a simpler  mechanism to pan data
                usePanAreaFallback = false,//true // use true to test quickly on chrome rather than ie8
                CIRCLE_RADIUS_INNER = 6,
                CIRCLE_RADIUS_OUTER = 7,
                TEXT_ROTATION_ANGLE = 45,
                TIME_INTERVAL = {
                    DAY: 'DAY',
                    WEEK: 'WEEK'
                };

            return {
                replace: true,
                scope: {
                    // an array of data buckets. each bucket has data points sharing a common characteristic
                    // (e.g. all assessments having 'Mastery')
                    data: '=localData',
                    whenHover: '&',
                    whenHoverOut: '&',
                    whenClick: '&',
                    generateUrl: '=?',
                    yMax: '=',
                    start: '=min',
                    end: '=max'
                },
                templateUrl: 'templates/reporting/lineGraph.html',
                link: function(scope, element, attrs) {
                    scope.getMessage = Messages.getMessage;
                    scope.reportType = attrs.type;

                    var container = element.find('.graph-container'),
                        data, focusAreaXScale, focusAreaYScale, focusAreaXAxis, focusAreaYAxis,
                        contextAreaXScale, contextAreaYScale, contextAreaXAxis,
                        brush, svg, focus, context, viewportStartDate, viewportEndDate,
                        averageLine, updateFn, groupFn, minMax, isAllBucketDataVisible,
                        availableWidth = 960, focusAreaProperties, contextAreaProperties,
                        width, metaGroups, availableHeight = 400,
                        panLeftCommonSteps, panRightCommonSteps,
                        currentDataPoint; //mobile hover fix

                    var setGraphProperties = function(graphWidth) {
                        $log.debug('line graph set graphWidth ' + graphWidth);

                        availableHeight = isAllBucketDataVisible ? 240 : usePanAreaFallback ? 260 : 400;

                        // define properties of the region which reacts to pan-zoom
                        // operations and where the line graph(s) will be rendered
                        focusAreaProperties = {
                            padding: {
                                bottom: 50,
                                left: LEFT_MARGIN,
                                right: 20,
                                top: 10
                            },
                            // ********* getting the the margins and padding right is tricky because we have
                            // to check **********
                            // 1. IE8 - pan area present and pan area not present
                            // 2. non IE8 - pan area present and pan area not present
                            // would it be better to use the same height always?
                            margin: {
                                top: 10,
                                right: RIGHT_MARGIN,
                                bottom: isAllBucketDataVisible ? 65 : usePanAreaFallback ? 80 : 230,
                                left: LEFT_MARGIN
                            },
                            dot: {
                                width: 25,
                                gap: 2,
                                dy: 4
                            },
                            group: {
                                gap: 5
                            },
                            offset: {
                                x: 5,
                                y: 10
                            },
                            xLabelFontSize: 14,
                            yLabelFontSize: 14
                        };
                        focusAreaProperties.height = availableHeight - focusAreaProperties.margin.top -
                            focusAreaProperties.margin.bottom - 10;
                        focusAreaProperties.x1 = focusAreaProperties.padding.left;
                        focusAreaProperties.y1 = focusAreaProperties.padding.top;
                        focusAreaProperties.y2 = focusAreaProperties.y1 + focusAreaProperties.height;

                        // define properties of the region which provides pan/zoom and viewport
                        contextAreaProperties = {
                            margin: {
                                top: usePanAreaFallback ? 255 : 280,
                                right: RIGHT_MARGIN,
                                bottom: usePanAreaFallback ? 10 : 50,
                                left: LEFT_MARGIN
                            }
                        };
                        contextAreaProperties.height = availableHeight -
                            contextAreaProperties.margin.top -
                            contextAreaProperties.margin.bottom;

                        if (angular.isNumber(graphWidth)) {
                            availableWidth = graphWidth;
                        } else {
                            availableWidth = angular.element($window).width() < 980 ? 450 : 700;
                        }
                        width  = availableWidth - focusAreaProperties.margin.left - focusAreaProperties.margin.right;
                        focusAreaProperties.x2 = focusAreaProperties.x1 + width;
                    };

                    var defaultLineGraphDisplayProperties = {
                            'type': 'standard',
                            // the following stroke caused the solid line to disappear on the Mac in FF and Safari...
                            //'stroke': '1,0' // <dash length>, <spacing length> ...this effectively creates a solid
                            // line this stroke fixes the Mac issue RGHT-5025, and doesn't seem to break other
                            // browser/OS combos
                            'stroke': ''
                        };

                    if (BrowserInfo.isIDevice) {
                        // 1. raphael style for ie8
                        // 2. ipad does not render line with 1,0
                        defaultLineGraphDisplayProperties.stroke = '';
                    }

                    var setDisplayProperties = function(buckets) {
                        var displayProperties ;
                        angular.forEach(buckets, function(bucket) {
                            if (!angular.isObject(bucket.lineGraphDisplayProperties)) {
                                bucket.lineGraphDisplayProperties = defaultLineGraphDisplayProperties;
                            } else {
                                displayProperties = {};
                                angular.copy(defaultLineGraphDisplayProperties, displayProperties);
                                angular.extend(displayProperties,  bucket.lineGraphDisplayProperties);
                                bucket.lineGraphDisplayProperties = displayProperties;
                            }
                        });
                    };

                    var setAverage = function(buckets) {
                        var i = 0, j = 0, scoreSum = 0, scoreCount = 0;

                        averageLine = 0;

                        for (i = 0; i < buckets.length; i++) {
                            scoreCount += buckets[i].data.length;
                            for (j = 0; j < buckets[i].data.length; j++) {
                                scoreSum += buckets[i].data[j].y;
                            }
                        }

                        if (scoreCount !== 0 && scoreSum !== 0) {
                            averageLine = Math.round(scoreSum / scoreCount);
                        }

                        $log.debug('setAverage: ', averageLine, scoreCount, scoreSum);

                        // update the average score displayed in the key section
                        // by sending an event to the parent in the chain
                        $rootScope.$broadcast('reportAverageUpdated', {
                            updatedAverage: averageLine,
                            reportType: scope.reportType
                        });
                    };

                    var drawFocusAreaLineFn = d3.svg.line().x(function(d) {
                            return d.displayAt;
                        }).y(function(d) {return focusAreaYScale(d.y);});

                    var drawContextAreaLineFn = d3.svg.line().x(function(d) {
                            return contextAreaXScale(new Date(d.x));
                        }).y(function(d) {
                            return contextAreaYScale(d.y);
                        });

                    var redrawAverageLine = function() {
                        svg.select('.averageLine').remove();
                        focus.append('svg:line')
                            .attr('class', 'averageLine')
                            .attr('x1', 0)
                            .attr('x2', width)
                            .attr('y1', focusAreaYScale(averageLine))
                            .attr('y2', focusAreaYScale(averageLine));
                    };

                    var isValidDate = function(d) {
                        if (Object.prototype.toString.call(d) === '[object Date]' && !isNaN(d.getTime())) {
                            return true;
                        } else {
                            return false;
                        }
                    };

                    // get the data points that is being focused on by the viewport
                    var getDataInViewport = function(buckets) {
                        var dataInViewport = [];
                        if (buckets.length === 0 || !isValidDate(viewportStartDate) || !isValidDate(viewportEndDate)) {
                            return dataInViewport;
                        }
                        angular.forEach(buckets, function(bucket) {
                            var bucketDataInViewport = [];
                            angular.forEach(bucket.data, function(d) {
                                var date = new Date(d.x);
                                if (date.isAfter(viewportEndDate)) {
                                    return false; // break the for each if  data point falls after the extent
                                }
                                if (date.between(viewportStartDate, viewportEndDate)) {
                                    // include the data point if it is equal or in between the viewport extents
                                    bucketDataInViewport.push(d);
                                }
                            });
                            if (bucketDataInViewport.length > 0) {
                                dataInViewport.push({
                                    data: bucketDataInViewport,
                                    lineGraphDisplayProperties: bucket.lineGraphDisplayProperties
                                });
                            }
                        });
                        $log.log('Viewport StartDate=' + viewportStartDate, 'Viewport EndDate = ' + viewportEndDate);
                        return dataInViewport;
                    };

                    // return the index of an item with the given assignment id
                    // if nothing is found, the value will be undefined
                    var getIndexByAssignmentId = function(assignmentId, array) {
                        var i = 0;
                        if (angular.isArray(array)) {
                            for (i = 0; i < array.length; i++) {
                                if (array[i] && array[i].assignmentId === assignmentId) {
                                    return i;
                                }
                            }
                        }
                        $log.error('lineGraph.js: findIndexByAssignmentId: Cannot find item with id: ' + assignmentId);
                    };

                    // return the array of assignment data that contains the given assignment
                    // if nothing is found, the value will be an empty array
                    var getAssignmentDataArrayContainingAssignment = function(assignment, arrayOfBuckets) {
                        var i = 0;
                        var assignmentData = [];
                        if (angular.isArray(arrayOfBuckets)) {
                            for (i = 0; i < arrayOfBuckets.length; i++) {
                                if (arrayOfBuckets[i] &&
                                    arrayOfBuckets[i].data && arrayOfBuckets[i].data.indexOf(assignment) > -1) {

                                    assignmentData = arrayOfBuckets[i].data;
                                    break;
                                }
                            }
                        }
                        return assignmentData;
                    };

                    var drawTopChartLineGraphs = function(dataInViewport) {
                        // draw line graph(s) for the top chart
                        var pendingNavigation = false;
                        var focusIn = function(dataPoint) {
                            scope.whenHover({data: dataPoint});
                        };
                        var focusOut = function() {
                            if (!pendingNavigation) {
                                scope.whenHoverOut();
                            }
                        };
                        var groupedData = groupFn(dataInViewport);
                        var points = focus.selectAll('.points')
                            .data(groupedData)
                            .enter()
                            .append('g')
                            .attr('class', function(d) {
                                return 'points ' + d.lineGraphDisplayProperties.type;
                            });

                        points.append('svg:path')
                            .attr('class', 'line')
                            .attr('stroke-dasharray', function(d) {
                                return d.lineGraphDisplayProperties.stroke;
                            })
                            .attr('clip-path', 'url(#clip_' + scope.reportType + ')')
                            .attr('d', function(d) {
                                return drawFocusAreaLineFn(d.data);
                            });

                        // draw circles for mouse over
                        var circle = points.selectAll('point-on-line-bg')
                            .data(function(d) { return d.data; })
                            .enter()
                            .append('a')
                            .attr('focusable', true)
                            .attr('role', 'link')
                            .attr('aria-label', function(points) {
                                return points.label;
                            });

                        circle.on('focus', function(d) {
                                focusIn(d);
                            })
                            .on('blur', function() {
                                focusOut();
                            });

                        if (scope.generateUrl) {
                            circle.attr('xlink:href', function(points, index) {
                                return scope.generateUrl(points, index);
                            });
                        }

                        circle.append('svg:circle')
                            .attr('class', function(d) {
                                var classes = 'point-on-line-bg';
                                if (angular.isString(d.pointClass)) {
                                    classes += ' ' + d.pointClass;
                                }
                                return classes;
                            })
                            .attr('r', CIRCLE_RADIUS_OUTER)
                            .attr('cx', function(d) { return d.displayAt; })
                            .attr('cy', function(d) { return focusAreaYScale(d.y); });

                        points.selectAll('point-on-line')
                            .data(function(d) { return d.data; })
                            .enter()
                            .append('svg:circle')
                            .attr('class', function(d) {
                                var classes = 'point-on-line';
                                if (angular.isString(d.pointClass)) {
                                    classes += ' ' + d.pointClass;
                                }
                                return classes;
                            })
                            .attr('r', CIRCLE_RADIUS_INNER)
                            /* since the smaller circle is drawn on top of the bigger one, set the mouse event handler
                                on the smaller circle. another option is to put each pair of concentric
                                circle in a svg:g element and put the event handlers on  the group element.
                                however, r2d3 does not support that yet: TODO: revisit and optimize now that
                                we no longer use the r2d3 lib
                            */
                            .on('mouseover', function(d) {
                                // note to you can do d3.events to get the x-y coordinates (non ie8)
                                scope.whenHover({
                                    data: d
                                });
                            })
                            .on('mouseout', function() {
                                if (currentDataPoint) {
                                    currentDataPoint = undefined;
                                }
                                scope.whenHoverOut();
                            })
                            .on('click', function(d) {
                                if (BrowserInfo.OS.isAndroid) {
                                    if (!currentDataPoint || currentDataPoint !== d) {
                                        currentDataPoint = d;
                                        scope.whenHover({data: d});
                                        return;
                                    }
                                }
                                scope.whenClick({
                                    data: d,

                                    // can't directly pass in function's index variable since it's
                                    // local to the zoomed-in viewport
                                    // Need to look up which data bucket assignment is in and
                                    // then the index in that bucket.
                                    index: getIndexByAssignmentId(
                                        d.assignmentId,
                                        getAssignmentDataArrayContainingAssignment(d, data)
                                    )
                                });
                            })
                            .attr('cx', function(d) {return d.displayAt;})
                            .attr('cy', function(d) {return focusAreaYScale(d.y);});
                    };

                    var drawTopChartXAxis = function() {

                        // Draw x-axis text for focus chart X axis.
                        svg.selectAll('.ruleTopX')
                            .data(metaGroups[0])
                            .enter().append('text')
                            .attr('transform', function(d) {
                                // slightly slant the tick labels to avoid overlapping when they are too close by
                                return 'translate(' + (focusAreaProperties.padding.left + d3.mean(metaGroups[2][d])) +
                                    ',' + (focusAreaProperties.y2 + (focusAreaProperties.offset.y * 2)) +
                                    ')rotate(' + TEXT_ROTATION_ANGLE + ')';
                            })
                            // add the class 'rule ruleX' to x axis tick labels so that the font size defined
                            // in less files gets applied for line graph
                            // with a larger font, the date labels were getting chopped off fir line graph
                            // e.g. July 30, 2013 to July 31, 2013 --> '31' gets chopped off when using a larger font
                            .attr('class', 'rule ruleX ruleTopX')
                            .text(function(d) {return moment(d, 'MM/DD/YYYY').format('MMM DD').replace('.', '');});

                        // X axis tick marks
                        svg.selectAll('.tickX')
                            .data(metaGroups[0])
                            .enter().append('line')
                            .attr('transform', 'translate(' + focusAreaProperties.padding.left + ', 0)')
                            .attr('class', 'tick tickX')
                            .attr('y1', focusAreaProperties.y2)
                            .attr('y2', focusAreaProperties.y2 + TICK_LENGTH)
                            .attr('x1', function(d) {return d3.mean(metaGroups[2][d]);})
                            .attr('x2', function(d) {return d3.mean(metaGroups[2][d]);});
                    };

                    // redraw the line graphs
                    var updateGraphUsingData = function(dataInViewport) {
                        // recalculate and redraw the average line
                        setAverage(dataInViewport);
                        redrawAverageLine();

                        focus.selectAll('.points').remove();    // clear top graph
                        svg.selectAll('.ruleTopX').remove();    // clear top x axis text
                        svg.selectAll('.tickX').remove();       // clear top x axis ticks

                        if (dataInViewport.length !== 0) {
                            drawTopChartLineGraphs(dataInViewport); // draw line graph(s) for the top chart
                            drawTopChartXAxis();                    // draw x axis for top chart
                        }
                    };

                    var updateGraphUsingDataInViewport = function() {
                        var dataInViewport = getDataInViewport(scope.data);
                        updateGraphUsingData(dataInViewport);
                    };

                    var brushedEventHandler = function() {
                        focusAreaXScale.domain(brush.empty() ? [viewportStartDate, viewportEndDate] : brush.extent());
                        var extent = brush.extent();

                        if (!brush.empty()) {
                            viewportStartDate = new Date(extent[0]);
                            viewportEndDate = new Date(extent[1]);
                        }
                        updateGraphUsingDataInViewport();
                    };

                    function setViewport() {
                        brush.extent([viewportStartDate, viewportEndDate]);
                        brush(context.selectAll('.x.brush'));
                        brushedEventHandler();
                    }

                    var createPanArea = function() {
                        context.select('.contextArea').remove();
                        contextAreaXScale = d3.time.scale().range([0, width]);
                        contextAreaYScale = d3.scale.linear().range([contextAreaProperties.height, 0]).clamp(true);

                        var contextXAxisMinVal = Date.parse(minMax[0].x), contextXAxisMaxVal = Date.parse(minMax[1].x);
                        if (viewportEndDate.isAfter(contextXAxisMaxVal)) {
                            // draw the x-axis to show at least the minimum viewport width
                            contextXAxisMaxVal = viewportEndDate;
                        }

                        contextAreaXScale.domain([contextXAxisMinVal, contextXAxisMaxVal]);
                        contextAreaYScale.domain(focusAreaYScale.domain());
                        contextAreaXAxis = d3.svg.axis()
                            .scale(contextAreaXScale)
                            .orient('bottom')
                            .tickFormat(d3.time.format('%b %d'));

                        // click and drag to select one- or two-dimensional regions,
                        // then set x scale of brush to lower X axis
                        // then respond to events when the brush is moved by calling function brushedEventHandler()
                        brush = d3.svg.brush()
                            .x(contextAreaXScale)
                            .on('brush', brushedEventHandler);

                        // create a group node so that it can be emptied out on redraw
                        var contextArea = context.append('g')
                            .attr('class', 'contextArea');

                        // draw the x axis for bottom graph
                        contextArea.append('g')
                            .attr('class', 'axes x')
                            .attr('transform', 'translate( 0 ,' + contextAreaProperties.height + ')')
                            .call(contextAreaXAxis);

                        // create the pan/zoom and viewport which the User can use to adjust the upper graph
                        contextArea.append('g')
                            .attr('class', 'x brush')
                            .call(brush)
                            .selectAll('rect')
                            .attr('y', -6)
                            .attr('height', contextAreaProperties.height + 7);

                        // create the initial viewport
                        setViewport();

                        // instruction text for pan-zoom area
                        contextArea.append('svg:text')
                          .attr('class', 'x instructions pan_zoom')
                          .attr('text-anchor', 'left')
                          .attr('x', 0)
                          .attr('y',  -10)
                          .attr('font-size', 14)
                          .text(Messages.getMessage('lineGraph.instructionForPanAndZoom'));

                        // draw line graph(s) for the bottom chart
                        var points = contextArea.selectAll('.points')
                           .data(scope.data)
                           .enter()
                           .append('g')
                           .attr('class', function(d) {
                                return 'points ' + d.lineGraphDisplayProperties.type;
                            });

                        points.append('svg:path')
                            .attr('class', 'line')
                            .attr('stroke-dasharray', function(d) {
                                return d.lineGraphDisplayProperties.stroke;
                            })
                            .attr('d', function(d) {
                                return drawContextAreaLineFn(d.data);
                            });
                    };

                    // return an array [min,max] of the minimum and maximum
                    // dates from the buckets
                    var getMinMaxValOfData = function(buckets) {
                        var flatData = [],
                            sortedData = [];
                        // put the first and last element of each bucket into an array. each bucket is sorted by date
                        angular.forEach(buckets, function(bucket) {
                            if (bucket.data.length !== 0) {
                                flatData.push(bucket.data[0]);
                                flatData.push(bucket.data[bucket.data.length - 1]);
                            }
                        });
                        // sort the data in order of ascending date so we can pick off
                        // first and last as minimum, maximum respectively
                        sortedData = flatData.sort(function(a, b) {
                            a = new Date(a.x);
                            b = new Date(b.x);
                            return a < b ? -1 : (a > b ? 1 : 0);
                        });
                        return [sortedData[0], sortedData[sortedData.length - 1]];
                    };

                    // is the subset of data shown in the viewport really the entire data received from the server
                    var isAllBucketDataVisibleFn = function() {
                        var isAllBucketDataInViewport = true;
                        angular.forEach(scope.data, function(bucket) {
                            var bucketData = bucket.data;
                            if (bucketData.length >= 1) {
                                // all the data for a bucket is in the viewport (i.e. visible) if the
                                // start date and end date is within the view port extent
                                var start = bucketData[0].x,
                                    end = bucketData[bucketData.length - 1].x,
                                    startIsInRange = Date.parse(start).between(viewportStartDate, viewportEndDate),
                                    endIsInRange = Date.parse(end).between(viewportStartDate, viewportEndDate);
                                if (!startIsInRange || !endIsInRange) {
                                    isAllBucketDataInViewport = false;
                                    return false; // break the for loop
                                }
                            }
                        });
                        return isAllBucketDataInViewport;
                    };

                    function allowKeyboardNavigation() {
                        return !usePanAreaFallback && !isAllBucketDataVisible;
                    }

                    /*
                     * return a map containing extent and the type of extent(i.e day, week) of the current viewport
                     */
                    function getViewPortExtentInfo() {
                        var extentType, extent, startDate, endDate, expectedWeeksFromStartDate;

                        startDate = new Date(
                            viewportStartDate.getFullYear(),
                            viewportStartDate.getMonth(),
                            viewportStartDate.getDate()
                        );
                        endDate = new Date(
                            viewportEndDate.getFullYear(),
                            viewportEndDate.getMonth(),
                            viewportEndDate.getDate()
                        );
                        expectedWeeksFromStartDate = startDate.clone().addWeeks (defaultViewPortWidthInWeeks);
                        if (viewportEndDate.isBefore(expectedWeeksFromStartDate)) {
                            // if the actual end date is before the expected one then we use
                            // extend in number of days between actual start and end dates
                            extent = d3.time.day.range(startDate, endDate).length;
                            extentType = TIME_INTERVAL.DAY;
                        } else {
                            // else use weeks between actual start and end dates
                            extent = d3.time.week.range(startDate, endDate).length;
                            extentType = TIME_INTERVAL.WEEK;
                        }
                        return {
                            extent: extent,
                            extentType: extentType
                        };
                    }

                    scope.isNavigatePanAreaWithKeyboardSet = false;
                    var navigatePanAreaWithKeyboard = function() {
                        var viewPortExtentInfo;
                        if (scope.isNavigatePanAreaWithKeyboardSet) {
                            // the function to bind keyboard events can be invoked multiple times because the
                            // draw(0) function is invoked each time filter or data changes
                            return;
                        }
                        scope.isNavigatePanAreaWithKeyboardSet = true;
                        $(element).keydown(
                            function(lineGraphKeyEvent) {
                                if (!allowKeyboardNavigation) {
                                    // ignore the key event if we are showing simple pan area or if all data
                                    // received from server fits nicely in the upper line graph
                                    return;
                                }

                                var processKey = false;
                                if (lineGraphKeyEvent.shiftKey === true) {
                                    if (lineGraphKeyEvent.which === keyCode.LEFT) {
                                        processKey = true;
                                        viewportStartDate.addWeeks(-1 * defaultViewPortWidthInWeeks);
                                    } else if (lineGraphKeyEvent.which === keyCode.RIGHT) {
                                        processKey = true;
                                        viewportStartDate.addWeeks(defaultViewPortWidthInWeeks);
                                    } else if (lineGraphKeyEvent.which === keyCode.UP) {
                                        lineGraphKeyEvent.preventDefault();
                                        processKey = true;
                                        viewportEndDate.addWeeks(defaultViewPortWidthInWeeks);
                                    } else if (lineGraphKeyEvent.which === keyCode.DOWN) {
                                        lineGraphKeyEvent.preventDefault();
                                        processKey = true;
                                        viewportEndDate.addWeeks(-1 * defaultViewPortWidthInWeeks);
                                    }
                                } else if (lineGraphKeyEvent.which === keyCode.LEFT) {
                                    viewPortExtentInfo = getViewPortExtentInfo();
                                    processKey = panLeftCommonSteps(
                                        viewPortExtentInfo.extent,
                                        viewPortExtentInfo.extentType
                                    );
                                } else if (lineGraphKeyEvent.which === keyCode.RIGHT) {
                                    viewPortExtentInfo = getViewPortExtentInfo();
                                    processKey = panRightCommonSteps(
                                        viewPortExtentInfo.extent,
                                        viewPortExtentInfo.extentType
                                    );
                                }

                                if (processKey) {
                                    if (viewportStartDate.isAfter(viewportEndDate)) {
                                        // swap the two dates
                                        var tempdate = viewportStartDate.clone();
                                        viewportStartDate = viewportEndDate;
                                        viewportEndDate = tempdate;
                                    }
                                    if (viewportStartDate.isBefore(Date.parse(minMax[0].x))) {
                                        viewportStartDate = Date.parse(minMax[0].x);
                                    }
                                    if (viewportEndDate.isAfter(Date.parse(minMax[1].x))) {
                                        viewportEndDate = Date.parse(minMax[1].x);
                                    }
                                    setViewport();
                                }
                            });
                    }; //end of navigate pan zoom with keyboard

                    var draw = function() {
                        container.empty();
                        $log.log('in draw');
                        data = scope.data;
                        if (data[0].data) {
                            //Sort by date
                            data[0].data = _.sortBy(data[0].data, function(d) { return new Date(d.assignmentDueDate);});
                        }
                        setDisplayProperties(data);

                        minMax = getMinMaxValOfData(data);
                        viewportStartDate = Date.parse(minMax[0].x);
                        viewportEndDate = Date.parse(minMax[0].x).addWeeks(defaultViewPortWidthInWeeks);
                        isAllBucketDataVisible = isAllBucketDataVisibleFn();

                        // initialize the graph based on window width available when the graph is rendered.
                        // Also adjust the height based on the type of the panzoom area shown
                        // and whether we need the pan zoom area at all.
                        setGraphProperties();

                        // X axes have linear time scale output range
                        focusAreaXScale = d3.time.scale().range([0, width]);
                        // Y axes have a linear quantitative scale output range
                        focusAreaYScale = d3.scale.linear().range([focusAreaProperties.height, 0]).clamp(true);

                        // the 'domain' is the upper and lower values of the input data
                        // Set the *initial* input domain for the X axis in the upper graph.  Note, that each time
                        // the user adjusts the viewport, the xscale domain() for the upper graph will be modified
                        // and the graph updated.

                        focusAreaXScale.domain(d3.extent([Date.parse(minMax[0].x), Date.parse(minMax[1].x)]));
                        focusAreaYScale.domain([0, parseInt(scope.yMax, 10)]);
                        // create new axis generator, scale using focusAreaXScale, put on bottom
                        focusAreaXAxis = d3.svg.axis()
                            .scale(focusAreaXScale)
                            .orient('bottom');
                        focusAreaYAxis = d3.svg.axis()
                            .scale(focusAreaYScale)
                            .orient('left')
                            .ticks(parseInt(attrs.ticks, 10) || 1)
                                // DE23519  - generate 3 minor ticks
                            .tickSubdivide(parseInt(attrs.subTicks, 10) || 3)
                            .tickSize(6, 6, 0)
                            .tickFormat(function(d) {
                                return d + attrs.ySuffix;
                            });

                        // Create this HTML in DOM:
                        // <svg width='' height='' class=''>
                        // </svg>
                        svg = d3.select(container[0])
                                    .append('svg:svg')
                                    .attr('class', 'line-graph')
                                    .attr('width', availableWidth)
                                    .attr('height', availableHeight);

                        if (!usePanAreaFallback) {
                            // Clipping path restricts the region where paint can be applied.
                            // see:  https://developer.mozilla.org/en-US/docs/Web/SVG/Element/clipPath
                            // This adds this HTML into <svg>:
                            //  <defs>
                            //     <clipPath id='clip'>
                            //         <rect width='910' height='390'> </rect>
                            //     </clipPath>
                            //  </defs>
                            // give the clippath a unique id which otherwise caused defect RGHT-5033
                            svg.append('defs')
                                .append('clipPath')
                                .attr('id', 'clip_' + scope.reportType)
                                .append('rect')
                                .attr('width', width)
                                .attr('height', focusAreaProperties.height);
                        }

                        // 'focus' variable is the container (<g> aka 'group') element for the top chart.
                        // adds <g transform='translate(40,10)'></g>
                        focus = svg.append('g')
                            .attr('class', 'graph-area')
                            .attr('transform', 'translate(' +
                                focusAreaProperties.margin.left + ',' +
                                focusAreaProperties.margin.top + ')');

                        // 'context' variable is the container (<g> aka 'group') element for the bottom chart that
                        // provides pan/zoom and viewport.
                        // adds <g transform='translate(40,430)'></g>
                        // note: 'translate()' means to move the SVG <g> element the x and y amount
                        // (to keep it in the proper spot)
                        context = svg.append('g')
                            .attr('class', 'date-range context')
                            .attr('transform', 'translate(' +
                                contextAreaProperties.margin.left + ',' +
                                contextAreaProperties.margin.top + ')');

                        // draw the x axis for upper graph
                        svg.append('line')
                            .attr('class', 'axes x')
                            .attr('x1', focusAreaProperties.x1)
                            .attr('x2', focusAreaProperties.x2)
                            .attr('y1', focusAreaProperties.y2)
                            .attr('y2', focusAreaProperties.y2);

                        // draw the y axis
                        focus.append('g')
                            .attr('class', 'axes y')
                            .call(focusAreaYAxis);

                        // x and y axis labels for upper graph
                        svg.append('text')
                            .attr('class', 'axis-label x')
                            .attr('text-anchor', 'middle').attr('x', width / 2)
                            .attr('y', (focusAreaProperties.height + focusAreaProperties.margin.top +
                                (isAllBucketDataVisible ?
                                    focusAreaProperties.margin.bottom - 5 : usePanAreaFallback ?
                                    focusAreaProperties.margin.bottom / 2 : focusAreaProperties.margin.bottom / 4)))
                            .attr('font-size', 14)
                            // the getMessage('code') did not get evaluted in the directive
                            // (in report_overview_template)
                            // once I included the template 'line_graph_template'.
                            // hence pass the code to the line graph directive
                            .text(Messages.getMessage(attrs.labelX));

                        svg.append('text')
                          .attr('class', 'axis-label y')
                          .attr('text-anchor', 'middle')
                          .attr('x', -focusAreaProperties.height / 2)
                          .attr('y', focusAreaProperties.margin.top)
                          .attr('transform', 'rotate(-90)')
                          .attr('font-size', 14)
                          .text(Messages.getMessage(attrs.labelY));

                        // This function generates an array that contains assessments that were completed on the same
                        // day, called a 'group'. It calculates the X-axis position which it adds to each data point
                        // (assessment) as a new field called 'displayAt'.
                        groupFn = function(buckets) {
                            var totalDots = 0,
                                dotXSpacing;

                            // The metaGroups data structure is an array with three fields in it...
                            //  metaGroups[0] is an array of dates (as strings), 1 unique date for all the dates
                            //  of the assessments. metaGroups[1]['datestr'] contains a total number of assessments
                            //  in each group.  It is incremented as the data is read.
                            //  metaGroups[2]['datestr'] contains an array of X-axis positions for the group
                            //  (note the groups can have a single assessment).  This is useful for positioning
                            //  the X-axis tick mark in the middle of the group.
                            // TODO Change metaGroups to be a map for clarity:
                            //  metaGroups = { dates: [], assessments: {}, positions: {} }
                            metaGroups = [[], {}, {}];
                            // loop through all the buckets grouping the data in all of them,
                            // also count the total number
                            // of dots so we can figure out the inter-dot spacing.
                            angular.forEach(buckets, function(bucket) {
                                var data = bucket.data;
                                // calculate number of groups and dots in each group
                                angular.forEach(data, function(d) {
                                    // note - for the array index lookup to work,
                                    // the date (d.x) must be in String object
                                    // and not a Date object
                                    if ($.inArray(d.x, metaGroups[0]) < 0) {
                                        metaGroups[0].push(d.x);
                                        metaGroups[1][d.x] = 1;
                                    } else {
                                        metaGroups[1][d.x]++;
                                    }
                                    totalDots += 1;
                                });
                            });

                            metaGroups[0] = _.sortBy(metaGroups[0], function(date) { return new Date(date);});

                            // if there are more dots than the available graph width,
                            // set the horizontal spacing to a minimum of 1px,
                            // otherwise, space the dots evenly throughout the available width.
                            // Use 'floor' to prevent dots from pushing out against rightmost edge of graph.
                            dotXSpacing = (totalDots >= width - 1) ? 1 : Math.floor(width / totalDots);

                            var offsetToStartOfGroup = function(pointDate) {
                                // Count how many dots (from other lines) are to the left of the first dot for this line
                                // so we can determine where the starting dot is for this line.
                                var offsetToStart = 0;
                                angular.forEach(metaGroups[0], function(metaDate) {
                                    if (new Date(metaDate).isBefore(new Date(pointDate))) { //Compare date, not string
                                        // offset by the number of dots in this group
                                        offsetToStart += metaGroups[1][metaDate] * dotXSpacing;
                                    }
                                });
                                // Check if there are already existing points drawn for this group from a previous line.
                                // If so, this start point will be to the right of the right-most existing point.
                                if (metaGroups[2][pointDate]) {
                                    offsetToStart += metaGroups[2][pointDate].length * dotXSpacing;
                                }
                                return offsetToStart;
                            };

                            angular.forEach(buckets, function(bucket) {
                                var data = bucket.data,
                                    currentDate, xPos;

                                angular.forEach(data, function(d, i) {
                                    if (i === 0) {
                                        // this is the first dot for the bucket
                                        xPos = offsetToStartOfGroup(data[i].x);
                                        currentDate = data[0].x;
                                    } else {
                                        // this is not the first dot for the bucket.
                                        // if we're in a new date, calculate the offset to start of group
                                        if (currentDate !== data[i].x) {
                                            xPos = offsetToStartOfGroup(data[i].x);
                                            currentDate = data[i].x;
                                        }
                                    }
                                    data[i].displayAt = xPos;
                                    // add this location to array, we'll avg these later for the tick mark
                                    if (metaGroups[2][d.x]) {
                                        metaGroups[2][d.x].push(xPos);
                                    } else {
                                        metaGroups[2][d.x] = [xPos];
                                    }
                                    // shift position for next dot
                                    xPos += dotXSpacing;
                                });
                                bucket.data = data;
                            });
                            return buckets;
                        };

                        updateFn(data);

                        $(element).removeAttr('tabindex');
                        if (allowKeyboardNavigation()) {
                            // conditionally set the tabindex on the element since we always redraw the graph
                            $(element).attr('tabindex', 0);
                            navigatePanAreaWithKeyboard();
                        }
                    };

                    updateFn = function() {
                        // clear graph
                        svg.selectAll('.points').remove();

                        if (!isAllBucketDataVisible) {
                            if (!usePanAreaFallback) {
                                // we create the pan zoom area each time data updates because all the components of this
                                // section needs is based on the data and hence dynamic
                                createPanArea();
                            } else {
                                updateGraphUsingDataInViewport();
                            }
                        } else {
                            updateGraphUsingDataInViewport();
                        }

                        // Unlike the upper graph's X axis labels which we draw manually,
                        // the lower graph's X labels are drawn by SVG.
                        // Here we're just going to rotate them.
                        // transform: slightly slant the tick labels on lower graph
                        //   to avoid overlapping when they are close together
                        svg.selectAll('.contextArea .axes.x text')
                            .attr('class', 'rule ruleX')
                            .attr('transform', function() {
                                return 'translate(5,10)rotate(' + TEXT_ROTATION_ANGLE + ')';
                            });
                    };

                    scope.$watch('start + end', function() {
                        // redraw the graph when the date filter changes. It is possble that no new data was returned
                        // for the new date filter and hence the below watch on 'data' won't be invoked.
                        // The downfall of doing this watch is that the same graph will be redrawn twice
                        // if the data changes
                        draw();
                    });

                    scope.$watch('data', function() {
                        // call draw each time the data updates because the graph
                        // area properties are dependend on the
                        // amount of data for example, we use a different height
                        // depending on whether we have to show pan zoom area
                        $log.debug('line graph updated data received');
                        draw();
                    });

                    scope.$on('graph-resized', function($event, args) {
                        setGraphProperties(args.width);
                        draw();
                    });

                    scope.$on('$destroy', function() {

                    });

                    function getNewDateWithTimeOffset(timeIntervalType, offset, baseDate) {
                        var newDate;
                        switch (timeIntervalType) {
                            case TIME_INTERVAL.DAY:
                                newDate = baseDate.clone().addDays (offset);
                                break;
                            case TIME_INTERVAL.WEEK:
                                newDate = baseDate.clone().addWeeks (offset);
                                break;
                            default:
                                $log.error('cant determine date based on offset', 'time interval type unknown',
                                    arguments);
                                break;
                        }
                        return newDate;
                    }

                    /**
                     * common code for clicking left arrow in pan area
                     * for IE8 and for left arrow key click by User in non IE8 browsers
                     * param viewportWidth - the viewport range
                     * param viewportWidthIntervalType - the unit of measure of the viewport range.
                     *       one of @see TIME_INTERVAL
                     *
                     * return true if the viewport will be allowed to pan
                     **/
                    panLeftCommonSteps = function(viewportWidth, viewportWidthIntervalType) {
                        var minDate = Date.parse(minMax[0].x);
                        if (Date.equals(minDate, viewportStartDate)) {
                            // return false because viewport is already at the leftmost edge of the graph
                            // and its position will not change
                            return false;
                        }
                        var nextViewportStartDate = getNewDateWithTimeOffset(
                                viewportWidthIntervalType,
                                (-1 * viewportWidth),
                                viewportStartDate
                            );
                        if (nextViewportStartDate.isBefore(minDate)) {
                            nextViewportStartDate = minDate;
                        }
                        viewportStartDate = nextViewportStartDate;

                        var maxDate = Date.parse(minMax[1].x);
                        var nextViewportEndDate = getNewDateWithTimeOffset(
                                viewportWidthIntervalType,
                                viewportWidth,
                                nextViewportStartDate
                            );
                        if (nextViewportEndDate.isAfter(maxDate)) {
                            nextViewportEndDate = maxDate;
                        }
                        viewportEndDate = nextViewportEndDate;

                        return true;
                    };

                    /**
                     * common code for clicking right arrow in pan area for IE8 and for
                     * right arrow key click by User in non IE8 browsers
                     *
                     * param viewportWidth - the viewport range
                     * param viewportWidthIntervalType - the unit of measure of the viewport range.
                     * one of @see TIME_INTERVAL
                     *
                     * return true if the viewport will be allowed to pan
                     **/
                    panRightCommonSteps = function(viewportWidth, viewportWidthIntervalType) {
                        var maxDate = Date.parse(minMax[1].x);
                        if (Date.equals(maxDate, viewportEndDate)) {
                            // return false because viewport is already at the rightmost edge of the graph
                            // and its position will not change
                            return false;
                        }
                        var nextViewportEndDate = getNewDateWithTimeOffset(
                                viewportWidthIntervalType,
                                viewportWidth,
                                viewportEndDate
                            );
                        if (nextViewportEndDate.isAfter(maxDate)) {
                            nextViewportEndDate = maxDate;
                        }
                        viewportEndDate = nextViewportEndDate;

                        var minDate = Date.parse(minMax[0].x);
                        var nextViewportStartDate = getNewDateWithTimeOffset(
                                viewportWidthIntervalType,
                                (-1 * viewportWidth),
                                nextViewportEndDate
                            );
                        if (nextViewportStartDate.isBefore(minDate)) {
                            nextViewportStartDate = minDate;
                        }
                        viewportStartDate = nextViewportStartDate;

                        return true;
                    };

                    // event handler for click event on left arrow
                    scope.panLeft = function(e) {
                        e.preventDefault();
                        e.stopPropagation();

                        if (panLeftCommonSteps(defaultViewPortWidthInWeeks, TIME_INTERVAL.WEEK)) {
                            updateGraphUsingDataInViewport();
                        }
                    };

                    // event handler for click event on right arrow
                    scope.panRight = function(e) {
                        e.preventDefault();
                        e.stopPropagation();

                        if (panRightCommonSteps(defaultViewPortWidthInWeeks, TIME_INTERVAL.WEEK)) {
                            updateGraphUsingDataInViewport();
                        }
                    };

                    scope.showA11yPanZoomInstruction = function() {
                        return !usePanAreaFallback && !isAllBucketDataVisible;
                    };

                    scope.usePanAreaFallback = function() {
                        return !isAllBucketDataVisible && usePanAreaFallback;
                    };

                    scope.showA11yPanZoomInstructions = function(e) {
                        e.preventDefault();
                        e.stopPropagation();

                        var modalScope = $rootScope.$new();
                        var closeModal = function() {
                            Modal.hideDialog();
                        };
                        modalScope.isDismissible = false;
                        modalScope.closeBtnClickHandler = closeModal;
                        Modal.simpleDialog(
                            'lineGraph.a11y.modal.title',
                            'lineGraph.a11y.modal.message',
                            {
                                OK: {
                                    title: 'global.action.button.ok',
                                    handler: closeModal,
                                    isDefault: true
                                }
                            },
                            {
                                id: 'lineGraphA11yInstructionModal'
                            }
                        );
                    };
                } // end link
            };
        }
    ]);
