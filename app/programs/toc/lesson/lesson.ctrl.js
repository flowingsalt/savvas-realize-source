angular.module('RealizeApp')
    .controller('LessonCtrl', [
        '$scope',
        '$rootScope',
        '$routeParams',
        '$location',
        '$log',
        'MyContent',
        'Content',
        'LessonContent',
        'AlertService',
        'InlineAlertService',
        'webStorage',
        '$timeout',
        'TEACHER_RESOURCES_DRAWER',
        'MediaQuery',
        'MEDIA_TYPE',
        'lwcI18nFilter',
        'ContentSource',
        'rubricEventTracking',
        'telemetryUtilitiesService',
        'AssignmentUtil',
        'ProgramService',
        'assessmentEventTrackingService',
        'ASSESSMENT_EVENT_TRACKING_CONSTANTS',
        'Assessment',
        'TELEMETRY_CONSTANTS',
        '$filter',
        'addToPlaylistService',
        'playlistUtilService',
        'playlistTelemetryService',
        'PLAYLIST_CONSTANTS',
        'featureManagementService',
        'locationUtilService',
        'penpalService',
        function($scope, $rootScope, $routeParams, $location, $log, MyContent, Content, LessonContent, AlertService,
            InlineAlertService, webStorage, $timeout, TEACHER_RESOURCES_DRAWER, MediaQuery, MEDIA_TYPE, lwcI18nFilter,
            ContentSource, rubricEventTracking, telemetryUtilitiesService, AssignmentUtil, ProgramService,
            assessmentEventTrackingService, ASSESSMENT_EVENT_TRACKING_CONSTANTS, Assessment, TELEMETRY_CONSTANTS,
            $filter, addToPlaylistService, playlistUtilService, playlistTelemetryService, PLAYLIST_CONSTANTS,
            featureManagementService, locationUtilService, penpalService) {
            'use strict';
            var isMyLibraryPath = $location.path().search(PLAYLIST_CONSTANTS.ROUTE.MY_LIBRARY) !== -1;
            var isResourceListingPath = $location.path().search(PLAYLIST_CONSTANTS.ROUTE.RESOURCE_LISTING) !== -1;
            $scope.passCssClass = PLAYLIST_CONSTANTS.CSS_CLASS.BROWSE_ALL;

            $scope.stateLabels = {
                deselectAll: lwcI18nFilter('lesson.action.deselectAll'),
                selectAll: lwcI18nFilter('lesson.action.selectAll'),
                assignAll: lwcI18nFilter('lesson.action.assignAll'),
                assignSelected: lwcI18nFilter('lesson.action.assignSelected'),
                addAllToPlaylist: lwcI18nFilter('lesson.action.addAllToPlaylist'),
                addSelectedToPlaylist: lwcI18nFilter('lesson.action.addSelectedToPlaylist')
            };

            $scope.assignMultiple = TELEMETRY_CONSTANTS.LESSON_ASSET_MULTI_SELECT.SINGLE;
            $scope.multiSelect = {
                assignableItems: {},
                label: ''
            };
            $scope.multiSelect.masterSelected = false;
            $scope.multiSelect.previousMasterSelect = false;
            $scope.isAllItemsTeacherOnly = true;
            if (locationUtilService.isDeeplinkDataTabActive()) {
                $rootScope.hideFooter = true;
            }
            $scope.$on('$viewContentLoaded', function() {
                $timeout(function() {
                    if (locationUtilService.isDeeplinkDataTabActive()) {
                        var body = document.body,
                            html = document.documentElement;
                        var height = Math.max(body.scrollHeight, body.offsetHeight,
                            html.clientHeight, html.scrollHeight, html.offsetHeight);
                        var payload = { resize_height: height };
                        penpalService.connectToParent().then(function(connection) {
                            connection.parent.exec('RESIZE_PAGE', payload);
                        });
                    }
                }, 1000);
            });
            if (MyContent.getMultiSelectStatus()) {
                $scope.selectDeselect = MyContent.getMultiSelectStatus().label;
                $scope.assignLabelText = MyContent.getMultiSelectStatus().assignLabel;
                $scope.assignPlaylistLabel = MyContent.getMultiSelectStatus().assignPlaylistLabel;
            } else {
                $scope.selectDeselect = $scope.stateLabels.selectAll;
                $scope.assignLabelText = $scope.stateLabels.assignAll;
                $scope.assignPlaylistLabel = $scope.stateLabels.addAllToPlaylist;
            }

            if (angular.isDefined($routeParams.programId)) {
                $scope.program = $rootScope.currentProgram;
            }

            /**
             * This fixes an issue where multiple copies of the same image are loaded from different paths
             * This function modifies the contentItems array by reusing the same thumbnailUrl if the filename matches
             */
            $scope.reuseThumbnails = function() {
                var imageMap = {};
                $scope.content.contentItems = $scope.content.contentItems.map(function(level1) {
                    level1.contentItems = (level1.contentItems || []).map(function(item) {
                        item.thumbnailUrls = (item.thumbnailUrls || []).map(function(url) {
                            var fileName = url.split('/').pop();
                            var savedImage = imageMap[fileName];
                            if (savedImage) {
                                return savedImage;
                            }
                            imageMap[fileName] = url;
                            return url;
                        });
                        return item;
                    });
                    return level1;
                });
            };

            $scope.content = LessonContent;
            $scope.lessonContentItems = LessonContent && angular.copy(LessonContent.contentItems);

            // show distance learning toggle button
            var availableContentItems = $scope.content && $scope.content.contentItems;
            $scope.showDistanceLearning = function() {
                return $scope.currentUser.isTeacher && availableContentItems &&
                    Content.isDistanceLearningContent(availableContentItems);
            };

            // is distance learning toggle button enabled
            $scope.isDistanceLearningEnabled = function() {
                return $scope.showDistanceLearning() && (webStorage.get('showDistanceLearningResources') || false) &&
                    !featureManagementService.isExternalTOCViewerEnabled();
            };
            var isDistanceLearningToggleEnabled = $scope.isDistanceLearningEnabled();

            // show distance learning zero state
            $scope.showDistanceLearningErrorMessage = isDistanceLearningToggleEnabled &&
                $scope.content && $scope.content.contentItems.length === 0;

            if (isDistanceLearningToggleEnabled && $scope.content) {
                $scope.content.contentItems = ProgramService
                    .filterDistanceLearningContent($scope.content.contentItems);
            }

            $scope.showExternalTocViewer = function() {
                return featureManagementService.isExternalTOCViewerEnabled() &&
                    !locationUtilService.isResourceLesson() &&
                    !(locationUtilService.isMyLibraryLesson() &&
                    !featureManagementService.isMyLibraryTocViewerEnabled()) &&
                    !locationUtilService.isSearchLesson() &&
                    !locationUtilService.isStandardsActive() &&
                    !locationUtilService.isBrowseAllLesson() &&
                    !locationUtilService.isSearchStandardPage();
            };
            // update the multi select assignable items based on distance learning toggle state
            $scope.updateMultiSelectAssignbleItems = function() {
                var assignableItems = $scope.multiSelect.assignableItems;
                $scope.multiSelect.assignableItems = {};
                learningModalItems($scope.content.contentItems, assignableItems);
                $scope.checkIfAllSelected();
            };

            var learningModalItems = function(contentItems, assignableItems) {
                _.forEach(contentItems, function(item) {
                    if (item.mediaType === MEDIA_TYPE.LEARNING_MODEL) {
                        learningModalItems(item.contentItems, assignableItems);
                    } else if ($scope.isAssignable(item)) {
                        var isSelected = assignableItems[item.id] ? assignableItems[item.id].selected : false;
                        $scope.multiSelect.assignableItems[item.id] = {
                            selected: isSelected,
                            id: item.id,
                            item: item
                        };
                    }
                });
            };

            var isContentOrAnyChildContentAssignable = function(content) {
                if (!content) {
                    return false;
                }

                if (!content.contentItems || !content.contentItems.length) {
                    return content.$isAssignable();
                }

                for (var index = 0; index < content.contentItems.length; index++) {
                    var currentChildContentItem = content.contentItems[index];
                    if (isContentOrAnyChildContentAssignable(currentChildContentItem)) {
                        return true;
                    }
                }

                return false;
            };
            $scope.isAllItemsTeacherOnly = !isContentOrAnyChildContentAssignable($scope.content);

            var originalItemId = webStorage.get('originalItemId');
            webStorage.remove('originalItemId');
            if (originalItemId && $scope.content) {
                var item;
                angular.forEach($scope.content.contentItems, function(content) {
                    if (content.mediaType !== MEDIA_TYPE.LEARNING_MODEL) {
                        if (content.id === originalItemId) {
                            item = content;
                        }
                    } else {
                        if (!item) {
                            item = $filter('filter')(content.contentItems, function(item) {
                                return item.id === originalItemId;
                            })[0];
                        }
                    }
                });
                var cache = false;
                Content.getCustomisedVersions(item, cache)
                    .then(function(data) {
                        if (data && data.length > 0) {
                            var customizedItems = ProgramService
                                .addCustomisedItemstoList(data, item.id, $scope.content.contentItems);
                            $scope.content.contentItems = customizedItems;
                            addItemsToMultiSelectData(item, customizedItems);
                        }
                    });
            }

            if ($scope.content) {
                $scope.reuseThumbnails();
            }
            var openKey = TEACHER_RESOURCES_DRAWER + $scope.currentUser.userId;
            $timeout(
                function() {
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

            $scope.$watch('sidebarOpen', function(isOpen) {
                if (!angular.isDefined(isOpen)) {
                    return;
                }

                webStorage.add(openKey, isOpen);
            });

            // used to display lesson edit and assignment notifications
            $scope.alertDetails = AlertService.alerts[0];
            $scope.alertIsSet = AlertService.alertIsSet();

            $scope.$on('assignmentModal.alert.toggle', function(e, args) {
                if (args.show) {
                    $scope.alertDetails = AlertService.alerts[0];
                    $scope.alertIsSet = AlertService.alertIsSet();

                    var displayTopOfPageAlert = function() {
                        $scope.alertDetails = args.alertDetails;
                        $scope.alertIsSet = true;
                        InlineAlertService.removeAlert();
                    };

                    var lessonPageAssigned = args.assignedItem.id === LessonContent.id;

                    if (lessonPageAssigned) {
                        displayTopOfPageAlert();
                    }
                } else {
                    $scope.alertIsSet = false;
                }
            });

            // to track state of current lesson view if original or customized
            $scope.isCustomized = $scope.content && $scope.content.contribSource === 'My Uploads';
            $scope.isOriginal = !$scope.isCustomized;
            $scope.showOriginal = $scope.content && !$scope.content.customizedItemDefaultView;

            $scope.isMixedMode = function() {
                return $scope.sidebarOpen && !MediaQuery.breakpoint.isDesktop;
            };

            $scope.isMixedModeSidebarNotOpen = function() {
                return !MediaQuery.breakpoint.isDesktop;
            };

            $scope.showCustomizedMessage = function(item) {
                return !$scope.currentUser.isStudent && !item.$isCustomizedTest();
            };

            $scope.open = function(event, item) {
                var itemToOpen, p,
                    target = 'content';
                if (item.mediaType === 'Student Voice' || item.mediaType === 'Learning Model') {
                    return;
                }

                event.preventDefault();
                event.stopPropagation();

                itemToOpen = item.$getDefaultVersion();
                p = $location.path();

                if (item.mediaType === 'Adaptive Homework') {
                    target = 'adaptivehomework';
                }
                if (item.mediaType === MEDIA_TYPE.DISCUSSION_PROMPT) {
                    target = 'discussionprompt';
                }

                if (item.$isNbcItem()) {
                    p = ['/nbclearn/video', item.id, item.version].join('/');
                } else {
                    // there should never be nested lessons or other containers, only content
                    // $getEquellaItemId() will get the equella item id for Pearson content and as well as for
                    // external source items
                    p = [p, target, itemToOpen.$getEquellaItemId(), itemToOpen.version].join('/');
                }
                $scope.multiSelect.assignLabel = $scope.assignLabelText;
                $scope.multiSelect.assignPlaylistLabel = $scope.assignPlaylistLabel;
                MyContent.setMultiSelectStatus($scope.multiSelect);
                $location.path(p);
            };

            $scope.hasRemediation = function(item) {
                return item && item.$hasRemediation();
            };

            $scope.viewRemediation = function(item, event) {
                var path;
                event.stopPropagation();

                path = [$location.path(), 'content', item.id, item.version, 'remediation'].join('/');

                $location.path(path);
            };

            $scope.showRubric = function(item, event) {
                if (event) {
                    event.stopPropagation();
                }
                if ($scope.productName) {
                    rubricEventTracking.clickOnRubricQuickLink(false, $scope.productName, item.externalId, item.title);
                } else {
                    AssignmentUtil.getProgramHierarchy(item, item.id)
                        .then(function(programHierarchy) {
                            $scope.productName = telemetryUtilitiesService.getProgramTitle(programHierarchy);
                            rubricEventTracking.clickOnRubricQuickLink(false, $scope.productName, item.externalId,
                                item.title);
                        });
                }

                $location.path([$location.path(), 'content', item.id, item.version].join('/'))
                    .search('rubric', 'true');
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

            $scope.back = function(e) {
                e.stopPropagation();

                var path = $location.path(),
                    next;

                if ($routeParams.keywords) {
                    next = path.split('/search')[0] + '/search';
                } else if ($scope.isOriginal && !$scope.showOriginal) {
                    // if in read-only view for original lesson, back takes you to customized version
                    next = path.split('/lesson/')[0] + '/lesson/' + $scope.content.customizedItem.id + '/' +
                        $scope.content.customizedItem.version;
                } else {
                    next = path.split('/lesson/')[0];
                }

                $scope.goBack(next, true);
            };

            $scope.openLessonEdit = function() {
                //determines 'add items from search' mode is on/off for edit lesson
                $rootScope.addItemSearchResults = angular.isDefined($rootScope.addItemSearchResults) ?
                    $rootScope.addItemSearchResults : false;
                var path = $location.path();
                $location.path(path + '/edit');
            };

            // can the logged-in user edit assessments
            $scope.canUserEditAssessment = $scope.currentUser.hasRole('ROLE_TEACHER');

            $scope.showOriginalLesson = function() {

                var lessonId = $scope.content.id,
                    path = $location.path(),
                    next;

                MyContent.getOriginalIdFromCustomized(lessonId).then(function(data) {
                    if ($routeParams.keywords) {
                        next = path.split('/search')[0] + '/search/lesson/' + data.originalItemId + '/0';
                    } else {
                        next = path.split('/lesson/')[0] + '/lesson/' + data.originalItemId + '/0';
                    }

                    $location.path(next);
                });
            };

            $scope.showCustomizedLesson = function() {

                var customizedLessonId = $scope.content.customizedItem.id;
                $log.log('showCustomizedLesson ID', customizedLessonId);

                var path = $location.path(),
                    next;
                if ($routeParams.keywords) {
                    next = path.split('/search')[0] + '/search/lesson/' + customizedLessonId + '/' +
                        $scope.content.customizedItem.version;
                } else {
                    next = path.split('/lesson/')[0] + '/lesson/' + customizedLessonId + '/' +
                        $scope.content.customizedItem.version;
                }

                $location.path(next);
            };

            $scope.openReorderView = function() {
                var path = $location.path();
                $location.path(path + '/reorder');
            };

            if (angular.isDefined($rootScope.addItemSearchResults) && $rootScope.addItemSearchResults) {
                $scope.openLessonEdit();
            }

            $scope.isAssignable = function(item) {
                return item.mediaType !== MEDIA_TYPE.STUDENT_VOICE && item.$isAssignable();
            };

            $scope.toggleSelect = function() {
                _.each($scope.multiSelect.assignableItems, function(item) {
                    item.selected = $scope.multiSelect.masterSelected;
                });

                $scope.checkedItems = _.where($scope.multiSelect.assignableItems, { selected: true });

                if ($scope.multiSelect.masterSelected === false) {
                    $scope.setState(false, $scope.stateLabels.selectAll);
                } else {
                    $scope.multiSelect.masterSelected = true;
                }
                $scope.assignLabelText = $scope.stateLabels.assignAll;
                $scope.assignPlaylistLabel = $scope.stateLabels.addAllToPlaylist;
            };

            $scope.setState = function(masterSelectedState, selectDeselectLabel) {
                $scope.multiSelect.masterSelected = masterSelectedState;
                $scope.selectDeselect = selectDeselectLabel;
                $scope.multiSelect.label = selectDeselectLabel;
            };

            $scope.checkIfAllSelected = function() {
                var uncheckedItems = _.where($scope.multiSelect.assignableItems, { selected: false });
                $scope.checkedItems = _.where($scope.multiSelect.assignableItems, { selected: true });
                $scope.assignMultiple = TELEMETRY_CONSTANTS.LESSON_ASSET_MULTI_SELECT.SINGLE;

                if (uncheckedItems.length < _.size($scope.multiSelect.assignableItems) &&
                    uncheckedItems.length > 0) {
                    $scope.assignMultiple = TELEMETRY_CONSTANTS.LESSON_ASSET_MULTI_SELECT.ASSIGN_SELECTED;
                    $scope.setState('mixed', $scope.stateLabels.deselectAll);
                    $scope.assignLabelText = $scope.stateLabels.assignSelected +
                        ' (' + $scope.checkedItems.length + ')';
                    $scope.assignPlaylistLabel = $scope.stateLabels.addSelectedToPlaylist +
                        ' (' + $scope.checkedItems.length + ')';
                } else {
                    if (uncheckedItems.length === _.size($scope.multiSelect.assignableItems)) {
                        $scope.setState(false, $scope.stateLabels.selectAll);
                    } else {
                        $scope.setState(true, $scope.stateLabels.selectAll);
                    }
                    $scope.assignMultiple = TELEMETRY_CONSTANTS.LESSON_ASSET_MULTI_SELECT.ASSIGN_ALL;
                    $scope.assignLabelText = $scope.stateLabels.assignAll;
                    $scope.assignPlaylistLabel = $scope.stateLabels.addAllToPlaylist;
                }
            };

            $scope.verifyAssignType = function() {
                $scope.checkedItems = _.where($scope.multiSelect.assignableItems, { selected: true });
                if ($scope.checkedItems.length === 0) {
                    $scope.assignMultiple = TELEMETRY_CONSTANTS.LESSON_ASSET_MULTI_SELECT.SINGLE;
                } else if ($scope.assignMultiple !== TELEMETRY_CONSTANTS.LESSON_ASSET_MULTI_SELECT.ASSIGN_SELECTED &&
                           $scope.checkedItems.length === _.size($scope.multiSelect.assignableItems)) {
                    $scope.assignMultiple = TELEMETRY_CONSTANTS.LESSON_ASSET_MULTI_SELECT.ASSIGN_ALL;
                }
            };

            $scope.showMultiselect = function() {
                return _.size($scope.multiSelect.assignableItems) > 0;
            };

            var prepMultiselectData = function() {
                var previousSelections = MyContent.getMultiSelectStatus();
                if (previousSelections) {
                    $scope.multiSelect = previousSelections;
                    MyContent.setMultiSelectStatus(null);
                } else if (!$scope.currentUser.isStudent && $scope.content) {
                    var setAssignableItemsState = function(contentItems) {
                        $scope.multiSelect.label = $scope.stateLabels.selectAll;
                        _.forEach(contentItems, function(item) {
                            if (item.mediaType === MEDIA_TYPE.LEARNING_MODEL) {
                                setAssignableItemsState(item.contentItems);
                            } else if ($scope.isAssignable(item)) {
                                $scope.multiSelect.assignableItems[item.id] = {
                                    selected: false,
                                    id: item.id,
                                    item: item
                                };
                            }
                        });
                    };
                    setAssignableItemsState($scope.content.contentItems);
                }
            };

            prepMultiselectData();

            $scope.showAssign = function() {
                return ContentSource.PROVIDER.GOORU === $scope.searchProvider ||
                    $scope.content.$isAssignable(true) && !$scope.currentUser.isStudent;
            };

            $scope.showEditOrRearrange =  function() {
                return !($scope.isOriginal && !$scope.showOriginal) && !$scope.currentUser.isStudent;
            };

            $scope.showCustomize = function() {
                return $scope.isOriginal && !$scope.showOriginal && !$scope.currentUser.isStudent;
            };
            var getOriginAndCssClass = function() {
                if (isResourceListingPath) {
                    $scope.passCssClass = PLAYLIST_CONSTANTS.CSS_CLASS.RESOURCE_LISTING;
                } else if (isMyLibraryPath) {
                    $scope.passCssClass = PLAYLIST_CONSTANTS.CSS_CLASS.MY_LIBRARY;
                }
            };
            getOriginAndCssClass();
            $scope.activateAddToPlaylistModal = function($event, items, isCalledFromAddSelectedButton) {
                if ($event) {
                    $event.stopPropagation();
                }
                var itemList = [];
                _.forEach(items, function(item) {
                    itemList.push(item.id);
                });
                var contentItemInfo = {
                    contentIdList: itemList,
                    cssClass: $scope.passCssClass,
                    closeAction: function() {
                        $scope.persistMasterSelectOnCancel();
                        $event.currentTarget.querySelector('a').focus();
                    }
                };
                var programName = $scope.program ? $scope.program.title : '';
                var resources = PLAYLIST_CONSTANTS.TELEMETRY.PAGE.RESOURCES;
                var leveledReaders = PLAYLIST_CONSTANTS.TELEMETRY.PAGE.LEVELED_READER;
                var standardResults = PLAYLIST_CONSTANTS.TELEMETRY.PAGE.STANDARD_RESULTS;
                var browseAll = PLAYLIST_CONSTANTS.TELEMETRY.PAGE.BROWSE_ALL;
                var originConfig = playlistUtilService.getOriginPageInfo();

                if (originConfig.originPage === resources ||
                    originConfig.originPage === leveledReaders || originConfig.originPage === browseAll ||
                    originConfig.originPage === standardResults) {
                    playlistTelemetryService.onAddToPlaylistBrowseSearch(originConfig.originPage,
                        originConfig.originSubpage,
                        originConfig.originArea,
                        programName);

                } else if (!isCalledFromAddSelectedButton) {
                    playlistTelemetryService.onAddToPlaylistLessonQuicklink(programName);
                }

                if (items.length === 1) {
                    contentItemInfo.contentTitle = items[0].title;
                }
                addToPlaylistService.invokeDefaultFlow(contentItemInfo);
            };

            $scope.checkMasterSelectOption = function() {
                $scope.verifyAssignType();
                $scope.multiSelect.previousMasterSelect = $scope.multiSelect.masterSelected;
                if ($scope.multiSelect.masterSelected === false) {
                    $scope.multiSelect.masterSelected = true;
                    $scope.toggleSelect();
                }
                var originPage = isMyLibraryPath ? 'customLesson' : 'lesson';
                var programName = $scope.program ? $scope.program.title : '';
                playlistTelemetryService.onAssignButtonInLessonOrCustomLessonPage({
                    numberOfCheckedItems: $scope.dataForTelemetry.getNumberOfCheckedItems(),
                    numberOfTotalItems: $scope.dataForTelemetry.getNumberOfTotalItems()
                }, originPage, programName);
                return;
            };

            $scope.checkMasterSelectForAddToPlaylistOption = function($event) {
                $scope.multiSelect.previousMasterSelect = $scope.multiSelect.masterSelected;
                if ($scope.multiSelect.masterSelected === false) {
                    $scope.multiSelect.masterSelected = true;
                    $scope.toggleSelect();
                }
                var originPage = isMyLibraryPath ? 'customLesson' : 'lesson';
                var programName = $scope.program ? $scope.program.title : '';
                playlistTelemetryService.onAddToPlaylistButtonInLessonOrCustomLessonPage({
                    numberOfCheckedItems: $scope.dataForTelemetry.getNumberOfCheckedItems(),
                    numberOfTotalItems: $scope.dataForTelemetry.getNumberOfTotalItems()
                }, originPage, programName);
                $scope.activateAddToPlaylistModal($event, getListOfItemsFromCheckedItems($scope.checkedItems), true);
                return;
            };

            var getListOfItemsFromCheckedItems = function(checkedItems) {
                return _.map(checkedItems, function(checkboxItem) {
                    return checkboxItem.item;
                });
            };

            $scope.updateMasterSelectOnSave = function() {
                if ($scope.multiSelect.masterSelected) {
                    $scope.multiSelect.masterSelected = false;
                    $scope.toggleSelect();
                } else {
                    return;
                }
            };

            $scope.persistMasterSelectOnCancel = function() {
                if ($scope.multiSelect.previousMasterSelect === true) {
                    $scope.multiSelect.masterSelected = true;
                    $scope.toggleSelect();
                } else if ($scope.multiSelect.previousMasterSelect === false) {
                    $scope.multiSelect.masterSelected = false;
                    $scope.toggleSelect();
                } else {
                    return;
                }
            };

            $scope.getAssignmentContent = function() {
                if ($scope.checkedItems && $scope.checkedItems.length === 1) {
                    return $scope.checkedItems[0].item;
                } else {
                    return getCheckedContentItems();
                }
            };

            $scope.dataForTelemetry = {
                getNumberOfCheckedItems: function() {
                    return $scope.checkedItems.length;
                },
                getNumberOfTotalItems: function() {
                    return _.size($scope.multiSelect.assignableItems);
                }
            };

            $scope.updateTocModel = function() {
                // when Distance Learning enabled all assignments treating as multi select assignemnts
                if (!$scope.isDistanceLearningEnabled() && ($scope.multiSelect.masterSelected === true ||
                        $scope.checkedItems && $scope.checkedItems.length === 1)) {
                    return;
                }
                // list of selected item (item Id and version)
                return _.map($scope.checkedItems, function(checkedItem) {
                    return {
                        itemUuid: angular.isDefined(checkedItem.item.originalEquellaItemId) ?
                            checkedItem.item.originalEquellaItemId : checkedItem.item.id,
                        itemVersion: checkedItem.item.version
                    };
                });
            };

            var getCheckedContentItems = function() {
                var requestContent = angular.copy($scope.content);
                requestContent.contentItems = [];
                var prepAssignmentModal = function(contentItems) {
                    angular.forEach(contentItems, function(contentItem) {
                        if (contentItem.mediaType === MEDIA_TYPE.LEARNING_MODEL) {
                            prepAssignmentModal(contentItem.contentItems);
                        } else {
                            var item = _.findWhere($scope.checkedItems, {id: contentItem.id});
                            if (item) {
                                requestContent.contentItems.push(item.item);
                            }
                        }
                    });
                };
                prepAssignmentModal($scope.content.contentItems);

                return requestContent;
            };

            $scope.disableLessonMenu = false;

            $scope.getVersionInProgress = false;

            var addItemsToMultiSelectData  = function(parentItem, items) {
                _.forEach(items, function(item) {
                    if (item.mediaType !== MEDIA_TYPE.LEARNING_MODEL) {
                        if (!$scope.multiSelect.assignableItems[item.id] && $scope.isAssignable(item)) {
                            $scope.multiSelect.assignableItems[item.id] = {
                                selected: $scope.multiSelect.assignableItems[parentItem.id].selected ? true : false,
                                id: item.id,
                                item: item
                            };
                        }
                    } else {
                        _.forEach(item.contentItems, function(learningModelItem) {
                            if (!$scope.multiSelect.assignableItems[learningModelItem.id] &&
                                $scope.isAssignable(learningModelItem)) {
                                $scope.multiSelect.assignableItems[learningModelItem.id] = {
                                    selected: $scope.multiSelect.assignableItems[parentItem.id].selected ?
                                        true : false,
                                    id: learningModelItem.id,
                                    item: learningModelItem
                                };
                            }
                        });
                    }
                });
                $scope.checkIfAllSelected();
            };

            var removeItemsFromMultiSelectData  = function(originalItem) {
                var customizedItems = [];
                _.filter($scope.content.contentItems, function(item) {
                    if (item.mediaType !== MEDIA_TYPE.LEARNING_MODEL) {
                        if (item.originalItemId === originalItem.id) {
                            customizedItems.push(item);
                        }
                    } else {
                        if (item.contentItems) {
                            item.contentItems.filter(function(learningModelItem) {
                                if (learningModelItem.originalItemId === originalItem.id) {
                                    customizedItems.push(learningModelItem);
                                }
                            });
                        }
                    }
                });

                if (!_.isEmpty(customizedItems)) {
                    _.forEach(customizedItems, function(customizedItem) {
                        delete $scope.multiSelect.assignableItems[customizedItem.id];
                        $scope.checkIfAllSelected();
                    });
                }
            };

            var sendAssessmentTelemetryEvents = function(item, isExpand) {
                Assessment.getCustomizedVersionCount(item.id)
                    .then(function(count) {
                        var extensionKeys = {
                            id: isExpand ? ASSESSMENT_EVENT_TRACKING_CONSTANTS.CLOSE :
                                ASSESSMENT_EVENT_TRACKING_CONSTANTS.OPEN,
                            area: TELEMETRY_CONSTANTS.EVENT_TYPE.PROGRAMS,
                            page: TELEMETRY_CONSTANTS.EVENT_TYPE.TABLE_OF_CONTENTS,
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
                    removeItemsFromMultiSelectData(item);
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
                                var customizedItems = ProgramService
                                    .addCustomisedItemstoList(data, item.id, $scope.content.contentItems);
                                $scope.content.contentItems = customizedItems;
                                addItemsToMultiSelectData(item, customizedItems);
                                var isExpand = false;
                                sendAssessmentTelemetryEvents(item, isExpand);
                            }
                        });
                }
            };

            var verifyIfCheckboxSelected = $scope.$watch('multiSelect.masterSelected', function() {
                $scope.disableLessonMenu = !!($scope.multiSelect.masterSelected);
            });

            $scope.$on('$destroy', function() {
                verifyIfCheckboxSelected();
            });
        }
    ]);
