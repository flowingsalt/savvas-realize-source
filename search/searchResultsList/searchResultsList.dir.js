angular.module('RealizeDirectives')
    .controller('SearchResultsListCtrl', [
        '$scope',
        '$location',
        'ContentSource',
        '$rootScope',
        'RealizeHelpers',
        'InfoModalService',
        'MediaQuery',
        'MEDIA_TYPE',
        'CONTRIBUTOR_SOURCE',
        'SearchSvc',
        '$timeout',
        'searchTelemetryUtilitiesService',
        'rubricEventTracking',
        'telemetryUtilitiesService',
        'AssignmentUtil',
        'addToPlaylistService',
        'playlistUtilService',
        'playlistTelemetryService',
        'setFocusUtilService',
        function($scope, $location, ContentSource, $rootScope, helpers, InfoModalSvc, MediaQuery, MEDIA_TYPE,
            CONTRIBUTOR_SOURCE, SearchSvc, $timeout, searchTelemetryUtilitiesService, rubricEventTracking,
            telemetryUtilitiesService, AssignmentUtil, addToPlaylistService, playlistUtilService,
            playlistTelemetryService, setFocusUtilService) {
            'use strict';

            var searchProvider = new ContentSource($scope.searchProvider);
            var url;
            var urlNeedsContentVersion;

            $scope.alertIsSet = false;
            $scope.$on('assignmentModal.alert.toggle', function(e, args) {
                $scope.alertDetails  = {info: args.alertDetails};
                if (args.show) {
                    $scope.alertIsSet = true;
                }
            });

            $scope.treeTitleEllipses = !MediaQuery.breakpoint.isDesktop ? 40 : 60;
            $scope.hasCustomizePrivilege = $rootScope.currentUser.$canCustomizeItems();
            $scope.showBreadcrumbEllipsis = false;
            $scope.isMixedMode = function() {
                return !MediaQuery.breakpoint.isDesktop;
            };

            $scope.showInfoLink = function(item) {
                if (angular.isDefined($scope.selectedSearchItems.ids[item.id])) {
                    return !$scope.selectedSearchItems.ids[item.id];
                }
                return item.$hasInfo() && item.mediaType !== 'Tier' && !item.essayPrompt &&
                    item.mediaType !== MEDIA_TYPE.PLAYLIST;
            };

            $scope.showAssignLink = function(item) {
                return $scope.isExternalSearchProviderMode() ||
                ($scope.showPrimaryLinks && item.$isAssignable());
            };

            $scope.showCustomizeLink = function(item) {
                return !$scope.isStudent && $scope.showPrimaryLinks &&
                $scope.hasCustomizePrivilege && item.mediaType === 'Lesson' && !item.$isReviewerContainer();
            };

            $scope.showTeacherResourceLink = function(item) {
                return !$scope.isStudent && item.mediaType !== 'Tier' && $scope.showPrimaryLinks;
            };

            $scope.showRemediationLink = function(item) {
                return !$scope.isStudent && item.$hasRemediation() && !$scope.selectedSearchItems.ids[item.id];
            };

            $scope.getCustomizeLabel = function(item) {
                if (item.$isCustomizedTest()) {
                    return 'content.action.edit';
                } else if (item.essayPrompt) {
                    return 'myContent.action.edit';
                } else {
                    return 'program.action.customize';
                }
            };

            $scope.isEssayPrompt = function(item) {
                return !!item.essayPrompt;
            };

            $scope.viewRemediation = function(item, event) {
                helpers.killEvent(event);
                var basePath = $location.path().split('/edit').shift(),
                    targetPath = item.mediaType === 'Lesson' ? 'lesson' : 'content',
                    itemRoute = [basePath, targetPath, item.id, item.version, 'remediation'].join('/');

                SearchSvc.storeContentFromDetails(item);
                $location.path(itemRoute);
            };

            $scope.showRubric = function(item, event) {
                if (event) {
                    event.stopPropagation();
                }
                if ($scope.productName) {
                    rubricEventTracking.clickOnRubricQuickLink(true, $scope.productName, item.externalId, item.title);
                } else {
                    AssignmentUtil.getProgramHierarchy(item, item.id)
                        .then(function(programHierarchy) {
                            $scope.productName = telemetryUtilitiesService.getProgramTitle(programHierarchy);
                            rubricEventTracking.clickOnRubricQuickLink(true, $scope.productName, item.externalId,
                                item.title);
                        });
                }
                var path = $location.path(),
                    basePath = path.split('/edit').shift(),
                    keywordString = $location.search().keywords;
                $location.path([basePath, 'content', item.id, item.version].join('/'));
                if (path.indexOf('edit') > -1) {
                    $location.search({editing: 'true', rubric: 'true', keywords: keywordString});
                } else {
                    $location.search({rubric: 'true', keywords: keywordString});
                }
            };

            $scope.showLeveledReadersLevelInfo = function(item) {
                return InfoModalSvc.createLevelsArray(item);
            };

            $scope.hideInfoItemOnLevels = function() {
                return InfoModalSvc.hideInfoItemOnLevels();
            };

            $scope.open = function(e, item) {
                urlNeedsContentVersion = true;
                helpers.killEvent(e);

                // TODO: Add Content.$isNbcItem() to OpenEd objects, though it should always be false then
                if ($scope.searchProvider !== ContentSource.PROVIDER.Open_ED && item.$isNbcItem()) {
                    $location.path(['/nbclearn/video', item.id, item.version].join('/'));
                } else {
                    var path = $location.path(),
                        basePath = path.split('/edit').shift(),
                        targetPath = 'content';

                    if (item.fileType === ContentSource.PROVIDER.FILE_TYPE.OpenEd) {
                        item.version = ContentSource.PROVIDER.VERSION.OpenEd;
                    } else if (item.mediaType === 'Lesson') {
                        targetPath = 'lesson';
                    } else if (item.mediaType === 'Center') {
                        targetPath = 'center';
                    } else if (item.mediaType === MEDIA_TYPE.DISCUSSION_PROMPT) {
                        targetPath = 'discussionprompt';
                    } else if (item.mediaType === MEDIA_TYPE.ADAPTIVE_HOMEWORK  ||
                        item.mediaType === 'Diagnostic Assessment') {
                        targetPath = 'adaptivehomework';
                    } else if (item.mediaType === MEDIA_TYPE.PLAYLIST) {
                        var originConfig = playlistUtilService.getOriginPageInfo();
                        targetPath = 'playlist';
                        urlNeedsContentVersion = false;
                        playlistTelemetryService.onNavigateToPlaylistPage(originConfig.originArea,
                            originConfig.originPage);
                    }

                    SearchSvc.storeContentFromDetails(item);

                    url = [basePath, targetPath, item.id].join('/');

                    if (urlNeedsContentVersion) {
                        url = [url, item.version].join('/');
                    }

                    $location.path(url);

                    if (path.indexOf('edit') > -1) {
                        $location.search({editing: 'true'});
                    }
                }
            };

            $scope.customizeLesson = function(item, event) {
                helpers.killEvent(event);
                var path = $location.path();

                item = item.$getDefaultVersion();
                $location.path(path + searchProvider.getRoute(item));
            };

            $scope.isExternalSearchProviderMode = function() {
                return angular.isDefined($scope.externalSearchProviderName) &&
                    ($scope.searchProvider === $scope.externalSearchProviderName);
            };

            $scope.isTeacherPrompt = function(item) {
                return item.contribSource === CONTRIBUTOR_SOURCE.MY_UPLOADS &&
                item.mediaType === MEDIA_TYPE.DISCUSSION_PROMPT;
            };

            $scope.editPrompt = function(event, item) {
                if (event) {
                    event.stopPropagation();
                }
                $location.search('view', 'edit');
                $scope.open(event, item);
            };

            $scope.hasTierAndLesson = function(item) {
                return item.$isLesson() || item.isTier() || item.isPlaylist();
            };

            $scope.breadcrumbHandler = function(event, url, breadcrumbData) {
                if (event) {
                    event.stopPropagation();
                }
                searchTelemetryUtilitiesService.sendTelemetryEventsFromSearch(event, breadcrumbData, 'searchPage');
                SearchSvc.navigateToSourceProgram(url);
            };

            $scope.moreOrLessToggle = function($event, toggle, breadcrumbList) {
                var toggleText = $event.currentTarget.text;
                if (toggle) {
                    $timeout(function() {
                        if (!$event) {
                            $event = window.event;
                        }
                        var element = $event.target || $event.srcElement;
                        while (element) {
                            element = element.parentNode;
                            if (element.className.indexOf('breadcrumbSection') > -1) {
                                break;
                            }
                        }
                        var childNavItem = angular.element(element).find('nav>ol')[1];
                        var childbreadcrumbItem = angular.element(childNavItem).find('a')[0];
                        childbreadcrumbItem.focus();
                        childbreadcrumbItem.classList.add('kb-mode');
                    });
                }
                searchTelemetryUtilitiesService.sendTelemetryEventsFromMoreOrLess(toggleText, breadcrumbList);
            };

            $scope.activateAddToPlaylistModal = function($event, item) {
                var originConfig = playlistUtilService.getOriginPageInfo();
                $event.stopPropagation();
                var contentItemInfo = {
                    contentIdList: [item.id],
                    cssClass: 'search__result',
                    origin: 'browseAll',
                    contentTitle: item.title,
                    closeAction: function() {
                        $event.currentTarget.querySelector('a').focus();
                    }
                };
                addToPlaylistService.invokeDefaultFlow(contentItemInfo);
                playlistTelemetryService.onAddToPlaylistBrowseSearch(originConfig.originPage,
                    originConfig.originSubpage,
                    originConfig.originArea,
                    $scope.productName);
            };

            $scope.$on('info.modal.closed', function() {
                var element = document.getElementById('info_dialog');
                setFocusUtilService.setFocusOnElement(element);
            });
        }
    ])
    .directive('searchResultsList', [
        function() {
            'use strict';

            return {
                templateUrl: 'templates/search/searchResultsList/searchResultsList.dir.html',
                transclude: true,
                controller: 'SearchResultsListCtrl'
            };
        }
    ]);
