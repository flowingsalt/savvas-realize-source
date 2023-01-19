angular.module('Realize.reporting.CategoryBarGraph', [
        'RealizeDataServices'
    ])
    .directive('categoryBarGraph', [
        '$log',
        'Messages',
        '$window',
        'COLORS',
        'KEY_CODES',
        function($log, Messages, $window, Colors, KEY_CODES) {
            'use strict';

            var svg, graphArea, properties;

            function drawYAxis(yScale, ySuffix, tickValues) {
                var yAxis =  d3.svg.axis()
                    .scale(yScale)
                    .orient('left')
                    .tickSize(6, 0)
                    .tickFormat(function(d) { return d + ySuffix; });

                if (angular.isArray(tickValues)) {
                    yAxis.tickValues(tickValues);
                }

                svg.append('g')
                    .attr('class', 'axes y')
                    .attr('transform', graphArea.transform)
                    .call(yAxis);

                return yAxis;
            }

            return {
                replace: true,
                scope: {
                    data: '=localData',
                    start: '=min',
                    end: '=max',
                    whenHover: '&',
                    whenHoverOut: '&',
                    whenClick: '&',
                    generateUrl:  '=?'
                },
                link: function(scope, element, attrs) {
                    scope.getMessage = Messages.getMessage;

                    var graph,
                        yScale, yAxis,
                        xScale, xAxis,
                        update;

                    var draw = function() {
                        $log.debug('in draw of category bar...' , scope.data);
                        // properties for entire svg area
                        graphArea = {
                            height: 220,
                            width: angular.element($window).width() < 980 ? 450 : 700,
                            padding: {
                                bottom: 50,
                                left: 50,
                                right: 20,
                                top: 10
                            }
                        };

                        // properties of drawing area for graph
                        properties = {
                            height: graphArea.height - graphArea.padding.bottom - graphArea.padding.top,
                            width: graphArea.width - graphArea.padding.left - graphArea.padding.right,
                            bar: {
                                width: 25,
                                gap: 2,
                                dy: 4
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

                        graphArea.transform = 'translate(' +
                            graphArea.padding.left + ', ' +
                            graphArea.padding.top + ')';

                        // properties of drawing area for graph
                        properties.x2 = properties.x1 + properties.width;
                        properties.y2 = properties.y1 + properties.height;

                        // translate to account for padding (to accommodate labels)
                        // scale to invert y axis for cartesian coords
                        // note: this will warp text on the graph
                        properties.transform = 'translate(' +
                            graphArea.padding.left + ', ' +
                            (graphArea.padding.top + properties.height) + ') scale(1,-1)';

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
                                .range([properties.height, 0]);

                        xScale = d3.scale.ordinal()
                            .rangeRoundBands([0, properties.width], 0.1);

                        yAxis = drawYAxis(yScale, attrs.ySuffix);

                        xAxis = d3.svg.axis()
                            .scale(xScale)
                            .orient('bottom');

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

                        var xAxisDrawn = false;

                        // Let's draw bars
                        update = function() {
                            $log.debug('in update of category bar');
                            // clear graph
                            element.find('.bar-group').empty();

                            var maxCategoryCount = d3.max(scope.data, function(d) {
                                return d.y;
                            });

                            if (maxCategoryCount > 100) {
                                maxCategoryCount = 100;
                            }
                            var increment, yMax;
                            if (maxCategoryCount <= 10) {
                                increment = 2;
                                yMax = 10;
                            } else if (maxCategoryCount <= 20) {
                                increment = 5;
                                yMax = 20;
                            } else if (maxCategoryCount <= 50) {
                                increment = 10;
                                yMax = 50;
                            } else {
                                increment = 20;
                                yMax = 100;
                            }

                            var tickValues = [], currentTick = 0;
                            while (currentTick <= yMax) {
                                tickValues.push(currentTick);
                                currentTick += increment;
                            }
                            $log.debug('tick values ' + tickValues + ', yMax = ' + yMax);

                            yScale.domain([0, yMax]);

                            // redraw y-axis to show the ticks.
                            // Note: I did try creating the ticks and labels manually.
                            // However, aligning the label next to the tick and
                            // adjusting the spacing from the y-axis felt like a pain
                            yAxis.tickValues(tickValues);
                            svg.select('.axes.y').call(yAxis);

                            // add class to yaxis tick labels
                            svg.selectAll('.axes.y g text')
                            .each(function() {
                                d3.select(this).attr('class', 'ruleY');
                            });

                            if (!xAxisDrawn) {
                                // draw the x-axis only after data is available to show the category names
                                xAxisDrawn = true;
                                xScale.domain(scope.data.map(function(d) {
                                    // the localized category names
                                    return Messages.getMessage(d.x);
                                }));

                                // sets major ticks to number of categories, minor ticks to 0, and end ticks to 0
                                xAxis.tickSize(scope.data.length, 0, 0);

                                svg.append('g')
                                    .attr('class', 'axes x ' + (graphArea.width === 450 ? 'small-font' : 'large-font'))
                                    .attr('transform', 'translate(' + graphArea.padding.left + ',' +
                                        (graphArea.padding.top + properties.height) + ')')
                                    .call(xAxis);
                            }

                            var pendingNavigation = false; //Prevent events being triggered before redirect

                            var drawBars = graph.selectAll('rect')
                               .data(scope.data)
                               .enter();

                            //Defining focus and on click functions
                            var focusIn = function(dataPoint) {
                                scope.whenHover({data: dataPoint});
                            };
                            var focusOut = function() {
                                if (!pendingNavigation) {
                                    scope.whenHoverOut();
                                }
                            };
                            var clickBar = function(dataPoint, index) {
                                d3.event.preventDefault();
                                d3.event.stopPropagation();
                                pendingNavigation = true;
                                scope.whenClick({data: dataPoint, index: index});
                            };

                            drawBars = drawBars.append('a') //Accessibility
                                .attr('class', 'bar-anchor')
                                .attr('focusable', true);
                            if (scope.generateUrl) {
                                drawBars.attr('xlink:href', function(bar, index) {
                                    return scope.generateUrl(bar, index);
                                });
                            }
                            drawBars.on('keydown', function(bar, index) {
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

                            // Really drawing the bars now
                            drawBars = drawBars.append('rect')
                                .attr('class', function(d) {
                                    return 'bar ' + d.categoryName;
                                })
                                .attr('fill-type', function(d) {
                                    if (angular.isString(d.displayProperties.fillType)) {
                                        return d.displayProperties.fillType;
                                    }
                                    // default
                                    return 'fill';
                                })
                                .attr('x', function(d) {
                                    // display category names on x-axis
                                    return xScale(d.x);
                                })
                                .attr('y', 0)
                                .attr('width', xScale.rangeBand())
                                .attr('height', function(d) {
                                    if (d.y > yMax) {
                                        d.y = yMax; // ie8 complains on hover of bar if d.y is greater than yMax
                                    }
                                    if (d.y === 0) {
                                        // since the y-scale is dynamic, we need to show a
                                        // bar with just enough height for the user to click
                                        return properties.y1 - 8;
                                    }
                                    return properties.height - yScale(d.y);
                                })
                                // raphael
                                .attr('stroke-width', function(d) {
                                    if (angular.isNumber(d.displayProperties.strokeWidth)) {
                                        return d.displayProperties.strokeWidth;
                                    }
                                    return 0;
                                })
                                .attr('stroke', function(d) {
                                    if (angular.isString(d.displayProperties.strokeColor)) {
                                        return d.displayProperties.strokeColor;
                                    }
                                    return Colors.BLUE;
                                })
                                .attr('title', function(d) {
                                    return d.categoryName;
                                });

                            // events
                            drawBars.on('mouseover', function(d) {
                                    $log.debug('on hover ', d.numberOfItemsInCategory);
                                    focusIn(d);
                                })
                                .on('mouseout', function() {
                                    focusOut();
                                })
                                .on('click', function(bar, index) {
                                    clickBar(bar, index);
                                });

                        };
                        if (scope.data && scope.data.length) {
                            update();
                        }
                    };

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
                        graphArea.width = args.width;
                        draw();
                    });

                } //end link
            };
        }
    ]);
