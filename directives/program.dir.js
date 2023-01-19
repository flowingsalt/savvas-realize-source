angular.module('RealizeDirectives')
    .directive('programFilterBar', [
        '$rootScope',
        '$location',
        'webStorage',
        'Content',
        'ProgramService',
        'tableOfContentTelemetryService',
        '$currentUser',
        function($rootScope, $location, webStorage, Content, ProgramService, tableOfContentTelemetryService,
            $currentUser) {
            'use strict';

            return {
                replace: true,
                templateUrl: 'templates/partials/programFilterBar.html',
                controller: ['$scope', function($scope) {

                    // user view preferences and defaults
                    $scope.tocView = $rootScope.currentUser.getAttribute('programs.tocView') || 'thumbnail';

                    $scope.isLessonView = $location.path().indexOf('lesson') >= 0;

                    $scope.changeTocView = function(viewName) {
                        $rootScope.currentUser.setAttribute('programs.tocView', viewName);
                        $scope.tocView = viewName;
                    };

                    // show distance learning toggle button
                    var availableContentItems = $scope.isLessonView ? $scope.lessonContentItems :
                        ($scope.content && $scope.content.contentItems);
                    $scope.showDistanceLearning = function() {
                        return $currentUser.isTeacher && availableContentItems &&
                            Content.isDistanceLearningContent(availableContentItems);
                    };

                    // is distance learning toggle button enabled
                    var showDistanceLearningResourcesKey = 'showDistanceLearningResources';
                    $scope.showDistanceLearningResources = $scope.showDistanceLearning() &&
                        (webStorage.get(showDistanceLearningResourcesKey) || false);

                    // show distance learning zero state
                    $scope.showDistanceLearningErrorMessage = $scope.showDistanceLearningResources &&
                        availableContentItems.length === 0;

                    $scope.onShowDistanceLearningResourcesToggled = function() {
                        // update the toggle state
                        $scope.showDistanceLearningResources = !$scope.showDistanceLearningResources;
                        webStorage.add(showDistanceLearningResourcesKey, $scope.showDistanceLearningResources);

                        // update the content items based on toggle state
                        var originalContentItems = angular.copy(availableContentItems);
                        $scope.content.contentItems =
                            !$scope.showDistanceLearningResources ? originalContentItems :
                            ProgramService.filterDistanceLearningContent($scope.content.contentItems);

                        // update the error state
                        $scope.showDistanceLearningErrorMessage = $scope.showDistanceLearningResources &&
                            $scope.content.contentItems.length === 0;
                        if ($scope.isLessonView) {
                            $scope.$parent.showDistanceLearningErrorMessage = $scope.showDistanceLearningErrorMessage;
                            $scope.updateMultiSelectAssignbleItems();
                        }

                        // send telemetry
                        tableOfContentTelemetryService.onDistanceLearningToggle($scope.showDistanceLearningResources);
                    };
                }]
            };
        }
    ])

    //programContent is shared by the PROGRAMS and CENTERS tabs
    //for PROGRAMS tab specific fns, add it to content.program.js and/or content.tier.js
    //for CENTERS tab specific fns, add it to centers.tier.js
    .directive('programContent', [
        '$log',
        '$route',
        '$location',
        '$rootScope',
        '$currentUser',
        'AlertService',
        'Content',
        '$timeout',
        'webStorage',
        'TEACHER_RESOURCES_DRAWER',
        'MEDIA_TYPE',
        'rubricEventTracking',
        'telemetryUtilitiesService',
        'AssignmentUtil',
        'ProgramService',
        '$filter',
        'assessmentEventTrackingService',
        'ASSESSMENT_EVENT_TRACKING_CONSTANTS',
        'Assessment',
        'TELEMETRY_CONSTANTS',
        'addToPlaylistService',
        'PLAYLIST_CONSTANTS',
        'playlistTelemetryService',
        'featureManagementService',
        function($log, $route, $location, $rootScope, $currentUser, AlertService, Content, $timeout, webStorage,
                TEACHER_RESOURCES_DRAWER, MEDIA_TYPE, rubricEventTracking, telemetryUtilitiesService, AssignmentUtil,
                ProgramService, $filter, assessmentEventTrackingService, ASSESSMENT_EVENT_TRACKING_CONSTANTS,
                Assessment, TELEMETRY_CONSTANTS, addToPlaylistService, PLAYLIST_CONSTANTS,
                playlistTelemetryService, featureManagementService) {

            'use strict';

            return {
                replace: true,
                templateUrl: 'templates/views/program.html',
                controller: [
                    '$scope',
                    function($scope) {
                        //inherits $scope.customize, $scope.program, $scope.content from parent ctrl

                        // assignmentModal.alert.toggle is emited from assign modal to show/hide assign success message
                        $scope.alertDetails = AlertService.alerts[0];
                        $scope.alertIsSet = AlertService.alertIsSet();
                        $scope.contentItemTemplate = 'templates/partials/programContentItem.html';

                        var openKey = TEACHER_RESOURCES_DRAWER + $scope.currentUser.userId,
                            timer = $timeout(function() {
                                    var shouldOpen = webStorage.get(openKey),
                                        content = $scope.content,
                                        hasContentItems = content && !_.isEmpty(content.contentItems),
                                        hasTeacherSupport = content && !_.isEmpty(content.associatedTeacherSupport) &&
                                            !_.isEmpty(content.associatedTeacherSupport.contentItems);

                                    if (shouldOpen && hasContentItems && hasTeacherSupport) {
                                        $scope.sidebarOpen = shouldOpen;
                                    }
                                }
                            );
                        var originalItemId = webStorage.get('originalItemId');
                        if ($scope.showDistanceLearningResources) {
                            $scope.content.contentItems = ProgramService
                                .filterDistanceLearningContent($scope.content.contentItems);
                        }
                        webStorage.remove('originalItemId');
                        if (originalItemId && $scope.content) {
                            var items = $filter('filter')($scope.content.contentItems, function(content) {
                                return content.id === originalItemId;
                            });
                            if (items && items.length > 0) {
                                var item = items[0];
                                var cache = false;
                                Content.getCustomisedVersions(item, cache)
                                    .then(function(data) {
                                        if (data && data.length > 0) {
                                            $scope.content.contentItems = ProgramService
                                                .addCustomisedItemstoList(data, item.id,
                                                    $scope.content.contentItems);
                                        }
                                    });
                            }
                        }
                        $scope.inCentersTab = $location.path().indexOf('centers') >= 0;
                        $scope.showExternalTocViewer = function() {
                            return featureManagementService.isExternalTOCViewerEnabled() && !$scope.inCentersTab;
                        };

                        $scope.$watch('sidebarOpen', function(isOpen) {
                            if (!angular.isDefined(isOpen)) {
                                return;
                            }

                            webStorage.add(openKey, isOpen);
                        });

                        $scope.$on('assignmentModal.alert.toggle', function(e, args) {
                            if (args.show) {
                                $scope.alertDetails = AlertService.alerts[0];
                                $scope.alertIsSet = AlertService.alertIsSet();
                            } else {
                                $scope.alertIsSet = false;
                            }
                        });

                        $scope.open = function(e, item) {
                            if (e) {
                                e.preventDefault();
                                e.stopPropagation();
                            }

                            // adjust reference if customized item is used
                            item = item.$getDefaultVersion();

                            var p = $location.path(),
                                target = 'content';

                            if (item.mediaType === 'Lesson') {
                                target = 'lesson';
                            }

                            if (item.mediaType === 'Tier') {
                                target = $location.path().indexOf('tier') < 0 ? 'tier' : 'tier2';
                            }

                            if (item.mediaType === 'Center') {
                                target = 'center';
                            }

                            if (item.mediaType === 'Adaptive Homework') {
                                target = 'adaptivehomework';
                            }

                            if (item.mediaType === MEDIA_TYPE.DISCUSSION_PROMPT) {
                                target = 'discussionprompt';
                            }

                            //NBC Learn path override
                            if (item.$isNbcItem()) {
                                p = ['/nbclearn/video', item.id, item.version].join('/');
                            } else {
                                p = [p, target, item.id, item.version].join('/');
                            }

                            if (item.isRubricViewSelected) {
                                $location.path(p).search('rubric', 'true');
                                postTelemetryEvent(item);
                            } else {
                                $location.path(p);
                            }

                            //at this point, we have associtiveProps since tier is in context of the parent
                            //store it at the rootScope, so it can be used when we GET tier item only
                            //on refresh this data is lost
                            $rootScope.openedItem = {
                                associativeProps: item.associativeProps,
                                id: item.id
                            };
                        };

                        $scope.hasRemediation = function(item) {
                            return item && item.$hasRemediation();
                        };

                        $scope.viewRemediation = function(item, event) {
                            var itemRoute;

                            event.stopPropagation();

                            itemRoute = Content.getRoute(item, $scope.program) + '/remediation';

                            $location.path(itemRoute);
                        };

                        $scope.showRubric = function(item, event) {
                            if (event) {
                                event.stopPropagation();
                            }
                            postTelemetryEvent(item);
                            $location.path(Content.getRoute(item, $scope.program)).search('rubric', 'true');
                        };

                        var postTelemetryEvent = function(item) {
                            if ($scope.productName) {
                                rubricEventTracking.clickOnRubricQuickLink(false, $scope.productName, item.externalId,
                                    item.title);
                            } else {
                                AssignmentUtil.getProgramHierarchy(item, item.id)
                                    .then(function(programHierarchy) {
                                        $scope.productName =
                                        telemetryUtilitiesService.getProgramTitle(programHierarchy);
                                        rubricEventTracking.clickOnRubricQuickLink(false, $scope.productName,
                                            item.externalId, item.title);
                                    });
                            }
                        };

                        $scope.hiddenContentFilter = function(item) {
                            // filter on: items hidden by teacher via customize || items flagged as hidden by editorial
                            if (Content.isHiddenViaCustomize(item) ||
                                (item.originalItem && Content.isHiddenViaCustomize(item.originalItem)) ||
                                ($scope.currentUser.isStudent && item.hideFromStudent)) {
                                return false;
                            }
                            return true;
                        };

                        $scope.hideCentersFromStudent = function(item) {
                            if ($scope.currentUser.isStudent && item.mediaType === 'Center') {
                                return false;
                            }

                            return true;
                        };

                        $scope.openMyContent = function() {
                            $location.path(Content.getRoute($scope.program) + '/myContent');
                        };

                        // temporary until we get the real counter working
                        $scope.myContentItemCount = 'X';

                        $scope.openLessonEdit = function(item, event) {
                            event.stopPropagation();
                            $rootScope.addItemSearchResults = false;
                            var path = $location.path();
                            var currentItem = item.$getDefaultVersion();
                            $location.path([path, 'lesson', currentItem.id, currentItem.version, 'edit'].join('/'));
                        };

                        $scope.activateAddToPlaylistModal = function($event, item) {
                            $event.stopPropagation();
                            var contentItemInfo = {
                                contentIdList: [item.id],
                                cssClass: PLAYLIST_CONSTANTS.CSS_CLASS.BROWSE_ALL,
                                contentTitle: item.title,
                                closeAction: function() {
                                    $event.currentTarget.querySelector('a').focus();
                                }
                            };
                            addToPlaylistService.invokeDefaultFlow(contentItemInfo);
                            playlistTelemetryService.onAddToPlaylistLessonQuicklink($scope.program.title);
                        };

                        $scope.hasTierAndLesson = function(item) {
                            return item.$isLesson() || item.isTier();
                        };

                        // can the logged-in user edit assessments
                        $scope.canUserEditAssessment = $scope.currentUser.hasRole('ROLE_TEACHER');

                        $scope.getVersionInProgress = false;

                        var sendAssessmentTelemetryEvents = function(item, isExpand) {
                            Assessment.getCustomizedVersionCount(item.id)
                                .then(function(count) {
                                    var extensionKeys = {
                                        id: isExpand ? ASSESSMENT_EVENT_TRACKING_CONSTANTS.CLOSE :
                                            ASSESSMENT_EVENT_TRACKING_CONSTANTS.OPEN,
                                        area: TELEMETRY_CONSTANTS.EVENT_TYPE.PROGRAMS,
                                        page: $scope.tocView === 'list' ?
                                            TELEMETRY_CONSTANTS.EVENT_TYPE.TABLE_OF_CONTENTS :
                                            TELEMETRY_CONSTANTS.EVENT_TYPE.TABLE_OF_CONTENTS_THUMBNAIL_VIEW,
                                        product: $scope.program.title,
                                        name: ASSESSMENT_EVENT_TRACKING_CONSTANTS.NAME.ASSESSMENT_VERSIONS_BUTTON,
                                        description: item.$getTitle(),
                                        value: count
                                    };
                                    assessmentEventTrackingService.sendTelemetryEvents(extensionKeys);
                                });
                        };

                        $scope.viewCustomisedVersions = function(item, event) {
                            // close more dropddown after clicking versions link from popup
                            var parentDropdownNode = angular.element(event.currentTarget.parentNode.parentNode);
                            if (parentDropdownNode.hasClass('quick-list-dropdown-trigger')) {
                                parentDropdownNode.find('.dropdown-toggle')[0].click();
                            }
                            event.stopPropagation();
                            if ($scope.getVersionInProgress) {
                                return;
                            }
                            if (item.showCustomisedVersions) {
                                $scope.getVersionInProgress = true;
                                $scope.content.contentItems =
                                    ProgramService.removeCustomisedItemsfromList(item, $scope.content.contentItems);
                                $scope.getVersionInProgress = false;
                                var isExpand = true;
                                sendAssessmentTelemetryEvents(item, isExpand);
                            } else {
                                $scope.getVersionInProgress = true;
                                Content.getCustomisedVersions(item, false)
                                    .then(function(data) {
                                        $scope.getVersionInProgress = false;
                                        if (data && data.length > 0) {
                                            $scope.content.contentItems = ProgramService
                                                .addCustomisedItemstoList(data, item.id, $scope.content.contentItems);
                                            var isExpand = false;
                                            sendAssessmentTelemetryEvents(item, isExpand);
                                        }
                                    });
                            }
                        };

                        $scope.$on('$destroy', function destroy() {
                            $timeout.cancel(timer);
                        });
                    }
                ]
            };
        }
    ])

    .directive('programView',
        function() {
            'use strict';

            return {
                template: '<div program-filter-bar></div><div program-content></div>'
            };
        }
    );
