angular.module('RealizeDirectives')
    .directive('reportOverview', [
        '$rootScope',
        '$log',
        '$location',
        '$timeout',
        'Modal',
        '$window',
        'Messages',
        'Analytics',
        'COLORS',
        'ROOT_PATH',
        'BrowserInfo',
        'itemAnalysisUtilities',
        'ASSIGNMENT_CONSTANTS',
        'locationUtilService',
        'featureManagementService',
         function($rootScope, $log, $location, $timeout, Modal, $window, Messages, Analytics,
            Colors, ROOT_PATH, BrowserInfo, itemAnalysisUtilities, ASSIGNMENT_CONSTANTS, locationUtilService,
            featureManagementService
             ) {
            'use strict';

            function setGraphType(scope) {
                if (!scope.data) { return; }
                // the portrait mode if ipad can display only 11 bars and each item falls on a different date
                if ((angular.element($window).width() >= 980 && scope.data.length <= 18) ||
                    (angular.element($window).width() < 980 && scope.data.length <= 11)) {

                    scope.graphType = 'bar';
                } else {
                    scope.graphType = 'line';
                }
            }

            function setGraphInfo(scope, scorableField, xCoordinate, yCoordinate) {
                var i, average, data = scope.data;

                if (angular.isDefined(scorableField)) {
                    average = 0;
                    if (0 < data.length) {
                        for (i = 0; i < data.length; i++) {
                            average += data[i][scorableField];
                        }
                        if (scope.reportType === 'mastery') {
                            var multiStageAssignments = data.filter(function(item) {
                                return item.assignmentType.toUpperCase() ===
                                    ASSIGNMENT_CONSTANTS.ASSIGNMENT_TYPE.MULTISTAGE;
                            });
                            if (data.length !== multiStageAssignments.length) {
                                average /= data.length - multiStageAssignments.length;
                            }
                        } else {
                            average /= data.length;
                        }
                        scope.average = average;
                    }
                }
                setGraphType(scope);

                angular.forEach(scope.data, function(report, key) {
                    this[key].x = report[xCoordinate];
                    this[key].y = report[yCoordinate] !== null ? report[yCoordinate] :
                        (report.sumOfQuestionAnsweredCorrect / report.sumOfTotalQuestions) * 100;
                }, scope.data);
            }

            /**
             * Display data item info represented by a bar in the graph
             */
            function displayGraphInfo(scope, data, titleField, scorableField) {
                scope.$applyAsync(function() {
                    scope.hoverTitle = data[titleField];
                    // the report data obtained in services/report.js converts assignment due date into
                    //    string format 'mm/dd/yyyy'
                    scope.hoverAssignmentDueDate = data.assignmentDueDate;
                    if (scope.reportType === 'mastery') {
                        if (data.assignmentType.toUpperCase() === ASSIGNMENT_CONSTANTS.ASSIGNMENT_TYPE.MULTISTAGE) {
                            scope.hoverScore = '-';
                        } else {
                            scope.hoverScore = data[scorableField] + '%';
                        }
                    } else {
                        scope.hoverScore = data[scorableField];
                    }
                    scope.hoverData = data;
                    scope.showGraphInfo = true;
                });
            }

            function hideGraphInfo(scope) {
                if (!scope) { return; }
                scope.$applyAsync(function() {
                    scope.showGraphInfo = false;
                });
            }

            return {
                replace: true,
                scope: {
                    reportData: '=',
                    filterData: '='
                },
                templateUrl: 'templates/partials/report_overview_template.html',
                link: function(scope, element, attrs) {
                    // 'dataDiscriminatorKey' is a field in the json array which, if present, can be used to group data
                    //    elements based on a value
                    // e.g. assessments having mastery and assessments not having mastery
                    // if 'dataDiscriminatorKey' is present then we specify graph display attributes for each group of
                    //    data
                    var dataDiscriminatorKey,
                        dataDiscriminatorValues,
                        barGraphDisplayProperties,
                        lineGraphDisplayProperties,
                        customVarsByPercentage,
                        reloadData,
                        setGraphDates,
                        resize,
                        resizeHandler,
                        jqWindow = angular.element($window);

                    scope.reportType = attrs.type;
                    scope.data = null;
                    scope.getMessage = Messages.getMessage;

                    // the length of assessment/assignment title to display after which ellipses will be appended
                    scope.assetTitleCutoffLen = 62;

                    // TODO use these shared properties for graphs
                    scope.graphAreaProperties = {
                        width: 700,
                        height: 220,
                        margins: {
                            left: 50,
                            bottom: 50,
                            right: 20,
                            top: 10
                        }
                    };

                    /**
                     * Navigate to the path that is passed into the method
                     * @param  {string} path String containing the path that the view should navigate to
                     */
                    scope.gotoPath = function(path) {
                        if (locationUtilService.isDeeplinkDataTabActive()) {
                            var programUrl = featureManagementService.isShowBrowseTopnavEnabled() ?
                                '/dashboard/program' : '/community/program';
                            $window.parent.location.href = $window.location.protocol +
                                '//' + $window.location.hostname + programUrl;
                        } else {
                            $location.path(path);
                            $location.search({});
                        }
                    };

                    scope.setAverage = function(average) {
                        scope.average = average;
                    };

                    // receive event from line graph when viewport changes and the updated average should be displayed
                    scope.$on('reportAverageUpdated', function(evt, data) {
                        if (scope.reportType !== data.reportType) {
                            return;
                        }
                        var newAverage = data.updatedAverage;
                        newAverage = Math.round(newAverage * 100) / 100;
                        $timeout(function() {
                            scope.setAverage(newAverage);
                        }, 100);
                    });

                    function getAssignmentPath (givenPath, index) {
                        var filterStartDate = scope.filterData.startDate.replace(/\//g, '-'),
                            filterEndDate = scope.filterData.endDate.replace(/\//g, '-'),
                            path = ROOT_PATH + [
                                $location.path(), givenPath,
                                filterStartDate, filterEndDate, index
                            ].join('/'),
                            search = $location.search();

                        if (search) { path = path + '?' + $.param(search); }

                        return path;
                    }

                    function getMasteryPath(data) {
                        if (data.assignmentType.toUpperCase() === ASSIGNMENT_CONSTANTS.ASSIGNMENT_TYPE.MULTISTAGE) {
                            $location.path(
                                $location.path() +
                                [
                                    '/assignment', data.assignmentId, 'item', data.itemId, data.itemVersion
                                ].join('/')
                            );
                        } else {
                            // In the date filter, replace the slashes / with dashes - for the URL.

                            var filterStartDate = scope.filterData.startDate.replace(/\//g, '-'),
                            filterEndDate = scope.filterData.endDate.replace(/\//g, '-');
                            $location.path(
                                $location.path() +
                                [
                                    '/assignment', data.assignmentId, 'recap', data.assessmentId,
                                    'student', filterStartDate, filterEndDate, data.index
                                ].join('/')
                            );
                        }
                    }

                    switch (scope.reportType) {
                        case 'mastery':
                            scope.displayGraphInfo = function(data) {
                                displayGraphInfo(scope, data, 'assessmentTitle', 'percentScore');
                            };

                            scope.hideGraphInfo = function() {
                                hideGraphInfo(scope);
                            };

                            scope.goToAssignment = function(data) {
                                scope.$applyAsync(function() {
                                    // In the date filter, replace the slashes / with dashes - for the URL.

                                    Analytics.track('track.action', {category: 'Data', action: 'Mastery drilldown'});
                                    itemAnalysisUtilities.onScoresDrilldown(data.programHierarchy, data.percentScore);
                                    getMasteryPath(data);
                                });
                            };

                            scope.getAssignmentLink = function(data) {
                                return getAssignmentPath([
                                        'assignment', data.assignmentId,
                                        'recap', data.assessmentId, 'student'
                                    ].join('/'), data.index);
                            };

                            dataDiscriminatorKey = 'masterable';
                            barGraphDisplayProperties = {
                                'false': {
                                    'strokeColor': Colors.BLACK,
                                    'strokeWidth': 1
                                },
                                'true': {
                                    'strokeColor': Colors.BLACK,
                                    'strokeWidth': 1
                                }
                            };

                            break;
                        case 'progress':
                            scope.displayGraphInfo = function(data) {
                                displayGraphInfo(scope, data, 'assignmentTitle', 'percentProgress');
                            };

                            scope.hideGraphInfo = function() {
                                hideGraphInfo(scope);
                            };

                            scope.goToAssignment = function(data, index) {
                                scope.$applyAsync(function() {
                                    // In the date filter, replace the slashes / with dashes - for the URL.

                                    Analytics.track('track.action', {category: 'Data', action: 'Progress drilldown'});

                                    var filterStartDate = scope.filterData.startDate.replace(/\//g, '-'),
                                    filterEndDate = scope.filterData.endDate.replace(/\//g, '-');
                                    $location.path($location.path() + [
                                        '/assignment', data.assignmentId, 'progress/recap',
                                        filterStartDate, filterEndDate, index
                                    ].join('/'));
                                });
                            };

                            scope.getAssignmentLink = function(data, index) {
                                return getAssignmentPath([
                                        'assignment', data.assignmentId,
                                        'progress/recap'
                                    ].join('/'), index);
                            };

                            break;
                        case 'usage':
                            scope.displayGraphInfo = function(data) {
                                displayGraphInfo(scope, data, 'assignmentTitle', 'minutes', 'timeout');
                            };

                            scope.hideGraphInfo = function() {
                                hideGraphInfo(scope);
                            };

                            scope.goToAssignment = function(data, index) {
                                scope.$applyAsync(function() {
                                    // In the date filter, replace the slashes / with dashes - for the URL.

                                    Analytics.track('track.action', {category: 'Data', action: 'Usage drilldown'});

                                    var filterStartDate = scope.filterData.startDate.replace(/\//g, '-'),
                                    filterEndDate = scope.filterData.endDate.replace(/\//g, '-');
                                    $location.path($location.path() + [
                                        '/assignment', data.assignmentId, 'usage/recap',
                                        filterStartDate, filterEndDate, index
                                    ].join('/'));
                                });
                            };

                            scope.getAssignmentLink = function(data, index) {
                                return getAssignmentPath([
                                        'assignment', data.assignmentId, 'usage/recap'
                                    ].join('/'), index);
                            };

                            break;
                        case 'studentAssessment':
                            scope.displayGraphInfo = function(data) {
                                displayGraphInfo(scope, data, 'assessmentTitle', 'percentScore');
                            };

                            scope.hideGraphInfo = function() {
                                hideGraphInfo(scope);
                            };

                            scope.goToAssignment = function(data, index) {
                                scope.$applyAsync(function() {

                                    Analytics.track('track.action', {category: 'Grades', action: 'Mastery drilldown'});

                                    var filterStartDate = scope.filterData.startDate.replace(/\//g, '-'),
                                    filterEndDate = scope.filterData.endDate.replace(/\//g, '-');
                                    $location.path([
                                        $location.path(), 'assignment', data.assignmentId,
                                        'assessments', data.assessmentSessionId,
                                        filterStartDate, filterEndDate, index
                                    ].join('/'));
                                });
                            };

                            scope.getAssignmentLink = function(data, index) {
                                return getAssignmentPath([
                                        'assignment', data.assignmentId,
                                        'assessments', data.assessmentSessionId
                                    ].join('/'), index);
                            };

                            // identify tests with and without mastery
                            dataDiscriminatorKey = 'masterable';
                            dataDiscriminatorValues = [true, false];

                            barGraphDisplayProperties = {
                                // the css styles (and colors for IE8) for a bar representing item having mastery false
                                'false': {
                                    'fillType': 'striped',
                                    'strokeColor': Colors.BLUE_DARK,
                                    'strokeWidth': 3
                                }
                                // use the default styles for bars representing items having mastery equal to true
                            };

                            lineGraphDisplayProperties = {
                                // the css styles for line representing items having mastery equal to false
                                'false': {
                                    'type': 'mastery',
                                    'stroke': '10,5' // <dash length>, <spacing length>
                                }
                                // use default styles for line representing mastery equal to true
                            };
                            if (BrowserInfo.browser.isIE && BrowserInfo.browser.version === 8) {
                                // raphael style for ie 8 to show dashed line
                                lineGraphDisplayProperties['false'].stroke = '-';
                            }
                            break;
                        case 'studentProgress':
                            scope.goToStudentProgressDetail = function(data) {
                                scope.$applyAsync(function() {
                                    if (data.numberOfItemsInCategory === 0) {
                                        Modal.simpleDialog(
                                                'grades.overview.progress.zeroStateModal.title',
                                                'grades.overview.progress.zeroStateModal.content',
                                                null,
                                                { id: 'studentProgressZeroCountModal' });
                                    } else {
                                        // In the date filter, replace the slashes / with dashes - for the URL.

                                        var status = {
                                                assignmentsCompletedOnTime:   'Completed On Time',
                                                assignmentsCompletedPastDue:  'Completed Past Due',
                                                assignmentsInProgress:        'In Progress',
                                                assignmentsNotStarted:        'Not Started'
                                            };

                                        Analytics.track('track.action', {
                                            category: 'Grades',
                                            action: 'Progress drilldown',
                                            label: status[data.categoryName]
                                        });

                                        var filterStartDate = scope.filterData.startDate.replace(/\//g, '-'),
                                        filterEndDate = scope.filterData.endDate.replace(/\//g, '-');
                                        $location.path([
                                            $location.path(), 'assignments', 'status',
                                            data.categoryName, filterStartDate, filterEndDate
                                        ].join('/'));
                                    }
                                });
                            };

                            scope.getAssignmentLink = function(data, index) {
                                return getAssignmentPath([
                                        'assignment', data.assignmentId,
                                        'assessments', data.assessmentSessionId
                                    ].join('/'), index);
                            };
                            // categories assignments based on the four progress statuses
                            dataDiscriminatorKey = 'categoryName';
                            dataDiscriminatorValues = [
                                'assignmentsCompletedOnTime',
                                'assignmentsCompletedPastDue',
                                'assignmentsInProgress',
                                'assignmentsNotStarted'
                            ];

                            barGraphDisplayProperties = {
                                'assignmentsCompletedOnTime': {
                                    'fillType': 'completed', // the css class for non-ie8
                                    'strokeColor': Colors.GREEN, // color for ie8
                                    'strokeColorOnHover': Colors.GREEN_DARK
                                },
                                'assignmentsCompletedPastDue': {
                                    'fillType': 'completed', // the css class for non-ie8
                                    'strokeColor': Colors.GREEN, // color for ie8
                                    'strokeColorOnHover': Colors.GREEN_DARK
                                },
                                'assignmentsNotStarted': {
                                    'fillType': 'notStarted', // the css class for non-ie8
                                    'strokeColor': Colors.RED_DARK, // color for ie8
                                    'strokeColorOnHover': Colors.RED_DARKER
                                },
                                'assignmentsInProgress': {
                                    'fillType': 'inProgress', // the css class for non-ie8
                                    'strokeColor': Colors.BLUE, // color for ie8
                                    'strokeColorOnHover': Colors.BLUE_DARKEST
                                }
                            };
                            break;
                    }

                    customVarsByPercentage = function(x) {
                        if (x >= 80) { return ['score-high', Colors.BLUE_LIGHT]; }
                        if (x >= 60) { return ['score-mid', Colors.YELLOW_LIGHT]; }
                        return ['score-low', Colors.RED_LIGHT];
                    };

                    reloadData = function() {
                        var dataBuckets = [];
                        scope.average = 0;

                        switch (scope.reportType) {
                            case 'mastery':
                                scope.data = scope.reportData.mastery;
                                if (scope.data && scope.data.length > 0) {
                                    angular.forEach(scope.data, function(d) {
                                        var percentScore = d.percentScore !== null ?
                                            d.percentScore :
                                            (d.sumOfQuestionAnsweredCorrect / d.sumOfTotalQuestions) * 100,
                                        customVars = customVarsByPercentage(percentScore);
                                        d.pointClass = customVars[0];
                                        d.pointHover = customVars[1];
                                        d.pointStroke = d.pointHover;
                                        d.label = d.assignmentTitle;
                                    });
                                    setGraphInfo(scope, 'percentScore', 'assignmentDueDate', 'percentScore');
                                }
                                break;
                            case 'progress':
                                scope.data = scope.reportData.progress;
                                if (scope.data && scope.data.length > 0) {
                                    angular.forEach(scope.data, function(d) {
                                        var customVars = customVarsByPercentage(d.percentProgress);
                                        d.pointClass = customVars[0];
                                        d.pointHover = customVars[1];
                                        d.pointStroke = d.pointHover;
                                        d.label = d.assignmentTitle;
                                    });
                                    setGraphInfo(scope, 'percentProgress', 'assignmentDueDate', 'percentProgress');
                                }
                                break;
                            case 'usage':
                                var data = scope.reportData.usage,
                                    highestUsage,
                                    vals,
                                    max = 180,
                                    min = 5;
                                scope.data = data;
                                if (data && data.length > 0) {
                                    angular.forEach(scope.data, function(d) {
                                        d.label = d.assignmentTitle;
                                        d.minutes = (d.averageUse / 60000);
                                        if (d.minutes < 0) { d.minutes = 0; }
                                        if (d.timeout) {
                                            d.pointClass = 'timeout';
                                        }
                                    });

                                    vals = _.pluck(data, 'minutes');
                                    highestUsage = _.max(vals);

                                    scope.maxY = ((highestUsage > max) ? max : (highestUsage > min) ?
                                        highestUsage : min);

                                    setGraphInfo(scope, 'minutes', 'assignmentDueDate', 'minutes');
                                }
                                break;
                            case 'studentAssessment':
                                scope.data = scope.reportData.studentAssessment;
                                //$log.debug('student-assessment data ' + scope.reportData.test);
                                if (scope.data && scope.data.length > 0) {
                                    setGraphInfo(scope, 'percentScore', 'assignmentDueDate', 'percentScore');
                                }
                                break;
                            case 'studentProgress':
                                if (angular.isObject(scope.reportData.studentProgress)) {
                                    scope.data = [];
                                    angular.forEach(scope.reportData.studentProgress,
                                        function(categoryCount, categoryName) {
                                            var item = {};
                                            //categoryName is the discriminator value e.g. assignmentsCompletedOnTime
                                            item.numberOfItemsInCategory = categoryCount;
                                            item.categoryName = categoryName;
                                            item.categoryLocaleKey = 'grades.overview.progress.categoryNames.' +
                                                categoryName;
                                            scope.data.push(item);
                                        }
                                    );
                                    // there is no average to show, set the x and y coordinates of the graph
                                    setGraphInfo(scope, null, 'categoryLocaleKey', 'numberOfItemsInCategory');

                                    // the number of completed assignments...note using the scope variable 'average'
                                    //    rather than creating a new one to avoid an if-else in the template :)
                                    scope.average = scope.reportData.studentProgress.assignmentsCompletedOnTime +
                                        scope.reportData.studentProgress.assignmentsCompletedPastDue;
                                }
                                break;
                        }

                        var isDiscriminatorKeyDefined = angular.isDefined(dataDiscriminatorKey);

                        /* note - we set the display properties for both bar and line graphs irrespective of which type
                         * of graph would be displayed to handle responsive design where the graph display could change
                         * from bar to line or vice-versa and we want corresponding display data to be available when
                         * the switch happens create data buckets for line graph
                         */
                        if (angular.isDefined(dataDiscriminatorKey) && angular.isObject(lineGraphDisplayProperties)) {
                            // for line graph divide the data into buckets.
                            // The data from each bucket is used to draw one line graph
                            angular.forEach(dataDiscriminatorValues, function(dataDiscriminatorValue) {
                                var dataBucket = {
                                    'value': dataDiscriminatorValue,
                                    'key': dataDiscriminatorKey,
                                    data: []
                                };

                                dataBucket.data =  $.Enumerable.From(scope.data).Where(function(item) {
                                    return (item[dataDiscriminatorKey] === dataDiscriminatorValue);
                                }).ToArray();
                                if (dataBucket.data.length !== 0) {
                                    dataBuckets.push(dataBucket);
                                    dataBucket.lineGraphDisplayProperties =
                                        lineGraphDisplayProperties[dataDiscriminatorValue];
                                }
                            });
                        } else {
                            dataBuckets[0] = {data: scope.data};
                        }
                        scope.dataBuckets = dataBuckets;

                        // set display properties for bar graph
                        angular.forEach(scope.data, function(item) {
                            if (isDiscriminatorKeyDefined &&  angular.isObject(barGraphDisplayProperties) &&
                                        angular.isObject(barGraphDisplayProperties[item[dataDiscriminatorKey]])) {
                                item.displayProperties = barGraphDisplayProperties[item[dataDiscriminatorKey]];
                            } else {
                                item.displayProperties = {};
                            }
                        });

                        if (scope.reportType !== 'usage' && scope.reportType !== 'studentProgress') {
                            scope.setAverage(scope.average);
                        } else if (scope.average === 0 && scope.reportType !== 'studentProgress') { //usage no data
                            scope.average = '00:00';
                        }

                        //$log.log('reportOverview.js  data', scope.reportType, scope.data);
                    };

                    // call it once to set default
                    reloadData();

                    setGraphDates = function() {
                        if (scope.filterData) {
                            scope.startDate = scope.filterData.startDate;
                            scope.endDate = scope.filterData.endDate;
                        }
                    };

                    scope.$watch('filterData.startDate + filterData.endDate', function() {
                        setGraphDates();
                    });

                    scope.$watch('reportData[\'' + scope.reportType + '\']', function() {
                        //$log.log('consumed data for ', scope.reportType);
                        reloadData();
                    });

                    resize = {lastComparison: null, target: 980};
                    resizeHandler = function($event) {
                        var comparison = $($event.target).width() > resize.target ? 'resize-greater' : 'resize-lesser';
                        if (comparison !== resize.lastComparison) {
                            resize.lastComparison = comparison;
                            resize.lastType = scope.graphType;

                            var graphWidth = (resize.lastComparison === 'resize-lesser') ? 450 : 700;

                            if (BrowserInfo.isIDevice) { //Kill the iOS 'hover' behavior on resize/orientation change
                                hideGraphInfo(scope);
                            }

                            // graph type may change
                            scope.$applyAsync(function() {
                                setGraphType(scope);
                            });

                            scope.$broadcast('graph-resized', { width: graphWidth });
                            $log.debug(
                                'graph resized graphWidth = ' + graphWidth + ', graphType = ' + scope.graphType
                            );
                        }
                    };
                    jqWindow.on('resize', resizeHandler);
                    scope.$on('$destroy', function() {
                        jqWindow.off('resize', resizeHandler);
                    });
                }
            };
        }
    ]);
