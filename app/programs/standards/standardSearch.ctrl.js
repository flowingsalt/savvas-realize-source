angular.module('Realize.standards.standardsSearchCtrl', [
        'rlzComponents.components.i18n',
        'Realize.content.model.contentItem',
        'Realize.standards.standardDataService'
    ])
    .controller('StandardsSearchCtrl', [
        '$scope',
        '$rootScope',
        '$log',
        '$location',
        '$routeParams',
        'lwcI18nFilter',
        'Content',
        'Standard',
        'locationUtilService',
        function($scope, $rootScope, $log, $location, $routeParams, lwcI18nFilter, Content, Standard,
            locationUtilService) {
            'use strict';

            $scope.pageLoading();

            $scope.stateStandard = $scope.zeroStateMsgCriteria = Standard.urlDecode($routeParams.stateStandard);
            $scope.nationalLibrary = Standard.urlDecode($routeParams.nationalLibrary);

            function setStandardLocaleDesc(standard) {
                var language = $scope.currentProgram && $scope.currentProgram.language ?
                    $scope.currentProgram.language : $scope.keyStore.get('assessmentLanguage');
                return Standard.localeDescription(standard, language);
            }

            Standard.getSelectedStandard($scope.stateStandard).then(function(standard) {
                $scope.selectedStandard = standard;
                setStandardLocaleDesc($scope.selectedStandard);
            });

            var searchParams = {
                STATE_STANDARD: $scope.stateStandard,
                NATIONAL_LIBRARY: $scope.nationalLibrary
            };

            var saveFiltersOnExit = false;

            $scope.goBackToStandards = function() {
                var programId = $routeParams.programId,
                    programVersion = $routeParams.programVersion,
                    standardsPath = Standard.getStandardRoute(programId, programVersion);

                $scope.back(standardsPath);
            };

            var initSearch = function() {
                if (locationUtilService.isDeeplinkSearchActive()) {
                    $rootScope.hidePlatform = true;
                }
                // to check if any selected facets & page while coming back from lesson/test edit/read only mode.
                var currentSelectedData = Content.filterData.get('search.standard');
                if (currentSelectedData) {
                    $scope.selectedFacets = currentSelectedData.selectedFacets;
                    $scope.searchParams = currentSelectedData.searchOptions;
                } else {
                    $scope.searchParams = searchParams;
                }
            };

            if (!$rootScope.searchResultsTitle) {
                $rootScope.searchResultsTitle = lwcI18nFilter('standards.search.searchByStandard');
            }

            $scope.$on('$routeChangeStart', function() {
                $rootScope.searchResultsTitle = null;
            });

            $scope.$on('searchResults.queryCompleted', function(evt, data) {
                $scope.noMatchFound = data.resultCount === 0;
                $scope.queryDone = true;
            });

            $scope.$on('$locationChangeStart', function(ev, nextLocation, currentLocation) {
                currentLocation = currentLocation.split('?').shift();
                if (nextLocation.indexOf(currentLocation) >= 0) {
                    saveFiltersOnExit = true;
                }
            });

            $scope.$on('searchResults.exiting', function(ev, filterData) {
                if (saveFiltersOnExit) {
                    Content.filterData.set('search.standard', filterData);
                } else {
                    Content.filterData.remove('search.standard');
                }
            });

            initSearch();
        }
    ]);
