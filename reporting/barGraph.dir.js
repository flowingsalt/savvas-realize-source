angular.module('Realize.reporting.BarGraph', [
        'RealizeDataServices'
    ])
    .directive('barGraph', [
        '$log',
        'Messages',
        '$window',
        'KEY_CODES',
        'BrowserInfo',
        function($log, Messages, $window, KEY_CODES, BrowserInfo) {
            'use strict';

            var ONE_WEEK = 1000 * 60 * 60 * 24 * 7,
                ONE_DAY = ONE_WEEK / 7,
                tickLength = 5,
                BLUE = '#026ecb', // @blue from variables.less
                // properties for entire svg area
                graphArea,
                // properties of drawing area for graph
                properties;

            return {
                replace: true,
                scope: {
                    data: '=localData',
                    start: '=min',
                    end: '=max',
                    yMax: '=',
                    whenHover: '&',
                    whenHoverOut: '&',
                    whenClick: '&',
                    generateUrl: '=?'
                },
                link: function(scope, element, attrs) {
                    scope.getMessage = Messages.getMessage;

                    var svg,
                        graph,
                        yScale,
                        groupFn,
                        groups,
                        update,
                        yMax;

                    yMax = parseInt(scope.yMax, 10);

                    var setGraphProperties = function(graphWidth) {
                        $log.debug('bar graph set graphWidth ' + graphWidth);
                        graphArea = {
                            height: 220,
                            padding: {
                                bottom: 50,
                                left: 64,
                                right: 20,
                                top: 10
                            }
                        };

                        if (angular.isNumber(graphWidth)) {
                            graphArea.width = graphWidth;
                        } else {
                            graphArea.width = angular.element($window).width() < 980 ? 450 : 700;
                        }

                        properties = {
                            height: graphArea.height - graphArea.padding.bottom - graphArea.padding.top,
                            width: graphArea.width - graphArea.padding.left - graphArea.padding.right,
                            bar: {
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
                            x1: graphArea.padding.left,
                            y1: graphArea.padding.top,
                            xLabelFontSize: 14,
                            yLabelFontSize: 14
                        };

                        graphArea.transform = 'translate(' + graphArea.padding.left + ', ' +
                            graphArea.padding.top + ')';

                        // properties of drawing area for graph
                        properties.x2 = properties.x1 + properties.width;
                        properties.y2 = properties.y1 + properties.height;

                        // translate to account for padding (to accommodate labels)
                        // scale to invert y axis for cartesian coords
                        // note: this will warp text on the graph
                        properties.transform = 'translate(' + graphArea.padding.left + ', ' +
                            (graphArea.padding.top + properties.height) + ') scale(1,-1)';

                    };

                    var draw = function() {
                        element.empty();

                        // create svg element for graph area
                        svg = d3.select(element[0])
                            .append('svg')
                            .attr('width', graphArea.width)
                            .attr('height', graphArea.height)
                            .attr('class', 'svgGraph');

                        graph = svg.append('g')
                            .attr('transform', properties.transform)
                            .attr('class', 'bar-group');

                        // y axis scale
                        yScale = d3.scale.linear()
                            .domain([0, yMax])
                            .range([0, properties.height])
                            .clamp(true);

                        // draw axes
                        svg.append('line')
                            .attr('class', 'axes x')
                            .attr('x1', properties.x1)
                            .attr('x2', properties.x2)
                            .attr('y1', properties.y2)
                            .attr('y2', properties.y2);
                        svg.append('line')
                            .attr('class', 'axes y')
                            .attr('x1', properties.x1)
                            .attr('x2', properties.x1)
                            .attr('y1', properties.y1)
                            .attr('y2', properties.y2);

                        // x axis label
                        svg.append('text')
                            .attr('class', 'axis-label x')
                            .attr('text-anchor', 'middle')
                            .attr('x', graphArea.width / 2)
                            .attr('y', graphArea.height - properties.offset.y)
                            .attr('font-size', properties.xLabelFontSize)
                            .text(attrs.labelX);

                        // y axis label
                        svg.append('text')
                            .attr('class', 'axis-label y')
                            .attr('transform', properties.transform)
                            .attr('text-anchor', 'middle')
                            .attr('x', -graphArea.height / 2 + properties.offset.y)
                            .attr('y', properties.offset.y)
                            .attr('transform', 'rotate(-90)')
                            .attr('font-size', properties.yLabelFontSize)
                            .text(attrs.labelY);

                        var yAxis = d3.svg.axis()
                            .scale(d3.scale.linear()
                            .domain([0, yMax])
                            .range([properties.height, 0]))
                            .orient('left')
                            .ticks(parseInt(attrs.ticks, 10) || 1)
                            // DE23519  - generate 3 minor ticks
                            .tickSubdivide(parseInt(attrs.subTicks, 10) || 3)
                            .tickSize(6, 6, 0)
                            .tickFormat(function(d) { return d + attrs.ySuffix; });

                        svg.append('g')
                            .attr('class', 'axes y')
                            .attr('transform', graphArea.transform)
                            .call(yAxis);

                        /* draw bar groups */
                        groupFn = function(data) {
                            groups = [[], {}, {}];

                            // calculate number of groups and bars in each group
                            angular.forEach(data, function(d) {
                                // note - for the array index lookup to work,
                                // the date (d.x) must be in String object and not a Date object
                                if ($.inArray(d.x, groups[0]) < 0) {
                                    groups[0].push(d.x);
                                    groups[1][d.x] = 1;
                                } else {
                                    groups[1][d.x]++;
                                }
                            });

                            // calculate position of first bar
                            var xPos = (function() {
                                var daysToFirstBar = (new Date(data[0].x) - new Date(scope.start)) / ONE_DAY;

                                // if many bars, try to center on graph
                                return Math.max(
                                    properties.offset.x,
                                    Math.min(properties.offset.x * (daysToFirstBar + 1),
                                    (properties.width - (data.length * (properties.bar.width + properties.offset.x) +
                                        groups[0].length * properties.group.gap)) / 2)
                                );
                            }());

                            angular.forEach(data, function(d, i) {
                                data[i].displayAt = xPos;

                                // add this location to array, we'll avg these later for the tick mark
                                if (groups[2][d.x]) {
                                    groups[2][d.x].push(xPos + properties.bar.width / 2);
                                } else {
                                    groups[2][d.x] = [xPos + properties.bar.width / 2];
                                }
                                // shift position for next bar
                                xPos += properties.offset.x + properties.bar.width;

                                // add a gap between bar groups
                                if (--groups[1][d.x] === 0) {
                                    xPos += properties.group.gap;
                                }
                            });

                            return data;
                        };

                        // Let's draw bars
                        update = function(data) {
                            //Make sure data is order by date
                            data = _.sortBy(data, function(d) { return new Date(d.assignmentDueDate); });

                            // clear graph
                            element.find('.bar-group').empty();
                            element.find('.tickX,.ruleX').remove();

                            var pendingNavigation = false, //Prevent events being triggered before redirect
                                currentDataPoint; //mobile hover fix

                            var drawBars = graph.selectAll('path')
                               .data(groupFn(data))
                               .enter();

                            //Defining focus and on click functions
                            var focusIn = function(dataPoint) {
                                scope.whenHover({data: dataPoint});
                            };
                            var focusOut = function() {
                                if (!pendingNavigation) {
                                    scope.whenHoverOut();
                                    if (currentDataPoint) {
                                        currentDataPoint = undefined;
                                    }
                                }
                            };

                            var clickBar = function(dataPoint, index) {
                                d3.event.preventDefault();
                                d3.event.stopPropagation();
                                if (BrowserInfo.OS.isAndroid) {
                                    if (!currentDataPoint || currentDataPoint !== dataPoint) {
                                        currentDataPoint = dataPoint;
                                        focusIn(dataPoint);
                                        return;
                                    }
                                }
                                // IOS fix
                                if (BrowserInfo.OS.isIOS) {
                                    if (currentDataPoint === dataPoint) {
                                        focusIn(dataPoint);
                                        return;
                                    }
                                }
                                pendingNavigation = true;
                                scope.whenClick({data: dataPoint, index: index});
                            };

                            drawBars = drawBars.append('a') //Accessibility
                                .attr('class', 'bar-anchor')
                                .attr('focusable', true)
                                .attr('role', 'link')
                                .attr('aria-label', function(bar) {
                                    return bar.label;
                                })
                                .on('keydown', function(bar, index) {
                                    if (d3.event.keyCode === KEY_CODES.ENTER) {
                                        clickBar(bar, index);
                                    }
                                })
                                .on('focus', function(d) {
                                    focusIn(d);
                                })
                                .on('blur', function() {
                                    focusOut();
                                });

                            if (scope.generateUrl) {
                                drawBars.attr('xlink:href', function(bar, index) {
                                    return scope.generateUrl(bar, index);
                                });
                            }

                            if (scope.whenClick) {
                                drawBars.on('click', function(bar, index) {
                                    clickBar(bar, index);
                                });
                            }

                            // Really drawing the bars now
                            drawBars = drawBars.append('path')
                                .attr('class', function(d) {
                                    var classes = 'bar';
                                    if (angular.isString(d.pointClass)) {
                                        classes += ' ' + d.pointClass;
                                    }
                                    return classes;
                                })
                                .attr('fill-type', function(d) {
                                    if (angular.isString(d.displayProperties.fillType)) {
                                        return d.displayProperties.fillType;
                                    }
                                    // default
                                    return 'fill';
                                })
                                .attr('d', function(d) {

                                    var x0 = d.displayAt;
                                    var y0 = 0;
                                    var w = properties.bar.width;
                                    var h = (d.y === 0) ? 1.5 : yScale(d.y);
                                    return 'M' + x0 + ',' +
                                            y0 + ' L' + x0 + ',' +
                                            (y0 + h) + ' ' + (x0 + w) + ',' +
                                            (y0 + h) + ' ' + (x0 + w) + ',' +
                                            y0;
                                })
                                // raphael
                               .attr('stroke-width', function(d) {
                                    if (angular.isNumber(d.displayProperties.strokeWidth)) {
                                        return d.displayProperties.strokeWidth;
                                    }
                                    return 0;
                                })
                                .attr('stroke', function(d) {
                                    if (!d.pointStroke) { d.pointStroke = BLUE; }
                                    if (angular.isString(d.displayProperties.strokeColor)) {
                                        return d.displayProperties.strokeColor;
                                    }
                                    return d.pointStroke;
                                });
                            //Bind events
                            drawBars.on('mouseover', function(d) {
                                    focusIn(d);
                                })
                                .on('mouseout', function() {
                                    focusOut();
                                });

                            // X axis tick marks
                            svg.selectAll('.tickX')
                                .data(groups[0])
                                .enter().append('line')
                                .attr('transform', 'translate(' + graphArea.padding.left + ', 0)')
                                .attr('class', 'tick tickX')
                                .attr('y1', properties.y2)
                                .attr('y2', properties.y2 + tickLength)
                                .attr('x1', function(d) { return d3.mean(groups[2][d]); })
                                .attr('x2', function(d) { return d3.mean(groups[2][d]); });

                            svg.selectAll('.ruleX')
                                .data(groups[0])
                                .enter().append('text')
                                .attr('transform', 'translate(' + graphArea.padding.left + ', 0)')
                                .attr('class', 'rule ruleX')
                                .attr('y', properties.y2 + (properties.offset.y * 2))
                                .attr('x', function(d) {return d3.mean(groups[2][d]);})
                                .text(function(d) {return moment(d, 'MM/DD/YYYY').format('MMM DD').replace('.', '');});

                            var average = d3.mean(scope.data, function(d) { return d.y; });

                            // Finally draw the average line
                            graph.append('line')
                                .attr('class', 'averageLine')
                                .attr('x1', 0)
                                .attr('x2', properties.width)
                                .attr('y1', yScale(average))
                                .attr('y2', yScale(average));
                        };

                        //update only if there is scope.data.
                        //Sometimes update() function gets executed before
                        // retrieving assessment data so added below condition.
                        if (scope.data && scope.data.length) {
                            update(scope.data);
                        }
                    };
                    // initialize the graph based on window width available when the graph is rendered
                    setGraphProperties();
                    draw();

                    scope.$watch('data', function() {
                        if (scope.data && scope.data.length) {
                            update(scope.data);
                        }
                    });

                    scope.$watch('start + end', function() {
                        draw();
                    });

                    scope.$on('graph-resized', function($event, args) {
                        setGraphProperties(args.width);
                        draw();
                    });

                } //end link
            };
        }
    ]);
